import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import RecipeItems from '../components/RecipeItems';

export default function Dishes() {
  const { outletId } = useParams();
  const [dishes, setDishes] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [error, setError] = useState('');

  async function loadDishes() {
    try {
      const res = await api.get(`/dishes/outlet/${outletId}`);
      setDishes(res.data);
    } catch (err) {
      setError('Failed to load dishes');
    }
  }

  useEffect(() => {
    loadDishes();
  }, [outletId]);

  function resetForm() {
    setName('');
    setPrice('');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const priceNum = parseFloat(price);
    if (!name.trim()) {
      setError('Dish name is required');
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/dishes/${editingId}`, { name: name.trim(), price: priceNum });
      } else {
        await api.post('/dishes', { outlet_id: outletId, name: name.trim(), price: priceNum });
      }
      resetForm();
      loadDishes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save dish');
    }
  }

  function startEdit(dish) {
    setEditingId(dish.id);
    setName(dish.name);
    setPrice(String(dish.price));
  }

  async function handleDelete(dish) {
    if (!window.confirm(`Delete "${dish.name}"? Its orders and recipe costs will also be deleted.`)) return;
    setError('');
    try {
      await api.delete(`/dishes/${dish.id}`);
      if (editingId === dish.id) resetForm();
      loadDishes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete dish');
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/outlets" className="text-blue-600 text-sm">&larr; Back to Outlets</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6 text-gray-800">Dishes</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Dish name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          required
        />
        <input
          type="number"
          placeholder="Price (₹)"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-32 border border-gray-300 rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700">
          {editingId ? 'Save' : 'Add'}
        </button>
        {editingId && (
          <button type="button" onClick={resetForm} className="text-gray-500 px-2 hover:text-gray-800">
            Cancel
          </button>
        )}
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-2">
        {dishes.map((dish) => (
          <div key={dish.id} className="bg-white p-4 rounded-lg shadow">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-800">{dish.name}</p>
                <p className="text-sm text-gray-600">₹{dish.price}</p>
              </div>
              <div className="flex gap-4 text-sm">
                <button
                  onClick={() => setOpenRecipeId(openRecipeId === dish.id ? null : dish.id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {openRecipeId === dish.id ? 'Hide recipe cost' : 'Recipe cost'}
                </button>
                <button onClick={() => startEdit(dish)} className="text-gray-600 hover:text-gray-900">Edit</button>
                {isOwner() && (
                  <button onClick={() => handleDelete(dish)} className="text-red-600 hover:text-red-800">Delete</button>
                )}
              </div>
            </div>
            {openRecipeId === dish.id && <RecipeItems dishId={dish.id} dishPrice={parseFloat(dish.price)} />}
          </div>
        ))}
        {dishes.length === 0 && <p className="text-gray-500">No dishes yet. Add one above.</p>}
      </div>
    </div>
  );
}
