const express = require("express");
const router = express.Router();

const {
  createCoupon,
  applyCoupon,
  getAllCoupons,
  deactivateCoupon,
  deleteCoupon,
} = require("../controllers/couponController");

const authMiddleware = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

// Public: apply coupon (needs login to know order total context)
router.post("/apply", authMiddleware, applyCoupon);

// Admin only
router.post("/", authMiddleware, isAdmin, createCoupon);
router.get("/", authMiddleware, isAdmin, getAllCoupons);
router.patch("/:id/deactivate", authMiddleware, isAdmin, deactivateCoupon);
router.delete("/:id", authMiddleware, isAdmin, deleteCoupon);

module.exports = router;
