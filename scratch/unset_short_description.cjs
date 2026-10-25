const mongoose = require('mongoose');

const DB_URL = 'mongodb+srv://eclera:Khokhani2292@eclera-cluster.6lyydwx.mongodb.net/?appName=eclera-cluster';

async function main() {
  await mongoose.connect(DB_URL);
  console.log("Connected to MongoDB Atlas!");

  const result = await mongoose.connection.collection("products").updateMany(
    {},
    { $unset: { shortDescription: "" } }
  );

  console.log(`Successfully unset shortDescription from ${result.modifiedCount} products in MongoDB.`);
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
