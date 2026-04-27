const express = require("express");
const router = express.Router();

const {
  addToCart,
  getCart,
  removeFromCart,
  updateCart
} = require("../controllers/cartController");

const authMiddleware = require("../middleware/authMiddleware");

// Routes
router.post("/add", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart);
router.put("/update", authMiddleware, updateCart);
router.post("/remove", authMiddleware, removeFromCart);

module.exports = router;