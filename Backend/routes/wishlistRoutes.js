const express = require("express");
const {
  addToWishlist,
  removeFromWishlist,
  getWishlist
} = require("../controllers/wishlistController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// all routes are protected
router.post("/add", authMiddleware, addToWishlist);
router.delete("/remove/:productId", authMiddleware, removeFromWishlist);
router.get("/", authMiddleware, getWishlist);

module.exports = router;