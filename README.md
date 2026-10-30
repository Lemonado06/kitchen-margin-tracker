# Kitchen Margin Tracker

Profit tracker for cloud kitchens selling on Zomato, Swiggy and direct orders. It works out the real profit on every order after platform commission, GST on that commission, discounts, packaging and food cost, and shows it on a dashboard with an AI assistant you can ask about your margins. A public landing page at `/` explains the product; the app itself is behind login.

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

The server creates the Zomato, Swiggy and Direct platforms on first start. `GEMINI_MODELS` (optional) sets the Gemini models the assistant tries, in order. Set `VITE_API_URL` in `frontend/.env` if the API is not on `http://localhost:5000`.

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

## AI assistant

Built on Google Gemini with function calling, and grounded in the outlet's own MongoDB data:

- **Chat** (`POST /ai/chat`): sends the question, the active dashboard filters (platform, dish, dates) and the last 10 turns of the conversation, so follow-ups like "what if I raise its price?" work. Gemini chooses from 10 tools: KPIs, cost breakdown, margin by dish, margin by platform, discount impact, profit trend (day/week), menu costing, fee rules, recent orders and a price what-if simulator. It can call several tools in one round. Each answer lists the tools it used and the model that wrote it.
- **Insights** (`POST /ai/insights`): 3–4 insight cards for the dashboard's current filters, written by Gemini as structured JSON. If Gemini is unavailable, the cards are calculated from the same numbers instead, so the dashboard never shows an error.
- **Reliability**: each Gemini call has a 25 s timeout; a busy model (503/504/429) falls through to the next model in `GEMINI_MODELS` and is skipped for 2 minutes.

Code: [backend/ai.js](backend/ai.js) (routes, prompts, model fallback) and [backend/aiTools.js](backend/aiTools.js) (the data tools).

## API testing with Postman

[postman/](postman/) has a collection of **64 requests in 11 folders**, each with tests, a description and a saved example response, plus an environment file and an HTML report of the last run (64 requests, 0 failures). See [postman/README.md](postman/README.md) for how to run it in Postman or with `npx newman`.

## UI

Public landing page with a product overview, a worked example of where a ₹450 order's money goes, features, how it works, an AI demo and the two roles; sections fade in as you scroll.

Dark glassmorphism theme: translucent blurred panels over animated gradient blobs. It includes page enter transitions, staggered list animations, hover lift and press effects, animated KPI counters, gradient charts, skeleton loaders, toast notifications and confirm dialogs, plus a slide-in menu on mobile. Animations are switched off when the OS "reduce motion" setting is on.
