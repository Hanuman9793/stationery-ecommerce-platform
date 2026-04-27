if (!isAuthenticated()) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    loadOrders();
});

const statusFlow = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered"];

async function loadOrders() {
    const loading = document.getElementById('loading');
    const container = document.getElementById('orders-container');
    const emptyState = document.getElementById('empty-state');
    const errorMsg = document.getElementById('error-message');

    try {
        const orders = await fetchAPI('/orders');
        loading.style.display = 'none';

        if (!orders || orders.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        container.innerHTML = '';
        
        // sort newest first
        orders.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

        orders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString() + ' ' + new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            const card = document.createElement('div');
            card.className = 'order-card';
            
            // Build Items
            let itemsHtml = '';
            order.items.forEach(item => {
                const p = item.product || {};
                const img = p.image || 'https://via.placeholder.com/50?text=No+Image';
                const name = sanitizeHTML(p.name || 'Product unavailable');
                
                itemsHtml += `
                    <div class="order-item" onclick="window.location.href='product.html?id=${p._id}'" style="cursor:pointer; transition:background 0.2s;" onmouseover="this.style.background='var(--bg-surface-hover)'" onmouseout="this.style.background='transparent'" title="View ${name}">
                        <img src="${img}" alt="img" class="order-item-img" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1529539795054-3c162aab037a?auto=format&fit=crop&w=500&q=80';">
                        <div class="order-item-details">
                            <div style="font-weight: 500;">${name}</div>
                            <div class="text-muted" style="font-size:0.85rem">Qty: ${item.quantity}</div>
                        </div>
                    </div>
                `;
            });

            // Status Timeline or Cancellation Notice
            let statusBannerHtml = '';
            if (order.status === 'Out of delivery area') {
                statusBannerHtml = `
                    <div style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; padding: 1.5rem; border-radius: 12px; text-align: center; margin-top: 1.5rem; font-weight: 500;">
                        <i class="fas fa-exclamation-circle" style="margin-right:8px; font-size:1.1rem"></i>
                        <span style="letter-spacing:0.02em">ORDER CANCELLED: Out of delivery area</span>
                        <p style="font-size:0.8rem; color:var(--text-muted); margin-top:5px; font-weight:400">Your order has been cancelled because the location is outside our current logistics range. Any payments made will be refunded.</p>
                    </div>
                `;
            } else {
                const currentIndex = statusFlow.indexOf(order.status);
                statusBannerHtml = '<div class="timeline">';
                statusFlow.forEach((step, idx) => {
                    const isActive = idx <= currentIndex ? 'active' : '';
                    const icon = getStepIcon(step);
                    statusBannerHtml += `
                        <div class="timeline-step ${isActive}">
                            <div class="timeline-circle"><i class="${icon}"></i></div>
                            <div class="timeline-label">${step}</div>
                        </div>
                    `;
                });
                statusBannerHtml += '</div>';
            }

            card.innerHTML = `
                <div class="order-header">
                    <div>
                        <div class="order-id">Order #${order._id.substring(18).toUpperCase()}</div>
                        <div class="order-date">${date}</div>
                    </div>
                    <div style="text-align:right;">
                        <div class="order-total">₹${order.totalPrice.toFixed(2)}</div>
                        <div class="text-muted" style="font-size:0.85rem">Ship to: ${sanitizeHTML(order.shippingAddress?.city || 'Address info')}</div>
                    </div>
                </div>
                <div class="order-items">
                    ${itemsHtml}
                </div>
                ${statusBannerHtml}
            `;
            
            // Link to fetch payment context and render any UPI rejection notice (advanced UI detail)
            // But tracking flow via timeline covers 90% of order state gracefully.

            container.appendChild(card);
        });

    } catch (err) {
        loading.style.display = 'none';
        errorMsg.innerText = err.message || 'Failed to load orders.';
    }
}

function getStepIcon(step) {
    if(step === 'Placed') return 'fas fa-receipt';
    if(step === 'Confirmed') return 'fas fa-check-circle';
    if(step === 'Packed') return 'fas fa-box';
    if(step === 'Shipped') return 'fas fa-truck';
    if(step === 'Delivered') return 'fas fa-home';
    return 'fas fa-circle';
}

function sanitizeHTML(str) {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}
