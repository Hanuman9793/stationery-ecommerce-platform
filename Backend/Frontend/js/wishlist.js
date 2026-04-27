if (!isAuthenticated()) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    loadWishlist();
});

async function loadWishlist() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('wishlist-container');
    const emptyState = document.getElementById('empty-state');
    const errorMsg = document.getElementById('error-message');

    try {
        const data = await fetchAPI('/wishlist');
        const wishlist = data.wishlist || [];

        loading.style.display = 'none';

        if (wishlist.length === 0) {
            emptyState.style.display = 'block';
            container.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        container.style.display = 'grid';
        container.innerHTML = '';

        wishlist.forEach(p => {
            if (!p) return; // Skip if product reference is missing

            const card = document.createElement('div');
            card.className = 'glass-card product-card';
            
            const imgUrl = p.image || 'https://via.placeholder.com/300?text=No+Image';

            card.innerHTML = `
                <a href="product.html?id=${p._id}" class="product-image-container">
                    <img src="${imgUrl}" alt="${sanitizeHTML(p.name)}" class="product-image" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1529539795054-3c162aab037a?auto=format&fit=crop&w=500&q=80';">
                </a>
                <div class="product-info">
                    <a href="product.html?id=${p._id}"><h3 class="product-name" style="font-size:1rem;">${sanitizeHTML(p.name)}</h3></a>
                    <div class="product-price">₹${p.price.toFixed(2)}</div>
                    
                    <div style="margin-top:auto">
                        <button onclick="moveToCart('${p._id}', ${p.stock})" class="btn btn-primary remove-wishlist-btn" ${p.stock <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> ${p.stock > 0 ? 'Move to Cart' : 'Out of Stock'}
                        </button>
                        <button onclick="removeFromWishlist('${p._id}')" class="btn btn-outline remove-wishlist-btn text-danger" style="border-color:var(--danger)">
                            <i class="fas fa-trash"></i> Remove
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        loading.style.display = 'none';
        errorMsg.innerText = err.message;
    }
}

async function removeFromWishlist(productId) {
    try {
        await fetchAPI(`/wishlist/remove/${productId}`, {
            method: 'DELETE'
        });
        showToast('Removed from wishlist');
        loadWishlist(); // reload
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function moveToCart(productId, stock) {
    if (stock <= 0) return;
    try {
        // Add to cart
        await fetchAPI('/cart/add', {
            method: 'POST',
            body: { productId, quantity: 1 }
        });
        
        // Remove from wishlist
        await fetchAPI(`/wishlist/remove/${productId}`, {
            method: 'DELETE'
        });

        showToast('Moved to cart!');
        updateCartCount();
        loadWishlist(); // reload grid

    } catch (err) {
        showToast(err.message, 'error');
    }
}

function sanitizeHTML(str) {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}
