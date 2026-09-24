// --- COMPLETE & FIXED JS FILE: APP.JS ---

// --- DYNAMICALLY LOAD RAZORPAY SDK IF NOT PRESENT ---
if (typeof Razorpay === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  document.head.appendChild(script);
}

// --- INITIAL PRODUCTS DATA WITH STOCK, REVIEWS & METAL SPECS ---
const initialProducts = [
  {
    id: 1,
    name: "18k Gold Solitaire Ring",
    category: "Rings",
    purity: "22K",
    weightGrams: 5,
    makingCharge: 1200,
    price: 0,
    rating: 4.8,
    reviewsCount: 24,
    stock: 5,
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500",
    description: "An elegant 18k solid gold ring featuring a brilliant-cut solitaire center stone. Perfect for special occasions and daily sophistication.",
    sizes: ["6", "7", "8", "9"],
    selectedSize: "7",
    userReviews: [
      { name: "Sanya M.", rating: 5, comment: "Bohot pyari ring hai, solid quality!" }
    ]
  },
  {
    id: 2,
    name: "Pearl Drop Necklace",
    category: "Necklaces",
    purity: "22K",
    weightGrams: 12,
    makingCharge: 2000,
    price: 0,
    rating: 4.6,
    reviewsCount: 18,
    stock: 2,
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500",
    description: "A timeless freshwater pearl hanging gracefully from an adjustable gold-plated chain. Adds class to any evening ensemble.",
    sizes: ["16 inch", "18 inch"],
    selectedSize: "18 inch",
    userReviews: []
  },
  {
    id: 3,
    name: "Classic Silver Bracelet",
    category: "Bracelets",
    purity: "Silver",
    weightGrams: 20,
    makingCharge: 400,
    price: 0,
    rating: 4.5,
    reviewsCount: 30,
    stock: 0,
    image: "https://images.unsplash.com/photo-1611591475777-233cd7577d60?w=500",
    description: "Handcrafted 925 sterling silver chain bracelet with a durable lobster clasp. Designed for comfort and long-lasting shine.",
    sizes: ["Small", "Medium"],
    selectedSize: "Medium",
    userReviews: []
  },
  {
    id: 4,
    name: "Royal Eternity Diamond Band",
    category: "Rings",
    purity: "24K",
    weightGrams: 8,
    makingCharge: 2500,
    price: 0,
    rating: 4.9,
    reviewsCount: 42,
    stock: 8,
    image: "https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=500",
    description: "A continuous loop of precision-cut lab diamonds set in polished platinum. Symbolizes everlasting strength and beauty.",
    sizes: ["5", "6", "7", "8"],
    selectedSize: "6",
    userReviews: []
  },
  {
    id: 5,
    name: "Diamond Pendant Necklace",
    category: "Necklaces",
    purity: "22K",
    weightGrams: 10,
    makingCharge: 1800,
    price: 0,
    rating: 5.0,
    reviewsCount: 15,
    stock: 3,
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500",
    description: "A radiant diamond pendant crafted with high-clarity stones, resting gently on a delicate 18k white gold chain.",
    sizes: ["18 inch"],
    selectedSize: "18 inch",
    userReviews: []
  }
];

// --- REALTIME METAL RATES CACHE ---
let currentLiveRates = {
  gold24k_10g: 72000,
  gold22k_10g: 66000,
  silver_1kg: 85000
};

// --- STORAGE PRODUCTS ---
let products = JSON.parse(localStorage.getItem('luxe_products')) || initialProducts;

function saveProductsToStorage() {
  localStorage.setItem('luxe_products', JSON.stringify(products));
}

// --- STATE MANAGEMENT ---
let currentUser = JSON.parse(localStorage.getItem('luxe_logged_in_user')) || null;
let pendingDirectBuyProduct = null; 
let selectedCategory = "All";
let appliedDiscount = 0;
let discountType = "fixed";

function getCartKey() {
  return currentUser ? `luxe_cart_${currentUser.id}` : 'luxe_cart_guest';
}

function getWishlistKey() {
  return currentUser ? `luxe_wishlist_${currentUser.id}` : 'luxe_wishlist_guest';
}

function loadCart() {
  return JSON.parse(localStorage.getItem(getCartKey())) || [];
}

function loadWishlist() {
  return JSON.parse(localStorage.getItem(getWishlistKey())) || [];
}

let cart = loadCart();
let wishlist = loadWishlist();

function saveCartToLocalStorage() {
  localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

function saveWishlist() {
  localStorage.setItem(getWishlistKey(), JSON.stringify(wishlist));
}

// --- APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  fetchAndDisplayMetalRates();
  setupPhoneInputs();
  updateUserUI();
  updateCartUI();
  updateWishlistUI();
});

// --- DYNAMIC LIVE METAL PRICE CALCULATOR ---
function calculateDynamicProductPrice(product) {
  if (!product.purity || !product.weightGrams) return product.price || 1000;

  let ratePerGram = 0;
  if (product.purity === "24K") ratePerGram = currentLiveRates.gold24k_10g / 10;
  else if (product.purity === "22K") ratePerGram = currentLiveRates.gold22k_10g / 10;
  else if (product.purity === "Silver") ratePerGram = currentLiveRates.silver_1kg / 1000;

  if (ratePerGram === 0) return product.price || 1000;
  const metalCost = product.weightGrams * ratePerGram;
  return Math.round(metalCost + (product.makingCharge || 0));
}

// --- TOAST NOTIFICATIONS ---
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- LIVE METAL RATES TICKER ---
async function fetchAndDisplayMetalRates() {
  const savedRates = JSON.parse(localStorage.getItem('luxe_metal_rates'));

  if (savedRates) {
    currentLiveRates = savedRates;
    updateRatesInUIAndProducts();
    return;
  }

  try {
    const response = await fetch('/api/metal-rates');
    const result = await response.json();

    if (result.success) {
      currentLiveRates = result.data;
      updateRatesInUIAndProducts();
    }
  } catch (error) {
    console.error("Error loading metal rates UI, using default fallback:", error);
    updateRatesInUIAndProducts();
  }
}

function updateRatesInUIAndProducts() {
  const g24 = document.getElementById('rate-gold-24k');
  const g22 = document.getElementById('rate-gold-22k');
  const sil = document.getElementById('rate-silver');

  if (g24) g24.innerText = `₹${currentLiveRates.gold24k_10g.toLocaleString('en-IN')}`;
  if (g22) g22.innerText = `₹${currentLiveRates.gold22k_10g.toLocaleString('en-IN')}`;
  if (sil) sil.innerText = `₹${currentLiveRates.silver_1kg.toLocaleString('en-IN')}`;

  filterProducts();
}

// --- PHONE & ADDRESS HELPERS ---
function sanitizePhoneNumber(inputVal) {
  let cleaned = inputVal.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  return cleaned.slice(0, 10);
}

function setupPhoneInputs() {
  const phoneInputs = document.querySelectorAll('.locked-phone-input, #phone, #signup-phone, #login-phone');
  phoneInputs.forEach(input => {
    input.addEventListener('input', (e) => {
      e.target.value = sanitizePhoneNumber(e.target.value);
    });
  });
}

function autoFillSavedAddress() {
  const savedAddressInfo = JSON.parse(localStorage.getItem('luxe_saved_shipping_address'));
  
  const nameInput = document.getElementById('full-name');
  const emailInput = document.getElementById('email');
  const phoneInput = document.getElementById('phone');
  const addressInput = document.getElementById('address');

  if (currentUser) {
    if (nameInput && !nameInput.value) nameInput.value = currentUser.name || '';
    if (emailInput && !emailInput.value) emailInput.value = currentUser.email || '';
    if (phoneInput && currentUser.phone && !phoneInput.value) phoneInput.value = currentUser.phone;
  }

  if (savedAddressInfo) {
    if (nameInput && savedAddressInfo.name) nameInput.value = savedAddressInfo.name;
    if (emailInput && savedAddressInfo.email) emailInput.value = savedAddressInfo.email;
    if (phoneInput && savedAddressInfo.phone) phoneInput.value = savedAddressInfo.phone;
    if (addressInput && savedAddressInfo.address) addressInput.value = savedAddressInfo.address;
  }
}

// --- RING SIZE CALCULATOR ---
function openSizeGuideModal() {
  document.getElementById('size-guide-modal')?.classList.add('active');
}

function closeSizeGuideModal() {
  document.getElementById('size-guide-modal')?.classList.remove('active');
}

function calculateRingSize() {
  const diameter = parseFloat(document.getElementById('diameter-input').value);
  const resultDiv = document.getElementById('size-result');

  if (!diameter || diameter <= 0) {
    resultDiv.innerText = "Please enter a valid diameter in mm.";
    return;
  }

  if (diameter <= 15.9) resultDiv.innerText = "Your Recommended Size: Size 5";
  else if (diameter <= 16.9) resultDiv.innerText = "Your Recommended Size: Size 6";
  else if (diameter <= 17.7) resultDiv.innerText = "Your Recommended Size: Size 7";
  else if (diameter <= 18.5) resultDiv.innerText = "Your Recommended Size: Size 8";
  else resultDiv.innerText = "Your Recommended Size: Size 9";
}

// --- DELIVERY DATE CALCULATOR ---
function getExactDeliveryDate(transitDays = 4, cutoffHour = 14) {
  let now = new Date();
  let dispatchDate = new Date(now);

  if (now.getHours() >= cutoffHour) dispatchDate.setDate(dispatchDate.getDate() + 1);

  let deliveryDate = new Date(dispatchDate);
  deliveryDate.setDate(deliveryDate.getDate() + transitDays);

  if (deliveryDate.getDay() === 0) deliveryDate.setDate(deliveryDate.getDate() + 1);

  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  return deliveryDate.toLocaleDateString('en-IN', options);
}

function checkPincodeDelivery() {
  const pin = document.getElementById('pincode-input')?.value.trim();
  const resDiv = document.getElementById('pincode-result');

  if (!pin || pin.length < 6 || isNaN(pin)) {
    resDiv.innerText = "Please enter a valid 6-digit Pincode.";
    resDiv.style.color = "red";
    return;
  }

  const formattedDate = getExactDeliveryDate(4, 14);
  resDiv.innerText = `🚚 Delivery expected by ${formattedDate}`;
  resDiv.style.color = "green";
}

// --- FOOTER INTERACTION HANDLERS ---
function footerFilter(category) {
  const btnId = `btn-${category.toLowerCase()}`;
  const targetBtn = document.getElementById(btnId) || document.getElementById('btn-all');
  setCategory(category, targetBtn);
  window.scrollTo({ top: 400, behavior: 'smooth' });
}

function showFooterInfo(title, infoText) {
  alert(`${title.toUpperCase()}\n\n${infoText}`);
}

// --- RENDER PRODUCTS ---
function renderProducts(itemsToRender = products) {
  const container = document.getElementById('product-list');
  if (!container) return;
  
  if (itemsToRender.length === 0) {
    container.innerHTML = `<div class="no-products">No jewelry items found matching your filters.</div>`;
    return;
  }

  container.innerHTML = itemsToRender.map(product => {
    const isWishlisted = wishlist.includes(product.id);
    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 3;
    const dynamicPrice = calculateDynamicProductPrice(product);

    return `
      <div class="product-card">
        <div class="img-container">
          <button class="wishlist-heart-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(event, ${product.id})">
            ${isWishlisted ? '❤️' : '🤍'}
          </button>
          <img src="${product.image}" alt="${product.name}" onclick="openProductDetailModal(${product.id})" class="card-clickable-area">
          ${isOutOfStock ? `<div class="badge out-of-stock-badge">Out of Stock</div>` : ''}
          ${isLowStock ? `<div class="badge low-stock-badge">Only ${product.stock} left!</div>` : ''}
        </div>
        <h3 onclick="openProductDetailModal(${product.id})" class="card-clickable-area">${product.name}</h3>
        <div class="rating-stars">⭐ ${product.rating.toFixed(1)} <span>(${product.reviewsCount})</span></div>
        <div class="price">₹${dynamicPrice.toLocaleString('en-IN')}</div>
        
        <div class="size-selector">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <label>SELECT SIZE</label>
            ${product.category === 'Rings' ? `<a href="javascript:void(0)" onclick="openSizeGuideModal()" style="font-size:11px; color:#b8860b;">Size Guide?</a>` : ''}
          </div>
          <div class="size-options">
            ${product.sizes.map(size => `
              <button class="size-btn ${product.selectedSize === size ? 'active' : ''}" onclick="selectSize(${product.id}, '${size}')">
                ${size}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="card-buttons" style="display:flex; gap:8px; margin-top:10px;">
          <button class="add-btn ${isOutOfStock ? 'disabled-btn' : ''}" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart(${product.id})" style="flex:1;">
            ${isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
          </button>
          <button class="buy-now-btn ${isOutOfStock ? 'disabled-btn' : ''}" ${isOutOfStock ? 'disabled' : ''} onclick="buyNow(${product.id})" style="flex:1; background:#b8860b; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">
            Buy Now
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// --- BUY NOW WITH AUTHENTICATION GUARD ---
function buyNow(productId) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    showToast("Sorry, product is out of stock!");
    return;
  }

  if (!currentUser) {
    pendingDirectBuyProduct = productId;
    showToast("Please Sign Up or Log In to buy products!");
    switchAuthMode('signup');
    openAuthModal();
    return;
  }

  executeDirectBuy(productId);
}

function executeDirectBuy(productId) {
  addToCart(productId, true); 
  closeProductDetailModal();
  checkout(); 
}

// --- PRODUCT DETAIL MODAL ---
function openProductDetailModal(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const container = document.getElementById('product-detail-content');
  if (!container) return;

  const isOutOfStock = product.stock <= 0;
  const dynamicPrice = calculateDynamicProductPrice(product);

  container.innerHTML = `
    <div class="product-detail-img-container">
      <img src="${product.image}" alt="${product.name}">
    </div>
    <div class="product-detail-info">
      <div class="product-detail-category">${product.category}</div>
      <h2>${product.name}</h2>
      <div class="rating-stars" style="margin-bottom:8px;">⭐ ${product.rating.toFixed(1)} <span>(${product.reviewsCount} reviews)</span></div>
      <div class="product-detail-price">₹${dynamicPrice.toLocaleString('en-IN')}</div>
      <p class="product-detail-description">${product.description}</p>
      
      <div class="pincode-check-box" style="margin-bottom: 15px;">
        <label style="font-size: 12px; font-weight: bold;">Check Estimated Delivery:</label>
        <div style="display:flex; gap: 5px; margin-top: 5px;">
          <input type="text" id="pincode-input" placeholder="Enter Pincode" maxlength="6" style="padding: 6px; font-size: 12px; flex: 1;">
          <button onclick="checkPincodeDelivery()" class="add-btn" style="width: auto; padding: 6px 12px; font-size: 12px;">Check</button>
        </div>
        <div id="pincode-result" style="font-size: 12px; margin-top: 5px;"></div>
      </div>

      <div class="size-selector" style="margin-bottom: 20px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <label>SELECT SIZE</label>
          ${product.category === 'Rings' ? `<a href="javascript:void(0)" onclick="openSizeGuideModal()" style="font-size:11px; color:#b8860b;">Size Guide?</a>` : ''}
        </div>
        <div class="size-options">
          ${product.sizes.map(size => `
            <button class="size-btn ${product.selectedSize === size ? 'active' : ''}" onclick="selectSize(${product.id}, '${size}'); openProductDetailModal(${product.id});">
              ${size}
            </button>
          `).join('')}
        </div>
      </div>

      <div style="display:flex; gap:10px;">
        <button class="add-btn ${isOutOfStock ? 'disabled-btn' : ''}" ${isOutOfStock ? 'disabled' : ''} onclick="addToCart(${product.id}); closeProductDetailModal();" style="flex:1;">
          ${isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
        </button>
        <button class="buy-now-btn ${isOutOfStock ? 'disabled-btn' : ''}" ${isOutOfStock ? 'disabled' : ''} onclick="buyNow(${product.id})" style="flex:1; background:#b8860b; color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">
          Buy Now
        </button>
      </div>

      <div class="reviews-section" style="margin-top: 25px; border-top: 1px solid #eee; padding-top: 15px;">
        <h4>Customer Reviews</h4>
        
        <form onsubmit="submitReview(event, ${product.id})" style="margin-top: 10px; margin-bottom: 15px;">
          <input type="text" id="review-name" placeholder="Your Name" required style="width: 100%; margin-bottom: 8px; padding: 6px;">
          <select id="review-rating" style="width: 100%; margin-bottom: 8px; padding: 6px;">
            <option value="5">⭐⭐⭐⭐⭐ (5/5)</option>
            <option value="4">⭐⭐⭐⭐ (4/5)</option>
            <option value="3">⭐⭐⭐ (3/5)</option>
            <option value="2">⭐⭐ (2/5)</option>
            <option value="1">⭐ (1/5)</option>
          </select>
          <textarea id="review-comment" placeholder="Write your review here..." required style="width: 100%; margin-bottom: 8px; padding: 6px; height: 60px;"></textarea>
          <button type="submit" class="place-order-btn" style="padding: 8px;">Submit Review</button>
        </form>

        <div class="reviews-list">
          ${(product.userReviews && product.userReviews.length > 0) ? 
            product.userReviews.map(r => `
              <div style="background: #f9f9f9; padding: 8px; border-radius: 5px; margin-bottom: 6px; font-size: 13px;">
                <strong>${r.name}</strong> - ⭐ ${r.rating}/5
                <p style="margin: 3px 0 0 0; color: #555;">${r.comment}</p>
              </div>
            `).join('') : '<p style="font-size:12px; color:#888;">No customer reviews yet. Be the first!</p>'
          }
        </div>
      </div>
    </div>
  `;

  document.getElementById('product-detail-modal')?.classList.add('active');
}

function submitReview(event, productId) {
  event.preventDefault();
  const product = products.find(p => p.id === productId);
  if (!product) return;

  const name = document.getElementById('review-name').value;
  const rating = parseFloat(document.getElementById('review-rating').value);
  const comment = document.getElementById('review-comment').value;

  if (!product.userReviews) product.userReviews = [];
  product.userReviews.unshift({ name, rating, comment });

  const totalRating = product.userReviews.reduce((sum, r) => sum + r.rating, 0);
  product.rating = totalRating / product.userReviews.length;
  product.reviewsCount = product.userReviews.length;

  saveProductsToStorage();
  filterProducts();
  openProductDetailModal(productId);
  showToast("Thank you for your review!");
}

function closeProductDetailModal() {
  document.getElementById('product-detail-modal')?.classList.remove('active');
}

// --- FILTER, SEARCH & SORT ---
function updatePriceSlider(val) {
  document.getElementById('price-val').innerText = parseInt(val).toLocaleString('en-IN');
  filterProducts();
}

function filterProducts() {
  const query = document.getElementById('search-input')?.value.toLowerCase() || '';
  const maxPrice = parseFloat(document.getElementById('price-range')?.value || 5000000);
  const sortVal = document.getElementById('sort-select')?.value || 'featured';

  let filtered = products.filter(product => {
    const matchesCategory = (selectedCategory === "All") || (product.category === selectedCategory);
    const matchesSearch = product.name.toLowerCase().includes(query);
    const dynamicPrice = calculateDynamicProductPrice(product);
    const matchesPrice = dynamicPrice <= maxPrice;
    return matchesCategory && matchesSearch && matchesPrice;
  });

  if (sortVal === 'price-low') {
    filtered.sort((a, b) => calculateDynamicProductPrice(a) - calculateDynamicProductPrice(b));
  } else if (sortVal === 'price-high') {
    filtered.sort((a, b) => calculateDynamicProductPrice(b) - calculateDynamicProductPrice(a));
  } else if (sortVal === 'top-rated') {
    filtered.sort((a, b) => b.rating - a.rating);
  }

  renderProducts(filtered);
}

function setCategory(category, buttonElement) {
  selectedCategory = category;
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  if (buttonElement) buttonElement.classList.add('active');
  filterProducts();
}

function selectSize(productId, size) {
  const product = products.find(p => p.id === productId);
  if (product) {
    product.selectedSize = size;
    filterProducts();
  }
}

// --- CART MANAGEMENT ---
function addToCart(productId, silent = false) {
  const product = products.find(p => p.id === productId);
  if (!product || product.stock <= 0) {
    if (!silent) showToast("Sorry, this product is out of stock!");
    return;
  }
  
  const dynamicPrice = calculateDynamicProductPrice(product);
  const existingItemIndex = cart.findIndex(item => item.id === product.id && item.size === product.selectedSize);

  if (existingItemIndex > -1) {
    if (cart[existingItemIndex].quantity + 1 > product.stock) {
      if (!silent) showToast(`Cannot add more. Only ${product.stock} items in stock!`);
      return;
    }
    cart[existingItemIndex].quantity += 1;
    cart[existingItemIndex].price = dynamicPrice; 
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: dynamicPrice,
      size: product.selectedSize,
      quantity: 1
    });
  }

  saveCartToLocalStorage();
  updateCartUI();
  if (!silent) showToast(`Added "${product.name}" to your bag!`);
}

function updateCartQuantity(index, delta) {
  const cartItem = cart[index];
  const product = products.find(p => p.id === cartItem.id);

  if (delta > 0 && cartItem.quantity + delta > product.stock) {
    showToast(`Stock limit reached! Only ${product.stock} available.`);
    return;
  }

  cartItem.quantity += delta;
  if (cartItem.quantity <= 0) {
    cart.splice(index, 1);
    showToast("Item removed from bag.");
  }
  saveCartToLocalStorage();
  updateCartUI();
}

function applyPromoCode() {
  const code = document.getElementById('promo-input').value.trim().toUpperCase();
  
  if (code === 'LUXE10') {
    appliedDiscount = 0.10;
    discountType = 'percentage';
    showToast("Coupon LUXE10 applied! 10% Discount given.");
  } else if (code === 'WELCOME50') {
    appliedDiscount = 50;
    discountType = 'flat';
    showToast("Coupon WELCOME50 applied! ₹50 Discount given.");
  } else {
    appliedDiscount = 0;
    showToast("Invalid Promo Code!");
  }
  updateCartUI();
}

function updateCartUI() {
  const cartCountEl = document.getElementById('cart-count');
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartCountEl) cartCountEl.innerText = totalItemsCount;
  
  const cartItemsContainer = document.getElementById('cart-items');
  if (!cartItemsContainer) return;
  
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `<p style="text-align:center; color:#888; margin-top:20px;">Your bag is empty.</p>`;
  } else {
    cartItemsContainer.innerHTML = cart.map((item, index) => `
      <div class="cart-item">
        <div>
          <p><strong>${item.name}</strong></p>
          <p style="font-size: 12px; color: #666;">Size: ${item.size}</p>
          <p style="color: #b8860b;">₹${item.price.toLocaleString('en-IN')}</p>
          <div class="qty-controls">
            <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)">-</button>
            <span style="font-size: 12px;">Qty: ${item.quantity}</span>
            <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)">+</button>
          </div>
        </div>
        <button onclick="updateCartQuantity(${index}, -${item.quantity})" style="color: red; background: none; border: none; cursor: pointer; font-size: 12px;">Remove</button>
      </div>
    `).join('');
  }

  const rawTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountVal = 0;

  if (discountType === 'percentage') discountVal = rawTotal * appliedDiscount;
  else if (discountType === 'flat') discountVal = appliedDiscount;

  const finalTotal = Math.max(0, rawTotal - discountVal);

  const discountRow = document.getElementById('discount-row');
  if (discountRow) {
    if (appliedDiscount > 0) {
      discountRow.style.display = 'flex';
      document.getElementById('discount-amount').innerText = discountVal.toFixed(0);
    } else {
      discountRow.style.display = 'none';
    }
  }

  const cartTotalEl = document.getElementById('cart-total');
  if (cartTotalEl) cartTotalEl.innerText = finalTotal.toLocaleString('en-IN');
}

function toggleCart(forceOpen = false) {
  const sidebar = document.getElementById('cart-sidebar');
  if (!sidebar) return;
  if (forceOpen) sidebar.classList.add('active');
  else sidebar.classList.toggle('active');
}

// --- CHECKOUT & ORDER HANDLING WITH RAZORPAY ---
function checkout() {
  if (cart.length === 0) {
    showToast("Your cart is empty!");
    return;
  }
  autoFillSavedAddress();
  toggleCart(false);
  document.getElementById('checkout-modal')?.classList.add('active');
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal')?.classList.remove('active');
}

async function handleOrderSubmit(event) {
  event.preventDefault();

  const phoneInput = document.getElementById('phone') || document.getElementById('phone-number') || document.getElementById('phone-input');
  if (!phoneInput) {
    alert("Phone field missing!");
    return;
  }

  const phoneVal = sanitizePhoneNumber(phoneInput.value);
  if (phoneVal.length !== 10) {
    alert("Please enter a valid 10-digit mobile number.");
    phoneInput.focus();
    return;
  }

  const name = document.getElementById('full-name').value;
  const email = document.getElementById('email').value;
  const address = document.getElementById('address').value;

  const rawTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  let discountVal = discountType === 'percentage' ? rawTotal * appliedDiscount : appliedDiscount;
  const finalTotal = Math.max(0, rawTotal - discountVal);

  if (typeof Razorpay === 'undefined') {
    alert("Razorpay Payment Gateway is loading... Please try again in 5 seconds.");
    return;
  }

  const options = {
    key: "rzp_test_TZAzdAPSq4KOrB",
    amount: finalTotal * 100,
    currency: "INR",
    name: "Luxe Jewelry",
    description: "Order Payment",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=200",
    prefill: {
      name: name,
      email: email,
      contact: phoneVal
    },
    theme: {
      color: "#b8860b"
    },
    handler: function (response) {
      const newOrder = {
        orderId: "LUXE" + Math.floor(100000 + Math.random() * 900000),
        paymentId: response.razorpay_payment_id,
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        name,
        email,
        address,
        phone: "+91 " + phoneVal,
        items: [...cart],
        totalAmount: finalTotal
      };

      localStorage.setItem('luxe_saved_shipping_address', JSON.stringify({ name, email, phone: phoneVal, address }));

      let history = JSON.parse(localStorage.getItem('luxe_order_history')) || [];
      history.unshift(newOrder);
      localStorage.setItem('luxe_order_history', JSON.stringify(history));

      cart = [];
      saveCartToLocalStorage();
      updateCartUI();

      closeCheckoutModal();
      showToast("Order Placed Successfully! 🎉");
      openOrdersModal();
    },
    modal: {
      ondismiss: function () {
        showToast("Payment cancelled. Order was not placed.");
      }
    }
  };

  try {
    const rzp = new Razorpay(options);
    rzp.open();
  } catch (err) {
    console.error("Razorpay Modal Error:", err);
    alert("Could not open payment window. Please check your internet connection.");
  }
}

// --- WISHLIST MANAGEMENT ---
function toggleWishlist(event, productId) {
  if (event) event.stopPropagation();

  const index = wishlist.indexOf(productId);
  if (index === -1) {
    wishlist.push(productId);
    showToast("Added to your wishlist! ❤️");
  } else {
    wishlist.splice(index, 1);
    showToast("Removed from wishlist.");
  }
  saveWishlist();
  updateWishlistUI();
  filterProducts();
}

function updateWishlistUI() {
  const countEl = document.getElementById('wishlist-count');
  if (countEl) countEl.innerText = wishlist.length;
}

function moveWishlistToCart(productId) {
  addToCart(productId);
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    saveWishlist();
    updateWishlistUI();
  }
  openWishlistModal();
  showToast("Moved item from Wishlist to Bag!");
}

function openWishlistModal() {
  const container = document.getElementById('wishlist-items-container');
  if (!container) return;

  const favProducts = products.filter(p => wishlist.includes(p.id));

  if (favProducts.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#888; margin-top:20px;">No favorite items saved yet.</p>`;
  } else {
    container.innerHTML = favProducts.map(item => {
      const livePrice = calculateDynamicProductPrice(item);
      return `
        <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
          <div>
            <p><strong>${item.name}</strong></p>
            <p style="color: #b8860b; font-size:13px;">₹${livePrice.toLocaleString('en-IN')}</p>
          </div>
          <div style="display:flex; gap:10px; align-items:center;">
            <button onclick="moveWishlistToCart(${item.id})" class="add-btn" style="padding: 5px 10px; font-size:12px;">Move to Bag 🛒</button>
            <button onclick="toggleWishlist(null, ${item.id}); openWishlistModal();" style="color: red; background: none; border: none; cursor: pointer;">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('wishlist-modal')?.classList.add('active');
}

function closeWishlistModal() {
  document.getElementById('wishlist-modal')?.classList.remove('active');
}

// --- MY ORDERS & INVOICE GENERATOR ---
function openOrdersModal() {
  const container = document.getElementById('orders-history-container');
  if (!container) return;

  const history = JSON.parse(localStorage.getItem('luxe_order_history')) || [];

  if (history.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#888; margin-top:20px;">You haven't placed any orders yet.</p>`;
  } else {
    container.innerHTML = history.map(order => `
      <div class="order-history-item" id="invoice-${order.orderId}" style="border: 1px solid #e0e0e0; padding:15px; margin-bottom:15px; border-radius:8px; background:#fff;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
          <strong>Order ID: ${order.orderId}</strong>
          <span style="color: #b8860b;">${order.date}</span>
        </div>

        <div style="margin: 10px 0; font-size:13px;">
          <p><strong>Customer:</strong> ${order.name} | ${order.phone}</p>
          <p><strong>Address:</strong> ${order.address}</p>
          <p><strong>Payment ID:</strong> ${order.paymentId}</p>
        </div>

        <div style="margin: 10px 0; font-size:13px;">
          <strong>Items Ordered:</strong>
          <ul style="padding-left: 20px; margin-top:5px;">
            ${order.items.map(item => `
              <li>${item.name} (Size: ${item.size}) x ${item.quantity} - ₹${(item.price * item.quantity).toLocaleString('en-IN')}</li>
            `).join('')}
          </ul>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px; border-top:1px solid #eee; padding-top:10px;">
          <strong>Total Amount: ₹${order.totalAmount.toLocaleString('en-IN')}</strong>
          <button onclick="downloadInvoice('${order.orderId}')" class="add-btn" style="padding: 5px 10px; font-size:12px; width:auto;">Download Invoice 📄</button>
        </div>
      </div>
    `).join('');
  }

  document.getElementById('orders-modal')?.classList.add('active');
}

function closeOrdersModal() {
  document.getElementById('orders-modal')?.classList.remove('active');
}

function downloadInvoice(orderId) {
  const history = JSON.parse(localStorage.getItem('luxe_order_history')) || [];
  const order = history.find(o => o.orderId === orderId);
  if (!order) return;

  const invoiceWindow = window.open('', '_blank');
  invoiceWindow.document.write(`
    <html>
      <head>
        <title>Invoice - ${order.orderId}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #b8860b; padding-bottom: 10px; }
          .details { margin: 20px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f4f4f4; }
          .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LUXE JEWELRY</h1>
          <p>Tax Invoice / Purchase Receipt</p>
        </div>
        <div class="details">
          <p><strong>Order ID:</strong> ${order.orderId}</p>
          <p><strong>Payment ID:</strong> ${order.paymentId}</p>
          <p><strong>Date:</strong> ${order.date}</p>
          <p><strong>Billed To:</strong> ${order.name} (${order.phone})</p>
          <p><strong>Shipping Address:</strong> ${order.address}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Size</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(i => `
              <tr>
                <td>${i.name}</td>
                <td>${i.size}</td>
                <td>${i.quantity}</td>
                <td>₹${i.price.toLocaleString('en-IN')}</td>
                <td>₹${(i.price * i.quantity).toLocaleString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          Grand Total: ₹${order.totalAmount.toLocaleString('en-IN')}
        </div>
      </body>
    </html>
  `);
  invoiceWindow.document.close();
  invoiceWindow.print();
}

// --- USER AUTHENTICATION & UI ---
function openAuthModal() {
  document.getElementById('auth-modal')?.classList.add('active');
}

function closeAuthModal() {
  document.getElementById('auth-modal')?.classList.remove('active');
}

function switchAuthMode(mode) {
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const title = document.getElementById('auth-modal-title');

  if (mode === 'signup') {
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
    if (title) title.innerText = 'Create Account';
  } else {
    if (signupForm) signupForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'block';
    if (title) title.innerText = 'Log In';
  }
}

function handleSignUp(event) {
  event.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const phone = sanitizePhoneNumber(document.getElementById('signup-phone').value);
  const password = document.getElementById('signup-password').value;

  if (phone.length !== 10) {
    alert("Please enter a valid 10-digit phone number.");
    return;
  }

  const users = JSON.parse(localStorage.getItem('luxe_users')) || [];
  if (users.some(u => u.email === email)) {
    alert("Account with this email already exists!");
    return;
  }

  const newUser = { id: 'usr_' + Date.now(), name, email, phone, password };
  users.push(newUser);
  localStorage.setItem('luxe_users', JSON.stringify(users));

  currentUser = newUser;
  localStorage.setItem('luxe_logged_in_user', JSON.stringify(currentUser));
  
  syncGuestDataToUser();
  updateUserUI();
  closeAuthModal();
  showToast(`Welcome to Luxe, ${name}! 🎉`);

  if (pendingDirectBuyProduct) {
    const prodId = pendingDirectBuyProduct;
    pendingDirectBuyProduct = null;
    executeDirectBuy(prodId);
  }
}

function handleLogIn(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const users = JSON.parse(localStorage.getItem('luxe_users')) || [];
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    alert("Invalid Email or Password!");
    return;
  }

  currentUser = user;
  localStorage.setItem('luxe_logged_in_user', JSON.stringify(currentUser));

  syncGuestDataToUser();
  updateUserUI();
  closeAuthModal();
  showToast(`Welcome back, ${user.name}! 👋`);

  if (pendingDirectBuyProduct) {
    const prodId = pendingDirectBuyProduct;
    pendingDirectBuyProduct = null;
    executeDirectBuy(prodId);
  }
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('luxe_logged_in_user');
  cart = loadCart();
  wishlist = loadWishlist();
  updateUserUI();
  updateCartUI();
  updateWishlistUI();
  showToast("Logged out successfully.");
}

function syncGuestDataToUser() {
  const guestCart = JSON.parse(localStorage.getItem('luxe_cart_guest')) || [];
  const guestWishlist = JSON.parse(localStorage.getItem('luxe_wishlist_guest')) || [];

  if (guestCart.length > 0) {
    const userCart = loadCart();
    guestCart.forEach(gItem => {
      const existing = userCart.find(uItem => uItem.id === gItem.id && uItem.size === gItem.size);
      if (existing) existing.quantity += gItem.quantity;
      else userCart.push(gItem);
    });
    localStorage.setItem(getCartKey(), JSON.stringify(userCart));
    localStorage.removeItem('luxe_cart_guest');
  }

  if (guestWishlist.length > 0) {
    const userWishlist = loadWishlist();
    guestWishlist.forEach(id => {
      if (!userWishlist.includes(id)) userWishlist.push(id);
    });
    localStorage.setItem(getWishlistKey(), JSON.stringify(userWishlist));
    localStorage.removeItem('luxe_wishlist_guest');
  }

  cart = loadCart();
  wishlist = loadWishlist();
  updateCartUI();
  updateWishlistUI();
}

function updateUserUI() {
  const accountBtn = document.getElementById('account-btn');
  const userMenu = document.getElementById('user-menu');
  const userNameDisplay = document.getElementById('user-name-display');

  if (currentUser) {
    if (accountBtn) accountBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    if (userNameDisplay) userNameDisplay.innerText = currentUser.name;
  } else {
    if (accountBtn) accountBtn.style.display = 'block';
    if (userMenu) userMenu.style.display = 'none';
  }
}