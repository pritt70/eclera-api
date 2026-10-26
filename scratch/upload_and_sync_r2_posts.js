import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import db from '../admin_panel/startup/db.js';
import { SocialPost } from '../admin_panel/modules/social/model.js';
import { getR2Client, getR2Config, buildObjectKey } from '../admin_panel/modules/upload/helper/r2.js';

const ARTIFACTS_DIR = 'C:\\Users\\INTEL\\.gemini\\antigravity-ide\\brain\\43b06604-6142-4258-b4b9-725db1d77cae';

const IMAGES_TO_UPLOAD = [
    {
        filename: 'eclera_serum_glow_1792948912370.jpg',
        caption: 'Lumière Radiance Glow Complex: Golden hour magic with pure cold-pressed botanicals ✨',
        platform: 'instagram',
        sortOrder: 1,
    },
    {
        filename: 'eclera_face_cream_1792948929746.jpg',
        caption: 'Botanical Hydration Cream: Ultra-whipped organic texture with fresh jasmine extract 🌿',
        platform: 'instagram',
        sortOrder: 2,
    },
    {
        filename: 'eclera_rosewater_mist_1792948948118.jpg',
        caption: 'Damask Rosewater Calming Face Mist: Infused with handpicked petals & hyaluronic acid 🌹',
        platform: 'instagram',
        sortOrder: 3,
    },
    {
        filename: 'eclera_model_glow_1792948966623.jpg',
        caption: 'Effortless Clean Beauty: Real skin, real hydration, real everyday radiance 🌸',
        platform: 'instagram',
        sortOrder: 4,
    },
    {
        filename: 'eclera_clay_mask_1792948986540.jpg',
        caption: 'Pastel French Clay Detoxifying Face Mask: Mineral-rich pore purification ritual 🧖‍♀️',
        platform: 'instagram',
        sortOrder: 5,
    },
];

async function main() {
    try {
        await db();
        await new Promise((r) => setTimeout(r, 1000));

        const client = getR2Client();
        const config = getR2Config();
        console.log(`Connected to R2 bucket: "${config.bucket}" | Public URL: "${config.publicUrl}"`);

        // 1. Clear any old default or dummy posts from DB
        const deleteResult = await SocialPost.deleteMany({});
        console.log(`Cleared ${deleteResult.deletedCount} old posts from database.`);

        // 2. Upload each image to R2 and create fresh DB record
        const uploadedPosts = [];

        for (const item of IMAGES_TO_UPLOAD) {
            const filePath = path.join(ARTIFACTS_DIR, item.filename);
            if (!fs.existsSync(filePath)) {
                console.warn(`File does not exist: ${filePath}`);
                continue;
            }

            const fileBuffer = fs.readFileSync(filePath);
            const key = buildObjectKey('social', item.filename, 'image/jpeg');

            console.log(`Uploading ${item.filename} -> ${key}...`);

            await client.send(
                new PutObjectCommand({
                    Bucket: config.bucket,
                    Key: key,
                    Body: fileBuffer,
                    ContentType: 'image/jpeg',
                })
            );

            const publicUrl = `${config.publicUrl}/${key}`;
            console.log(`Uploaded! Public URL: ${publicUrl}`);

            const postDoc = await SocialPost.create({
                mediaType: 'image',
                mediaUrl: publicUrl,
                caption: item.caption,
                platform: item.platform,
                status: 'active',
                sortOrder: item.sortOrder,
            });

            uploadedPosts.push(postDoc);
        }

        console.log(`Successfully created ${uploadedPosts.length} real R2 posts in DB!`);
        process.exit(0);
    } catch (err) {
        console.error('Error during upload and sync:', err);
        process.exit(1);
    }
}

main();
