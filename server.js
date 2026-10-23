import express from 'express';
import cors from 'cors';
import { getConfig } from './helper/config.js';
import db from './admin_panel/startup/db.js';
import adminRouter from './admin_panel/routes/index.js';
import websiteRouter from './website/routes/index.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to single MongoDB Database
db();

// Routes
app.use('/api/admin', adminRouter);
app.use('/api/website', websiteRouter);

// Health check route
app.get('/', (req, res) => {
    res.json({ message: 'Eclera Combined API Server Running', port: getConfig('PORT') || 5000 });
});

const port = getConfig('PORT') || 5000;
app.listen(port, () => {
    console.log(`Eclera Combined API listening on port ${port}`);
    console.log(`Admin Panel API: http://localhost:${port}/api/admin`);
    console.log(`Website API: http://localhost:${port}/api/website`);
});

export default app;
