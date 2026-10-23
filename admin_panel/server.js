import express from 'express';
import cors from 'cors';
import { getConfig } from '../helper/config.js';
import db from './startup/db.js';
import adminRouter from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB & seed default admin
db();

// Mount routes
app.use('/api/admin', adminRouter);
app.use('/', adminRouter);

const port = (getConfig('PORT') || 5000);
app.listen(port, () => {
    console.log(`Admin Panel API listening to ${port}`);
    console.log(`Login endpoint available at: http://localhost:${port}/api/admin/auth/login`);
});

export default app;