import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { seedDatabase } from './config/seed.js';
import { validateRuntimeConfig } from './config/env.js';

dotenv.config();
validateRuntimeConfig();

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
});
