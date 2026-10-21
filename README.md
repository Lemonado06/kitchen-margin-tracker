# Kitchen Margin Tracker

Profit tracker for cloud kitchens selling on Zomato, Swiggy and direct orders. It works out the real profit on every order after platform commission, GST on that commission, discounts, packaging and food cost, and shows it on a dashboard with an AI assistant you can ask about your margins.

**Stack:** React 19 + Vite + Tailwind CSS 4 + Recharts (frontend) · Node.js + Express 5 + MongoDB with Mongoose (backend) · JWT auth with bcrypt · Google Gemini tool-calling for the assistant.

## Run it locally

You need Node.js 20+ and a MongoDB database: either [MongoDB Community Server](https://www.mongodb.com/try/download/community) installed locally, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env      # then set MONGODB_URI, JWT_SECRET and GEMINI_API_KEY
npm run seed              # optional: demo data (owner@demo.com / demo123, manager@demo.com / demo123)
npm run dev               # API on http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev               # app on http://localhost:5173
```

`MONGODB_URI` examples:
- Local: `mongodb://127.0.0.1:27017/kitchen_margin_tracker`
- Atlas: `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/kitchen_margin_tracker`

The server creates the Zomato, Swiggy and Direct platforms on first start. Set `VITE_API_URL` in `frontend/.env` if the API is not on `http://localhost:5000`.

## Users and roles

| | Owner | Manager |
|---|:-:|:-:|
| View dashboard and AI assistant | ✓ | ✓ |
| Add and edit outlets, dishes, recipe costs, orders, fee rules | ✓ | ✓ |
| Delete any of those | ✓ | |
| Add, rename or delete delivery platforms | ✓ | |
| Add, edit and remove managers (Team page) | ✓ | |

Owners sign up on the Register page. Managers are added by an owner from the **Team** page and work on that owner's outlets. Every user can change their name and password on the **Profile** page. The API checks the role on every request, and a removed manager is locked out straight away.

## Database (MongoDB collections)

| Collection | Key fields |
|---|---|
| `users` | name, email (unique), password_hash, role (`owner` / `manager`), owner_id (managers only) |
| `outlets` | owner_id, name, city |
| `dishes` | outlet_id, name, price |
| `recipeitems` | dish_id, ingredient_name, cost (sum = dish food cost) |
| `platforms` | name |
| `feerules` | outlet_id, platform_id (unique pair), commission_pct, gst_on_commission_pct |
| `orders` | outlet_id, platform_id, dish_id, order_date, order_value, discount_amount, packaging_cost |

Models are in [backend/models.js](backend/models.js). Deleting an outlet or dish also deletes its child records.

**Profit per order** = order value − commission − GST on commission − discount − packaging − food cost.

## API testing with Postman

Import both files from [postman/](postman/) into Postman:
- `KitchenMarginTracker.postman_collection.json`: 58 requests in 11 folders (auth, users and roles, platforms, outlets, dishes and recipe costs, fee rules, orders, dashboard, AI assistant, cleanup), each with tests.
- `KitchenMarginTracker.local.postman_environment.json`: sets `baseUrl` to `http://localhost:5000`.

Select the environment and run the whole collection with the **Collection Runner**. It registers a fresh owner, saves the JWT automatically, adds a manager, checks that role permissions are enforced, verifies the margin maths and cleans up after itself. The same run works from the command line:

```bash
npx newman run postman/KitchenMarginTracker.postman_collection.json -e postman/KitchenMarginTracker.local.postman_environment.json
```

The AI assistant folder needs a valid `GEMINI_API_KEY` and will fail when Gemini returns "high demand" (503).

## UI

Dark glassmorphism theme: translucent blurred panels over animated gradient blobs. It includes page enter transitions, staggered list animations, hover lift and press effects, animated KPI counters, gradient charts, skeleton loaders, toast notifications and confirm dialogs, plus a slide-in menu on mobile. Animations are switched off when the OS "reduce motion" setting is on.
