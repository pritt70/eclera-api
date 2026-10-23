import mongoose from 'mongoose';
import { getConfig } from '../../../helper/config.js';
import { Specification, SpecificationOption } from './model.js';
import { generateUniqueSlug } from './helper/slug.js';

/**
 * Migration: Specification & SpecificationOption Collections & Indexes
 * Run via: npm run migrate:specifications
 * or: node admin_panel/modules/specification/migration.js [--seed]
 */
export async function runMigration() {
    console.log('--------------------------------------------------');
    console.log('[MIGRATION] Starting Specification Database Setup...');
    console.log('--------------------------------------------------');

    const dbConnectionStr = getConfig('DB_URL');
    if (!dbConnectionStr) {
        console.error('Error: DB_URL is not set in configuration.');
        process.exit(1);
    }

    try {
        await mongoose.connect(dbConnectionStr, { autoIndex: true, autoCreate: true });
        console.log('✓ Connected to MongoDB database');

        const db = mongoose.connection.db;

        // 1. Ensure Collections Exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map((c) => c.name);

        if (!collectionNames.includes('specifications')) {
            await db.createCollection('specifications');
            console.log('✓ Created collection: specifications');
        } else {
            console.log('✓ Collection specifications already exists');
        }

        if (!collectionNames.includes('specification_options')) {
            await db.createCollection('specification_options');
            console.log('✓ Created collection: specification_options');
        } else {
            console.log('✓ Collection specification_options already exists');
        }

        // 2. Synchronize Indexes cleanly using Mongoose Schema Definitions
        console.log('[INDEXES] Synchronizing indexes for specifications and specification_options...');

        await Specification.syncIndexes();
        console.log('✓ Synchronized indexes for specifications:');
        console.log('  - Unique slug index');
        console.log('  - Unique case-insensitive collation index on lower(trim(name))');
        console.log('  - Index on is_active');

        await SpecificationOption.syncIndexes();
        console.log('✓ Synchronized indexes for specification_options:');
        console.log('  - Foreign key index on specification_id');
        console.log('  - Compound unique collation index on (specification_id, lower(trim(name)))');
        console.log('  - Index on sort_order');

        // 3. Seed Data Check (Skin Type & Finish)
        // Rule: "Add seed data only if categories have seed data"
        const categoryCount = await db.collection('categories').countDocuments();
        const forceSeed = process.argv.includes('--seed');

        if (categoryCount > 0 || forceSeed) {
            console.log(`[SEED] Checking specification seed data (Categories count: ${categoryCount})...`);

            const seedSpecs = [
                {
                    name: 'Skin Type',
                    display_name: 'Skin Type',
                    description: 'Skin type attribute for cosmetics and skincare products',
                    options: ['Oily', 'Dry', 'Combination', 'Sensitive'],
                },
                {
                    name: 'Finish',
                    display_name: 'Finish',
                    description: 'Finish attribute for cosmetics like Lip Care, Foundation',
                    options: ['Matte', 'Glossy', 'Satin'],
                },
            ];

            for (const item of seedSpecs) {
                let spec = await Specification.findOne({
                    name: new RegExp(`^\\s*${item.name}\\s*$`, 'i'),
                });

                if (!spec) {
                    const slug = await generateUniqueSlug(item.name);
                    spec = await Specification.create({
                        name: item.name,
                        display_name: item.display_name,
                        displayName: item.display_name,
                        slug,
                        description: item.description,
                        is_active: true,
                        status: 'active',
                    });
                    console.log(`✓ Seeded specification: ${item.name}`);
                }

                // Seed options
                let sortIdx = 0;
                for (const optName of item.options) {
                    const optExists = await SpecificationOption.findOne({
                        specification_id: spec._id,
                        name: new RegExp(`^\\s*${optName}\\s*$`, 'i'),
                    });
                    if (!optExists) {
                        await SpecificationOption.create({
                            specification_id: spec._id,
                            name: optName,
                            sort_order: sortIdx++,
                        });
                        console.log(`  ✓ Added option: ${optName} to ${item.name}`);
                    }
                }
            }
        } else {
            console.log('[SEED] No category seed data found in database. Skipping specification seeding.');
        }

        console.log('--------------------------------------------------');
        console.log('[MIGRATION COMPLETED SUCCESSFULLY]');
        console.log('--------------------------------------------------');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        await mongoose.disconnect();
        process.exit(1);
    }
}

// Execute migration if run directly from command line
if (process.argv[1]?.endsWith('migration.js')) {
    runMigration();
}
