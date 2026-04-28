# 🖊️ Ink and Paper

> Your one-stop destination for stationery, art & craft supplies, and school & office essentials.

---

## 📖 About

**Ink and Paper** is an online stationery shop that brings together everything you need — whether you're a student, artist, professional, or just someone who loves beautiful stationery. We stock a carefully curated range of general stationery, art & craft supplies, and school & office products to keep you inspired and organized.

---

## 🛍️ Product Categories

- **General Stationery** — Notebooks, journals, pens, pencils, sticky notes, planners, and more.
- **Art & Craft Supplies** — Sketchbooks, watercolors, markers, brushes, washi tape, craft paper, and tools for every creative project.
- **School & Office Supplies** — Folders, binders, staplers, rulers, correction tools, sticky notes, and everything to keep your workspace sorted.

---

## ✨ Features

- 🗂️ Wide product catalog across multiple categories
- 🔍 Easy search and filter by category, brand, or price
- 🛒 Simple and secure checkout process
- 📦 Fast and reliable shipping
- 💬 Customer support via email and chat

---

## 🚀 Getting Started

### Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or above)
- [npm](https://www.npmjs.com/)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ink-and-paper.git

# Navigate into the Backend directory
cd ink-and-paper/Backend

# Install dependencies
npm install

# Set up your environment variables
cp .env.example .env

# Start the server
node server.js
```

The backend server will start at `http://localhost:5000` (or your configured port).

Then open `Frontend/index.html` in your browser, or serve the `Frontend/` folder using a local server to view the full app.

---

## 📁 Project Structure

```
ink-and-paper/
├── Backend/
│   ├── config/                  # Database and app configuration
│   ├── controllers/             # Route handler logic
│   ├── middleware/              # Auth and other middleware
│   ├── models/                  # Database models / schemas
│   ├── public/images/products/  # Uploaded product images
│   ├── routes/                  # API route definitions
│   ├── node_modules/
│   ├── .env                     # Environment variables
│   ├── package.json
│   ├── package-lock.json
│   └── server.js                # Entry point for the backend
│
├── Categories wise Product/     # Product data organized by category
│
├── Frontend/
│   ├── css/                     # Stylesheets
│   ├── js/                      # Client-side JavaScript
│   ├── admin.html               # Admin dashboard
│   ├── cart.html                # Shopping cart
│   ├── checkout.html            # Checkout page
│   ├── faq.html                 # FAQ page
│   ├── index.html               # Homepage
│   ├── login.html               # Login page
│   ├── orders.html              # Order history
│   ├── privacy.html             # Privacy policy
│   ├── product.html             # Product detail page
│   ├── profile.html             # User profile
│   ├── returns.html             # Returns policy
│   ├── shipping.html            # Shipping info
│   ├── shop.html                # Shop / product listing
│   ├── terms.html               # Terms & conditions
│   ├── track.html               # Order tracking
│   └── wishlist.html            # Wishlist page
│
└── Product list.txt             # Master product list
```

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory based on `.env.example`:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
DATABASE_URL=your_database_url
STRIPE_SECRET_KEY=your_stripe_key
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "Add your message"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

---

## 📬 Contact

Have a question or suggestion? Reach out to us:

- 📧 Email: inkandpaper97@gmail.com
- 🌐 Website: https://stationery-ecommerce-platform-1.onrender.com

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ by the Ink and Paper team</p>
