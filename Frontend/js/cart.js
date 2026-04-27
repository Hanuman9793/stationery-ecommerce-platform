if (!isAuthenticated()) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    loadCart();
});

async function loadCart() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('cart-content');
    const emptyState = document.getElementById('empty-state');
    const container = document.getElementById('cart-items-container');

    try {
        const cart = await fetchAPI('/cart');
        loading.style.display = 'none';

        if (!cart || cart.length === 0) {
            emptyState.style.display = 'block';
            content.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        content.style.display = 'grid';
        container.innerHTML = '';

        let subtotal = 0;
        let totalItems = 0;

        cart.forEach(item => {
            const p = item.product;
            if(!p) return; // safety
            
            const itemTotal = p.price * item.quantity;
            subtotal += itemTotal;
            totalItems += item.quantity;

            const imgUrl = p.image || 'https://via.placeholder.com/150?text=No+Image';

            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <img src="${imgUrl}" alt="${sanitizeHTML(p.name)}" class="cart-item-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1529539795054-3c162aab037a?auto=format&fit=crop&w=500&q=80';">
                <div class="cart-item-info">
                    <a href="product.html?id=${p._id}"><h3 style="color:var(--text-main);">${sanitizeHTML(p.name)}</h3></a>
                    <div style="color:var(--text-muted);font-size:0.9rem;">Price: ₹${p.price.toFixed(2)}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="remove-btn" onclick="removeFromCart('${p._id}')" aria-label="Remove item" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                    <div style="font-weight:bold;margin-top:20px;">Qty: ${item.quantity}</div>
                    <div class="cart-item-price" style="margin-top:5px;">₹${itemTotal.toFixed(2)}</div>
                </div>
            `;
            container.appendChild(div);
        });

        document.getElementById('cart-count').innerText = totalItems;
        document.getElementById('cart-subtotal').innerText = `₹${subtotal.toFixed(2)}`;
        document.getElementById('cart-total').innerText = `₹${subtotal.toFixed(2)}`;

        // We could store the cart subtotal in session storage for the checkout page
        sessionStorage.setItem('checkoutTotal', subtotal);

    } catch (err) {
        loading.style.display = 'none';
        document.getElementById('error-message').innerText = err.message;
    }
}

async function removeFromCart(productId) {
    try {
        await fetchAPI('/cart/remove', {
            method: 'POST', // Backend route uses POST for remove
            body: { productId }
        });
        showToast('Item removed from cart');
        updateCartCount();
        loadCart(); // reload UI
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function sanitizeHTML(str) {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}
