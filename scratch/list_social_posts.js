import db from '../admin_panel/startup/db.js';
import { SocialPost } from '../admin_panel/modules/social/model.js';

async function listPosts() {
    try {
        await db();
        await new Promise((r) => setTimeout(r, 1000));

        const posts = await SocialPost.find().lean();
        console.log(`Total posts in DB: ${posts.length}`);
        posts.forEach((p, idx) => {
            console.log(`[${idx + 1}] ID: ${p._id}, Type: ${p.mediaType}, URL: ${p.mediaUrl.substring(0, 50)}...`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

listPosts();
