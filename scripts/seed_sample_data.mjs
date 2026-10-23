import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import config from '../helper/config.js';
import { uploadBufferToR2 } from '../admin_panel/modules/upload/helper/r2.js';

// Paths to generated images
const brainDir = 'C:\\Users\\INTEL\\.gemini\\antigravity-ide\\brain\\2d1d6ecd-3833-4794-91d8-43950f3bd7b8';

const imageFiles = {
    hero1: path.join(brainDir, 'hero_banner_one_1792692515311.jpg'),
    hero2: path.join(brainDir, 'hero_banner_two_1792692531095.jpg'),
    catSerums: path.join(brainDir, 'cat_serums_1792692547079.jpg'),
    catMoisturizers: path.join(brainDir, 'cat_moisturizers_1792692564510.jpg'),
    catCleansers: path.join(brainDir, 'cat_cleansers_1792692586891.jpg'),
    catMasks: path.join(brainDir, 'cat_masks_1792692612038.jpg'),
    catEyeLip: path.join(brainDir, 'cat_eye_lip_1792692630571.jpg'),
    prodToner: path.join(brainDir, 'prod_rose_toner_1792692648977.jpg'),
    prodRetinol: path.join(brainDir, 'prod_retinol_night_1792692667970.jpg'),
    prodVitC: path.join(brainDir, 'prod_vitc_radiance_1792692687207.jpg'),
    bannerMiddle: path.join(brainDir, 'banner_middle_promo_1792692706096.jpg'),
};

async function uploadFile(filePath, folder, fileName) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const buffer = fs.readFileSync(filePath);
    const uploaded = await uploadBufferToR2({
        folder,
        fileName,
        contentType: 'image/jpeg',
        buffer,
    });
    console.log(`Uploaded ${fileName} to R2 -> ${uploaded.publicUrl}`);
    return uploaded;
}

async function run() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.DB_URL);
    console.log('MongoDB connected.');

    const db = mongoose.connection.db;

    // 1. Upload All Assets to Cloudflare R2
    console.log('\n--- UPLOADING ASSETS TO CLOUDFLARE R2 ---');
    const uploaded = {};
    uploaded.hero1 = await uploadFile(imageFiles.hero1, 'banners', 'hero-banner-one.jpg');
    uploaded.hero2 = await uploadFile(imageFiles.hero2, 'banners', 'hero-banner-two.jpg');
    uploaded.bannerMiddle = await uploadFile(imageFiles.bannerMiddle, 'banners', 'banner-middle-promo.jpg');

    uploaded.catSerums = await uploadFile(imageFiles.catSerums, 'categories', 'category-serums-oils.jpg');
    uploaded.catMoisturizers = await uploadFile(imageFiles.catMoisturizers, 'categories', 'category-moisturizers.jpg');
    uploaded.catCleansers = await uploadFile(imageFiles.catCleansers, 'categories', 'category-cleansers.jpg');
    uploaded.catMasks = await uploadFile(imageFiles.catMasks, 'categories', 'category-masks.jpg');
    uploaded.catEyeLip = await uploadFile(imageFiles.catEyeLip, 'categories', 'category-eye-lip.jpg');

    uploaded.prodToner = await uploadFile(imageFiles.prodToner, 'products', 'damask-rosewater-toner.jpg');
    uploaded.prodRetinol = await uploadFile(imageFiles.prodRetinol, 'products', 'retinol-night-renewal.jpg');
    uploaded.prodVitC = await uploadFile(imageFiles.prodVitC, 'products', 'vitaminc-radiance-duo.jpg');

    // 2. Fetch or prepare Specifications
    console.log('\n--- SYNCING SPECIFICATIONS ---');
    const specsCollection = db.collection('specifications');
    const optionsCollection = db.collection('specification_options');

    let skinTypeSpec = await specsCollection.findOne({ slug: 'skin-type' });
    if (!skinTypeSpec) {
        const res = await specsCollection.insertOne({
            name: 'Skin Type',
            slug: 'skin-type',
            displayName: 'Skin Type',
            description: 'Recommended skin types for skincare products',
            status: 'active',
            sortOrder: 1,
            is_active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        skinTypeSpec = { _id: res.insertedId };
    }

    let finishSpec = await specsCollection.findOne({ slug: 'finish' });
    if (!finishSpec) {
        const res = await specsCollection.insertOne({
            name: 'Finish',
            slug: 'finish',
            displayName: 'Finish',
            description: 'Texture finish of product',
            status: 'active',
            sortOrder: 2,
            is_active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        finishSpec = { _id: res.insertedId };
    }

    // 3. Clear and Populate Categories
    console.log('\n--- SEEDING CATEGORIES ---');
    const catCollection = db.collection('categories');

    // Remove messy test categories
    await catCollection.deleteMany({
        slug: { $in: ['test-category-auto', 'demo', 'face-serumface-serumfface-serum'] }
    });

    const categoryDefinitions = [
        {
            name: 'Serums & Face Oils',
            slug: 'serums-oils',
            description: 'Targeted botanical serums, potent actives, and nourishing face elixirs for glowing radiant skin.',
            image: uploaded.catSerums,
            status: 'active',
            sortOrder: 1,
            seoTitle: 'Luxury Face Serums & Botanical Oils | Eclera',
            seoDescription: 'Discover dermatologically formulated face serums and elixirs infused with hyaluronic acid, niacinamide, and rare botanicals.',
        },
        {
            name: 'Moisturizers & Creams',
            slug: 'moisturizers-creams',
            description: 'Deeply hydrating day moisturizers, barrier restoring creams, and night renewal balms.',
            image: uploaded.catMoisturizers,
            status: 'active',
            sortOrder: 2,
            seoTitle: 'Hydrating Face Moisturizers & Barrier Creams | Eclera',
            seoDescription: 'Nourish and fortify your skin barrier with clinically backed day and night moisturizers.',
        },
        {
            name: 'Cleansers & Toners',
            slug: 'cleansers-toners',
            description: 'Gentle foaming face washes, soothing floral waters, and pH-balancing clarifying toners.',
            image: uploaded.catCleansers,
            status: 'active',
            sortOrder: 3,
            seoTitle: 'Gentle Facial Cleansers & Calming Toners | Eclera',
            seoDescription: 'Clarify and prep your skin with sulfate-free gentle cleansers and organic rosewater toners.',
        },
        {
            name: 'Face Masks & Scrubs',
            slug: 'face-masks-scrubs',
            description: 'Purifying mineral clay masks, gentle enzymatic exfoliators, and revitalizing overnight treatments.',
            image: uploaded.catMasks,
            status: 'active',
            sortOrder: 4,
            seoTitle: 'Pink French Clay Masks & Clarifying Treatments | Eclera',
            seoDescription: 'Detoxify pores and reveal glass skin radiance with French clay and natural fruit enzymes.',
        },
        {
            name: 'Eye & Lip Care',
            slug: 'eye-lip-care',
            description: 'Awakening caffeine eye creams, peptide-infused lip treatment balms, and overnight nourishment.',
            image: uploaded.catEyeLip,
            status: 'active',
            sortOrder: 5,
            seoTitle: 'Peptide Eye Creams & Glossy Lip Treatments | Eclera',
            seoDescription: 'Target fine lines and dry lips with advanced peptide complexes and rich botanical butters.',
        },
    ];

    const categoryMap = {};
    for (const catDef of categoryDefinitions) {
        const existing = await catCollection.findOne({ slug: catDef.slug });
        if (existing) {
            await catCollection.updateOne(
                { _id: existing._id },
                { $set: { ...catDef, updatedAt: new Date() } }
            );
            categoryMap[catDef.slug] = existing._id;
        } else {
            const ins = await catCollection.insertOne({
                ...catDef,
                parent: null,
                specifications: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            categoryMap[catDef.slug] = ins.insertedId;
        }
    }
    console.log(`Seeded ${Object.keys(categoryMap).length} categories with images.`);

    // 4. Seed Collections
    console.log('\n--- SEEDING COLLECTIONS ---');
    const colCollection = db.collection('collections');
    const collectionDefinitions = [
        {
            name: 'Radiant Summer 2026',
            slug: 'radiant-summer-2026',
            description: 'Lightweight, sun-kissed essentials formulated to protect, hydrate, and maintain effortless summer radiance.',
            image: uploaded.hero2,
            category: categoryMap['serums-oils'],
            categories: [categoryMap['serums-oils'], categoryMap['moisturizers-creams']],
            status: 'active',
            sortOrder: 1,
            seoTitle: 'Radiant Summer 2026 Skincare Collection | Eclera',
            seoDescription: 'Explore our limited-edition summer glow curation with antioxidants and SPF enhancers.',
        },
        {
            name: 'Hydra-Boost Essentials',
            slug: 'hydra-boost-essentials',
            description: 'Deep cellular hydration powered by multi-molecular hyaluronic acid and fermented botanical extracts.',
            image: uploaded.catSerums,
            category: categoryMap['moisturizers-creams'],
            categories: [categoryMap['serums-oils'], categoryMap['moisturizers-creams'], categoryMap['cleansers-toners']],
            status: 'active',
            sortOrder: 2,
            seoTitle: 'Hydra-Boost Moisture Ritual | Eclera Skincare',
            seoDescription: 'Transform dehydrated, dull skin with ultra-replenishing hyaluronic acid formulas.',
        },
        {
            name: 'Pure Botanical Ritual',
            slug: 'pure-botanical-ritual',
            description: 'Ecocert organic certified botanical extracts harvested ethically for mindful, soothing beauty.',
            image: uploaded.bannerMiddle,
            category: categoryMap['cleansers-toners'],
            categories: [categoryMap['cleansers-toners'], categoryMap['face-masks-scrubs']],
            status: 'active',
            sortOrder: 3,
            seoTitle: 'Pure Botanical Ritual | Clean Beauty by Eclera',
            seoDescription: 'Pure, vegan, cruelty-free botanicals to balance and revive delicate complexions.',
        },
    ];

    const collectionMap = {};
    for (const colDef of collectionDefinitions) {
        const existing = await colCollection.findOne({ slug: colDef.slug });
        if (existing) {
            await colCollection.updateOne(
                { _id: existing._id },
                { $set: { ...colDef, updatedAt: new Date() } }
            );
            collectionMap[colDef.slug] = existing._id;
        } else {
            const ins = await colCollection.insertOne({
                ...colDef,
                specifications: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            collectionMap[colDef.slug] = ins.insertedId;
        }
    }
    console.log(`Seeded ${Object.keys(collectionMap).length} collections.`);

    // 5. Seed Banners
    console.log('\n--- SEEDING BANNERS ---');
    const bannerCollection = db.collection('banners');
    await bannerCollection.deleteMany({}); // fresh seed of banners

    const bannerItems = [
        {
            title: 'Radiance Reimagined',
            subtitle: 'Infused with Multi-Peptides & Hyaluronic Acid for a Glass-Skin Glow',
            image: uploaded.hero1,
            mobileImage: uploaded.hero1,
            link: '/collection/radiant-summer-2026',
            buttonText: 'Explore Collection',
            position: 'home_hero',
            category: categoryMap['serums-oils'],
            status: 'active',
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            title: 'Radiance Moisturizer & Botanical Serum',
            subtitle: 'Experience Natural Glow with Dermatologist-Tested Botanical Formulations',
            image: uploaded.hero2,
            mobileImage: uploaded.hero2,
            link: '/category/moisturizers-creams',
            buttonText: 'Shop Moisturizers',
            position: 'home_hero',
            category: categoryMap['moisturizers-creams'],
            status: 'active',
            sortOrder: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            title: 'Pure Botanical Luxury',
            subtitle: 'Nourish Your Skin with Nature’s Essence — 100% Organic & Cruelty-Free',
            image: uploaded.bannerMiddle,
            mobileImage: uploaded.bannerMiddle,
            link: '/collection/pure-botanical-ritual',
            buttonText: 'Discover Pure Ritual',
            position: 'home_middle',
            category: categoryMap['cleansers-toners'],
            status: 'active',
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    await bannerCollection.insertMany(bannerItems);
    console.log(`Seeded ${bannerItems.length} active banners.`);

    // 6. Seed High Quality Skincare Products
    console.log('\n--- SEEDING PRODUCTS ---');
    const prodCollection = db.collection('products');
    await prodCollection.deleteMany({}); // clean seed with fresh IDs and real images

    const products = [
        {
            name: 'Hydra-Luxe Hyaluronic Acid & Peptide Face Serum (30ml)',
            slug: 'hydra-luxe-hyaluronic-acid-peptide-face-serum-30ml',
            sku: 'ECL-SRM-01',
            barcode: '8901234567011',
            category: categoryMap['serums-oils'],
            collections: [collectionMap['radiant-summer-2026'], collectionMap['hydra-boost-essentials']],
            shortDescription: 'Ultra-hydrating 2% multi-weight hyaluronic acid serum paired with tri-peptide complex to instantly plump and replenish moisture.',
            description: '<p>Experience dewy radiance with Eclera Hydra-Luxe Face Serum. Formulated with 5 molecular weights of Hyaluronic Acid, it deeply penetrates skin layers to lock in moisture for up to 72 hours. Fortified with soothing Centella Asiatica and Vitamin B5, it strengthens the natural barrier and reduces redness.</p><ul><li>Deep 72-hour sustained hydration</li><li>Plumps fine lines and smooths skin texture</li><li>Non-greasy, fast-absorbing water-gel texture</li><li>Free from parabens, sulfates, and artificial fragrance</li></ul>',
            price: 799,
            comparePrice: 1099,
            costPrice: 280,
            stock: 85,
            trackStock: true,
            images: [uploaded.catSerums, uploaded.hero1],
            status: 'active',
            sortOrder: 1,
            seoTitle: 'Hydra-Luxe Hyaluronic Acid & Peptide Face Serum 30ml | Eclera',
            seoDescription: 'Buy Eclera 2% Hyaluronic Acid and Tri-Peptide Face Serum for deep hydration and glass-skin glow.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Vitamin C Radiance Glow Day Moisturizer (50ml)',
            slug: 'vitamin-c-radiance-glow-day-moisturizer-50ml',
            sku: 'ECL-MST-02',
            barcode: '8901234567028',
            category: categoryMap['moisturizers-creams'],
            collections: [collectionMap['radiant-summer-2026']],
            shortDescription: 'Lightweight antioxidant-rich gel moisturizer with 10% stabilized Vitamin C and Kakadu Plum for luminous, even-toned skin.',
            description: '<p>Wake up your skin with a burst of radiance. Eclera Vitamin C Glow Day Moisturizer shields against free radicals and environmental aggressors while fading stubborn dark spots and pigmentation. The silky, weightless texture leaves skin luminous without clogging pores.</p><ul><li>Brightens hyperpigmentation and uneven tone</li><li>Rich in natural antioxidants from Kakadu Plum & Sweet Orange</li><li>Imparts an instant dewy, healthy complexion</li><li>Ideal under makeup or bare-faced radiance</li></ul>',
            price: 599,
            comparePrice: 799,
            costPrice: 210,
            stock: 120,
            trackStock: true,
            images: [uploaded.prodVitC, uploaded.catMoisturizers],
            status: 'active',
            sortOrder: 2,
            seoTitle: 'Vitamin C Radiance Glow Day Moisturizer 50ml | Eclera',
            seoDescription: 'Shop Vitamin C Day Moisturizer for glowing, radiant, even-toned skin. Dermatologist tested.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Damask Rosewater Calming & Clarifying Toner (100ml)',
            slug: 'damask-rosewater-calming-clarifying-toner-100ml',
            sku: 'ECL-TNR-03',
            barcode: '8901234567035',
            category: categoryMap['cleansers-toners'],
            collections: [collectionMap['pure-botanical-ritual']],
            shortDescription: 'Pure steam-distilled Bulgarian Damask rosewater infused with witch hazel and chamomile to balance pH and soothe sensitive skin.',
            description: '<p>Indulge your skin with pure floral serenity. Hand-harvested Damask Rose petals are hydro-distilled into a pure botanical toner that tightens the appearance of pores, calms irritation, and restores optimal skin pH balance after cleansing.</p><ul><li>100% pure distilled organic rose distillate</li><li>Soothes redness, irritation, and blemishes</li><li>Preps skin for superior serum absorption</li><li>Alcohol-free, gentle on even the most sensitive skin</li></ul>',
            price: 389,
            comparePrice: 499,
            costPrice: 140,
            stock: 95,
            trackStock: true,
            images: [uploaded.prodToner],
            status: 'active',
            sortOrder: 3,
            seoTitle: 'Damask Rosewater Calming Toner 100ml | Eclera',
            seoDescription: 'Buy organic steam-distilled Damask rosewater toner for hydration and pore refinement.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Botanical Foaming Cleanser with Tea Tree & Calendula (150ml)',
            slug: 'botanical-foaming-cleanser-tea-tree-calendula-150ml',
            sku: 'ECL-CLN-04',
            barcode: '8901234567042',
            category: categoryMap['cleansers-toners'],
            collections: [collectionMap['pure-botanical-ritual']],
            shortDescription: 'Gentle sulfate-free cloud foam cleanser that purifies impurities, excess sebum, and makeup while keeping moisture locked in.',
            description: '<p>A cloud-soft foam that effortlessly lifts away makeup, sunscreen, and daily pollutants without stripping your moisture barrier. Infused with Australian Tea Tree to calm breakouts and Calendula to soothe sensitive areas.</p><ul><li>Ultra-mild, non-drying foaming pump action</li><li>Controls excess oil without post-wash tightness</li><li>Formulated at skin-friendly pH 5.5</li><li>Safe for daily AM and PM use</li></ul>',
            price: 449,
            comparePrice: 599,
            costPrice: 160,
            stock: 140,
            trackStock: true,
            images: [uploaded.catCleansers],
            status: 'active',
            sortOrder: 4,
            seoTitle: 'Botanical Foaming Cleanser 150ml | Eclera Skincare',
            seoDescription: 'Shop sulfate-free gentle foaming cleanser with tea tree and calendula.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Pink French Clay Detoxifying Face Mask (60g)',
            slug: 'pink-french-clay-detoxifying-face-mask-60g',
            sku: 'ECL-MSK-05',
            barcode: '8901234567059',
            category: categoryMap['face-masks-scrubs'],
            collections: [collectionMap['pure-botanical-ritual']],
            shortDescription: 'Gentle mineral-rich French pink clay mask enriched with rosehip seed oil and pomegranate enzymes to detoxify and refine pores.',
            description: '<p>Treat your skin to an indulgent home spa ritual. French Pink Clay works as a gentle natural magnet to draw out deep-seated toxins and decongest pores, while organic Rosehip Oil and Aloe Vera ensure skin stays supple and nourished.</p><ul><li>Cleanses congested pores and minimizes blackheads</li><li>Smooths rough texture for a velvety matte finish</li><li>Includes custom wooden applicator spatula</li><li>Leaves skin visibly brighter in just 10 minutes</li></ul>',
            price: 549,
            comparePrice: 699,
            costPrice: 190,
            stock: 65,
            trackStock: true,
            images: [uploaded.catMasks],
            status: 'active',
            sortOrder: 5,
            seoTitle: 'Pink French Clay Detoxifying Face Mask 60g | Eclera',
            seoDescription: 'Detoxify and refine pores with organic French pink clay and rosehip seed oil.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Retinol Youth Renewal Night Elixir (30ml)',
            slug: 'retinol-youth-renewal-night-elixir-30ml',
            sku: 'ECL-RTN-06',
            barcode: '8901234567066',
            category: categoryMap['serums-oils'],
            collections: [collectionMap['hydra-boost-essentials']],
            shortDescription: '0.3% Micro-encapsulated Retinol with Bakuchiol and plant Squalane for intensive overnight cellular renewal without irritation.',
            description: '<p>Reclaim youthful skin tone and elasticity while you sleep. Our advanced micro-encapsulated retinol releases gradually overnight to boost collagen synthesis, smooth fine lines, and fade age spots with minimal tingling or dryness.</p><ul><li>Micro-encapsulated technology reduces irritation</li><li>Synergized with 1% natural Bakuchiol booster</li><li>Deeply hydrating plant-derived squalane base</li><li>Visible renewal and firmer contours within 4 weeks</li></ul>',
            price: 899,
            comparePrice: 1299,
            costPrice: 320,
            stock: 50,
            trackStock: true,
            images: [uploaded.prodRetinol],
            status: 'active',
            sortOrder: 6,
            seoTitle: 'Retinol Youth Renewal Night Elixir 30ml | Eclera',
            seoDescription: 'Shop gentle encapsulated retinol night serum with bakuchiol and squalane for youthful skin.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Revitalizing Caffeine & Peptide Eye Cream (30ml)',
            slug: 'revitalizing-caffeine-peptide-eye-cream-30ml',
            sku: 'ECL-EYE-07',
            barcode: '8901234567073',
            category: categoryMap['eye-lip-care'],
            collections: [collectionMap['hydra-boost-essentials']],
            shortDescription: 'Refreshing eye contour cream infused with 3% green coffee caffeine, matrixyl peptides, and niacinamide to diminish dark circles and puffiness.',
            description: '<p>Target tired eyes with precision botanicals. This silky cream instantly awakens sleepy under-eyes, constricts fluid retention to deflate morning puffiness, and brightens stubborn shadow discoloration.</p><ul><li>Depuffs swollen eye contours within 15 minutes</li><li>Brightens shadows and strengthens fragile capillary walls</li><li>Cooling lightweight pump bottle application</li><li>Ophthalmologist tested, contact-lens safe</li></ul>',
            price: 649,
            comparePrice: 849,
            costPrice: 230,
            stock: 75,
            trackStock: true,
            images: [uploaded.catEyeLip],
            status: 'active',
            sortOrder: 7,
            seoTitle: 'Revitalizing Caffeine & Peptide Eye Cream 30ml | Eclera',
            seoDescription: 'Buy clinical caffeine and matrixyl peptide eye cream for dark circles and puffiness.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Peptide Glaze Hydrating Lip Treatment (15ml)',
            slug: 'peptide-glaze-hydrating-lip-treatment-15ml',
            sku: 'ECL-LIP-08',
            barcode: '8901234567080',
            category: categoryMap['eye-lip-care'],
            collections: [collectionMap['radiant-summer-2026']],
            shortDescription: 'Nourishing peptide lip balm infused with Shea butter and babassu oil that melts onto lips to give an irresistible high-gloss glass shine.',
            description: '<p>A restorative lip treatment that repairs dry, cracked lips while delivering a luscious high-shine glossy glaze. Peptides stimulate lip fullness and cushion moisture throughout the day.</p><ul><li>Instant high-shine glassy mirror finish</li><li>Nourishes with organic Shea Butter and Vitamin E</li><li>Comfortable cushion texture without stickiness</li><li>Natural soft vanilla-rose scent</li></ul>',
            price: 349,
            comparePrice: 449,
            costPrice: 110,
            stock: 150,
            trackStock: true,
            images: [uploaded.catEyeLip],
            status: 'active',
            sortOrder: 8,
            seoTitle: 'Peptide Glaze Hydrating Lip Treatment 15ml | Eclera',
            seoDescription: 'Experience high-shine restorative peptide lip glaze for plump, nourished lips.',
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    const insertedProds = await prodCollection.insertMany(products);
    console.log(`Successfully seeded ${products.length} luxury products with rich content and R2 images!`);

    // 7. Update Coupons / Discounts to match realistic offers
    console.log('\n--- SYNCING DISCOUNTS ---');
    const discCollection = db.collection('discounts');
    const coupons = [
        {
            code: 'GLOW20',
            description: 'Get 20% off on your entire skincare ritual',
            discountType: 'percentage',
            discountValue: 20,
            minOrderAmount: 999,
            maxDiscountAmount: 500,
            isSpecial: false,
            status: 'active',
            usageLimit: 500,
            usedCount: 14,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            code: 'WELCOME100',
            description: 'Flat ₹100 instant discount on first purchase above ₹499',
            discountType: 'fixed_amount',
            discountValue: 100,
            minOrderAmount: 499,
            maxDiscountAmount: 100,
            isSpecial: false,
            status: 'active',
            usageLimit: 1000,
            usedCount: 42,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            code: 'FREESHIP',
            description: 'Special 10% discount on summer essentials above ₹299',
            discountType: 'percentage',
            discountValue: 10,
            minOrderAmount: 299,
            maxDiscountAmount: 150,
            isSpecial: false,
            status: 'active',
            usageLimit: 200,
            usedCount: 8,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            code: 'VIP50',
            description: 'Exclusive VIP member 50% discount code (Exclusive invitation)',
            discountType: 'percentage',
            discountValue: 50,
            minOrderAmount: 1499,
            maxDiscountAmount: 1000,
            isSpecial: true, // Special coupon: does not show on public coupon listing in website
            status: 'active',
            usageLimit: 50,
            usedCount: 3,
            startDate: new Date('2026-01-01'),
            endDate: new Date('2026-12-31'),
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    for (const c of coupons) {
        await discCollection.updateOne(
            { code: c.code },
            { $set: c },
            { upsert: true }
        );
    }
    console.log(`Synced ${coupons.length} discount coupons (including VIP special coupon).`);

    // 8. Update Customers
    console.log('\n--- SYNCING CUSTOMERS ---');
    const custCollection = db.collection('customers');
    const customers = [
        {
            name: 'Meera Nair',
            email: 'meera.nair@gmail.com',
            phone: '+91 9845012345',
            status: 'active',
            addresses: [
                {
                    addressLine1: 'B-402, Sea Green Heights, Worli Sea Face',
                    city: 'Mumbai',
                    state: 'Maharashtra',
                    postalCode: '400018',
                    country: 'India',
                    isDefault: true,
                },
            ],
            totalOrders: 3,
            totalSpent: 3499,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Kunal Joshi',
            email: 'kunal.joshi@outlook.com',
            phone: '+91 9766432109',
            status: 'active',
            addresses: [
                {
                    addressLine1: '702, Shivalik High Street, Bodakdev',
                    city: 'Ahmedabad',
                    state: 'Gujarat',
                    postalCode: '380054',
                    country: 'India',
                    isDefault: true,
                },
            ],
            totalOrders: 2,
            totalSpent: 1898,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
        {
            name: 'Ritu Kapoor',
            email: 'ritu.k@yahoo.com',
            phone: '+91 9911223344',
            status: 'active',
            addresses: [
                {
                    addressLine1: '14, Barakhamba Road, Connaught Place',
                    city: 'New Delhi',
                    state: 'Delhi',
                    postalCode: '110001',
                    country: 'India',
                    isDefault: true,
                },
            ],
            totalOrders: 1,
            totalSpent: 899,
            createdAt: new Date(),
            updatedAt: new Date(),
        },
    ];

    for (const cust of customers) {
        await custCollection.updateOne(
            { email: cust.email },
            { $set: cust },
            { upsert: true }
        );
    }
    console.log(`Synced ${customers.length} verified customers.`);

    console.log('\n🎉 ALL SAMPLE DATA SUCCESSFULLY SEEDED INTO DATABASE WITH REAL R2 IMAGES & RICH CONTENT!');
    process.exit(0);
}

run().catch((err) => {
    console.error('Fatal error seeding sample data:', err);
    process.exit(1);
});
