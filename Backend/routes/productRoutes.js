const express = require("express");
const router = express.Router();

const {
  addProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  createProductReview,
  getRecentReviews
} = require("../controllers/productController");


// Routes
const authMiddleware = require("../middleware/authMiddleware");
const { isAdmin } = require("../middleware/adminMiddleware");


router.post("/", authMiddleware, isAdmin, addProduct);
router.get("/reviews/recent", getRecentReviews); // Above /:id to prevent bypass
router.get("/", getProducts);        
router.get("/:id", getProductById);  
router.put("/:id", authMiddleware, isAdmin, updateProduct);
router.delete("/:id", authMiddleware, isAdmin, deleteProduct);
router.post("/:id/reviews", authMiddleware, createProductReview);

module.exports = router;