// ============================================================
//  Retail Shop Billing System — Frontend JavaScript
//  File: frontend/js/script.js
//  All pages share this single script file.
// ============================================================

// Auto-detect backend URL:
//   - In production (Vercel), reads the BACKEND_URL meta tag injected at build time
//   - Falls back to localhost for local development
const _meta = document.querySelector('meta[name="backend-url"]');
const API = (_meta && _meta.content && _meta.content !== "REPLACE_BACKEND_URL")
  ? _meta.content
  : "http://localhost:3000";

// ════════════════════════════════════════════════════════════
//  UTILITY HELPERS
// ════════════════════════════════════════════════════════════

/** Format number as Indian Rupees */
const rupees = (n) =>
  "₹" + parseFloat(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format date string to readable form */
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });

/** Show a temporary toast notification */
function toast(msg, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  const icons = { success: "✓", error: "✗", warn: "⚠" };
  el.innerHTML = `<span>${icons[type] || "•"}</span> ${msg}`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/** Simple GET fetch wrapper */
async function apiFetch(path) {
  const res = await fetch(API + path);
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json.data;
}

/** POST / PUT fetch wrapper */
async function apiPost(path, body, method = "POST") {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message);
  return json;
}

/** Mark the current page's nav link as active */
function setActiveNav() {
  const page = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".sidebar-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    if (href === page) a.classList.add("active");
  });
}

/** Confirm modal (returns Promise<boolean>) */
function confirmModal(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px">
        <div class="modal-header">
          <h3>Confirm Action</h3>
          <button class="modal-close" id="mc-cancel">✕</button>
        </div>
        <p style="color:var(--text-2);font-size:.92rem;">${message}</p>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="mc-no">Cancel</button>
          <button class="btn btn-danger" id="mc-yes">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const close = (v) => { overlay.remove(); resolve(v); };
    overlay.querySelector("#mc-yes").onclick    = () => close(true);
    overlay.querySelector("#mc-no").onclick     = () => close(false);
    overlay.querySelector("#mc-cancel").onclick = () => close(false);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
  });
}

// ════════════════════════════════════════════════════════════
//  DASHBOARD  (index.html)
// ════════════════════════════════════════════════════════════

async function initDashboard() {
  try {
    const stats = await apiFetch("/history/stats");
    document.getElementById("stat-revenue").textContent    = rupees(stats.total_revenue);
    document.getElementById("stat-bills").textContent      = stats.total_bills;
    document.getElementById("stat-products").textContent   = stats.total_products;
    document.getElementById("stat-avg").textContent        = rupees(stats.avg_bill_value);
    document.getElementById("stat-top").textContent        = stats.top_product;
  } catch (e) {
    console.error("Dashboard stats error:", e.message);
  }

  try {
    const bills = await apiFetch("/history");
    const tbody = document.getElementById("recent-bills-body");
    if (!bills.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:32px">No bills yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = bills.slice(0, 6).map((b) => `
      <tr>
        <td><span class="chip chip-accent">#${b.bill_id}</span></td>
        <td>${b.customer_name}</td>
        <td>${b.item_count} item(s)</td>
        <td class="fw-bold" style="color:var(--accent)">${rupees(b.total_amount)}</td>
        <td><small class="text-muted">${fmtDate(b.bill_date)}</small></td>
      </tr>`).join("");
  } catch (e) {
    console.error("Recent bills error:", e.message);
  }
}

// ════════════════════════════════════════════════════════════
//  PRODUCT MANAGEMENT  (products.html)
// ════════════════════════════════════════════════════════════

let allProducts = []; // cached list for search

async function initProducts() {
  await loadProducts();

  // Add / Edit form submit
  document.getElementById("product-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id   = document.getElementById("edit-product-id").value;
    const body = {
      product_name: document.getElementById("product-name").value.trim(),
      price       : parseFloat(document.getElementById("product-price").value),
      stock       : parseInt(document.getElementById("product-stock").value),
    };
    try {
      if (id) {
        await apiPost(`/products/${id}`, body, "PUT");
        toast("Product updated successfully!");
      } else {
        await apiPost("/products", body);
        toast("Product added successfully!");
      }
      closeProductModal();
      await loadProducts();
    } catch (err) {
      toast(err.message, "error");
    }
  });

  // Search
  document.getElementById("product-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    renderProductTable(allProducts.filter((p) =>
      p.product_name.toLowerCase().includes(q)
    ));
  });
}

async function loadProducts() {
  const tbody = document.getElementById("products-body");
  tbody.innerHTML = `<tr><td colspan="5"><div class="loader"><div class="spinner"></div> Loading…</div></td></tr>`;
  try {
    allProducts = await apiFetch("/products");
    renderProductTable(allProducts);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:32px">${e.message}</td></tr>`;
  }
}

function renderProductTable(products) {
  const tbody = document.getElementById("products-body");
  if (!products.length) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state"><div class="empty-icon">📦</div>
        <h3>No products found</h3><p>Add your first product to get started.</p>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = products.map((p) => {
    const stockClass = p.stock > 50 ? "chip-success" : p.stock > 10 ? "chip-warn" : "chip-danger";
    return `
      <tr>
        <td><span class="text-muted">#${p.product_id}</span></td>
        <td class="fw-bold">${p.product_name}</td>
        <td class="fw-bold" style="color:var(--accent)">${rupees(p.price)}</td>
        <td><span class="chip ${stockClass}">${p.stock} units</span></td>
        <td>
          <div class="td-actions">
            <button class="btn btn-warn btn-sm" onclick="openProductModal(${p.product_id})">✏ Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.product_id}, '${p.product_name}')">🗑 Delete</button>
          </div>
        </td>
      </tr>`;
  }).join("");
}

function openProductModal(id = null) {
  document.getElementById("product-modal").style.display = "flex";
  if (id) {
    const p = allProducts.find((x) => x.product_id === id);
    document.getElementById("modal-title").textContent           = "Edit Product";
    document.getElementById("edit-product-id").value            = p.product_id;
    document.getElementById("product-name").value               = p.product_name;
    document.getElementById("product-price").value              = p.price;
    document.getElementById("product-stock").value              = p.stock;
  } else {
    document.getElementById("modal-title").textContent  = "Add New Product";
    document.getElementById("product-form").reset();
    document.getElementById("edit-product-id").value   = "";
  }
}

function closeProductModal() {
  document.getElementById("product-modal").style.display = "none";
}

async function deleteProduct(id, name) {
  const ok = await confirmModal(`Delete <strong>${name}</strong>? This cannot be undone.`);
  if (!ok) return;
  try {
    await fetch(`${API}/products/${id}`, { method: "DELETE" });
    toast("Product deleted.", "warn");
    await loadProducts();
  } catch (e) {
    toast(e.message, "error");
  }
}

// ════════════════════════════════════════════════════════════
//  BILLING PAGE  (billing.html)
// ════════════════════════════════════════════════════════════

let cart = []; // [{ product_id, product_name, price, quantity }]

async function initBilling() {
  // Load products into the selector
  try {
    const products = await apiFetch("/products");
    const sel = document.getElementById("product-select");
    sel.innerHTML = `<option value="">— Select a Product —</option>` +
      products.map((p) =>
        `<option value="${p.product_id}" data-price="${p.price}" data-stock="${p.stock}">${p.product_name} — ${rupees(p.price)}</option>`
      ).join("");
  } catch (e) {
    toast("Could not load products: " + e.message, "error");
  }

  // Auto-fill price when a product is selected
  document.getElementById("product-select").addEventListener("change", (e) => {
    const opt   = e.target.selectedOptions[0];
    const price = opt?.dataset?.price || "";
    document.getElementById("item-price").value = price;
    document.getElementById("item-price-display").textContent = price ? rupees(price) : "—";
  });

  // Re-render unit price when qty changes
  document.getElementById("item-qty").addEventListener("input", () => {
    const price = parseFloat(document.getElementById("item-price").value) || 0;
    const qty   = parseInt(document.getElementById("item-qty").value) || 0;
    document.getElementById("item-subtotal").textContent = qty && price ? rupees(price * qty) : "—";
  });

  // Add to cart
  document.getElementById("add-to-cart-btn").addEventListener("click", addToCart);

  // Create Bill
  document.getElementById("create-bill-btn").addEventListener("click", createBill);

  renderCart();
}

function addToCart() {
  const sel   = document.getElementById("product-select");
  const opt   = sel.selectedOptions[0];
  const pid   = parseInt(sel.value);
  const qty   = parseInt(document.getElementById("item-qty").value);
  const price = parseFloat(document.getElementById("item-price").value);
  const stock = parseInt(opt?.dataset?.stock || 0);

  if (!pid)    return toast("Please select a product", "warn");
  if (!qty || qty < 1) return toast("Quantity must be at least 1", "warn");
  if (qty > stock) return toast(`Only ${stock} units in stock`, "warn");

  const existing = cart.find((c) => c.product_id === pid);
  if (existing) {
    if (existing.quantity + qty > stock)
      return toast(`Total quantity exceeds stock (${stock})`, "warn");
    existing.quantity += qty;
  } else {
    cart.push({ product_id: pid, product_name: opt.text.split(" — ")[0], price, quantity: qty });
  }

  // Reset selector fields
  sel.value = "";
  document.getElementById("item-qty").value = 1;
  document.getElementById("item-price").value = "";
  document.getElementById("item-price-display").textContent = "—";
  document.getElementById("item-subtotal").textContent = "—";

  renderCart();
  toast("Item added to cart ✓");
}

function removeFromCart(index) {
  cart.splice(index, 1);
  renderCart();
}

function renderCart() {
  const listEl  = document.getElementById("cart-list");
  const totalEl = document.getElementById("cart-total");
  const createBtn = document.getElementById("create-bill-btn");

  if (!cart.length) {
    listEl.innerHTML  = `<li class="cart-empty">🛒 No items added yet.</li>`;
    totalEl.innerHTML = "";
    createBtn.disabled = true;
    return;
  }

  createBtn.disabled = false;

  listEl.innerHTML = cart.map((item, i) => `
    <li class="cart-item">
      <span class="item-name">${item.product_name}</span>
      <span class="item-qty">${item.quantity} × ${rupees(item.price)}</span>
      <span class="item-price">${rupees(item.price * item.quantity)}</span>
      <button class="item-remove" onclick="removeFromCart(${i})" title="Remove">✕</button>
    </li>`).join("");

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const gst      = subtotal * 0.00; // no tax for simplicity — can extend
  const grand    = subtotal + gst;

  totalEl.innerHTML = `
    <div class="total-box">
      <div class="total-row"><span>Subtotal</span><span>${rupees(subtotal)}</span></div>
      <div class="total-row"><span>Discount</span><span>₹0.00</span></div>
      <div class="total-row grand"><span>Grand Total</span><span>${rupees(grand)}</span></div>
    </div>`;
}

async function createBill() {
  const customer = document.getElementById("customer-name").value.trim();
  if (!customer) return toast("Please enter customer name", "warn");
  if (!cart.length) return toast("Cart is empty", "warn");

  const body = {
    customer_name: customer,
    items: cart.map((i) => ({
      product_id  : i.product_id,
      product_name: i.product_name,
      quantity    : i.quantity,
      price       : i.price,
    })),
  };

  try {
    const res = await apiPost("/bills", body);
    toast(`Bill #${res.bill_id} created! Redirecting…`);
    cart = [];
    renderCart();
    document.getElementById("customer-name").value = "";
    setTimeout(() => {
      window.location.href = `invoice.html?id=${res.bill_id}`;
    }, 1000);
  } catch (e) {
    toast(e.message, "error");
  }
}

// ════════════════════════════════════════════════════════════
//  INVOICE PAGE  (invoice.html)
// ════════════════════════════════════════════════════════════

async function initInvoice() {
  const params = new URLSearchParams(location.search);
  const id     = params.get("id");
  if (!id) {
    document.getElementById("invoice-container").innerHTML =
      `<div class="empty-state"><div class="empty-icon">🧾</div><h3>No Invoice Selected</h3><p>Go to Billing History and click View on a bill.</p></div>`;
    return;
  }

  try {
    const bill = await apiFetch(`/bills/${id}`);
    renderInvoice(bill);
  } catch (e) {
    toast(e.message, "error");
  }
}

function renderInvoice(bill) {
  const container = document.getElementById("invoice-container");
  const itemRows  = bill.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.product_name}</td>
      <td class="text-right">${rupees(item.price)}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right fw-bold">${rupees(item.subtotal)}</td>
    </tr>`).join("");

  container.innerHTML = `
    <div class="invoice-paper" id="print-area">
      <div class="invoice-header">
        <div>
          <div class="invoice-shop-name">🛍 ShopEase Retail</div>
          <div class="invoice-shop-meta">
            123 Market Street, Coimbatore<br>
            Tamil Nadu, India — 641001<br>
            Tel: +91 98765 43210
          </div>
        </div>
        <div class="invoice-meta-right">
          <div class="invoice-bill-id">Invoice #${bill.bill_id}</div>
          <div class="invoice-date">${fmtDate(bill.bill_date)}</div>
          <div class="mt-8">
            <span class="chip chip-success">PAID</span>
          </div>
        </div>
      </div>

      <div class="invoice-customer">
        <strong>Billed To:</strong> &nbsp; ${bill.customer_name}
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Product</th>
            <th class="text-right">Unit Price</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <div class="invoice-totals">
        <div class="invoice-total-row"><span>Subtotal</span><span>${rupees(bill.total_amount)}</span></div>
        <div class="invoice-total-row"><span>GST (0%)</span><span>₹0.00</span></div>
        <div class="invoice-total-row"><span>Grand Total</span><span>${rupees(bill.total_amount)}</span></div>
      </div>

      <div class="invoice-footer">
        Thank you for shopping at ShopEase Retail! &nbsp;•&nbsp; Goods once sold will not be taken back.
      </div>
    </div>

    <div class="flex gap-8 mt-16 no-print" style="justify-content:center">
      <button class="btn btn-secondary" onclick="history.back()">← Go Back</button>
      <button class="btn btn-primary" onclick="window.print()">🖨 Print Invoice</button>
    </div>`;
}

// ════════════════════════════════════════════════════════════
//  BILLING HISTORY  (history.html)
// ════════════════════════════════════════════════════════════

let allBills = [];

async function initHistory() {
  const tbody = document.getElementById("history-body");
  tbody.innerHTML = `<tr><td colspan="6"><div class="loader"><div class="spinner"></div> Loading…</div></td></tr>`;

  try {
    allBills = await apiFetch("/history");
    renderHistoryTable(allBills);
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding:32px">${e.message}</td></tr>`;
  }

  // Search
  document.getElementById("history-search")?.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    renderHistoryTable(allBills.filter((b) =>
      b.customer_name.toLowerCase().includes(q) ||
      String(b.bill_id).includes(q)
    ));
  });
}

function renderHistoryTable(bills) {
  const tbody = document.getElementById("history-body");
  if (!bills.length) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state"><div class="empty-icon">📄</div>
        <h3>No billing history</h3><p>Bills will appear here once created.</p>
      </div></td></tr>`;
    return;
  }
  tbody.innerHTML = bills.map((b) => `
    <tr>
      <td><span class="chip chip-accent">#${b.bill_id}</span></td>
      <td class="fw-bold">${b.customer_name}</td>
      <td class="text-center">${b.item_count}</td>
      <td class="fw-bold" style="color:var(--accent)">${rupees(b.total_amount)}</td>
      <td><small class="text-muted">${fmtDate(b.bill_date)}</small></td>
      <td>
        <a class="btn btn-primary btn-sm" href="invoice.html?id=${b.bill_id}">🧾 View Invoice</a>
      </td>
    </tr>`).join("");
}

// ════════════════════════════════════════════════════════════
//  BOOT — detect which page is loaded and init
// ════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  setActiveNav();

  const page = location.pathname.split("/").pop();
  if (page === "index.html"    || page === "")          initDashboard();
  if (page === "products.html")                          initProducts();
  if (page === "billing.html")                           initBilling();
  if (page === "invoice.html")                           initInvoice();
  if (page === "history.html")                           initHistory();
});
