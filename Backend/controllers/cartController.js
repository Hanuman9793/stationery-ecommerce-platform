const User = require("../models/User");

// ADD TO CART
const Product = require("../models/Product");

exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;

    // 🔴 VALIDATION
    if (!productId || !quantity) {
      return res.status(400).json({ message: "ProductId and quantity required" });
    }

    if (quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0" });
    }

    // Check product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const user = await User.findById(req.user._id);

    const existingItem = user.cart.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      user.cart.push({ product: productId, quantity });
    }

    await user.save();

    res.json({ message: "Item added to cart", cart: user.cart });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET CART
exports.getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate("cart.product");

    // Filter out items where product was deleted/not found
    const originalCount = user.cart.length;
    const filteredCart = user.cart.filter((item) => item.product !== null);

    // If some items were filtered out, save the cleaned cart back to the database
    if (filteredCart.length !== originalCount) {
      user.cart = filteredCart;
      await user.save();
    }

    res.json(filteredCart);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE CART ITEM QUANTITY
exports.updateCart = async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const user = await User.findById(req.user._id);

    const existingItem = user.cart.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity = quantity;
      await user.save();
      res.json({ message: "Cart updated", cart: user.cart });
    } else {
      res.status(404).json({ message: "Item not found in cart" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// REMOVE FROM CART
exports.removeFromCart = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const { productId } = req.body;

    user.cart = user.cart.filter(
      (item) => item.product.toString() !== productId
    );

    await user.save();

    res.json({ message: "Item removed", cart: user.cart });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};