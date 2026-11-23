
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Platform } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kitchen_margin_tracker';

const app = express();
app.use(cors());
app.use(express.json());

// Kitchen staff are limited to viewing data and adding orders.
app.use(require('./staffGuard'));

app.use('/auth', require('./auth')());
app.use('/users', require('./users')());
app.use('/activity', require('./activity')());
app.use('/outlets', require('./outlets')());
app.use('/dishes', require('./dishes')());
app.use('/platforms', require('./platforms')());
app.use('/fee-rules', require('./feeRules')());
app.use('/recipe-items', require('./recipeItems')());
app.use('/orders', require('./orders')());
app.use('/dashboard', require('./dashboard')());
app.use('/ai', require('./ai')());

app.get('/health', async (req, res) => {
  try {
    await mongoose.connection.db.admin().ping();
    res.json({
      status: 'ok',
      db: mongoose.connection.name,
      time: new Date()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
});

// The delivery platforms every outlet starts with.
async function ensureDefaultPlatforms() {
  for (const name of ['Zomato', 'Swiggy', 'Direct']) {
    await Platform.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true }
    );
  }
}

async function start() {
  await mongoose.connect(MONGODB_URI);
  await ensureDefaultPlatforms();

  const PORT = process.env.PORT || 5000;

  app.listen(PORT, () => {
    console.log(
      `Server running on port ${PORT} (MongoDB: ${mongoose.connection.name})`
    );
  });
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
