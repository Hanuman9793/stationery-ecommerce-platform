const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    // Only COD and UPI supported
    method: {
      type: String,
      enum: ["cod", "upi"],
      required: true,
    },

    // ─── UPI-specific ────────────────────────────────────────────────────────
    // The shop's UPI ID that was shown to the customer at checkout
    shopUpiId: {
      type: String,
    },

    // UTR = Unique Transaction Reference (12-digit string from user's UPI app)
    // Customer submits this after they complete the UPI transfer
    utrNumber: {
      type: String,
      trim: true,
    },

    // ─── Status ──────────────────────────────────────────────────────────────
    // pending_cod        → COD order placed, payment due on delivery
    // pending_verification → UPI payment submitted, waiting for admin to verify UTR
    // confirmed          → Admin verified UPI payment (or COD marked collected)
    // failed             → Payment failed / UTR rejected by admin
    // refunded           → Admin issued a refund
    status: {
      type: String,
      enum: [
        "pending_cod",
        "pending_verification",
        "confirmed",
        "failed",
        "refunded",
      ],
      default: "pending_cod",
    },

    // Coupon discount info (stored for record-keeping)
    couponApplied: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    originalAmount: {
      type: Number,
    },

    // Timestamp when payment was confirmed
    paidAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
