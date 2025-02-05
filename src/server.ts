// src/app.ts
import express from 'express';
import dotenv from 'dotenv';
import { connectDB } from './database';

dotenv.config();
const app = express();
app.use(express.json());

connectDB();

app.get('/', (req, res) => {
  res.send('Server running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
