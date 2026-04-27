const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: String,
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: String
}, { timestamps: true });

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    category: {
      type: String,
    },
    image: {
      type: String,
    },
    stock: {
      type: Number,
      default: 0,
    },
    reviews: [reviewSchema],

    numReviews: {
      type: Number,
      default: 0
    },

    rating: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);