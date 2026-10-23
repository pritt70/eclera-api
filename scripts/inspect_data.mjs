import mongoose from 'mongoose';
import config from '../helper/config.js';

async function main() {
    await mongoose.connect(config.DB_URL);
    
    console.log('--- CATEGORIES ---');
    const categories = await mongoose.connection.db.collection('categories').find({}).toArray();
    categories.forEach(c => console.log(c._id, c.name, c.slug, c.image));

    console.log('\n--- COLLECTIONS ---');
    const collections = await mongoose.connection.db.collection('collections').find({}).toArray();
    collections.forEach(c => console.log(c._id, c.name, c.slug, c.image));

    console.log('\n--- PRODUCTS ---');
    const products = await mongoose.connection.db.collection('products').find({}).toArray();
    products.forEach(p => console.log(p._id, p.name, p.slug, p.price, p.images?.length, p.images));

    console.log('\n--- BANNERS ---');
    const banners = await mongoose.connection.db.collection('banners').find({}).toArray();
    console.log(`Banners count: ${banners.length}`);
    banners.forEach(b => console.log(b._id, b.title, b.position, b.image));

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
