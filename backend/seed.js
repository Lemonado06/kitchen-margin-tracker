// Fills MongoDB with a demo account so the dashboard and AI assistant have data to show.
// Run: npm run seed   (safe to re-run: it replaces the demo account's data each time)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User, Outlet, Dish, RecipeItem, Platform, FeeRule, Order } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kitchen_margin_tracker';
const OWNER = { name: 'Demo Owner', email: 'owner@demo.com', password: 'demo123' };
const MANAGER = { name: 'Demo Manager', email: 'manager@demo.com', password: 'demo123' };

async function seed() {
  await mongoose.connect(MONGODB_URI);

  // Start clean: remove the previous demo account and everything under it
  const oldOwner = await User.findOne({ email: OWNER.email });
  if (oldOwner) {
    const outletIds = await Outlet.find({ owner_id: oldOwner._id }).distinct('_id');
    const dishIds = await Dish.find({ outlet_id: { $in: outletIds } }).distinct('_id');
    await Order.deleteMany({ outlet_id: { $in: outletIds } });
    await RecipeItem.deleteMany({ dish_id: { $in: dishIds } });
    await Dish.deleteMany({ outlet_id: { $in: outletIds } });
    await FeeRule.deleteMany({ outlet_id: { $in: outletIds } });
    await Outlet.deleteMany({ owner_id: oldOwner._id });
    await User.deleteMany({ $or: [{ _id: oldOwner._id }, { owner_id: oldOwner._id }] });
  }
  await User.deleteMany({ email: MANAGER.email });

  const owner = await User.create({
    name: OWNER.name, email: OWNER.email, role: 'owner',
    password_hash: await bcrypt.hash(OWNER.password, 10),
  });
  await User.create({
    name: MANAGER.name, email: MANAGER.email, role: 'manager', owner_id: owner._id,
    password_hash: await bcrypt.hash(MANAGER.password, 10),
  });

  const platform = {};
  for (const name of ['Zomato', 'Swiggy', 'Direct']) {
    platform[name] = await Platform.findOneAndUpdate({ name }, { $setOnInsert: { name } }, { upsert: true, returnDocument: 'after' });
  }

  const outlet = await Outlet.create({ owner_id: owner._id, name: 'My Kitchen', city: 'Bengaluru' });

  await FeeRule.create([
    { outlet_id: outlet._id, platform_id: platform.Zomato._id, commission_pct: 25, gst_on_commission_pct: 18 },
    { outlet_id: outlet._id, platform_id: platform.Swiggy._id, commission_pct: 22, gst_on_commission_pct: 18 },
    { outlet_id: outlet._id, platform_id: platform.Direct._id, commission_pct: 0, gst_on_commission_pct: 18 },
  ]);

  const [biryani, paneer, rice] = await Dish.create([
    { outlet_id: outlet._id, name: 'Chicken Biryani', price: 450 },
    { outlet_id: outlet._id, name: 'Paneer Tikka', price: 180 },
    { outlet_id: outlet._id, name: 'Veg Fried Rice', price: 150 },
  ]);

  // Recipe costs, so the margin maths has a real food cost
  await RecipeItem.create([
    { dish_id: biryani._id, ingredient_name: 'Chicken', cost: 55 },
    { dish_id: biryani._id, ingredient_name: 'Basmati rice', cost: 20 },
    { dish_id: biryani._id, ingredient_name: 'Spices & oil', cost: 15 },
    { dish_id: paneer._id, ingredient_name: 'Paneer', cost: 70 },
    { dish_id: paneer._id, ingredient_name: 'Marinade', cost: 25 }, // high cost, thin margin dish
    { dish_id: rice._id, ingredient_name: 'Rice & vegetables', cost: 35 },
    { dish_id: rice._id, ingredient_name: 'Sauces', cost: 10 },
  ]);

  // Orders across dishes, platforms and dates, with deliberately varied margins
  const orders = [
    // Biryani: strong seller, good margin, multiple platforms
    { dish: biryani, platform: 'Zomato', date: '2026-09-25', value: 450, discount: 0, packaging: 15 },
    { dish: biryani, platform: 'Swiggy', date: '2026-09-26', value: 460, discount: 20, packaging: 15 },
    { dish: biryani, platform: 'Zomato', date: '2026-09-28', value: 455, discount: 0, packaging: 15 },
    { dish: biryani, platform: 'Direct', date: '2026-09-29', value: 440, discount: 0, packaging: 10 },
    // Paneer Tikka: high food cost + heavy discount = loss-making (the "find the losing dish" demo)
    { dish: paneer, platform: 'Swiggy', date: '2026-09-25', value: 180, discount: 60, packaging: 12 },
    { dish: paneer, platform: 'Swiggy', date: '2026-09-27', value: 180, discount: 50, packaging: 12 },
    { dish: paneer, platform: 'Zomato', date: '2026-09-30', value: 180, discount: 40, packaging: 12 },
    // Veg Fried Rice: decent, mid-range margin
    { dish: rice, platform: 'Zomato', date: '2026-09-26', value: 150, discount: 0, packaging: 8 },
    { dish: rice, platform: 'Direct', date: '2026-09-28', value: 150, discount: 0, packaging: 8 },
    { dish: rice, platform: 'Swiggy', date: '2026-10-01', value: 155, discount: 10, packaging: 8 },
  ];
  await Order.create(orders.map((o) => ({
    outlet_id: outlet._id,
    dish_id: o.dish._id,
    platform_id: platform[o.platform]._id,
    order_date: new Date(`${o.date}T00:00:00.000Z`),
    order_value: o.value,
    discount_amount: o.discount,
    packaging_cost: o.packaging,
  })));

  console.log(`Seeded "${outlet.name}" with 3 dishes, 3 fee rules and ${orders.length} orders.`);
  console.log(`Log in as ${OWNER.email} / ${OWNER.password} (owner) or ${MANAGER.email} / ${MANAGER.password} (manager).`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
