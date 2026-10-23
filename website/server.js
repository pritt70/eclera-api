import express from 'express';
import { getConfig } from '../helper/config.js';
import db from './startup/db.js';

const app = express();

db();

const port = (getConfig('PORT') || 5000);
app.listen(port, () => console.log(`Listening to ${port}`));

export default app;