const Payment = require("../models/Payment");
const Order   = require("../models/Order");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/upi-details/:orderId
// ─────────────────────────────────────────────────────────────────────────────
const getUpiDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized for this order" });

    const paid = await Payment.findOne({
      order: req.params.orderId,
      status: { $in: ["pending_verification", "confirmed"] },
    });
    if (paid) return res.status(400).json({ message: "Payment already submitted for this order" });

    return res.json({
      shopUpiId : process.env.SHOP_UPI_ID,
      shopName  : process.env.SHOP_NAME,
      amount    : order.totalPrice,
      orderId   : order._id,
      note      : `Pay ₹${order.totalPrice} to ${process.env.SHOP_UPI_ID} and enter your UTR number below`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payments
// Body for COD : { orderId, method: "cod" }
// Body for UPI : { orderId, method: "upi", utrNumber }
//
// NOTE: Coupon discounts are already applied at order placement (orderController).
//       Do NOT re-apply them here to avoid double discounting.
// ─────────────────────────────────────────────────────────────────────────────
const processPayment = async (req, res) => {
  try {
    const { orderId, method, utrNumber } = req.body;

    if (!orderId || !method)
      return res.status(400).json({ message: "orderId and method are required" });

    if (!["cod", "upi"].includes(method))
      return res.status(400).json({ message: "method must be 'cod' or 'upi'" });

    if (method === "upi" && (!utrNumber || utrNumber.trim().length < 10))
      return res.status(400).json({ message: "Valid 10-digit UTR is required for UPI payments" });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized for this order" });

    const existing = await Payment.findOne({
      order: orderId,
      status: { $in: ["pending_cod", "pending_verification", "confirmed"] },
    });
    if (existing) return res.status(400).json({ message: "A payment already exists for this order" });

    // Use the final totalPrice set by orderController (already includes delivery charge & coupon discount)
    const amount = order.totalPrice;

    const paymentData = {
      order          : orderId,
      user           : req.user._id,
      amount,
      originalAmount : amount,
      method,
      discountAmount : 0,
      couponApplied  : null,
    };

    if (method === "upi") {
      paymentData.shopUpiId = process.env.SHOP_UPI_ID;
      paymentData.utrNumber = utrNumber.trim();
      paymentData.status    = "pending_verification";
    }

    if (method === "cod") {
      paymentData.status = "pending_cod";
      order.status = "Confirmed";
      await order.save();
    }

    const payment = await Payment.create(paymentData);

    const message = method === "cod"
      ? `Order confirmed! Pay ₹${amount} on delivery.`
      : `UPI payment submitted! We will verify your UTR (${utrNumber.trim()}) and confirm your order shortly.`;

    return res.status(201).json({
      message,
      paymentId : payment._id,
      method    : payment.method,
      status    : payment.status,
      amountDue : amount,
      ...(method === "upi" && {
        shopUpiId : process.env.SHOP_UPI_ID,
        utrNumber : payment.utrNumber,
        note      : "Keep your UTR number safe as proof of payment.",
      }),
    });
  } catch (error) {
    console.error("processPayment error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/confirm  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
const confirmPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (!["pending_verification", "pending_cod"].includes(payment.status))
      return res.status(400).json({ message: `Cannot confirm a payment with status '${payment.status}'` });

    payment.status = "confirmed";
    payment.paidAt = new Date();
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order && order.status === "Placed") {
      order.status = "Confirmed";
      await order.save();
    }

    return res.json({ message: "Payment confirmed successfully", payment, orderId: payment.order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/reject  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
const rejectPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status !== "pending_verification")
      return res.status(400).json({ message: "Only UPI payments awaiting verification can be rejected" });

    payment.status = "failed";
    await payment.save();

    return res.json({ message: "Payment rejected. Customer will need to retry.", payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments/order/:orderId  (owner only)
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentByOrder = async (req, res) => {
  try {
    const payment = await Payment.findOne({ order: req.params.orderId })
      .populate("order")
      .populate("user", "name email");

    if (!payment) return res.status(404).json({ message: "No payment found for this order" });

    if (payment.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payments  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
const getAllPayments = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.method) filter.method = req.query.method;

    const payments = await Payment.find(filter)
      .populate("order")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/payments/:id/refund  (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ message: "Payment not found" });

    if (payment.status !== "confirmed")
      return res.status(400).json({ message: "Only confirmed payments can be refunded" });

    payment.status = "refunded";
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.status = "Placed";
      await order.save();
    }

    return res.json({ message: "Refund recorded successfully. Process manually via UPI/COD.", payment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUpiDetails,
  processPayment,
  confirmPayment,
  rejectPayment,
  getPaymentByOrder,
  getAllPayments,
  refundPayment,
};
