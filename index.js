const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const port = 3000;

let products = [
    { id: 1, name: 'คีย์บอร์ด', stock: 20, min_alert: 5 },
    { id: 2, name: 'เมาส์', stock: 3, min_alert: 5 }
];
let productCounter = 3;

let transactions = [];
let transactionCounter = 1;


app.get('/api/products', (req, res) => {
    const results = products.map(product => {
        return {
            ...product,
            status: product.stock <= product.min_alert ? 'LOW STOCK' : 'OK'
        };
    });
    res.json(results);
});

app.get('/api/products/:id', (req, res) => {
    let id = parseInt(req.params.id);
    let product = products.find(p => p.id === id);
    
    if (!product) {
        return res.status(404).json({ message: 'ไม่พบสินค้านี้' });
    }
    res.json(product);
});

app.get('/api/transactions', (req, res) => {
    res.json(transactions);
});

app.post('/api/products', (req, res) => {
    let { name, stock, min_alert } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'กรุณากรอกชื่อสินค้า' });
    }

    let newProduct = {
        id: productCounter++,
        name: name,
        stock: stock || 0,
        min_alert: min_alert || 5
    };

    products.push(newProduct);
    res.status(201).json({
        message: 'เพิ่มสินค้าใหม่สำเร็จ',
        product: newProduct
    });
});

app.put('/api/products/:id', (req, res) => {
    let id = parseInt(req.params.id);
    let { name, stock, min_alert } = req.body;

    let index = products.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'ไม่พบสินค้านี้' });
    }

    if (!name || stock === undefined || min_alert === undefined) {
        return res.status(400).json({ message: 'PUT ต้องส่งข้อมูลให้ครบ (name, stock, min_alert)' });
    }

    products[index] = { id: id, name: name, stock: stock, min_alert: min_alert };
    
    res.json({
        message: 'อัปเดตสินค้าสำเร็จ (PUT)',
        product: products[index]
    });
});

app.patch('/api/products/:id', (req, res) => {
    let id = parseInt(req.params.id);
    let updateData = req.body;

    let index = products.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'ไม่พบสินค้านี้' });
    }

    if (updateData.name !== undefined) products[index].name = updateData.name;
    if (updateData.stock !== undefined) products[index].stock = updateData.stock;
    if (updateData.min_alert !== undefined) products[index].min_alert = updateData.min_alert;

    res.json({
        message: 'อัปเดตสินค้าสำเร็จ (PATCH)',
        product: products[index]
    });
});

app.delete('/api/products/:id', (req, res) => {
    let id = parseInt(req.params.id);
    let index = products.findIndex(p => p.id === id);
    
    if (index === -1) {
        return res.status(404).json({ message: 'ไม่พบสินค้านี้' });
    }

    let deletedProduct = products.splice(index, 1);
    
    res.json({
        message: 'ลบสินค้าสำเร็จ',
        product: deletedProduct[0]
    });
});

app.post('/api/transactions', (req, res) => {
    try {
        let { product_id, type, quantity } = req.body;
        
        product_id = parseInt(product_id);
        quantity = parseInt(quantity);

        if (!product_id || !type || !quantity) {
            return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน (product_id, type, quantity)' });
        }

        let selectedIndex = products.findIndex(p => p.id === product_id);
        if (selectedIndex === -1) {
            return res.status(404).json({ message: 'ไม่พบรหัสสินค้านี้' });
        }

        if (type === 'IN') {
            products[selectedIndex].stock += quantity;
        } else if (type === 'OUT') {
            if (products[selectedIndex].stock < quantity) {
                return res.status(400).json({ message: 'จำนวนสต๊อกไม่เพียงพอให้เบิกออก' });
            }
            products[selectedIndex].stock -= quantity;
        } else {
            return res.status(400).json({ message: 'ประเภทต้องเป็น IN หรือ OUT เท่านั้น' });
        }

        const newTransaction = {
            id: transactionCounter++,
            product_id: product_id,
            type: type,
            quantity: quantity,
            transaction_date: new Date()
        };
        transactions.push(newTransaction);

        res.json({
            message: 'บันทึกรายการสำเร็จ',
            updatedProduct: products[selectedIndex],
            transaction: newTransaction
        });

    } catch (error) {
        console.error('Error handling transaction:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Inventory Server is running on http://localhost:${port}`);
});
