import db from '../admin_panel/startup/db.js';
import { SocialPost } from '../admin_panel/modules/social/model.js';

async function removeDefaultPosts() {
    try {
        await db();
        await new Promise((r) => setTimeout(r, 1000));

        const result = await SocialPost.deleteMany({});
        console.log(`Deleted all sample/default posts from SocialPost collection. Count: ${result.deletedCount}`);

        process.exit(0);
    } catch (err) {
        console.error('Error removing default posts:', err);
        process.exit(1);
    }
}

removeDefaultPosts();
