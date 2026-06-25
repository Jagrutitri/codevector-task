require('dotenv').config();
const mongoose= require('mongoose');

async function testConnection() {
    console.log('Trying to connect');
    console.log('Using URI:', process.env.MONGODB_URI? 'fount in .env':'Missing');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected Successfully');

    await mongoose.disconnect(process.env.MONGODB_URI);
    console.log('Disconnected');
}

testConnection().catch((err)=>{
    console.error('Connection failed:', err.message);
})