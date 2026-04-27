const Product = require("../models/Product");

// ✅ Add Review
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const productId = req.params.productId;
    const userId = req.user.id;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // ❌ Prevent duplicate review
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === userId
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: "You already reviewed this product" });
    }

    const review = {
      user: userId,
      name: req.user.name,
      rating: Number(rating),
      comment
    };

    product.reviews.push(review);

    // ✅ Update stats
    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();

    res.json({ message: "Review added successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get All Reviews of Product
const getReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId)
      .populate("reviews.user", "username");

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({
      reviews: product.reviews,
      rating: product.rating,
      numReviews: product.numReviews
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Delete Review (only owner or admin)
const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    const userId = req.user.id;

    const product = await Product.findById(productId);

    const review = product.reviews.id(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // ❌ Only owner or admin
    if (review.user.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // remove review
    product.reviews.pull(reviewId);

    // recalc stats
    product.numReviews = product.reviews.length;

    product.rating =
      product.reviews.length === 0
        ? 0
        : product.reviews.reduce((acc, item) => acc + item.rating, 0) /
          product.reviews.length;

    await product.save();

    res.json({ message: "Review deleted" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  addReview,
  getReviews,
  deleteReview
};