const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const port = 3000;
let conn = null;

const initMySQL = async () => {
    try {
        conn = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'webstock',
            port: 8700
        });
        console.log('Connected to MySQL database (webstock)');
    } catch (err) {
        console.error('Error connecting to MySQL:', err);
    }
}

//GET ดึงสินค้า
app.get('/api/products', async (req, res) => {
    try {
        const [results] = await conn.query('SELECT * FROM products');
        res.json(results);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});

//GET ดึงข้อมูลสินค้าตาม Id
app.get('/api/products/:id', async (req, res) => {
    try {
        let id = req.params.id;
        const [results] = await conn.query('SELECT * FROM products WHERE id = ?', [id]);
        
        if (results.length === 0) {
            return res.status(404).json({ message: 'ไม่พบสินค้านี้' });
        }
        res.json(results[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ message: 'Error fetching product' });
    }
});

//POST เพิ่มสินค้าใหม่
app.post('/api/products', async (req, res) => {
    try {
        let productData = req.body;

        if (!productData.name) {
            return res.status(400).json({ message: 'กรุณากรอกชื่อสินค้า' });
        }

        let newProduct = {
            name: productData.name,
            stock: productData.stock || 0,
            min_alert: productData.min_alert || 5
        };

        const [results] = await conn.query('INSERT INTO products SET ?', newProduct);
        res.status(201).json({
            message: 'เพิ่มสินค้าสำเร็จ',
            data: { id: results.insertId, newProduct }
        });
    } catch (error) {
        console.error('Error adding product:', error);
        res.status(500).json({ message: 'Error adding product' });
    }
});

// PUT แก้ไขข้อมูลสินค้า
app.put('/api/products/:id', async (req, res) => {
    try {
        let id = req.params.id;
        let updateProduct = req.body;

        const [check] = await conn.query('SELECT id FROM products WHERE id = ?', [id]);
        if (check.length === 0) return res.status(404).json({ message: 'ไม่พบสินค้านี้' });

        const [results] = await conn.query('UPDATE products SET ? WHERE id = ?', [updateProduct, id]);
        res.json({
            message: 'อัปเดตข้อมูลสินค้าสำเร็จ',
            affectedRows: results.affectedRows
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product' });
    }
});

// DELETE ลบสินค้า
app.delete('/api/products/:id', async (req, res) => {
    try {
        let id = req.params.id;

        const [check] = await conn.query('SELECT id FROM products WHERE id = ?', [id]);
        if (check.length === 0) return res.status(404).json({ message: 'ไม่พบสินค้านี้' });

        const [results] = await conn.query('DELETE FROM products WHERE id = ?', [id]);
        res.json({  
            message: 'ลบสินค้าสำเร็จ',
            affectedRows: results.affectedRows
        });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// POST บันทึกเข้า-ออก
app.post('/api/transactions', async (req, res) => {
    try {
        let { product_id, type, quantity } = req.body;

        if (!product_id || !type || !quantity) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน (product_id, type, quantity)' });
        }

        const [products] = await conn.query('SELECT * FROM products WHERE id = ?', [product_id]);
        if (products.length === 0) {
            return res.status(404).json({ message: 'ไม่พบรหัสสินค้านี้' });
        }
        let product = products[0];

        let newStock = product.stock;
        if (type === 'IN') {
            newStock += parseInt(quantity);
        } else if (type === 'OUT') {
            if (product.stock < quantity) {
                return res.status(400).json({ message: 'จำนวนสต๊อกไม่เพียงพอให้เบิกออก' });
            }
            newStock -= parseInt(quantity);
        } else {
            return res.status(400).json({ message: "type ต้องเป็น 'IN' หรือ 'OUT' เท่านั้น" });
        }

        // บันทึก transaction
        await conn.query('BEGIN');
        
        await conn.query('INSERT INTO transactions SET ?', {
            product_id: product_id,
            type: type,
            quantity: quantity
        });

        // 4. อัปเดตสต๊อกในตาราง products
        await conn.query('UPDATE products SET stock = ? WHERE id = ?', [newStock, product_id]);
        
        await conn.query('COMMIT');

        res.status(201).json({
            message: 'บันทึกรายการและอัปเดตสต๊อกสำเร็จ',
            new_stock: newStock
        });

    } catch (error) {
        await conn.query('ROLLBACK');
        console.error('Error handling transaction:', error);
        res.status(500).json({ message: 'Error handling transaction' });
    }
});

app.listen(port, async () => {
    await initMySQL();
    console.log(`Inventory API is running on http://localhost:${port}`);
});
