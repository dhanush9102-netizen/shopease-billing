# 🛍 ShopEase — Retail Shop Billing System

> A complete full-stack web application for small retail shops.
> Built with **Node.js + Express + MySQL + Vanilla JS**.
> Academic Project — suitable for submission.

---

## 📁 Folder Structure

```
billing-system/
├── frontend/
│   ├── index.html          ← Dashboard
│   ├── products.html       ← Product Management (CRUD)
│   ├── billing.html        ← Create Bills
│   ├── invoice.html        ← View / Print Invoice
│   ├── history.html        ← Billing History
│   ├── css/
│   │   └── style.css       ← All styling
│   └── js/
│       └── script.js       ← All frontend logic
├── backend/
│   ├── server.js           ← Express API server
│   └── package.json        ← Node dependencies
├── database/
│   └── billing.sql         ← Database schema + sample data
└── README.md
```

---

## ⚙️ Setup Instructions

### Step 1 — Install Prerequisites
- [Node.js](https://nodejs.org/) v16+
- [MySQL](https://dev.mysql.com/downloads/) 5.7+ (or MySQL Workbench)

### Step 2 — Set Up the Database

1. Open **MySQL Workbench** or the MySQL CLI.
2. Run the SQL script:
   ```sql
   source /path/to/billing-system/database/billing.sql;
   ```
   Or paste the contents of `billing.sql` directly into MySQL Workbench and click **Execute**.

This will:
- Create the `billing_system` database
- Create the `products`, `bills`, and `bill_items` tables
- Insert 15 sample products and 3 sample bills

### Step 3 — Configure Database Credentials

Open `backend/server.js` and update lines 16–19:

```js
const db = mysql.createPool({
  host    : "localhost",
  user    : "root",       // ← your MySQL username
  password: "",           // ← your MySQL password
  database: "billing_system",
});
```

### Step 4 — Install Node Dependencies

```bash
cd billing-system/backend
npm install
```

### Step 5 — Start the Server

```bash
node server.js
# or for auto-reload during development:
npm run dev
```

You should see:
```
✅  Connected to MySQL database: billing_system
🚀  Billing System server running at http://localhost:3000
```

### Step 6 — Open the App

Open your browser and navigate to:
```
http://localhost:3000/index.html
```

---

## 🗄️ Database Schema

### `products`
| Column       | Type           | Description           |
|--------------|----------------|-----------------------|
| product_id   | INT (PK, AI)   | Unique product ID     |
| product_name | VARCHAR(150)   | Name of product       |
| price        | DECIMAL(10,2)  | Unit price in ₹       |
| stock        | INT            | Available stock       |
| created_at   | TIMESTAMP      | Record creation time  |

### `bills`
| Column        | Type           | Description            |
|---------------|----------------|------------------------|
| bill_id       | INT (PK, AI)   | Unique bill ID         |
| customer_name | VARCHAR(150)   | Customer's name        |
| total_amount  | DECIMAL(10,2)  | Grand total of the bill|
| bill_date     | TIMESTAMP      | Date/time of bill      |

### `bill_items`
| Column     | Type           | Description                     |
|------------|----------------|---------------------------------|
| id         | INT (PK, AI)   | Unique line-item ID             |
| bill_id    | INT (FK)       | References `bills.bill_id`      |
| product_id | INT (FK)       | References `products.product_id`|
| quantity   | INT            | Quantity purchased              |
| price      | DECIMAL(10,2)  | Unit price at time of sale      |

---

## 🔌 REST API Endpoints

### Products
| Method | Endpoint          | Description          |
|--------|-------------------|----------------------|
| GET    | /products         | List all products    |
| GET    | /products/:id     | Get single product   |
| POST   | /products         | Add new product      |
| PUT    | /products/:id     | Update product       |
| DELETE | /products/:id     | Delete product       |

**POST/PUT body:**
```json
{
  "product_name": "Basmati Rice (1 kg)",
  "price": 65.00,
  "stock": 200
}
```

### Bills
| Method | Endpoint   | Description                      |
|--------|------------|----------------------------------|
| POST   | /bills     | Create new bill                  |
| GET    | /bills/:id | Get bill with items (for invoice)|

**POST /bills body:**
```json
{
  "customer_name": "Ravi Kumar",
  "items": [
    { "product_id": 1, "product_name": "Rice", "quantity": 2, "price": 65.00 }
  ]
}
```

### History
| Method | Endpoint        | Description             |
|--------|-----------------|-------------------------|
| GET    | /history        | List all bills          |
| GET    | /history/stats  | Dashboard statistics    |

---

## 📄 Module Explanation

### 1. Dashboard (`index.html`)
- Fetches total revenue, bills count, products count, avg bill, top product
- Shows last 6 bills
- Quick links to Products and New Bill

### 2. Product Management (`products.html`)
- Full CRUD for products via REST API
- Live search/filter by name
- Add/Edit via modal popup
- Stock level shown with color-coded badges

### 3. Billing Page (`billing.html`)
- Dropdown to select product; auto-fills price
- Add multiple items to cart
- Running total calculated: `Total = Price × Quantity`
- POST to `/bills` on submit → redirects to invoice

### 4. Invoice Page (`invoice.html`)
- Reads `?id=X` from URL
- Fetches bill + items from `/bills/:id`
- Renders a printable A4-style invoice
- Print button triggers `window.print()`

### 5. Billing History (`history.html`)
- Lists all bills newest-first
- Search by customer name or bill ID
- Link to view invoice for each bill

### 6. Backend (`server.js`)
- Express REST API on port 3000
- MySQL2 connection pool
- Transaction used when creating bills (atomic insert)
- Stock auto-deducted when bill is created

---

## 🧪 Sample Invoice Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛍 ShopEase Retail                Invoice #1
123 Market Street, Coimbatore     01 Mar 2025
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Billed To: Ravi Kumar
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#  Product             Unit ₹   Qty   Total
1  Basmati Rice 1kg    65.00    2    130.00
2  Tata Salt 1kg       20.00    1     20.00
3  Sugar 1kg           45.00    1     45.00
4  Biscuits (Parle-G)  10.00    3     30.00
5  Milk 500ml          28.00    2     56.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Grand Total:                        ₹281.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thank you for shopping at ShopEase Retail!
```

---

## 🛠 Technologies Used

| Layer    | Technology         | Purpose                        |
|----------|--------------------|--------------------------------|
| Frontend | HTML5              | Page structure                 |
| Frontend | CSS3               | Styling and responsive layout  |
| Frontend | Vanilla JavaScript | Dynamic UI, API calls (fetch)  |
| Backend  | Node.js            | JavaScript runtime             |
| Backend  | Express.js         | REST API framework             |
| Database | MySQL              | Persistent data storage        |
| Library  | mysql2             | MySQL driver for Node.js       |
| Library  | cors               | Cross-origin request handling  |

---

*Academic Project — ShopEase Billing System*
