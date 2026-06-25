require('dotenv').config();
const mongoose= require('mongoose');
const Product= require('../src/models/product');

async function fetchPage(cursor, limit){
    const filter={};
    if(cursor){
        filter.$or=[
            {createdAt: {$lt: cursor.createdAt}},
            {createdAt: cursor.createdAt, _id: {$lt: cursor.id}},
        ];
    }
    const docs= (await Product.find(filter)).toSorted({createdAt: -1, _id: -1})
    .limit(limit).lean();

    let nextcursor= null;
    if(docs.length>0){
        const last= docs[docs.length-1];
        nextcursor={ createdAt: last.createdAt, id: last._id};
    }
    return {docs, nextcursor};
}

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected');

    const alldocs= await Product.find({}).select('_id').lean();
    const snapshotIds= new Set(alldocs.map(doc=> doc._id.toString()));
    console.log('Snapshot size :', snapshotIds.size);

    const seen= new Set();
    const duplicates= [];
    let cursor= null;
    let pageNum= 0;
    let hasInjected= false;
    const LIMIT=20;

    while(true){
        const {docs, nextcursor}= await fetchPage(cursor, LIMIT);
        pageNum++;

        for(const doc of docs){
            const id= doc._id.toString();
            if(seen.has(id)){
                duplicates.push(id);
            }
            seen.add(id);
        }

        console.log(`Page ${pageNum}: got ${docslength} Products, total seen so far: ${seen.size}`);

        if(pageNum==2 && !hasInjected){
            hasInjected= true;
            console.log('injecting 50 new products and updating 50 existing ones');

            const newProducts= [];
            for(let i=0; i<50; i++){
                newProducts.push({
                    name: `Injected Products #${i}`,
                    category: 'Electronics',
                    price: 999,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }

            await Product.insertMany(newProducts);

            const idsAlreadySeen= Array.from(seen).slice(0, 50);
            await Product.updateMany(
                {_id: {$in: idsAlreadySeen}},
                {$set: {price: 12345, updatedAt: new Date()} }
            );

            console.log('Injection Complete');
        }

        if(docs.length < LIMIT){
            break;
        }
        cursor= nextcursor;
    }

    console.log('DONE');
    console.log('Total Pages: ', pageNum);
    console.log('Total Unique Products seen: ', seen.size);
    console.log('Total Duplicates found: ', duplicates.length);

    let missing=0;
    for(const id of snapshotIds){
        if(!seen.has(id)) missing++;
    }

    console.log('Original Products never seen: ', missing);

    if(duplicates.length==0 && missing==0){
        console.log('PASSED: No duplicates, nothing missed');
    }
    else{
        console.log('FAIL: something went wrong');
    }

    await mongoose.disconnect();
}

run();