const Coupon = require("../models/Coupon");

// ✅ Create Coupon (Admin Only)
const createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscount,
      expiresAt,
      usageLimit,
    } = req.body;

    if (!code || !discountType || !discountValue || !expiresAt) {
      return res
        .status(400)
        .json({ message: "code, discountType, discountValue, expiresAt are required" });
    }

    if (!["percentage", "flat"].includes(discountType)) {
      return res
        .status(400)
        .json({ message: "discountType must be 'percentage' or 'flat'" });
    }

    if (discountType === "percentage" && discountValue > 100) {
      return res
        .status(400)
        .json({ message: "Percentage discount cannot exceed 100" });
    }

    const existing = await Coupon.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "Coupon code already exists" });
    }

    const coupon = await Coupon.create({
      code,
      discountType,
      discountValue,
      minOrderAmount: minOrderAmount || 0,
      maxDiscount: maxDiscount || null,
      expiresAt,
      usageLimit: usageLimit || null,
    });

    res.status(201).json({ message: "Coupon created", coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Apply / Validate Coupon
const applyCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;

    if (!code || !orderAmount) {
      return res
        .status(400)
        .json({ message: "code and orderAmount are required" });
    }

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ message: "Coupon is no longer active" });
    }

    if (new Date() > new Date(coupon.expiresAt)) {
      return res.status(400).json({ message: "Coupon has expired" });
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    if (orderAmount < coupon.minOrderAmount) {
      return res.status(400).json({
        message: `Minimum order amount is ₹${coupon.minOrderAmount}`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscount) {
        discount = Math.min(discount, coupon.maxDiscount);
      }
    } else {
      discount = coupon.discountValue;
    }

    discount = Math.min(discount, orderAmount); // can't discount more than total
    const finalAmount = orderAmount - discount;

    res.json({
      message: "Coupon applied successfully",
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: discount,
      originalAmount: orderAmount,
      finalAmount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get All Coupons (Admin Only)
const getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Deactivate Coupon (Admin Only)
const deactivateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    coupon.isActive = false;
    await coupon.save();

    res.json({ message: "Coupon deactivated", coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete Coupon (Admin Only)
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.json({ message: "Coupon deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCoupon,
  applyCoupon,
  getAllCoupons,
  deactivateCoupon,
  deleteCoupon,
};
