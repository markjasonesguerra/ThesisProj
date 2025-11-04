import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool } from './db.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(cors({
  origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// mount routers
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.use((err, _req, res, _next) => {
  res.status(500).json({ message: err.message ?? 'Unexpected error.' });
});

const start = async () => {
  try {
    await pool.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`API server ready at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error.message);
    process.exit(1);
  }
};

start();
