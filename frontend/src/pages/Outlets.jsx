import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function Outlets() {
  const [outlets, setOutlets] = useState([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [error, setError] = useState('');

  async function loadOutlets() {
    try {
      const res = await api.get('/outlets');
      setOutlets(res.data);
    } catch (err) {
      setError('Failed to load outlets');
    }
  }

  useEffect(() => {
    loadOutlets();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/outlets', { name, city });
      setName('');
      setCity('');
      loadOutlets(); // refresh list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create outlet');
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link to="/dashboard" className="text-blue-600 text-sm">&larr; Back to Dashboard</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6 text-gray-800">Outlets</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Outlet name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
          required
        />
        <input
          type="text"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2"
        />
        <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700">
          Add
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-2">
        {outlets.map((outlet) => (
          <div key={outlet.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{outlet.name}</p>
              <p className="text-sm text-gray-500">{outlet.city}</p>
            </div>
                        <div className="flex gap-4">
              <Link to={`/outlets/${outlet.id}/dishes`} className="text-blue-600 text-sm">
                Manage Dishes &rarr;
              </Link>
              <Link to={`/outlets/${outlet.id}/orders`} className="text-blue-600 text-sm">
                Manage Orders &rarr;
              </Link>
            </div>
          </div>
        ))}
        {outlets.length === 0 && <p className="text-gray-500">No outlets yet. Add one above.</p>}
      </div>
    </div>
  );
}