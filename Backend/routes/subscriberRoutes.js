const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");
const { addSubscriber, getSubscribers } = require("../controllers/subscriberController");

router.post("/", addSubscriber);
router.get("/", authMiddleware, isAdmin, getSubscribers);

module.exports = router;
