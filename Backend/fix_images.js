const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const DB_URI = 'mongodb+srv://marshal9793_db_user:MtnwoNyj9LE0hfa1@cluster0.u7bhvw2.mongodb.net/?appName=Cluster0';
const OLD_IMG_DIR = path.join(__dirname, 'images', 'images', 'products');
const NEW_IMG_DIR = path.join(__dirname, 'images', 'products');

async function fixImages() {
  try {
    // Create new directory if it doesn't exist
    if (!fs.existsSync(NEW_IMG_DIR)) {
      fs.mkdirSync(NEW_IMG_DIR, { recursive: true });
    }

    await mongoose.connect(DB_URI);
    const Product = require('./models/Product');
    
    // Get all products sorted by insertion order
    const products = await Product.find().sort('_id');
    console.log(`Found ${products.length} products in DB.`);

    // Get all physical images sorted by name (which acts as creation time due to ObjectID in name)
    const files = fs.readdirSync(OLD_IMG_DIR)
      .filter(f => f.endsWith('.png') || f.endsWith('.webp') || f.endsWith('.jpg'))
      .sort();
    console.log(`Found ${files.length} images in ${OLD_IMG_DIR}.`);

    if (products.length !== files.length) {
      console.error('Mismatch in count! Cannot safely map 1:1.');
      process.exit(1);
    }

    let renamedCount = 0;
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      const oldFile = files[i];
      
      // Keep the original extension
      const ext = path.extname(oldFile);
      const newFile = `prod_${product._id}${ext}`;
      
      const oldPath = path.join(OLD_IMG_DIR, oldFile);
      const newPath = path.join(NEW_IMG_DIR, newFile);
      
      fs.renameSync(oldPath, newPath);
      renamedCount++;
    }

    console.log(`Successfully moved and renamed ${renamedCount} images.`);
    
    // Check if old directory is empty and remove it if possible
    const remainingFiles = fs.readdirSync(OLD_IMG_DIR);
    if (remainingFiles.length === 0) {
      fs.rmdirSync(OLD_IMG_DIR);
      console.log('Removed empty old directory.');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixImages();
