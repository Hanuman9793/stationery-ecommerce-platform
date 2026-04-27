const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('id');

let maxStock = 1;

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    if (!productId) {
        document.getElementById('error-message').innerText = 'No product specified.';
        document.getElementById('loading').style.display = 'none';
        return;
    }
    loadProduct();

    // Setup QTY controls
    const qtyInput = document.getElementById('qty');
    document.getElementById('qty-minus').addEventListener('click', () => {
        let val = parseInt(qtyInput.value);
        if (val > 1) qtyInput.value = val - 1;
    });
    document.getElementById('qty-plus').addEventListener('click', () => {
        let val = parseInt(qtyInput.value);
        if (val < maxStock) qtyInput.value = val + 1;
    });

    // Actions
    document.getElementById('btn-add-cart').addEventListener('click', handleAddToCart);
    document.getElementById('btn-wishlist').addEventListener('click', handleAddToWishlist);

    // Review form setup
    if (isAuthenticated()) {
        document.getElementById('add-review-box').style.display = 'block';
        document.getElementById('review-form').addEventListener('submit', handleReviewSubmit);
    }
});

async function loadProduct() {
    try {
        const p = await fetchAPI(`/products/${productId}`);

        document.title = `${p.name} | Stationery Shop`;
        document.getElementById('p-name').innerText = p.name;
        document.getElementById('p-cat').innerText = p.category || 'General';
        document.getElementById('p-price').innerText = `₹${p.price.toFixed(2)}`;
        document.getElementById('p-desc').innerText = p.description || '';
        document.getElementById('p-img').src = p.image
            ? p.image
            : 'https://via.placeholder.com/600?text=No+Image';
        document.getElementById('p-img').alt = p.name;

        // Stock handling
        maxStock = p.stock;
        const stockBadge = document.getElementById('p-stock');
        const cartBtn = document.getElementById('btn-add-cart');

        if (p.stock > 0) {
            stockBadge.innerText = `In Stock (${p.stock})`;
            stockBadge.className = 'stock-badge';
        } else {
            stockBadge.innerText = 'Out of Stock';
            stockBadge.className = 'stock-badge out';
            cartBtn.disabled = true;
            cartBtn.style.opacity = '0.5';
            cartBtn.style.cursor = 'not-allowed';
            cartBtn.innerText = 'Out of Stock';
            document.getElementById('qty').disabled = true;
        }

        // Ratings header
        document.getElementById('p-stars').innerHTML = generateStars(p.rating);
        document.getElementById('p-ratings-count').innerText = `(${p.numReviews} review${p.numReviews !== 1 ? 's' : ''})`;

        // Load Reviews array
        renderReviews(p.reviews);

        document.getElementById('loading').style.display = 'none';
        document.getElementById('product-content').style.display = 'block';

    } catch (err) {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error-message').innerText = err.message || 'Product not found';
    }
}

function renderReviews(reviews) {
    const list = document.getElementById('reviews-container');
    if (!reviews || reviews.length === 0) {
        list.innerHTML = '<p class="text-muted">No reviews yet. Be the first to review!</p>';
        return;
    }

    list.innerHTML = '';
    // Sort by newest first
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    reviews.forEach(r => {
        const date = new Date(r.createdAt || Date.now()).toLocaleDateString();

        const card = document.createElement('div');
        card.className = 'review-card';
        card.innerHTML = `
            <div class="review-header">
                <div>
                    <div class="review-author">${sanitizeHTML(r.name || 'Anonymous')}</div>
                    <div class="text-gold" style="font-size: 0.85rem">${generateStars(r.rating)}</div>
                </div>
                <div class="review-date">${date}</div>
            </div>
            <div class="mt-1">${sanitizeHTML(r.comment)}</div>
        `;
        list.appendChild(card);
    });
}

function generateStars(rating) {
    let result = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) result += '<i class="fas fa-star"></i>';
        else if (i - 0.5 <= rating) result += '<i class="fas fa-star-half-alt"></i>';
        else result += '<i class="far fa-star"></i>';
    }
    return result;
}

function sanitizeHTML(str) {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

async function handleAddToCart() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    const qty = parseInt(document.getElementById('qty').value);
    const btn = document.getElementById('btn-add-cart');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    btn.disabled = true;

    try {
        await fetchAPI('/cart/add', {
            method: 'POST',
            body: { productId, quantity: qty }
        });
        showToast('Item added to cart!');
        updateCartCount();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function handleAddToWishlist() {
    if (!isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }
    const btn = document.getElementById('btn-wishlist');

    try {
        await fetchAPI('/wishlist/add', {
            method: 'POST',
            body: { productId }
        });
        showToast('Added to wishlist!');
        btn.innerHTML = '<i class="fas fa-heart" style="color:var(--danger)"></i>';
    } catch (err) {
        if (err.message.includes('already')) {
            showToast('Product already in wishlist', 'error');
        } else {
            showToast(err.message, 'error');
        }
    }
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const rating = document.getElementById('review-rating').value;
    const comment = document.getElementById('review-comment').value;
    const errorDiv = document.getElementById('review-error');
    const btn = document.getElementById('submit-review-btn');

    btn.disabled = true;
    errorDiv.innerText = '';

    try {
        await fetchAPI(`/products/${productId}/reviews`, {
            method: 'POST',
            body: { rating, comment }
        });
        showToast('Review submitted successfully!');

        // Reload to show the new review
        setTimeout(() => location.reload(), 1000);
    } catch (err) {
        errorDiv.innerText = err.message;
        btn.disabled = false;
    }
}
