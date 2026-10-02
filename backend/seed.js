require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// ===== EDIT THESE to match your actual IDs =====
const OUTLET_ID = '0e05d444-5e77-4c26-8e0c-7419abbd5960'; // My Kitchen
const ZOMATO_ID = '4f485577-a7ff-465a-9ee6-fe489787c0be';
const SWIGGY_ID = 'c6ed219e-b2c5-4e2b-bf98-81062e70b250';
const DIRECT_ID = 'e2101eed-09d9-467e-b071-b6ad393aeeab';
const BIRYANI_ID = '0ea02b18-2b95-4c7c-b858-97720cb6107a'; // Chicken Biryani
// =================================================

async function seed() {
  // Add 2 more dishes
  const dish2 = await pool.query(
    `INSERT INTO dishes (outlet_id, name, price) VALUES ($1, $2, $3) RETURNING id`,
    [OUTLET_ID, 'Paneer Tikka', 180]
  );
  const dish3 = await pool.query(
    `INSERT INTO dishes (outlet_id, name, price) VALUES ($1, $2, $3) RETURNING id`,
    [OUTLET_ID, 'Veg Fried Rice', 150]
  );
  const PANEER_ID = dish2.rows[0].id;
  const RICE_ID = dish3.rows[0].id;

  console.log('Created dishes:', { PANEER_ID, RICE_ID });

  // Add recipe cost for each dish (so margin math has real food cost, not 0)
  await pool.query(`INSERT INTO recipe_items (dish_id, ingredient_name, cost) VALUES ($1, 'Ingredients', $2)`, [BIRYANI_ID, 90]);
  await pool.query(`INSERT INTO recipe_items (dish_id, ingredient_name, cost) VALUES ($1, 'Ingredients', $2)`, [PANEER_ID, 95]); // high cost, thin margin dish
  await pool.query(`INSERT INTO recipe_items (dish_id, ingredient_name, cost) VALUES ($1, 'Ingredients', $2)`, [RICE_ID, 45]);

  // Orders across dishes, platforms, dates — deliberately varied margins
  const orders = [
    // Biryani: strong seller, good margin, multiple platforms
    { dish: BIRYANI_ID, platform: ZOMATO_ID, date: '2026-09-25', value: 450, discount: 0, packaging: 15 },
    { dish: BIRYANI_ID, platform: SWIGGY_ID, date: '2026-09-26', value: 460, discount: 20, packaging: 15 },
    { dish: BIRYANI_ID, platform: ZOMATO_ID, date: '2026-09-28', value: 455, discount: 0, packaging: 15 },
    { dish: BIRYANI_ID, platform: DIRECT_ID, date: '2026-09-29', value: 440, discount: 0, packaging: 10 },

    // Paneer Tikka: high food cost + heavy discount = loss-making, this is your "find the losing dish" demo
    { dish: PANEER_ID, platform: SWIGGY_ID, date: '2026-09-25', value: 180, discount: 60, packaging: 12 },
    { dish: PANEER_ID, platform: SWIGGY_ID, date: '2026-09-27', value: 180, discount: 50, packaging: 12 },
    { dish: PANEER_ID, platform: ZOMATO_ID, date: '2026-09-30', value: 180, discount: 40, packaging: 12 },

    // Veg Fried Rice: decent, mid-range margin
    { dish: RICE_ID, platform: ZOMATO_ID, date: '2026-09-26', value: 150, discount: 0, packaging: 8 },
    { dish: RICE_ID, platform: DIRECT_ID, date: '2026-09-28', value: 150, discount: 0, packaging: 8 },
    { dish: RICE_ID, platform: SWIGGY_ID, date: '2026-10-01', value: 155, discount: 10, packaging: 8 },
  ];

  for (const o of orders) {
    await pool.query(
      `INSERT INTO orders (outlet_id, dish_id, platform_id, order_date, order_value, discount_amount, packaging_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [OUTLET_ID, o.dish, o.platform, o.date, o.value, o.discount, o.packaging]
    );
  }

  console.log(`Seeded ${orders.length} orders across 3 dishes and 3 platforms.`);
  await pool.end();
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  pool.end();
});