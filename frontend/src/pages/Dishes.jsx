import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

export default function Dishes() {
  const { outletId } = useParams();
  const [dishes, setDishes] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/dishes', { outlet_id: outletId, name, price: parseFloat(price) });
      setName('');
      setPrice('');
      loadDishes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create dish');
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
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
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-32 border border-gray-300 rounded px-3 py-2"
          required
        />
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700">
          Add
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-2">
        {dishes.map((dish) => (
          <div key={dish.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <p className="font-medium text-gray-800">{dish.name}</p>
            <p className="text-gray-600">₹{dish.price}</p>
          </div>
        ))}
        {dishes.length === 0 && <p className="text-gray-500">No dishes yet. Add one above.</p>}
      </div>
    </div>
  );
}