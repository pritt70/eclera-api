const config = {
    DB_URL: 'mongodb+srv://eclera:Khokhani2292@eclera-cluster.6lyydwx.mongodb.net/?appName=eclera-cluster',
    PORT: 5000,
    JWT_SECRET: 'eclera_jwt_secret_change_in_production',
    JWT_EXPIRES_IN: '7d',

    // Cloudflare R2 Storage Configuration
    R2_ACCOUNT_ID: '11edab7357ac13e767f20f991927a560',
    R2_ACCESS_KEY_ID: 'a2cac47a46cd4372627b4adef9f7b64e',
    R2_SECRET_ACCESS_KEY: '263e500c87f72ada018f807bf574ddf1945950f32b56ecd3e7bafab051b4f310',
    R2_BUCKET_NAME: 'eclera-store',
    R2_PUBLIC_URL: 'https://r2.eclera.in',
};

export const getConfig = (key) => {
    return config[key];
};

export default config;