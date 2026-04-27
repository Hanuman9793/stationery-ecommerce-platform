const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
console.log("ENV CHECK:", process.env.MONGO_URI);

const connectDB = require("./config/db");

const app = express();
const authMiddleware = require("./middleware/authMiddleware");

// Connect DB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/images", express.static(path.join(__dirname, "public", "images")));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/cart", require("./routes/cartRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/reviews", require("./routes/reviewRoutes"));
app.use("/api/wishlist", require("./routes/wishlistRoutes"));
app.use("/api/coupons", require("./routes/couponRoutes"));
app.use("/api/payments", require("./routes/paymentRoutes"));
app.use("/api/subscribers", require("./routes/subscriberRoutes"));
app.use("/api/delivery", require("./routes/deliveryRoutes"));
app.use(express.static(path.join(__dirname, "Frontend")));
// Test route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Frontend", "index.html"));
});
app.get("/api/profile", authMiddleware, (req, res) => {
  res.json({
    message: "Protected data",
    user: req.user,
  });
});

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));