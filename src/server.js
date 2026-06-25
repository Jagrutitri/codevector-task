require('dotenv').config();
const express= require('express');
const mongoose= require('mongoose');
const Product= require('./models/product');

const app= express();

app.use(express.static('public'));

function encodeCursor(doc){
    const payload= JSON.stringify({
        createdAt: doc.createdAt.toISOString(), //returns a date as string value in iso format
        id: doc._id.toString(),
    });
    return Buffer.from(payload, 'utf8').toString('base64');
}

function decodeCursor(cursorStr){
    const json= Buffer.from(cursorStr, 'base64').toString('utf8');
    const parsed= JSON.parse(json);
    return {
        createdAt: new Date(parsed.createdAt),
        id: parsed.id,
    };
}

app.get('/api/categories', async (req, res) => {
  const categories = await Product.distinct('category');
  res.json({ categories: categories.sort() });
});

app.get('/api/products', async (req, res)=>{
    const limit=5;
    const cursor= req.query.cursor;
    const category= req.query.category;

    const filter={};
    
    if(category){
        filter.category= category;
    }

    if(cursor){
        const decoded= decodeCursor(cursor);
        filter.$or=[
            {createdAt: {$lt: decoded.createdAt}},
            {createdAt: decoded.createdAt, _id: {$lt: decoded.id}},
        ];
    }

    const products= await Product.find(filter).sort({createdAt: -1, _id: -1}).limit(limit);
    
    let nextcursor= null;
    if(products.length > 0){
        nextcursor= encodeCursor(products[products.length-1]);
    }

    res.json({
        data: products, nextcursor
    });
});

const PORT= process.env.PORT || 4000;

async function startServer() {
    console.log('Connecting to Database');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to Database');
    
    app.listen(PORT, ()=>{
        console.log(`server running on http://localhost:${PORT}`);
    });
}

startServer();