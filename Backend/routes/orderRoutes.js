const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getMyOrders,
  updateOrderStatus,
  getAllOrders
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");

// ⚠️ Specific routes MUST come before wildcard routes in Express
router.post("/", authMiddleware, placeOrder);
router.get("/", authMiddleware, getMyOrders);
router.get("/all", authMiddleware, isAdmin, getAllOrders);
router.put("/:id", authMiddleware, isAdmin, updateOrderStatus);

module.exports = router;