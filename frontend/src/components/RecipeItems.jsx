import { useState, useEffect } from 'react';
import api, { isOwner } from '../api/client';

// Ingredient cost list for one dish; the total is the dish's food cost
export default function RecipeItems({ dishId, dishPrice }) {
  const [items, setItems] = useState([]);
  const [ingredient, setIngredient] = useState('');
  const [cost, setCost] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function loadItems() {
    try {
      const res = await api.get(`/recipe-items/dish/${dishId}`);
      setItems(res.data);
    } catch (err) {
      setError('Failed to load recipe items');
    }
  }

  useEffect(() => {
    loadItems();
  }, [dishId]);

  function resetForm() {
    setIngredient('');
    setCost('');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const costNum = parseFloat(cost);
    if (!ingredient.trim() || isNaN(costNum) || costNum < 0) {
      setError('Enter an ingredient and a cost of 0 or more');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/recipe-items/${editingId}`, { ingredient_name: ingredient.trim(), cost: costNum });
      } else {
        await api.post('/recipe-items', { dish_id: dishId, ingredient_name: ingredient.trim(), cost: costNum });
      }
      resetForm();
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recipe item');
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setIngredient(item.ingredient_name);
    setCost(String(item.cost));
  }

  async function handleDelete(item) {
    if (!window.confirm(`Remove "${item.ingredient_name}"?`)) return;
    try {
      await api.delete(`/recipe-items/${item.id}`);
      if (editingId === item.id) resetForm();
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete recipe item');
    }
  }

  const foodCost = items.reduce((s, i) => s + parseFloat(i.cost), 0);
  const foodCostPct = dishPrice > 0 ? (foodCost / dishPrice) * 100 : 0;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <table className="w-full text-sm mb-3">
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="py-2 text-gray-700">{item.ingredient_name}</td>
              <td className="py-2 text-right text-gray-700">₹{item.cost}</td>
              <td className="py-2 text-right w-32">
                <button onClick={() => startEdit(item)} className="text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                {isOwner() && (
                  <button onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-800">Delete</button>
                )}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr><td colSpan="3" className="py-2 text-gray-400">No ingredients yet. Food cost counts as ₹0.</td></tr>
          )}
        </tbody>
      </table>

      <p className="text-sm font-medium text-gray-800 mb-3">
        Food cost: ₹{foodCost.toFixed(2)} <span className="text-gray-500 font-normal">({foodCostPct.toFixed(1)}% of price)</span>
      </p>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          placeholder="Ingredient"
          value={ingredient}
          onChange={(e) => setIngredient(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
          required
        />
        <input
          type="number"
          placeholder="Cost (₹)"
          min="0"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          className="w-28 border border-gray-300 rounded px-3 py-1.5 text-sm"
          required
        />
        <button type="submit" className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm hover:bg-gray-900">
          {editingId ? 'Save' : 'Add'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="text-gray-500 text-sm px-2">Cancel</button>
        )}
      </form>

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
