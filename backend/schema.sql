-- Kitchen Margin Tracker database schema (PostgreSQL 13+)
-- Run once on an empty database:  psql "$DATABASE_URL" -f schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- gen_random_uuid() on PostgreSQL < 13

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('owner', 'manager')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outlets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  city       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dishes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id  UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  price      NUMERIC(10, 2) NOT NULL CHECK (price > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ingredient costs; their sum is a dish's food cost
CREATE TABLE IF NOT EXISTS recipe_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id         UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  cost            NUMERIC(10, 2) NOT NULL CHECK (cost >= 0)
);

CREATE TABLE IF NOT EXISTS platforms (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

-- Commission and GST charged by each platform, per outlet
CREATE TABLE IF NOT EXISTS platform_fee_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id             UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  platform_id           UUID NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  commission_pct        NUMERIC(5, 2) NOT NULL CHECK (commission_pct BETWEEN 0 AND 100),
  gst_on_commission_pct NUMERIC(5, 2) NOT NULL DEFAULT 18 CHECK (gst_on_commission_pct BETWEEN 0 AND 100),
  UNIQUE (outlet_id, platform_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id       UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  platform_id     UUID NOT NULL REFERENCES platforms(id),
  dish_id         UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  order_date      DATE NOT NULL,
  order_value     NUMERIC(10, 2) NOT NULL CHECK (order_value > 0),
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  packaging_cost  NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (packaging_cost >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_outlet_date ON orders (outlet_id, order_date);

INSERT INTO platforms (name) VALUES ('Zomato'), ('Swiggy'), ('Direct')
ON CONFLICT (name) DO NOTHING;
