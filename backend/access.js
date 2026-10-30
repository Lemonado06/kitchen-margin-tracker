// Ownership checks shared by the routes. Each returns the document, or null when the id is
// malformed or the record doesn't belong to the user's account.
const mongoose = require('mongoose');
const { Outlet, Dish, RecipeItem, FeeRule, Order } = require('./models');

const validId = (id) => mongoose.isValidObjectId(id);

async function outletFor(outletId, user) {
  if (!validId(outletId)) return null;
  return Outlet.findOne({ _id: outletId, owner_id: user.accountId });
}

async function dishFor(dishId, user) {
  if (!validId(dishId)) return null;
  const dish = await Dish.findById(dishId);
  return dish && (await outletFor(dish.outlet_id, user)) ? dish : null;
}

async function recipeItemFor(itemId, user) {
  if (!validId(itemId)) return null;
  const item = await RecipeItem.findById(itemId);
  return item && (await dishFor(item.dish_id, user)) ? item : null;
}

async function feeRuleFor(ruleId, user) {
  if (!validId(ruleId)) return null;
  const rule = await FeeRule.findById(ruleId);
  return rule && (await outletFor(rule.outlet_id, user)) ? rule : null;
}

async function orderFor(orderId, user) {
  if (!validId(orderId)) return null;
  const order = await Order.findById(orderId);
  return order && (await outletFor(order.outlet_id, user)) ? order : null;
}

module.exports = { validId, outletFor, dishFor, recipeItemFor, feeRuleFor, orderFor };
