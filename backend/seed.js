// Fills MongoDB with a demo account so the dashboard and AI assistant have data to show.
// Run: npm run seed   (safe to re-run: it replaces the demo account's data each time)
// This version generates 3 outlets, 24 dishes and ~10,000 orders over the last 120 days.
// Dates are relative to the day you run it, so reseed before a demo.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const { User, Outlet, Dish, RecipeItem, Platform, FeeRule, Order } = require('./models');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kitchen_margin_tracker';
const OWNER = { name: 'Demo Owner', email: 'owner@demo.com', password: 'demo123' };
const MANAGER = { name: 'Demo Manager', email: 'manager@demo.com', password: 'demo123' };
const STAFF = { name: 'Demo Kitchen Staff', email: 'staff@demo.com', password: 'demo123' };

const DAYS = 120;

// Per outlet: fee rules, base daily volume, and a menu.
// weight = how often it sells, discountChance / maxDiscount = how promo-heavy it is,
// pack = packaging cost, items = [ingredient, cost] (sum = food cost)
const OUTLETS = [
  {
    name: 'Indiranagar Kitchen', city: 'Bengaluru', baseOrders: 34,
    fees: { Zomato: [25, 18], Swiggy: [22, 18], Direct: [0, 18] },
    menu: [
      { name: 'Chicken Biryani', price: 450, weight: 6, discountChance: 0.1, maxDiscount: 20, pack: 15, items: [['Chicken', 55], ['Basmati rice', 20], ['Spices & oil', 15]] },
      { name: 'Mutton Biryani', price: 620, weight: 3, discountChance: 0.15, maxDiscount: 40, pack: 18, items: [['Mutton', 180], ['Basmati rice', 25], ['Spices & oil', 20]] },
      { name: 'Paneer Tikka', price: 180, weight: 4, discountChance: 0.85, maxDiscount: 60, pack: 12, items: [['Paneer', 70], ['Marinade', 25]] }, // loss-making
      { name: 'Butter Chicken Combo', price: 320, weight: 5, discountChance: 0.3, maxDiscount: 30, pack: 14, items: [['Chicken', 60], ['Gravy base', 30], ['Naan', 18]] },
      { name: 'Veg Fried Rice', price: 150, weight: 3, discountChance: 0.2, maxDiscount: 10, pack: 8, items: [['Rice & vegetables', 35], ['Sauces', 10]] },
      { name: 'Dal Khichdi Bowl', price: 120, weight: 2, discountChance: 0.1, maxDiscount: 10, pack: 8, items: [['Dal & rice', 28], ['Ghee & spices', 8]] },
      { name: 'Chicken 65', price: 210, weight: 3, discountChance: 0.5, maxDiscount: 35, pack: 12, items: [['Chicken', 80], ['Batter & oil', 22]] },
      { name: 'Gulab Jamun (4 pc)', price: 90, weight: 2, discountChance: 0.05, maxDiscount: 10, pack: 6, items: [['Khoya mix', 18], ['Sugar syrup', 6]] },
    ],
  },
  {
    name: 'Koramangala Rolls & Bowls', city: 'Bengaluru', baseOrders: 28,
    fees: { Zomato: [27, 18], Swiggy: [24, 18], Direct: [0, 18] },
    menu: [
      { name: 'Egg Roll', price: 90, weight: 6, discountChance: 0.4, maxDiscount: 15, pack: 6, items: [['Egg', 14], ['Wrap', 10], ['Fillings', 8]] },
      { name: 'Chicken Kathi Roll', price: 170, weight: 6, discountChance: 0.25, maxDiscount: 20, pack: 8, items: [['Chicken', 45], ['Wrap', 10], ['Sauce & onion', 12]] },
      { name: 'Paneer Kathi Roll', price: 150, weight: 4, discountChance: 0.3, maxDiscount: 20, pack: 8, items: [['Paneer', 40], ['Wrap', 10], ['Sauce & onion', 12]] },
      { name: 'Burrito Bowl', price: 260, weight: 3, discountChance: 0.35, maxDiscount: 30, pack: 14, items: [['Rice & beans', 35], ['Chicken', 55], ['Salsa & cheese', 30]] },
      { name: 'Loaded Fries', price: 140, weight: 4, discountChance: 0.6, maxDiscount: 40, pack: 10, items: [['Potato', 20], ['Cheese sauce', 28], ['Seasoning', 6]] }, // thin margin
      { name: 'Cold Coffee', price: 120, weight: 5, discountChance: 0.2, maxDiscount: 15, pack: 7, items: [['Coffee & milk', 22], ['Ice cream', 15]] },
      { name: 'Chicken Wings (6 pc)', price: 240, weight: 3, discountChance: 0.45, maxDiscount: 40, pack: 12, items: [['Wings', 105], ['Sauce', 14]] },
      { name: 'Brownie', price: 110, weight: 2, discountChance: 0.1, maxDiscount: 10, pack: 6, items: [['Chocolate mix', 24], ['Nuts', 8]] },
    ],
  },
  {
    name: 'HSR Healthy Plates', city: 'Bengaluru', baseOrders: 24,
    fees: { Zomato: [24, 18], Swiggy: [21, 18], Direct: [0, 18] },
    menu: [
      { name: 'Idli Vada Combo', price: 110, weight: 5, discountChance: 0.15, maxDiscount: 10, pack: 8, items: [['Idli batter', 12], ['Vada mix', 14], ['Chutney & sambar', 10]] },
      { name: 'Masala Dosa', price: 130, weight: 6, discountChance: 0.15, maxDiscount: 10, pack: 9, items: [['Dosa batter', 14], ['Potato masala', 16], ['Chutney', 6]] },
      { name: 'Quinoa Salad Bowl', price: 280, weight: 2, discountChance: 0.4, maxDiscount: 40, pack: 14, items: [['Quinoa', 55], ['Veggies', 35], ['Dressing', 12]] },
      { name: 'Grilled Chicken Plate', price: 340, weight: 3, discountChance: 0.3, maxDiscount: 35, pack: 15, items: [['Chicken breast', 95], ['Sides', 30], ['Sauce', 10]] },
      { name: 'Millet Khichdi', price: 160, weight: 3, discountChance: 0.1, maxDiscount: 10, pack: 8, items: [['Millet & dal', 30], ['Ghee & spices', 10]] },
      { name: 'Protein Smoothie', price: 190, weight: 4, discountChance: 0.5, maxDiscount: 30, pack: 8, items: [['Whey & banana', 55], ['Milk', 15], ['Nuts', 18]] }, // thin margin
      { name: 'Avocado Toast', price: 230, weight: 2, discountChance: 0.35, maxDiscount: 30, pack: 10, items: [['Avocado', 85], ['Bread', 12], ['Toppings', 15]] }, // high food cost
      { name: 'Filter Coffee', price: 60, weight: 6, discountChance: 0.05, maxDiscount: 5, pack: 5, items: [['Coffee & milk', 11]] },
    ],
  },
];

// Deterministic pseudo-random, so every reseed gives the same data
let seedVal = 20260;
const rand = () => (seedVal = (seedVal * 16807) % 2147483647) / 2147483647;

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
  await User.deleteMany({ email: { $in: [MANAGER.email, STAFF.email] } });

  const owner = await User.create({
    name: OWNER.name, email: OWNER.email, role: 'owner',
    password_hash: await bcrypt.hash(OWNER.password, 10),
  });
  await User.create({
    name: MANAGER.name, email: MANAGER.email, role: 'manager', owner_id: owner._id,
    password_hash: await bcrypt.hash(MANAGER.password, 10),
  });
  await User.create({
    name: STAFF.name, email: STAFF.email, role: 'staff', owner_id: owner._id,
    password_hash: await bcrypt.hash(STAFF.password, 10),
  });

  const platform = {};
  for (const name of ['Zomato', 'Swiggy', 'Direct']) {
    platform[name] = await Platform.findOneAndUpdate({ name }, { $setOnInsert: { name } }, { upsert: true, returnDocument: 'after' });
  }

  const now = new Date();
  let totalOrders = 0;
  let totalDishes = 0;

  for (const o of OUTLETS) {
    const outlet = await Outlet.create({ owner_id: owner._id, name: o.name, city: o.city });

    await FeeRule.create(Object.entries(o.fees).map(([pname, [commission, gst]]) => ({
      outlet_id: outlet._id, platform_id: platform[pname]._id,
      commission_pct: commission, gst_on_commission_pct: gst,
    })));

    const dishes = [];
    for (const m of o.menu) {
      const doc = await Dish.create({ outlet_id: outlet._id, name: m.name, price: m.price });
      await RecipeItem.create(m.items.map(([ingredient_name, cost]) => ({ dish_id: doc._id, ingredient_name, cost })));
      dishes.push({ ...m, doc });
    }
    totalDishes += dishes.length;

    const totalWeight = dishes.reduce((s, d) => s + d.weight, 0);
    const pickDish = () => {
      let r = rand() * totalWeight;
      for (const d of dishes) { r -= d.weight; if (r <= 0) return d; }
      return dishes[0];
    };
    // Zomato 40%, Swiggy 40%, Direct 20%
    const pickPlatform = () => {
      const r = rand();
      return r < 0.4 ? 'Zomato' : r < 0.8 ? 'Swiggy' : 'Direct';
    };

    const orders = [];
    for (let back = DAYS - 1; back >= 0; back--) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - back));
      const dow = day.getUTCDay();
      const weekend = dow === 0 || dow === 5 || dow === 6;
      const growth = 0.75 + 0.5 * ((DAYS - back) / DAYS);   // volume grows ~75% -> 125% over the period
      const promoWeek = Math.floor(back / 7) % 6 === 2;     // every 6th week is a heavy-promo week
      const count = Math.round((o.baseOrders * growth + rand() * 8) * (weekend ? 1.35 : 1));

      for (let i = 0; i < count; i++) {
        const d = pickDish();
        const plat = pickPlatform();
        const discChance = Math.min(0.95, d.discountChance * (promoWeek ? 1.8 : 1));
        const discount = plat !== 'Direct' && rand() < discChance
          ? Math.max(5, Math.round(rand() * d.maxDiscount * (promoWeek ? 1.3 : 1)))
          : 0;
        const value = d.price + (rand() < 0.25 ? Math.round(rand() * 12) : 0); // add-ons
        orders.push({
          outlet_id: outlet._id,
          dish_id: d.doc._id,
          platform_id: platform[plat]._id,
          order_date: day,
          order_value: value,
          discount_amount: discount,
          packaging_cost: d.pack,
        });
      }
    }

    // Insert in chunks to keep memory and request sizes small
    for (let i = 0; i < orders.length; i += 1000) {
      await Order.insertMany(orders.slice(i, i + 1000));
    }
    totalOrders += orders.length;
    console.log(`  ${outlet.name}: ${dishes.length} dishes, ${orders.length} orders`);
  }

  console.log(`Seeded ${OUTLETS.length} outlets, ${totalDishes} dishes and ${totalOrders} orders over the last ${DAYS} days.`);
  console.log(`Log in as ${OWNER.email} / ${OWNER.password} (owner), ${MANAGER.email} / ${MANAGER.password} (manager) or ${STAFF.email} / ${STAFF.password} (kitchen staff).`);
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error('Seed failed:', err.message);
  await mongoose.disconnect();
  process.exit(1);
});
