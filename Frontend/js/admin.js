document.addEventListener('DOMContentLoaded', () => {
    // We already setup global navbar functions dynamically attached.
    try {
        setupNavbar();
    } catch (e) {
        console.error("Navbar setup skip in Admin:", e);
    }
    
    // Auth Check
    if (getRole() !== 'admin') {
        const errBox = document.getElementById('auth-error');
        if(errBox) errBox.style.display = 'block';
        setTimeout(() => window.location.href = 'index.html', 2000);
        return;
    }
    const dash = document.getElementById('admin-dashboard');
    if(dash) dash.style.display = 'grid';

    // Start with default tab
    loadAdminPayments();
    
    // Events
    const prodForm = document.getElementById('form-product');
    if(prodForm) prodForm.addEventListener('submit', handleCreateProduct);
    
    const coupForm = document.getElementById('form-coupon');
    if(coupForm) coupForm.addEventListener('submit', handleCreateCoupon);
});

// Tab Switcher
function switchAdminTab(tabId, el) {
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${tabId}`);
    if (tabEl) tabEl.classList.add('active');

    if (tabId === 'payments') loadAdminPayments();
    if (tabId === 'orders') loadAdminOrders();
    if (tabId === 'products') loadAdminProducts();
    if (tabId === 'coupons') loadAdminCoupons();
    if (tabId === 'subscribers') loadAdminSubscribers();
}

function openModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'flex';
}
function closeModal(id) {
    const m = document.getElementById(id);
    if (m) m.style.display = 'none';
}


// ============================================
// PAYMENTS VERIFICATION
// ============================================
async function loadAdminPayments() {
    const tbody = document.getElementById('tbl-payments');
    try {
        const payments = await fetchAPI('/payments');
        if (payments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No payments found.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        payments.forEach(p => {
            const date = new Date(p.createdAt).toLocaleDateString();
            let bClass = p.status === 'confirmed' ? 'verified' : (p.status === 'rejected' ? 'rejected' : 'pending');
            const st = p.status.replace('_', ' ').toUpperCase();

            let acts = '-';
            if (p.method === 'upi' && p.status === 'pending_verification') {
                acts = `
                    <div style="font-family:monospace; margin-bottom:5px; color:var(--accent-gold); letter-spacing:1px">UTR: ${p.utrNumber}</div>
                    <div class="action-btns">
                        <button class="action-btn success" title="Approve" onclick="verifyPayment('${p._id}', 'confirm')"><i class="fas fa-check"></i></button>
                        <button class="action-btn danger" title="Reject" onclick="verifyPayment('${p._id}', 'reject')"><i class="fas fa-times"></i></button>
                    </div>
                `;
            } else if (p.method === 'cod' && p.status === 'pending_cod') {
                acts = `
                    <div style="margin-bottom:5px; font-size:0.85rem;" class="text-muted">Unpaid (Cash on Delivery)</div>
                    <div class="action-btns">
                        <button class="action-btn success" title="Mark Paid" onclick="verifyPayment('${p._id}', 'confirm')"><i class="fas fa-check"></i></button>
                    </div>
                `;
            } else if (p.method === 'upi') {
                acts = `<div class="text-muted" style="font-family:monospace; font-size:0.85rem">UTR: ${p.utrNumber}</div>`;
            } else if (p.method === 'cod') {
                acts = `<div class="text-muted" style="font-size:0.85rem"><i class="fas fa-check-circle text-success"></i> Paid on Delivery</div>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="text-transform:uppercase">${p.method}</strong></td>
                <td><span class="text-gold" style="font-weight:800">₹${p.amount.toFixed(2)}</span></td>
                <td><span class="badge ${bClass}">${st}</span></td>
                <td>${date}</td>
                <td>${acts}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

async function verifyPayment(id, action) {
    if (!confirm(`Confirm you want to ${action.toUpperCase()} this payment?`)) return;
    try {
        await fetchAPI(`/payments/${id}/${action}`, { method: 'PATCH' });
        showToast(`Payment ${action}ed successfully.`);
        loadAdminPayments();
    } catch (err) {
        showToast(err.message, 'error');
    }
}


// ============================================
// ORDERS MANAGEMENT
// ============================================
async function loadAdminOrders() {
    const tbody = document.getElementById('tbl-orders');
    try {
        const orders = await fetchAPI('/orders/all');
        tbody.innerHTML = '';
        if(orders.length === 0) return tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No orders.</td></tr>';
        
        const validFlow = ["Placed", "Confirmed", "Packed", "Shipped", "Delivered", "Out of delivery area"];

        orders.forEach(o => {
            const tr = document.createElement('tr');
            
            // Status Pill + Dropdown
            const cleanStatus = (o.status || 'Placed');
            const statusClass = cleanStatus.toLowerCase().replace(/\s+/g, '-');
            
            let dropHtml = `
                <div class="status-pill status-${statusClass}">${cleanStatus}</div>
                <select class="status-dropdown" data-order-id="${o._id}" data-payment-method="${o.paymentMethod || 'cod'}" onchange="handleOrderStatus(this, '${o._id}', this.value)">
            `;
            validFlow.forEach(status => {
                const sel = status === cleanStatus ? 'selected' : '';
                dropHtml += `<option value="${status}" ${sel}>${status}</option>`;
            });
            dropHtml += `</select>`;

            const customerName = o.user ? o.user.name : 'Guest';
            const customerEmail = o.user ? o.user.email : 'Unknown';
            
            const shipping = o.shippingAddress || {};
            const addressText = shipping.address || 'No address provided';
            const cityZip = shipping.city ? `${shipping.city} - ${shipping.pincode || ''}` : '';
            const phoneText = shipping.phone || 'No phone';

            // Items list as Chips
            let itemsHtml = (o.items || []).map(item => {
                const name = item.product ? item.product.name : 'Unknown Product';
                return `<div class="prod-chip">${name} <span class="text-muted" style="margin-left:4px; font-weight:400">x${item.quantity}</span></div>`;
            }).join('');

            tr.innerHTML = `
                <td style="font-family:monospace; font-weight:600; color:var(--accent-gold)">${o._id.slice(-8).toUpperCase()}</td>
                <td>
                    <div style="font-weight:700; color:var(--text-main)">${customerName}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:2px">${customerEmail}</div>
                </td>
                <td style="white-space:nowrap; font-weight:500">${phoneText}</td>
                <td style="min-width:200px">${itemsHtml}</td>
                <td>
                    <div style="font-size:0.85rem; max-width:180px; line-height:1.5; color:var(--text-main)">
                        ${addressText}<br>
                        <span style="font-size:0.75rem; color:var(--text-muted); font-weight:500">${cityZip}</span>
                    </div>
                </td>
                <td style="font-weight:800; color:var(--accent-gold); font-size:1.05rem">₹${o.totalPrice.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
                <td style="min-width:160px">${dropHtml}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
         tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger" style="padding:2rem;">${err.message}</td></tr>`;
    }
}

// State for the OOD confirmation modal
let _pendingOodOrderId = null;
let _pendingOodDropdown = null;
let _pendingOodPrevStatus = null;

async function handleOrderStatus(selectEl, orderId, newStatus) {
    if (newStatus === 'Out of delivery area') {
        // Save state for revert/confirm
        _pendingOodOrderId = orderId;
        _pendingOodDropdown = selectEl;
        _pendingOodPrevStatus = null;
        // Find the previously selected option
        for (let opt of selectEl.options) {
            if (opt.defaultSelected) { _pendingOodPrevStatus = opt.value; break; }
        }
        if (!_pendingOodPrevStatus) {
            // fallback: loop to find first selected that isn't the new value
            _pendingOodPrevStatus = [...selectEl.options].find(o => o.value !== newStatus)?.value || 'Placed';
        }

        // Detect payment method from the dropdown's data attribute
        const payMethod = selectEl.dataset.paymentMethod || 'cod';
        const isCod = payMethod === 'cod' || payMethod === 'pending_cod';

        // Populate modal message
        const msgEl = document.getElementById('ood-modal-msg');
        const badgeEl = document.getElementById('ood-payment-badge');

        if (isCod) {
            msgEl.innerHTML = `This order was placed as <strong>Cash on Delivery</strong>. Since no payment was collected yet, marking it as "Out of delivery area" will cancel the order and automatically restock all items.<br><br>Has the customer been notified?`;
            badgeEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;background:rgba(245,158,11,0.12);color:#fbbf24;padding:8px 16px;border-radius:20px;font-weight:600;font-size:0.85rem"><i class="fas fa-truck"></i> COD — No payment to refund</span>`;
        } else {
            msgEl.innerHTML = `This order was paid via <strong>UPI/Online</strong>. Marking it as "Out of delivery area" will cancel the order and restock items.<br><br>Please ensure the payment is refunded to the customer manually.`;
            badgeEl.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;background:rgba(139,92,246,0.12);color:#a78bfa;padding:8px 16px;border-radius:20px;font-weight:600;font-size:0.85rem"><i class="fas fa-qrcode"></i> UPI — Refund required</span>`;
        }

        openModal('ood-confirm-modal');
        return; // Do NOT update status yet
    }

    // All other status changes go through directly
    try {
        await fetchAPI(`/orders/${orderId}`, { method: 'PUT', body: { status: newStatus } });
        showToast('Order status updated!');
        loadAdminOrders();
    } catch(err) {
        showToast(err.message, 'error');
        loadAdminOrders();
    }
}

async function confirmOutOfArea() {
    closeModal('ood-confirm-modal');
    const yesBtn = document.getElementById('ood-yes-btn');
    yesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
    yesBtn.disabled = true;
    try {
        await fetchAPI(`/orders/${_pendingOodOrderId}`, { method: 'PUT', body: { status: 'Out of delivery area' } });
        showToast('Order cancelled & items restocked.', 'success');
        loadAdminOrders();
    } catch(err) {
        showToast(err.message, 'error');
        revertOrderStatusDropdown();
    } finally {
        yesBtn.innerHTML = '<i class="fas fa-check"></i> Yes, Cancel';
        yesBtn.disabled = false;
        _pendingOodOrderId = null;
        _pendingOodDropdown = null;
        _pendingOodPrevStatus = null;
    }
}

function revertOrderStatusDropdown() {
    if (_pendingOodDropdown && _pendingOodPrevStatus) {
        _pendingOodDropdown.value = _pendingOodPrevStatus;
    }
}


// ============================================
// PRODUCTS MANAGEMENT
// ============================================
async function loadAdminProducts() {
    const tbody = document.getElementById('tbl-products');
    const keyword = document.getElementById('admin-prod-search')?.value || '';
    const sort = document.getElementById('admin-prod-sort')?.value || '';
    
    try {
        const res = await fetchAPI(`/products?limit=100&keyword=${keyword}&sort=${sort}`);
        tbody.innerHTML = '';
        if(res.products.length === 0) return tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No products.</td></tr>';
        
        res.products.forEach(p => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <img src="${p.image}" style="width:40px;height:40px;object-fit:contain;border-radius:4px;background:#fff;mix-blend-mode:multiply" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1529539795054-3c162aab037a?auto=format&fit=crop&w=500&q=80';">
                        <strong title="${p.name}">${p.name.length > 25 ? p.name.substring(0,25)+'...' : p.name}</strong>
                    </div>
                </td>
                <td><span class="badge" style="background:#334155">${p.category}</span></td>
                <td>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <span style="color:var(--text-muted)">₹</span>
                        <input type="number" id="price-${p._id}" class="inline-stock" value="${p.price}" min="0" step="0.01">
                    </div>
                </td>
                <td>
                    <div style="display:flex; align-items:center; gap:5px;">
                        <input type="number" id="stock-${p._id}" class="inline-stock" value="${p.stock}" min="0">
                        <button class="action-btn" title="Update Price & Stock" onclick="updateProductInline('${p._id}')"><i class="fas fa-save"></i></button>
                    </div>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn danger" title="Delete Product" onclick="deleteProduct('${p._id}')"><i class="fas fa-trash"></i></button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch(err) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

async function updateProductInline(id) {
    const stockInput = document.getElementById(`stock-${id}`);
    const priceInput = document.getElementById(`price-${id}`);
    
    const newStock = parseInt(stockInput.value);
    const newPrice = parseFloat(priceInput.value);
    
    try {
        await fetchAPI(`/products/${id}`, { 
            method: 'PUT', 
            body: { stock: newStock, price: newPrice } 
        });
        showToast('Product updated inline successfully');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteProduct(id) {
    if (!confirm('Warning: Deleting a product may break existing user orders linked to it. Continue?')) return;
    try {
        await fetchAPI(`/products/${id}`, { method: 'DELETE' });
        showToast('Product successfully deleted', 'error'); // visually red toast
        loadAdminProducts();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

async function handleCreateProduct(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('add-prod-name').value,
        price: parseFloat(document.getElementById('add-prod-price').value),
        description: document.getElementById('add-prod-desc').value,
        image: document.getElementById('add-prod-img').value,
        brand: document.getElementById('add-prod-brand').value,
        category: document.getElementById('add-prod-cat').value,
        stock: parseInt(document.getElementById('add-prod-stock').value)
    };

    try {
        await fetchAPI('/products', { method: 'POST', body: payload });
        showToast('Product created seamlessly!');
        closeModal('product-modal');
        document.getElementById('form-product').reset();
        loadAdminProducts();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ============================================
// COUPONS MANAGEMENT
// ============================================
async function loadAdminCoupons() {
    const tbody = document.getElementById('tbl-coupons');
    try {
        const coupons = await fetchAPI('/coupons');
        tbody.innerHTML = '';
        if(coupons.length === 0) return tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No coupons.</td></tr>';

        coupons.forEach(c => {
            const tr = document.createElement('tr');
            const discountLabel = c.discountType === 'percentage'
                ? `${c.discountValue}%${c.maxDiscount ? ' (Max ₹'+c.maxDiscount+')' : ''}`
                : `Flat ₹${c.discountValue}`;
            const expiry = c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : 'No expiry';
            tr.innerHTML = `
                <td><strong style="color:var(--accent-gold); letter-spacing:1px">${c.code}</strong></td>
                <td>${discountLabel}</td>
                <td>Until ${expiry}</td>
                <td>
                    <button class="action-btn danger" onclick="deleteCoupon('${c._id}')"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

async function deleteCoupon(id) {
    if (!confirm('Are you sure you want to permanently delete this coupon?')) return;
    try {
        await fetchAPI(`/coupons/${id}`, { method: 'DELETE' });
        showToast('Coupon scrubbed from database.');
        loadAdminCoupons();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleCreateCoupon(e) {
    e.preventDefault();
    const discountType = document.getElementById('add-coup-type').value;
    const payload = {
        code: document.getElementById('add-coup-code').value.toUpperCase(),
        discountType: discountType,
        discountValue: parseFloat(document.getElementById('add-coup-pct').value),
        maxDiscount: discountType === 'percentage' ? parseFloat(document.getElementById('add-coup-max').value || 0) || null : null,
        minOrderAmount: parseFloat(document.getElementById('add-coup-min').value || 0) || 0,
        expiresAt: document.getElementById('add-coup-date').value,
        usageLimit: parseInt(document.getElementById('add-coup-limit').value || 0) || null
    };

    try {
        await fetchAPI('/coupons', { method: 'POST', body: payload });
        showToast('Coupon is live!');
        closeModal('coupon-modal');
        document.getElementById('form-coupon').reset();
        loadAdminCoupons();
    } catch(err) {
        showToast(err.message, 'error');
    }
}

// ============================================
// SUBSCRIBERS MANAGEMENT
// ============================================
async function loadAdminSubscribers() {
    const tbody = document.getElementById('tbl-subscribers');
    try {
        const subs = await fetchAPI('/subscribers');
        tbody.innerHTML = '';
        if(subs.length === 0) return tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No subscribers yet.</td></tr>';

        subs.forEach(sub => {
            const tr = document.createElement('tr');
            const date = new Date(sub.subscribedAt).toLocaleString();
            tr.innerHTML = `
                <td><strong style="color:var(--text-main);">${sub.email}</strong></td>
                <td>${date}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger">${err.message}</td></tr>`;
    }
}

// ============================================
// MASS PRICE UPDATE
// ============================================
async function handleMassPriceUpdate() {
    const inputEl = document.getElementById('mass-price-amount');
    const amountVal = inputEl.value;
    
    if (!amountVal) {
        showToast('Please enter an amount to update prices by', 'error');
        return;
    }
    
    const amount = parseFloat(amountVal);
    if (isNaN(amount)) {
        showToast('Please enter a valid number', 'error');
        return;
    }

    const directionStr = amount > 0 ? `increase` : `decrease`;
    if (!confirm(`Are you sure you want to ${directionStr} ALL product prices by ₹${Math.abs(amount)}?`)) return;

    try {
        const res = await fetchAPI('/products/mass-price-update', { 
            method: 'POST', 
            body: { amount } 
        });
        showToast(res.message || 'Mass price update successful!', 'success');
        inputEl.value = '';
        loadAdminProducts(); // Refresh list
    } catch (err) {
        showToast(err.message, 'error');
    }
}

