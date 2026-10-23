import mongoose from 'mongoose';
import config from '../helper/config.js';

async function main() {
    await mongoose.connect(config.DB_URL);
    console.log('Connected to MongoDB successfully.');
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (let c of collections) {
        const count = await mongoose.connection.db.collection(c.name).countDocuments();
        console.log(`${c.name}: ${count}`);
    }
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
