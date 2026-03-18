const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root', 
  database: 'webstock',                    
  port: parseInt(process.env.DB_PORT) || 8700
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("เชื่อมต่อ webstock ไม่สำเร็จ:", err.message);
  } else {
    console.log("เชื่อมต่อฐานข้อมูล webstock เรียบร้อยแล้ว!");
    connection.release();
  }
});

module.exports = pool;