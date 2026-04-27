const Order = require("../models/Order");
const User = require("../models/User");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const Payment = require("../models/Payment");

// PLACE ORDER
exports.placeOrder = async (req, res) => {
  try {
    const { shippingAddress, couponCode } = req.body;
    if (!shippingAddress || !shippingAddress.address) {
      return res.status(400).json({ message: "Shipping address required" });
    }

    const user = await User.findById(req.user._id).populate("cart.product");

    if (!user || user.cart.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    let subtotal = 0;
    const items = [];

    for (let item of user.cart) {
      const product = item.product;
      if (!product) continue; // skip orphaned cart items

      // STOCK VALIDATION
      if (item.quantity > product.stock) {
        return res.status(400).json({
          message: `Not enough stock for ${product.name}`,
        });
      }

      subtotal += product.price * item.quantity;
      items.push({
        product: product._id,
        quantity: item.quantity,
      });

      // REDUCE STOCK
      product.stock -= item.quantity;
      await product.save();
    }

    if (items.length === 0) {
      return res.status(400).json({ message: "No valid products in cart" });
    }

    // DELIVERY CHARGE: Rs.40 if subtotal < 100 (based on original subtotal, not after discount)
    let deliveryCharge = subtotal < 100 ? 40 : 0;

    // COUPON LOGIC
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && new Date() <= new Date(coupon.expiresAt) && subtotal >= coupon.minOrderAmount) {
        if (coupon.discountType === "percentage") {
          discount = (subtotal * coupon.discountValue) / 100;
          if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
        } else {
          discount = coupon.discountValue;
        }
        discount = Math.min(discount, subtotal);
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    const totalPrice = Math.max(0, subtotal + deliveryCharge - discount);

    const order = new Order({
      user: user._id,
      items,
      totalPrice,
      deliveryCharge,
      shippingAddress,
    });

    await order.save();

    user.cart = [];
    await user.save();

    res.json({
      message: "Order placed successfully",
      order,
    });

  } catch (error) {
    console.error("placeOrder error:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// UPDATE ORDER STATUS (Admin Only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const status = req.body.status ? req.body.status.trim() : null;
    console.log(`[updateOrderStatus] Received status: "${status}" for order: ${req.params.id}`);

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const validStatuses = [
      "Placed",
      "Confirmed",
      "Packed",
      "Shipped",
      "Delivered",
      "Out of delivery area"
    ];

    if (!validStatuses.includes(status)) {
      console.error(`[updateOrderStatus] INVALID status received: "${status}"`);
      return res.status(400).json({ message: `Invalid status value: "${status}"` });
    }

    // RESTOCK if cancelled as "Out of delivery area"
    if (status === "Out of delivery area" && order.status !== "Out of delivery area") {
      console.log(`[updateOrderStatus] Restocking items for order ${order._id}`);
      for (let item of order.items) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await product.save();
          console.log(`[updateOrderStatus] Restocked ${item.quantity} of product ${product._id}`);
        }
      }
    }

    order.status = status;
    await order.save();

    console.log(`[updateOrderStatus] Order ${order._id} status set to "${status}"`);
    res.json({
      message: "Order status updated",
      order,
    });

  } catch (error) {
    console.error("updateOrderStatus error:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// GET USER ORDERS
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate("items.product")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error("getMyOrders error:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

// GET ALL ORDERS (ADMIN ONLY)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("items.product", "name price")
      .sort({ createdAt: -1 });

    // Attach payment method to each order so admin knows COD vs UPI
    const ordersWithPayment = await Promise.all(orders.map(async (order) => {
      const payment = await Payment.findOne({ order: order._id }).select("method status");
      const obj = order.toObject();
      obj.paymentMethod = payment ? payment.method : "cod";
      obj.paymentStatus = payment ? payment.status : "pending_cod";
      return obj;
    }));

    res.json(ordersWithPayment);
  } catch (error) {
    console.error("getAllOrders error:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
};