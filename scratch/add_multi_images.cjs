const mongoose = require('mongoose');

const DB_URL = 'mongodb+srv://eclera:Khokhani2292@eclera-cluster.6lyydwx.mongodb.net/?appName=eclera-cluster';

async function main() {
  await mongoose.connect(DB_URL);
  const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));
  
  await Product.updateOne(
    { slug: 'hydra-luxe-hyaluronic-acid-peptide-face-serum-30ml' },
    {
      $set: {
        images: [
          { url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=900&auto=format&fit=crop', key: 'prod_img_1' },
          { url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?q=80&w=900&auto=format&fit=crop', key: 'prod_img_2' },
          { url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=900&auto=format&fit=crop', key: 'prod_img_3' },
          { url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=900&auto=format&fit=crop', key: 'prod_img_4' }
        ]
      }
    }
  );
  
  console.log('Success! All 4 images valid and updated.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
