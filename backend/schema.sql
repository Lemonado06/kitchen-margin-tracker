-- Kitchen Margin Tracker database schema (PostgreSQL 13+)
-- Matches the live database. Run once on an empty database:  psql "$DATABASE_URL" -f schema.sql
-- Foreign keys do not cascade; the API deletes child rows itself (see outlets.js and dishes.js).

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on PostgreSQL < 13

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'admin')),
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outlets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID REFERENCES users(id),
  name       TEXT NOT NULL,
  city       TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dishes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id  UUID REFERENCES outlets(id),
  name       TEXT NOT NULL,
  price      NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ingredient costs; their sum is a dish's food cost
CREATE TABLE IF NOT EXISTS recipe_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id         UUID REFERENCES dishes(id),
  ingredient_name TEXT NOT NULL,
  cost            NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS platforms (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);

-- Commission and GST charged by each platform, per outlet
CREATE TABLE IF NOT EXISTS platform_fee_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id             UUID REFERENCES outlets(id),
  platform_id           UUID REFERENCES platforms(id),
  commission_pct        NUMERIC NOT NULL,
  gst_on_commission_pct NUMERIC DEFAULT 18,
  effective_from        DATE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id       UUID REFERENCES outlets(id),
  platform_id     UUID REFERENCES platforms(id),
  dish_id         UUID REFERENCES dishes(id),
  order_date      DATE NOT NULL,
  order_value     NUMERIC NOT NULL,
  discount_amount NUMERIC DEFAULT 0,
  packaging_cost  NUMERIC DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW()
);

INSERT INTO platforms (name)
SELECT v.name FROM (VALUES ('Zomato'), ('Swiggy'), ('Direct')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM platforms p WHERE p.name = v.name);
