import db from '../admin_panel/startup/db.js';
import { SocialLink, SocialPost } from '../admin_panel/modules/social/model.js';

async function seed() {
    await db();
    console.log('Connected to DB for social seed...');

    const defaultLinks = [
        { platform: 'instagram', title: 'Instagram', url: 'https://www.instagram.com/eclera.cosmetics', status: 'active', sortOrder: 1 },
        { platform: 'facebook', title: 'Facebook', url: 'https://www.facebook.com/eclera.cosmetics', status: 'active', sortOrder: 2 },
        { platform: 'thread', title: 'Threads', url: 'https://www.threads.net/@eclera.cosmetics', status: 'active', sortOrder: 3 },
        { platform: 'youtube', title: 'YouTube', url: 'https://www.youtube.com/@ecleracosmetics', status: 'active', sortOrder: 4 },
        { platform: 'x', title: 'X (Twitter)', url: 'https://x.com/ecleracosmetics', status: 'active', sortOrder: 5 },
        { platform: 'pinterest', title: 'Pinterest', url: 'https://www.pinterest.com/ecleracosmetics', status: 'active', sortOrder: 6 },
        { platform: 'tumblr', title: 'Tumblr', url: 'https://ecleracosmetics.tumblr.com', status: 'active', sortOrder: 7 },
        { platform: 'linkedin', title: 'LinkedIn', url: 'https://www.linkedin.com/company/eclera-cosmetics', status: 'active', sortOrder: 8 },
        { platform: 'meesho', title: 'Meesho Store', url: 'https://www.meesho.com/eclera_cosmetics', status: 'active', sortOrder: 9 },
        // Flipkart is set to empty or fallback to meesho store as requested
        { platform: 'flipkart', title: 'Flipkart', url: 'https://www.meesho.com/eclera_cosmetics', status: 'active', sortOrder: 10 },
    ];

    for (const item of defaultLinks) {
        await SocialLink.findOneAndUpdate(
            { platform: item.platform },
            item,
            { upsert: true, new: true }
        );
    }
    console.log('Seeded social links successfully!');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
