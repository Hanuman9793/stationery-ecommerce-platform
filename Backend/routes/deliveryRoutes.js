const express = require("express");
const router = express.Router();
const { checkDeliveryDistance } = require("../controllers/deliveryController");
const authMiddleware = require("../middleware/authMiddleware");

// Delivery check route (protected to prevent API abuse)
router.post("/check", authMiddleware, checkDeliveryDistance);

module.exports = router;
