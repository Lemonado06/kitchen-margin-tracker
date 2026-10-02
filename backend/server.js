require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

const authRoutes = require('./auth');
app.use('/auth', authRoutes(pool));

const outletRoutes = require('./outlets');
app.use('/outlets', outletRoutes(pool));

const dishRoutes = require('./dishes');
app.use('/dishes', dishRoutes(pool));

const platformRoutes = require('./platforms');
app.use('/platforms', platformRoutes(pool));

const feeRuleRoutes = require('./feeRules');
app.use('/fee-rules', feeRuleRoutes(pool));

const orderRoutes = require('./orders');
app.use('/orders', orderRoutes(pool));

const dashboardRoutes = require('./dashboard');
app.use('/dashboard', dashboardRoutes(pool));

const aiRoutes = require('./ai');
app.use('/ai', aiRoutes(pool));

app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));