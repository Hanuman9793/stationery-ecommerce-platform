const express = require("express");
const {
  addReview,
  getReviews,
  deleteReview
} = require("../controllers/reviewController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/:productId", authMiddleware, addReview);
router.get("/:productId", getReviews);
router.delete("/:productId/:reviewId", authMiddleware, deleteReview);

module.exports = router;