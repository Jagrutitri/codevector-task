require('dotenv').config();
const mongoose= require('mongoose');
const Product= require('../src/models/product');

const CATEGORIES= ['Electronics', 'Toys', 'Books', 'Clothing'];

function randomFrom(arr){
    const index= Math.floor(Math.random() * arr.length);
    return arr[index];
}

function randomPastDate(){
    const now=Date.now();
    const oneyearms= 365*24*60*60*1000;

    const randomOffset= Math.floor(Math.random()*oneyearms);

    return new Date(now-randomOffset);
}

function makeoneFakeProduct(i){
    const createdAt= randomPastDate();
    return{
        name: `Product #${i}`,
        category: randomFrom(CATEGORIES),
        price: Math.round(Math.random()*5000),
        createdAt,
        updatedAt: createdAt,
    };
}

const totalproducts=200000;
const batchsize=5000;

async function seed() {
    console.log('connecting to Database');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    await Product.deleteMany({});
    console.log('Old Products Deleted');

    let totalInserted=0;
    const start= Date.now();

    for(let batchstart=0; batchstart<totalproducts; batchstart+=batchsize){
        const AllProducts=[];
        for(let i=0; i<batchsize; i++){
            AllProducts.push(makeoneFakeProduct(batchstart + i));
        }

        await Product.insertMany(AllProducts);
        totalInserted += AllProducts.length;
        console.log(`Inserted ${totalInserted}/${totalproducts}`);
    }

    const endingtime= Date.now()-start;
    console.log(`Inserted ${totalInserted} Products in ${endingtime}ms`);

    await mongoose.disconnect();
    console.log('Disconnected');

}

seed();