const Product = require("../models/Product");

// ADD PRODUCT
exports.addProduct = async (req, res) => {
  try {
    const { name, price, description, category, image, stock } = req.body;

    // 🔴 VALIDATION
    if (!name || !price) {
      return res.status(400).json({ message: "Name and price are required" });
    }

    if (price <= 0) {
      return res.status(400).json({ message: "Price must be greater than 0" });
    }

    if (stock < 0) {
      return res.status(400).json({ message: "Stock cannot be negative" });
    }

    const product = new Product({
      name,
      price,
      description,
      category,
      image,
      stock,
    });

    await product.save();

    // Notify via FormSubmit to Marshal
    try {
        fetch("https://formsubmit.co/ajax/marshal9793@gmail.com", {
            method: "POST",
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ 
                _subject: "New Product Added!", 
                message: `Product ${name} was just added. Price: ${price}`
            })
        });
        console.log("FormSubmit triggered for new product notification.");
    } catch(err) {
        console.log("Error triggering email:", err);
    }

    res.status(201).json({
      message: "Product added",
      product,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      page = 1,
      limit = 5,
      sort
    } = req.query;

    let filter = {};

    // 🔍 SEARCH
    if (keyword) {
      filter.name = { $regex: keyword, $options: "i" };
    }

    // 📂 CATEGORY (Case-insensitive & handles basic singular/plural)
    if (category) {
      const baseCat = category.replace(/s$/i, ''); // e.g., 'Pens' -> 'Pen'
      filter.category = { $regex: baseCat, $options: "i" };
    }

    // 💰 PRICE
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // ⭐ RATING
    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    // 📦 STOCK
    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // 📊 PAGINATION
    const skip = (page - 1) * limit;

    // 🔽 SORTING
    let sortOption = {};
    if (sort === "price_asc") sortOption.price = 1;
    if (sort === "price_desc") sortOption.price = -1;

    const products = await Product.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    res.json({
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      products,
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET SINGLE PRODUCT
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PRODUCT STOCK/INFO
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product updated", product });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET RECENT REVIEWS (For Homepage Testimonials)
exports.getRecentReviews = async (req, res) => {
  try {
    // Find all products that have at least one review
    const products = await Product.find({ "reviews.0": { $exists: true } });
    let allReviews = [];
    
    products.forEach(p => {
      p.reviews.forEach(r => {
        allReviews.push({ 
          ...r.toObject(), 
          productName: p.name, 
          productId: p._id 
        });
      });
    });
    
    // Sort descending by date
    allReviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get top 3 latest positive reviews
    const topReviews = allReviews.filter(r => r.rating >= 4).slice(0, 3);
    
    res.json(topReviews);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ADD PRODUCT REVIEW
exports.createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🔴 REQUIRE PURCHASE VALIDATION
    const Order = require("../models/Order");
    const hasPurchased = await Order.findOne({
      user: req.user._id,
      "items.product": product._id,
      status: { $in: ["Confirmed", "Packed", "Shipped", "Delivered"] }
    });

    if (!hasPurchased) {
      return res.status(403).json({ message: "Only verified buyers can leave a review for this product." });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      r => r.user.toString() === req.user._id.toString()
    );
    if (alreadyReviewed) {
      return res.status(400).json({ message: "You have already reviewed this product" });
    }

    const review = {
      name: req.user.name,
      rating: Number(rating),
      comment,
      user: req.user._id,
    };

    product.reviews.push(review);
    product.numReviews = product.reviews.length;
    product.rating = product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};