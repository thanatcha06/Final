const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());
const port = 3000;

app.get("/low-stock", (req, res) => {
  const sql = `
    SELECT p.id, p.name, p.min_stock, 
    IFNULL(SUM(CASE WHEN t.type='IN' THEN t.quantity WHEN t.type='OUT' THEN -t.quantity END), 0) AS current_stock
    FROM products p
    LEFT JOIN transactions t ON p.id = t.product_id
    GROUP BY p.id
    HAVING current_stock <= p.min_stock
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

app.get("/report/daily", (req, res) => {
  const sql = `
    SELECT DATE(created_at) as date, type, SUM(quantity) as total_qty
    FROM transactions
    WHERE DATE(created_at) = CURDATE()
    GROUP BY DATE(created_at), type`; 
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.get("/report/monthly", (req, res) => {
  const sql = `
    SELECT 
      MONTHNAME(created_at) as month, YEAR(created_at) as year, type, SUM(quantity) as total_qty
    FROM transactions
    WHERE YEAR(created_at) = YEAR(CURDATE())
    GROUP BY year, month, type
    ORDER BY FIELD(month, 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December') DESC
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err); 
    res.json(result);
  });
});


app.listen(3000,()=>{
  console.log(`Server run at http://localhost:${port}`);
});