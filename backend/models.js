
const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

// Every model sends `id` instead of `_id` and keeps the snake_case field names the frontend already uses
function schema(fields, extraToJSON) {
  const s = new Schema(fields, {
    timestamps: { createdAt: 'created_at', updatedAt: false },
    versionKey: false,
  });

  s.set('toJSON', {
    transform(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;

      for (const [key, value] of Object.entries(ret)) {
        if (value instanceof Types.ObjectId) {
          ret[key] = value.toString();
        }
      }

      if (extraToJSON) extraToJSON(ret);
      return ret;
    },
  });

  return s;
}

const ref = (model, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: model,
  required,
  index: true,
});

// Owners sign up themselves; managers and kitchen staff are added by an owner and work on that owner's outlets
const userSchema = schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'manager', 'staff'], required: true },
  owner_id: ref('User', false), // set for managers and staff
}, (ret) => {
  delete ret.password_hash;
});

const outletSchema = schema({
  owner_id: ref('User'),
  name: { type: String, required: true, trim: true },
  city: { type: String, default: null, trim: true },
});

const dishSchema = schema({
  outlet_id: ref('Outlet'),
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
});

// Ingredient costs; their sum is a dish's food cost
const recipeItemSchema = schema({
  dish_id: ref('Dish'),
  ingredient_name: { type: String, required: true, trim: true },
  cost: { type: Number, required: true, min: 0 },
});

const platformSchema = schema({
  name: { type: String, required: true, trim: true },
});

// Commission and GST charged by each platform, per outlet
const feeRuleSchema = schema({
  outlet_id: ref('Outlet'),
  platform_id: ref('Platform'),
  commission_pct: { type: Number, required: true, min: 0, max: 100 },
  gst_on_commission_pct: { type: Number, default: 18, min: 0, max: 100 },
  effective_from: { type: Date, default: Date.now },
});

feeRuleSchema.index({ outlet_id: 1, platform_id: 1 }, { unique: true });

// order_date is a calendar day stored as UTC midnight and sent back as YYYY-MM-DD
const orderSchema = schema({
  outlet_id: ref('Outlet'),
  platform_id: ref('Platform'),
  dish_id: ref('Dish'),
  order_date: { type: Date, required: true },
  order_value: { type: Number, required: true, min: 0 },
  discount_amount: { type: Number, default: 0, min: 0 },
  packaging_cost: { type: Number, default: 0, min: 0 },
}, (ret) => {
  if (ret.order_date) {
    ret.order_date = ret.order_date.toISOString().slice(0, 10);
  }
});

orderSchema.index({ outlet_id: 1, order_date: -1 });

// Admin activity / audit log
const auditLogSchema = schema({
  // Owner account that owns this activity
  account_id: ref('User'),

  // User who performed the action; null for unidentified login attempts
  user_id: ref('User', false),

  // Snapshot so historical activity remains readable if the user is renamed
  user_name: {
    type: String,
    required: true,
    default: 'Unknown user',
    trim: true,
  },

  user_role: {
    type: String,
    enum: ['owner', 'manager', 'staff', null],
    default: null,
  },

  action: {
    type: String,
    required: true,
    enum: [
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGIN_FAILED',
      'LOGOUT',
    ],
  },

  module: {
    type: String,
    required: true,
    enum: [
      'AUTH',
      'ORDERS',
      'OUTLETS',
      'MENU',
      'RECIPE_COSTING',
      'FEE_RULES',
      'TEAM',
      'PROFILE',
    ],
  },

  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },

  // Optional reference to the affected record
  entity_id: {
    type: String,
    default: null,
  },

  // Optional outlet associated with the action
  outlet_id: {
    type: String,
    default: null,
  },
});

// Efficient account-level activity queries and filtering
auditLogSchema.index({ account_id: 1, created_at: -1 });
auditLogSchema.index({ account_id: 1, user_id: 1, created_at: -1 });
auditLogSchema.index({ account_id: 1, module: 1, created_at: -1 });
auditLogSchema.index({ account_id: 1, action: 1, created_at: -1 });

module.exports = {
  User: mongoose.model('User', userSchema),
  Outlet: mongoose.model('Outlet', outletSchema),
  Dish: mongoose.model('Dish', dishSchema),
  RecipeItem: mongoose.model('RecipeItem', recipeItemSchema),
  Platform: mongoose.model('Platform', platformSchema),
  FeeRule: mongoose.model('FeeRule', feeRuleSchema),
  Order: mongoose.model('Order', orderSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
};
