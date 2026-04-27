const User = require("../models/User.js");
const Product = require("../models/Product.js");

// ✅ Add to Wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.body;

    // check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ FIXED duplicate check
    if (user.wishlist.some(item => item.toString() === productId)) {
      return res.status(400).json({ message: "Product already in wishlist" });
    }

    user.wishlist.push(productId);
    await user.save();

    res.json({ message: "Added to wishlist", wishlist: user.wishlist });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Remove from Wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.wishlist = user.wishlist.filter(
      (item) => item.toString() !== productId
    );

    await user.save();

    res.json({ message: "Removed from wishlist", wishlist: user.wishlist });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get Wishlist
const getWishlist = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate("wishlist");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Filter out items where product was deleted/not found
    const filteredWishlist = user.wishlist.filter((item) => item !== null);

    // If some items were filtered out, save the cleaned wishlist back to the database
    if (filteredWishlist.length !== user.wishlist.length) {
      user.wishlist = filteredWishlist;
      await user.save();
    }

    res.json({ wishlist: filteredWishlist });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addToWishlist, removeFromWishlist, getWishlist };