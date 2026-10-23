import mongoose from "mongoose";
import { getConfig } from "../../helper/config.js";

export default () => {
    let dbConnectionStr = getConfig('DB_URL');

    if (dbConnectionStr && dbConnectionStr != '') {
        mongoose.set('runValidators', true);
        mongoose.set('strictQuery', true);

        mongoose.connect(dbConnectionStr, { autoIndex: true, autoCreate: true });
    } else {
        console.log('Config db is not set in config file.');
        process.exit(1);
    }
}