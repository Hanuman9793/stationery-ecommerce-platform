const express = require("express");
const router  = express.Router();

const {
  getUpiDetails,
  processPayment,
  confirmPayment,
  rejectPayment,
  getPaymentByOrder,
  getAllPayments,
  refundPayment,
} = require("../controllers/paymentController");

const authMiddleware = require("../middleware/authMiddleware");
const { isAdmin }   = require("../middleware/adminMiddleware");

// ── User routes ──────────────────────────────────────────────────────────────

// Get shop UPI details + amount for an order (before paying)
router.get("/upi-details/:orderId", authMiddleware, getUpiDetails);

// Submit payment (COD or UPI+UTR)
router.post("/", authMiddleware, processPayment);

// Get payment record for a specific order
router.get("/order/:orderId", authMiddleware, getPaymentByOrder);

// ── Admin routes ─────────────────────────────────────────────────────────────

// View all payments (supports ?status=pending_verification, ?method=upi)
router.get("/", authMiddleware, isAdmin, getAllPayments);

// Confirm a UPI payment after verifying the UTR number
router.patch("/:id/confirm", authMiddleware, isAdmin, confirmPayment);

// Reject a UPI payment (wrong/fake UTR)
router.patch("/:id/reject", authMiddleware, isAdmin, rejectPayment);

// Refund a confirmed payment
router.patch("/:id/refund", authMiddleware, isAdmin, refundPayment);

module.exports = router;
