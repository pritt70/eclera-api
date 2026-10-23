import mongoose from "mongoose";
import { getConfig } from "../../helper/config.js";
import Admin from "../modules/auth/model.js";

// Static default admin credentials
export const DEFAULT_ADMIN = {
    name: "Eclera",
    email: "eclera.cosmetics@gmail.com",
    password: "Eclera2171",
    is_active: true
};

// Seed default admin in database if not exists or update credentials
export const seedDefaultAdmin = async () => {
    try {
        await Admin.findOneAndUpdate(
            { email: DEFAULT_ADMIN.email },
            { $set: { name: DEFAULT_ADMIN.name, password: DEFAULT_ADMIN.password, is_active: true } },
            { upsert: true, returnDocument: 'after' }
        );
        console.log(`[Seed] Default admin configured successfully: ${DEFAULT_ADMIN.email}`);
    } catch (error) {
        console.error('[Seed] Error checking/seeding default admin:', error.message);
    }
};

export default () => {
    const dbConnectionStr = getConfig('DB_URL');

    if (dbConnectionStr && dbConnectionStr !== '') {
        mongoose.set('runValidators', true);
        mongoose.set('strictQuery', true);

        mongoose.connect(dbConnectionStr, { autoIndex: true, autoCreate: true })
            .then(() => {
                console.log('MongoDB connected successfully');
                seedDefaultAdmin();
            })
            .catch((err) => {
                console.error('MongoDB connection error:', err.message);
            });
    } else {
        console.log('Config db is not set in config file.');
        process.exit(1);
    }
};