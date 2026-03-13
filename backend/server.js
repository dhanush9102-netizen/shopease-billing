// ============================================================
//  Retail Shop Billing System — Backend Server
//  Stack  : Node.js + Express.js + MySQL2
//  DB     : Clever Cloud MySQL (no SSL needed)
//  Host   : Render Web Service
//  File   : backend/server.js
// ============================================================

// Load .env file when running locally (ignored on Render)
require("dotenv").config();

const express = require("express");
const mysql   = require("mysql2");
const cors    = require("cors");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────────
// FRONTEND_URL = your Vercel URL  e.g. https://shopease.vercel.app
// Leave as "*" only during initial testing, then lock it down.
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

app.use(cors({
  origin     : FRONTEND_URL,
  methods    : ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
}));
app.options("*", cors());   // handle pre-flight for all routes
app.use(express.json());

// ── Clever Cloud MySQL Connection Pool ───────────────────────
// Clever Cloud does NOT need SSL — it uses plain TCP on port 3306.
// All 5 env vars below are copy-pasted from the Clever Cloud
// "Environment variables" tab of your MySQL add-on.
const db = mysql.createPool({
  host              : process.env.MYSQL_ADDON_HOST,
  user              : process.env.MYSQL_ADDON_USER,
  password          : process.env.MYSQL_ADDON_PASSWORD,
  database          : process.env.MYSQL_ADDON_DB,
  port              : parseInt(process.env.MYSQL_ADDON_PORT) || 3306,
  ssl               : false,          // Clever Cloud = no SSL required
  waitForConnections: true,
  connectionLimit   : 5,              // free tier limit
  connectTimeout    : 20000,          // 20 s — CC can be slow on first connect
  // Keep-alive: prevents Clever Cloud from closing idle connections
  enableKeepAlive   : true,
  keepAliveInitialDelay: 30000,
});

// ── Startup connection test ──────────────────────────────────
db.getConnection((err, conn) => {
  if (err) {
    console.error("❌  Clever Cloud MySQL connection failed:", err.message);
    console.error("    Check that all MYSQL_ADDON_* env vars are set on Render.");
    process.exit(1);
  }
  console.log("✅  Connected to Clever Cloud MySQL —", process.env.MYSQL_ADDON_DB);
  conn.release();
});

// ── Promise wrapper ──────────────────────────────────────────
const query = (sql, params = []) =>
  new Promise((resolve, reject) =>
    db.query(sql, params, (err, results) =>
      err ? reject(err) : resolve(results)
    )
  );

// ── Health / Root ────────────────────────────────────────────
// Render free tier pings / every 5 min to prevent spin-down.
app.get("/", (_req, res) =>
  res.json({ status: "ok", service: "ShopEase Billing API", ts: new Date().toISOString() })
);
app.get("/health", (_req, res) =>
  res.json({ status: "ok", ts: new Date().toISOString() })
);

// ════════════════════════════════════════════════════════════
//  PRODUCT ROUTES   /products
// ════════════════════════════════════════════════════════════

// GET /products — list all products
app.get("/products", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM products ORDER BY product_name ASC"
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /products/:id — single product
app.get("/products/:id", async (req, res) => {
  try {
    const rows = await query(
      "SELECT * FROM products WHERE product_id = ?",
      [req.params.id]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /products — add new product
app.post("/products", async (req, res) => {
  const { product_name, price, stock } = req.body;
  // Basic validation
  if (!product_name || price == null || stock == null)
    return res.status(400).json({ success: false, message: "product_name, price, and stock are required" });

  try {
    const result = await query(
      "INSERT INTO products (product_name, price, stock) VALUES (?, ?, ?)",
      [product_name, price, stock]
    );
    res.status(201).json({
      success    : true,
      message    : "Product added successfully",
      product_id : result.insertId,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /products/:id — update product
app.put("/products/:id", async (req, res) => {
  const { product_name, price, stock } = req.body;
  if (!product_name || price == null || stock == null)
    return res.status(400).json({ success: false, message: "product_name, price, and stock are required" });

  try {
    const result = await query(
      "UPDATE products SET product_name=?, price=?, stock=? WHERE product_id=?",
      [product_name, price, stock, req.params.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product updated successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /products/:id — remove product
app.delete("/products/:id", async (req, res) => {
  try {
    const result = await query(
      "DELETE FROM products WHERE product_id=?",
      [req.params.id]
    );
    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  BILLING ROUTES   /bills
// ════════════════════════════════════════════════════════════

// POST /bills — create a new bill with line items
app.post("/bills", async (req, res) => {
  const { customer_name, items } = req.body;
  // items = [{ product_id, product_name, quantity, price }, ...]

  if (!customer_name || !items || !items.length)
    return res.status(400).json({ success: false, message: "customer_name and items[] are required" });

  // Calculate grand total
  const total_amount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Use a connection to run a transaction (insert bill + items atomically)
  db.getConnection((connErr, conn) => {
    if (connErr)
      return res.status(500).json({ success: false, message: connErr.message });

    conn.beginTransaction(async (txErr) => {
      if (txErr) {
        conn.release();
        return res.status(500).json({ success: false, message: txErr.message });
      }

      try {
        // 1. Insert bill header
        const billResult = await new Promise((resolve, reject) =>
          conn.query(
            "INSERT INTO bills (customer_name, total_amount) VALUES (?, ?)",
            [customer_name, total_amount],
            (e, r) => (e ? reject(e) : resolve(r))
          )
        );
        const bill_id = billResult.insertId;

        // 2. Insert each line item + reduce stock
        for (const item of items) {
          await new Promise((resolve, reject) =>
            conn.query(
              "INSERT INTO bill_items (bill_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
              [bill_id, item.product_id, item.quantity, item.price],
              (e, r) => (e ? reject(e) : resolve(r))
            )
          );
          // Deduct stock
          await new Promise((resolve, reject) =>
            conn.query(
              "UPDATE products SET stock = stock - ? WHERE product_id = ?",
              [item.quantity, item.product_id],
              (e, r) => (e ? reject(e) : resolve(r))
            )
          );
        }

        // 3. Commit
        conn.commit((commitErr) => {
          conn.release();
          if (commitErr)
            return res.status(500).json({ success: false, message: commitErr.message });

          res.status(201).json({
            success      : true,
            message      : "Bill created successfully",
            bill_id,
            total_amount : total_amount.toFixed(2),
          });
        });
      } catch (err) {
        conn.rollback(() => {
          conn.release();
          res.status(500).json({ success: false, message: err.message });
        });
      }
    });
  });
});

// GET /bills/:id — fetch a single bill + its items (for invoice)
app.get("/bills/:id", async (req, res) => {
  try {
    const bills = await query(
      "SELECT * FROM bills WHERE bill_id = ?",
      [req.params.id]
    );
    if (!bills.length)
      return res.status(404).json({ success: false, message: "Bill not found" });

    const items = await query(
      `SELECT bi.id, bi.quantity, bi.price,
              p.product_name,
              (bi.quantity * bi.price) AS subtotal
       FROM   bill_items bi
       JOIN   products p ON p.product_id = bi.product_id
       WHERE  bi.bill_id = ?`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...bills[0], items } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ════════════════════════════════════════════════════════════
//  HISTORY ROUTES   /history
// ════════════════════════════════════════════════════════════

// GET /history — list all bills (summary)
app.get("/history", async (req, res) => {
  try {
    const rows = await query(
      `SELECT b.bill_id,
              b.customer_name,
              b.total_amount,
              b.bill_date,
              COUNT(bi.id) AS item_count
       FROM   bills b
       LEFT JOIN bill_items bi ON bi.bill_id = b.bill_id
       GROUP BY b.bill_id
       ORDER BY b.bill_date DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /history/stats — total sales statistics for dashboard
app.get("/history/stats", async (req, res) => {
  try {
    const [[totals]] = await Promise.all([
      query(
        `SELECT
           COUNT(*)               AS total_bills,
           IFNULL(SUM(total_amount),0) AS total_revenue,
           IFNULL(AVG(total_amount),0) AS avg_bill_value
         FROM bills`
      ),
    ]);
    const [topProduct] = await query(
      `SELECT p.product_name, SUM(bi.quantity) AS units_sold
       FROM bill_items bi
       JOIN products p ON p.product_id = bi.product_id
       GROUP BY bi.product_id
       ORDER BY units_sold DESC
       LIMIT 1`
    );
    const [productCount] = await query(
      "SELECT COUNT(*) AS total FROM products"
    );

    res.json({
      success : true,
      data    : {
        total_bills    : totals.total_bills,
        total_revenue  : parseFloat(totals.total_revenue).toFixed(2),
        avg_bill_value : parseFloat(totals.avg_bill_value).toFixed(2),
        top_product    : topProduct ? topProduct.product_name : "N/A",
        total_products : productCount.total,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀  ShopEase API running on port ${PORT}`);
  console.log(`    DB  : ${process.env.MYSQL_ADDON_HOST}/${process.env.MYSQL_ADDON_DB}`);
  console.log(`    CORS: ${FRONTEND_URL}`);
});
