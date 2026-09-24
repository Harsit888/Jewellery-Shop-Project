// --- AUTHENTICATION CHECK ---
function checkAdminAuth() {
  const isAuthenticated = sessionStorage.getItem('luxe_admin_authenticated');
  if (isAuthenticated !== 'true') {
    window.location.href = 'login.html';
  }
}

// Immediately check auth before running rest of the script
checkAdminAuth();

function lockDashboard() {
  sessionStorage.removeItem('luxe_admin_authenticated');
  sessionStorage.removeItem('luxe_admin_name');
  window.location.href = 'login.html';
}

// --- INITIAL STORAGE & STATE MANAGEMENT ---
let products = JSON.parse(localStorage.getItem('luxe_products')) || [];
let orders = JSON.parse(localStorage.getItem('luxe_order_history')) || [];
let coupons = JSON.parse(localStorage.getItem('luxe_coupons')) || [
  { code: 'LUXE10', type: 'percentage', value: 10 },
  { code: 'WELCOME50', type: 'flat', value: 50 }
];
let metalRates = JSON.parse(localStorage.getItem('luxe_metal_rates')) || {
  gold24k_10g: 72000,
  gold22k_10g: 66000,
  gold20k_10g: 60000,
  gold18k_10g: 54000,
  silver_1kg: 85000
};

let salesChartInstance = null;

// Storage helpers
function saveProducts() { localStorage.setItem('luxe_products', JSON.stringify(products)); }
function saveOrders() { localStorage.setItem('luxe_order_history', JSON.stringify(orders)); }
function saveCoupons() { localStorage.setItem('luxe_coupons', JSON.stringify(coupons)); }

// Dynamic Category & Purity Control
function handleCategoryChange(category) {
  const puritySelect = document.getElementById('prod-purity');
  if (!puritySelect) return;

  if (category === 'Silver') {
    puritySelect.innerHTML = `<option value="Silver">Silver</option>`;
  } else {
    puritySelect.innerHTML = `
      <option value="24K">24K Gold</option>
      <option value="22K">22K Gold</option>
      <option value="20K">20K Gold</option>
      <option value="18K">18K Gold</option>
    `;
  }
}

// --- TAB SWITCHING LOGIC ---
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
  document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));

  const selectedTab = document.getElementById(`tab-${tabName}`);
  if (selectedTab) selectedTab.classList.add('active');

  const activeLi = Array.from(document.querySelectorAll('.sidebar ul li')).find(
    li => li.getAttribute('onclick')?.includes(tabName)
  );
  if (activeLi) activeLi.classList.add('active');

  if (tabName === 'analytics') renderAnalytics();
  if (tabName === 'orders') renderOrdersTable();
  if (tabName === 'products') renderAdminProductsTable();
  if (tabName === 'customers') renderCustomersTable();
  if (tabName === 'coupons') renderCouponsTable();
  if (tabName === 'rates') populateRatesForm();
}

// --- VISUAL ANALYTICS & CHARTS ---
function renderAnalytics() {
  const totalSalesElem = document.getElementById('stat-total-sales');
  const totalOrdersElem = document.getElementById('stat-total-orders');
  const totalProductsElem = document.getElementById('stat-total-products');
  const lowStockElem = document.getElementById('stat-low-stock');

  const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
  const lowStockCount = products.filter(p => p.stock <= 2).length;

  if (totalSalesElem) totalSalesElem.innerText = `₹${totalSales.toLocaleString('en-IN')}`;
  if (totalOrdersElem) totalOrdersElem.innerText = orders.length;
  if (totalProductsElem) totalProductsElem.innerText = products.length;
  if (lowStockElem) lowStockElem.innerText = lowStockCount;

  const chartCanvas = document.getElementById('salesChart');
  if (!chartCanvas) return;

  const ctx = chartCanvas.getContext('2d');
  const labels = orders.map(o => o.date || 'Recent').slice(-7);
  const dataPoints = orders.map(o => o.totalAmount || 0).slice(-7);

  if (salesChartInstance) salesChartInstance.destroy();

  salesChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['No Data'],
      datasets: [{
        label: 'Revenue Growth (₹)',
        data: dataPoints.length ? dataPoints : [0],
        borderColor: '#b8860b',
        backgroundColor: 'rgba(184, 134, 11, 0.15)',
        fill: true,
        tension: 0.3
      }]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: { legend: { display: true } } 
    }
  });
}

// --- ORDERS & INVOICE MANAGEMENT ---
function renderOrdersTable() {
  const tableBody = document.getElementById('admin-orders-list');
  if (!tableBody) return;

  if (orders.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 15px;">No orders available.</td></tr>`;
    return;
  }

  tableBody.innerHTML = orders.map((order, index) => `
    <tr>
      <td><strong>${order.orderId}</strong></td>
      <td>${order.name || 'Guest'}<br><small style="color:#666;">${order.phone || ''}</small></td>
      <td>${order.date || 'N/A'}</td>
      <td>₹${(order.totalAmount || 0).toLocaleString('en-IN')}</td>
      <td>
        <span style="padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;
          background: ${order.status === 'Delivered' ? '#d4edda' : order.status === 'Shipped' ? '#cce5ff' : '#fff3cd'};
          color: ${order.status === 'Delivered' ? '#155724' : order.status === 'Shipped' ? '#004085' : '#856404'};">
          ${order.status || 'Processing'}
        </span>
      </td>
      <td>
        <select onchange="updateOrderStatus(${index}, this.value)" style="padding: 4px; font-size: 12px;">
          <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
          <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
          <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
        </select>
      </td>
      <td>
        <button onclick="printInvoice(${index})" style="background:#007bff; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Print</button>
      </td>
    </tr>
  `).join('');
}

function updateOrderStatus(index, newStatus) {
  orders[index].status = newStatus;
  saveOrders();
  renderOrdersTable();
}

function printInvoice(index) {
  const order = orders[index];
  const invoiceWin = window.open('', '_blank');
  invoiceWin.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${order.orderId}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 30px; color: #333; }
          .header { border-bottom: 2px solid #b8860b; padding-bottom: 10px; margin-bottom: 20px; }
          .details { margin-bottom: 20px; line-height: 1.6; }
          .print-btn { background: #b8860b; color: #fff; border: none; padding: 10px 18px; cursor: pointer; border-radius: 4px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="color: #b8860b;">LUXE JEWELLERY - TAX INVOICE</h2>
        </div>
        <div class="details">
          <p><strong>Order ID:</strong> #${order.orderId}</p>
          <p><strong>Customer Name:</strong> ${order.name}</p>
          <p><strong>Phone:</strong> ${order.phone || 'N/A'}</p>
          <p><strong>Date:</strong> ${order.date}</p>
          <p><strong>Status:</strong> ${order.status || 'Processing'}</p>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <h3>Total Paid: ₹${(order.totalAmount || 0).toLocaleString('en-IN')}</h3>
        <br><br>
        <button class="print-btn" onclick="window.print()">Print Invoice</button>
      </body>
    </html>
  `);
  invoiceWin.document.close();
}

function exportOrdersToCSV() {
  if (orders.length === 0) return alert("No orders available to export!");
  let csvContent = "data:text/csv;charset=utf-8,Order ID,Customer Name,Date,Amount,Status\n";
  orders.forEach(o => {
    csvContent += `"${o.orderId}","${o.name}","${o.date}","${o.totalAmount}","${o.status || 'Processing'}"\n`;
  });
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `Luxe_Orders_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- PRODUCTS MANAGEMENT ---
function renderAdminProductsTable() {
  const tableBody = document.getElementById('admin-products-list');
  if (!tableBody) return;

  if (products.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 15px;">No products found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = products.map(product => `
    <tr>
      <td>#${product.id}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${product.image}" alt="${product.name}" style="width:30px; height:30px; border-radius:4px; object-fit:cover;">
          <span>${product.name}</span>
        </div>
      </td>
      <td>${product.category}</td>
      <td>${product.purity || 'N/A'}</td>
      <td>
        ${product.stock <= 2 
          ? `<span style="color:red; font-weight:bold;">⚠️ Low: ${product.stock}</span>` 
          : `<span style="color:green; font-weight:bold;">${product.stock}</span>`}
      </td>
      <td>
        <input type="number" value="${product.stock}" min="0" onchange="quickUpdateStock(${product.id}, this.value)" style="width:60px; padding:3px;">
      </td>
      <td>
        <button onclick="deleteProduct(${product.id})" class="btn-delete">Delete</button>
      </td>
    </tr>
  `).join('');
}

function quickUpdateStock(productId, newStock) {
  const prod = products.find(p => p.id === productId);
  if (prod) {
    prod.stock = parseInt(newStock, 10) || 0;
    saveProducts();
    renderAnalytics();
  }
}

function handleAddProduct(event) {
  event.preventDefault();

  const name = document.getElementById('prod-name').value;
  const category = document.getElementById('prod-category').value;
  const purity = document.getElementById('prod-purity').value;
  const weightGrams = parseFloat(document.getElementById('prod-weight').value) || 0;
  const makingCharge = parseFloat(document.getElementById('prod-making').value) || 0;
  const stock = parseInt(document.getElementById('prod-stock').value, 10) || 0;
  const imageFileInput = document.getElementById('prod-image-file');

  if (!imageFileInput.files || imageFileInput.files.length === 0) return alert("Please upload a product image!");

  const reader = new FileReader();
  reader.onload = function (e) {
    products.unshift({
      id: Date.now(),
      name, category, purity, weightGrams, makingCharge, price: 0, stock,
      rating: 5.0, reviewsCount: 0, image: e.target.result,
      description: `${purity} ${category} crafted with fine precision.`,
      sizes: category === "Rings" ? ["6", "7", "8"] : ["Standard"],
      selectedSize: category === "Rings" ? "7" : "Standard",
      userReviews: []
    });

    saveProducts();
    document.getElementById('add-product-form').reset();
    handleCategoryChange('Rings');
    renderAdminProductsTable();
    renderAnalytics();
    alert("Product added successfully!");
  };
  reader.readAsDataURL(imageFileInput.files[0]);
}

function deleteProduct(productId) {
  if (confirm("Delete this product?")) {
    products = products.filter(p => p.id !== productId);
    saveProducts();
    renderAdminProductsTable();
    renderAnalytics();
  }
}

// --- CUSTOMERS MANAGEMENT ---
function renderCustomersTable() {
  const tableBody = document.getElementById('admin-customers-list');
  if (!tableBody) return;

  const customerMap = {};
  orders.forEach(o => {
    const key = o.phone || o.name;
    if (!customerMap[key]) {
      customerMap[key] = { name: o.name, phone: o.phone || 'N/A', ordersCount: 0, totalSpend: 0 };
    }
    customerMap[key].ordersCount += 1;
    customerMap[key].totalSpend += (o.totalAmount || 0);
  });

  const customersList = Object.values(customerMap);

  if (customersList.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px;">No customer records.</td></tr>`;
    return;
  }

  tableBody.innerHTML = customersList.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.phone}</td>
      <td>${c.ordersCount}</td>
      <td>₹${c.totalSpend.toLocaleString('en-IN')}</td>
    </tr>
  `).join('');
}

function exportCustomersToCSV() {
  const customerMap = {};
  orders.forEach(o => {
    const key = o.phone || o.name;
    if (!customerMap[key]) customerMap[key] = { name: o.name, phone: o.phone || 'N/A', count: 0, spend: 0 };
    customerMap[key].count += 1;
    customerMap[key].spend += (o.totalAmount || 0);
  });

  let csvContent = "data:text/csv;charset=utf-8,Customer Name,Phone,Total Orders,Total Spend\n";
  Object.values(customerMap).forEach(c => {
    csvContent += `"${c.name}","${c.phone}","${c.count}","${c.spend}"\n`;
  });

  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", `Luxe_Customers_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// --- PROMO CODES ---
function renderCouponsTable() {
  const tableBody = document.getElementById('admin-coupons-list');
  if (!tableBody) return;

  tableBody.innerHTML = coupons.map((c, index) => `
    <tr>
      <td><strong>${c.code}</strong></td>
      <td>${c.type === 'percentage' ? 'Percentage Off' : 'Flat Discount'}</td>
      <td>${c.type === 'percentage' ? c.value + '%' : '₹' + c.value}</td>
      <td>
        <button onclick="deleteCoupon(${index})" class="btn-delete">Delete</button>
      </td>
    </tr>
  `).join('');
}

function handleAddCoupon(event) {
  event.preventDefault();
  const codeInput = document.getElementById('coupon-code');
  const typeInput = document.getElementById('coupon-type');
  const valueInput = document.getElementById('coupon-value');

  if (!codeInput || !typeInput || !valueInput) return;

  const code = codeInput.value.trim().toUpperCase();
  const type = typeInput.value;
  const value = parseFloat(valueInput.value);

  if (coupons.some(c => c.code === code)) return alert("Coupon exists!");

  coupons.push({ code, type, value });
  saveCoupons();
  document.getElementById('add-coupon-form').reset();
  renderCouponsTable();
}

function deleteCoupon(index) {
  coupons.splice(index, 1);
  saveCoupons();
  renderCouponsTable();
}

// --- METAL RATES & AUTOMATIC CALCULATION ---
function calculateAutoGoldRates() {
  const rate24kInput = document.getElementById('rate-24k');
  if (!rate24kInput) return;

  const rate24k = parseFloat(rate24kInput.value) || 0;

  // 24K ke basis par 22K, 20K aur 18K ka rate calculate karna
  const rate22k = Math.round((rate24k * 22) / 24);
  const rate20k = Math.round((rate24k * 20) / 24);
  const rate18k = Math.round((rate24k * 18) / 24);

  const r22 = document.getElementById('rate-22k');
  const r20 = document.getElementById('rate-20k');
  const r18 = document.getElementById('rate-18k');

  if (r22) r22.value = rate22k;
  if (r20) r20.value = rate20k;
  if (r18) r18.value = rate18k;
}

function populateRatesForm() {
  const r24 = document.getElementById('rate-24k');
  const r22 = document.getElementById('rate-22k');
  const r20 = document.getElementById('rate-20k');
  const r18 = document.getElementById('rate-18k');
  const rSilver = document.getElementById('rate-silver-input');

  const gold24k = metalRates.gold24k_10g || 72000;

  if (r24) r24.value = gold24k;
  if (rSilver) rSilver.value = metalRates.silver_1kg || 85000;

  // Storage se rates load karo, agar missing hain toh 24K se calculate kar do
  if (r22) r22.value = metalRates.gold22k_10g || Math.round((gold24k * 22) / 24);
  if (r20) r20.value = metalRates.gold20k_10g || Math.round((gold24k * 20) / 24);
  if (r18) r18.value = metalRates.gold18k_10g || Math.round((gold24k * 18) / 24);
}

function handleUpdateRates(event) {
  event.preventDefault();
  
  // Save karne se pehle ensure karo ki sub-rates updated ho
  calculateAutoGoldRates();

  metalRates = {
    gold24k_10g: parseFloat(document.getElementById('rate-24k').value) || 0,
    gold22k_10g: parseFloat(document.getElementById('rate-22k').value) || 0,
    gold20k_10g: parseFloat(document.getElementById('rate-20k').value) || 0,
    gold18k_10g: parseFloat(document.getElementById('rate-18k').value) || 0,
    silver_1kg: parseFloat(document.getElementById('rate-silver-input').value) || 0
  };
  localStorage.setItem('luxe_metal_rates', JSON.stringify(metalRates));
  alert("Live Metal Rates Updated!");
}

function setupMetalRatesListeners() {
  const rate24kInput = document.getElementById('rate-24k');
  if (rate24kInput) {
    // Input change hone par real-time auto calculation trigger
    rate24kInput.addEventListener('input', calculateAutoGoldRates);
  }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  renderAnalytics();
  renderAdminProductsTable();
  renderOrdersTable();
  renderCouponsTable();
  populateRatesForm();
  setupMetalRatesListeners(); // Dynamic event listener attach karna
});