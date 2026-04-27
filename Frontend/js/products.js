let currentCategory = '';

document.addEventListener('DOMContentLoaded', () => {
    setupNavbar();
    
    // Check which page we are on
    const isShopPage = document.getElementById('shop-products-container') !== null;
    const isHomePage = document.getElementById('featured-products') !== null;

    if (isShopPage) {
        initShopPage();
    } else if (isHomePage) {
        loadFeaturedProducts();
        loadTestimonials();
    }
});

// =======================
// HOMEPAGE LOGIC
// =======================
async function loadFeaturedProducts() {
    const container = document.getElementById('featured-products');
    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    try {
        // Fetch top 4 products for homepage
        const res = await fetchAPI('/products?limit=3&sort=price_desc');
        loading.style.display = 'none';

        if(!res || !res.products || res.products.length === 0) {
            container.innerHTML = '<p class="text-muted">No featured items available.</p>';
            return;
        }

        res.products.forEach(p => {
            if (p) container.appendChild(createProductCard(p));
        });
    } catch (err) {
        loading.style.display = 'none';
        container.innerHTML = `<p class="text-danger">Failed to load products: ${err.message}</p>`;
    }
}

async function loadTestimonials() {
    try {
        const reviews = await fetchAPI('/products/reviews/recent');
        
        // If no reviews at all, keep the section hidden.
        if(!reviews || reviews.length === 0) return;

        const section = document.getElementById('testimonials-section');
        const container = document.getElementById('dynamic-testimonials');
        
        container.innerHTML = '';
        section.style.display = 'block'; // Make visible

        reviews.forEach((r, idx) => {
            // Natively building star string
            let starsHtml = '';
            for(let i=0; i<5; i++) starsHtml += i < r.rating ? '★' : '☆';
            
            // We use simple placeholder avatars based on index since no avatar uploads exist
            const avatarNum = [1, 11, 5, 20, 33][idx % 5];
            
            const div = document.createElement('div');
            div.className = 'review-card';
            div.innerHTML = `
                <div class="review-stars">${starsHtml}</div>
                <p class="review-text">"${r.comment}"</p>
                <div class="reviewer">
                    <img src="https://i.pravatar.cc/100?img=${avatarNum}" class="reviewer-img" alt="${r.name}">
                    <div>
                        <div class="reviewer-name">${r.name}</div>
                        <a href="product.html?id=${r.productId}" class="reviewer-title">Verified: ${r.productName.substring(0,18)}…</a>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (err) {
        console.error("Testimonials Failed", err);
    }
}

// =======================
// SHOP PAGE LOGIC (Sidebar)
// =======================
let currentPage = 1;

function initShopPage() {
    const urlParams = new URLSearchParams(window.location.search);
    if(urlParams.has('cat')) {
        setCategoryFilter(urlParams.get('cat'));
    }

    document.getElementById('apply-filters').addEventListener('click', () => {
        currentPage = 1;
        loadShopProducts();
    });

    document.getElementById('clear-filters').addEventListener('click', () => {
        document.getElementById('filter-keyword').value = '';
        document.getElementById('filter-sort').value = '';
        if(document.getElementById('filter-min')) {
            document.getElementById('filter-min').value = '';
            document.getElementById('filter-max').value = '';
            document.getElementById('filter-rating').value = '';
            document.getElementById('filter-stock').checked = false;
        }
        setCategoryFilter('');
    });

    document.getElementById('filter-keyword').addEventListener('keypress', (e) => {
        if(e.key === 'Enter') {
            currentPage = 1;
            loadShopProducts();
        }
    });

    document.getElementById('filter-sort').addEventListener('change', () => {
        currentPage = 1;
        loadShopProducts();
    });

    loadShopProducts();
}

function setCategoryFilter(cat) {
    currentCategory = cat;
    
    // Update active state in sidebar using new button list
    document.querySelectorAll('.cat-list button').forEach(el => el.classList.remove('active'));
    
    if(!cat) {
        document.getElementById('cat-all').classList.add('active');
    } else {
        const targetId = cat.toLowerCase().replace(/\s+/g, '-');
        const target = document.getElementById(`cat-${targetId}`);
        if(target) target.classList.add('active');
    }

    currentPage = 1;
    loadShopProducts();
}

async function loadShopProducts() {
    const container = document.getElementById('shop-products-container');
    const loading = document.getElementById('loading');
    const noProducts = document.getElementById('no-products');
    const pagination = document.getElementById('pagination-controls');
    const resultCount = document.getElementById('results-count');

    const keyword = document.getElementById('filter-keyword').value;
    const sort = document.getElementById('filter-sort').value;
    const minPrice = document.getElementById('filter-min')?.value;
    const maxPrice = document.getElementById('filter-max')?.value;
    const minRating = document.getElementById('filter-rating')?.value;
    const inStock = document.getElementById('filter-stock')?.checked;

    container.innerHTML = '';
    container.appendChild(loading); // Keep the spinner inside grid
    loading.style.display = 'block';
    noProducts.style.display = 'none';
    pagination.style.display = 'none';
    resultCount.innerHTML = 'Showing <strong>...</strong> products';

    try {
        let query = new URLSearchParams({ page: currentPage, limit: 12 });
        if (keyword) query.append('keyword', keyword);
        if (currentCategory) query.append('category', currentCategory);
        if (sort) query.append('sort', sort);
        if (minPrice) query.append('minPrice', minPrice);
        if (maxPrice) query.append('maxPrice', maxPrice);
        if (minRating) query.append('minRating', minRating);
        if (inStock) query.append('inStock', 'true');

        const res = await fetchAPI(`/products?${query.toString()}`);
        loading.style.display = 'none';

        if (!res.products || res.products.length === 0) {
            noProducts.style.display = 'block';
            resultCount.innerHTML = `Showing <strong>0</strong> products`;
            
            // Re-fetch aggregate categories to render properly (even if none found)
            updateSidebarCounts({});
            return;
        }

        resultCount.innerHTML = `Showing <strong>${res.products.length}</strong> products of ${res.total}`;

        res.products.forEach((p, idx) => {
            try {
                container.appendChild(createShopProductCard(p, idx));
            } catch (cardErr) {
                console.error(`Failed to render product at index ${idx}:`, p, cardErr);
            }
        });

        renderPagination(res.page, res.pages);
        
        // Bonus: Fake total count on sidebar
        updateSidebarCounts(res);

    } catch (err) {
        loading.style.display = 'none';
        showToast(err.message, 'error');
        resultCount.innerText = 'Error loading products';
    }
}

// Side-bar helper for shop counts to look authentic
function updateSidebarCounts(res) {
    if(res.total) {
        const activeBadge = document.querySelector('.cat-list button.active .cat-count');
        if(activeBadge) activeBadge.innerText = res.total;
    }
}

const CAT_COLORS = {
  'Class 9': '#1B4F8A', 'Class 10': '#1B4F8A', 'Class 11': '#1B4F8A', 'Class 12': '#1B4F8A', Guides: '#1B4F8A',
  Books: '#1B4F8A', Notebooks: '#2A6B3C', Pens: '#C8501A',
  Instruments: '#B8860B', Art: '#8B5CF6', Paper: '#64748B', Accessories: '#0F766E'
};

const FallbackEmojis = ["📘", "📒", "🖊️", "📐", "🎨", "🗂️", "🎒"];

function createShopProductCard(p, idx) {
    const div = document.createElement('div');
    div.className = 'custom-product-card';
    div.style.animationDelay = `${(idx % 12) * 0.04}s`;
    
    const fallbackImage = 'https://images.unsplash.com/photo-1529539795054-3c162aab037a?auto=format&fit=crop&w=500&q=80';
    let imageElem = p.image 
        ? `<img src="${p.image}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover; mix-blend-mode:multiply;" onerror="this.onerror=null; this.src='${fallbackImage}';">` 
        : `<span class="product-emoji">${FallbackEmojis[idx % FallbackEmojis.length]}</span>`;

    // Dynamic badges mapping 
    let badgeHtml = '';
    if (p.rating >= 4.8) badgeHtml = '<span class="product-badge badge-popular">Popular</span>';
    else if (p.rating > 0 && p.rating <= 4.2) badgeHtml = '<span class="product-badge badge-sale">Sale</span>'; // Emulate "Sale"
    else if (p.price < 50) badgeHtml = '<span class="product-badge badge-new">Deal</span>';

    // Stars
    const fullStars = Math.floor(p.rating || 0);
    let starsStr = '';
    for(let i=0; i<5; i++) starsStr += i < fullStars ? '★' : '☆';

    const catColor = CAT_COLORS[p.category] || '#8A7F75';

    div.innerHTML = `
      <div class="product-img-wrap" onclick="window.location.href='product.html?id=${p._id}'" style="cursor:pointer;">
        ${badgeHtml}
        ${imageElem}
        <button class="wishlist-btn" onclick="addToWishlist('${p._id}', event)" title="Wishlist">
          ♡
        </button>
      </div>
      <div class="card-body">
        <div class="card-cat" style="color:${catColor}">${p.category || 'Category'}</div>
        <a href="product.html?id=${p._id}" class="card-name" style="text-decoration:none; display:block;">${p.name || 'Untitled Item'}</a>
        <div class="card-note">${p.brand || ''}</div>
        <div class="stars">
          <span class="stars-val">${starsStr}</span>
          <span class="stars-count">${p.rating ? p.rating.toFixed(1) : 'New'}</span>
        </div>
        <div class="card-footer">
          <div class="price"><span class="currency">₹</span>${(p.price || 0).toFixed(2)}</div>
          ${p.stock > 0 
            ? `<button class="add-btn" onclick="addToCart('${p._id}', event)">🛒 ADD</button>`
            : `<span style="font-size:0.78rem;color:#C8501A;font-weight:600;">Out of Stock</span>`
          }
        </div>
      </div>
    `;
    return div;
}

// =======================
// SHARED UI HELPERS
// =======================
function createProductCard(p) {
    const div = document.createElement('div');
    div.className = 'product-card';
    
    const imageHtml = p.image ? `<img src="${p.image}" alt="${p.name}" class="product-image" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1529539795054-3c162aab037a?auto=format&fit=crop&w=500&q=80';">` : `<div style="padding:4rem;color:#ccc">No Image</div>`;
    
    // Fallback ratings display
    const ratingHtml = p.rating ? 
        `★ ${p.rating} <span class="count">(${p.numReviews || 0})</span>` : 
        `★ New <span class="count"></span>`;

    div.innerHTML = `
        <a href="product.html?id=${p._id}" class="product-image-container" style="position:relative;">
            ${imageHtml}
        </a>
        <div class="product-info">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="product-category">${p.category || 'Stationery'}</div>
                <button class="btn btn-outline" style="padding:0.2rem 0.4rem; border:none; color:var(--danger)" onclick="addToWishlist('${p._id}', event)">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            <a href="product.html?id=${p._id}" class="product-name">${p.name || 'Untitled Item'}</a>
            <div class="product-rating">${ratingHtml}</div>
            <div class="product-footer">
                <div class="product-price">₹${(p.price || 0).toFixed(2)}</div>
                <button class="btn btn-primary" onclick="addToCart('${p._id}', event)" style="padding: 0.5rem 1rem; border-radius: 4px;">
                    <i class="fas fa-shopping-cart"></i> Add
                </button>
            </div>
        </div>
    `;
    return div;
}

function renderPagination(current, total) {
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';
    if (total <= 1) return;

    container.style.display = 'flex';

    // Prev
    const prev = document.createElement('button');
    prev.className = 'page-btn';
    prev.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prev.disabled = current === 1;
    prev.onclick = () => { currentPage = current - 1; loadShopProducts(); };
    container.appendChild(prev);

    // Calculate start and end page for max 8 visible buttons
    let maxVisible = 8;
    let startPage = Math.max(1, current - Math.floor(maxVisible / 2));
    let endPage = startPage + maxVisible - 1;

    if (endPage > total) {
        endPage = total;
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Pages
    for (let i = startPage; i <= endPage; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === current ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => { currentPage = i; loadShopProducts(); };
        container.appendChild(btn);
    }

    // Next
    const next = document.createElement('button');
    next.className = 'page-btn';
    next.innerHTML = '<i class="fas fa-chevron-right"></i>';
    next.disabled = current === total;
    next.onclick = () => { currentPage = current + 1; loadShopProducts(); };
    container.appendChild(next);
}

// Add To Cart Utility accessible everywhere
window.addToCart = async function(productId, event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (!isAuthenticated()) {
        showToast('Please login to add items.', 'error');
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    try {
        await fetchAPI('/cart/add', {
            method: 'POST',
            body: { productId, quantity: 1 }
        });
        showToast('Added to cart!');
        updateCartCount();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Add To Wishlist Utility accessible everywhere
window.addToWishlist = async function(productId, event) {
    if(event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (!isAuthenticated()) {
        showToast('Please login to add to wishlist.', 'error');
        return;
    }

    try {
        await fetchAPI('/wishlist/add', {
            method: 'POST',
            body: { productId }
        });
        showToast('Added to Wishlist!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}
