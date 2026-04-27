if (!isAuthenticated()) {
    window.location.href = 'login.html';
}

let cartItems = [];
let baseTotal = 0;
let finalTotal = 0;
let appliedCouponCode = null;
let currentOrderId = null; // store temporarily across step transitions if needed

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    loadCheckoutData();

    // Event Listeners
    document.getElementById('btn-apply-coupon').addEventListener('click', handleApplyCoupon);
    
    // Payment method toggle logic
    const radios = document.querySelectorAll('input[name="paymentMethod"]');
    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const upiSection = document.getElementById('upi-section');
            if (e.target.value === 'upi') {
                upiSection.style.display = 'block';
            } else {
                upiSection.style.display = 'none';
            }
        });
    });

    document.getElementById('btn-place-order').addEventListener('click', handleCheckoutProcess);
});

async function loadCheckoutData() {
    const loading = document.getElementById('loading');
    const content = document.getElementById('checkout-content');

    try {
        const cart = await fetchAPI('/cart');
        if (!cart || cart.length === 0) {
            window.location.href = 'cart.html';
            return;
        }

        cartItems = cart;
        let subtotal = 0;
        
        const summaryItems = document.getElementById('summary-items');
        summaryItems.innerHTML = '';

        cart.forEach(item => {
            const p = item.product;
            subtotal += (p.price * item.quantity);

            // small mini summary
            const div = document.createElement('div');
            div.style.display = 'flex';
            div.style.justifyContent = 'space-between';
            div.style.marginBottom = '5px';
            div.style.fontSize = '0.9rem';
            div.innerHTML = `
                <span class="text-muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">
                    ${item.quantity}x ${sanitizeHTML(p.name)}
                </span>
                <span>₹${(p.price * item.quantity).toFixed(2)}</span>
            `;
            summaryItems.appendChild(div);
        });

        baseTotal = subtotal;
        finalTotal = subtotal;
        updateTotalsUI();

        // Try to fetch UPI details in advance so UI is ready if they select UPI
        fetchUpiTarget();

        loading.style.display = 'none';
        content.style.display = 'grid'; // because layout is a grid

        // Pre-fill user details if possible
        const user = getUserData();
        if(user) {
            document.getElementById('ship-name').value = user.name || '';
        }

    } catch (err) {
        document.getElementById('error-message').innerText = 'Failed to load checkout data.';
    }
}

async function handleApplyCoupon() {
    const code = document.getElementById('coupon-input').value.trim();
    const msgDiv = document.getElementById('coupon-msg');
    
    if (!code) {
        appliedCouponCode = null;
        finalTotal = baseTotal;
        updateTotalsUI();
        msgDiv.innerText = '';
        return;
    }

    try {
        // use backend endpoint to validate vs baseTotal
        const res = await fetchAPI('/coupons/apply', {
            method: 'POST',
            body: { code, orderAmount: baseTotal }
        });

        appliedCouponCode = res.code;
        finalTotal = res.finalAmount;
        
        // Show discount UI
        document.getElementById('summ-discount-row').style.display = 'flex';
        document.getElementById('summ-coupon-code').innerText = res.code;
        document.getElementById('summ-discount').innerText = `-₹${parseFloat(res.discountAmount).toFixed(2)}`;
        
        msgDiv.className = 'mb-2 text-success';
        msgDiv.innerHTML = `<i class="fas fa-check"></i> ${res.message}`;
        
        updateTotalsUI();
    } catch (err) {
        msgDiv.className = 'mb-2 text-danger';
        msgDiv.innerText = err.message;
        
        // Reset
        appliedCouponCode = null;
        finalTotal = baseTotal;
        document.getElementById('summ-discount-row').style.display = 'none';
        updateTotalsUI();
    }
}

function updateTotalsUI() {
    document.getElementById('summ-subtotal').innerText = `₹${baseTotal.toFixed(2)}`;
    document.getElementById('summ-total').innerText = `₹${finalTotal.toFixed(2)}`;
}

// Just to get the shop ID without an order initially (the backend doesn't have a generic endpoint, 
// so we'll simulate picking it up if we know it or let the user see it once order is placed. 
// Wait, the new backend `GET /api/payments/upi-details/:orderId` requires an orderId.
// For the UI to show the shop ID *before* order placement, the user must see it. We'll hardcode the known one
// or show it gracefully. Let's hardcode the one we set in .env for seamless UI experience: marshal9793@oksbi
function fetchUpiTarget() {
    // Ideally backend would have /api/shop-config, but we can display the string
    document.getElementById('shop-upi-display').innerText = 'marshal9793@oksbi';
}


// MAIN CHECKOUT FLOW
// 1. Create Order => returns orderId
// 2. Submit Payment => links orderId + upi (with UTR) or cod (coupon included)
async function handleCheckoutProcess() {
    // Validate form
    const form = document.getElementById('shipping-form');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const shipAddress = {
        fullName: document.getElementById('ship-name').value,
        phone: document.getElementById('ship-phone').value,
        address: document.getElementById('ship-address').value,
        city: document.getElementById('ship-city').value,
        pincode: document.getElementById('ship-pincode').value
    };

    if (!shipAddress.city.toLowerCase().includes('gorakhpur')) {
        showToast('Sorry, we currently only deliver to Gorakhpur District, Uttar Pradesh', 'error');
        return;
    }

    const methodNode = document.querySelector('input[name="paymentMethod"]:checked');
    if (!methodNode) {
        showToast('Please select a payment method', 'error');
        return;
    }
    const method = methodNode.value;

    const utrNumber = document.getElementById('upi-utr').value.trim();
    if (method === 'upi' && utrNumber.length < 10) {
        showToast('Please enter a valid 12-digit UTR number', 'error');
        return;
    }

    const btn = document.getElementById('btn-place-order');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

    try {
        // Step 1: Create Order
        const orderRes = await fetchAPI('/orders', {
            method: 'POST',
            body: { shippingAddress: shipAddress }
        });

        const newOrderId = orderRes.order._id;

        // Step 2: Make Payment to confirm order
        const payBody = {
            orderId: newOrderId,
            method: method
        };
        if (appliedCouponCode) payBody.couponCode = appliedCouponCode;
        if (method === 'upi') payBody.utrNumber = utrNumber;

        const payRes = await fetchAPI('/payments', {
            method: 'POST',
            body: payBody
        });

        // Step 3: Success! Display success screen
        document.getElementById('checkout-content').style.display = 'none';
        const scr = document.getElementById('success-screen');
        scr.style.display = 'block';

        if(method === 'cod') {
            document.getElementById('success-desc').innerText = "Your order is confirmed. Payment will be collected on delivery.";
        } else {
            document.getElementById('success-title').innerText = "Payment Registered!";
            document.getElementById('success-desc').innerText = `Your UPI transfer (UTR: ${utrNumber}) has been recorded. We will verify and confirm your order shortly.`;
        }

        updateCartCount(); // cart is now empty

    } catch(err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.innerText = 'Place Order & Pay';
    }
}

function sanitizeHTML(str) {
    var temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}
