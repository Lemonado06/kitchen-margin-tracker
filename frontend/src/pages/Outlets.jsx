import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { isOwner } from '../api/client';

export default function Outlets() {
  const [outlets, setOutlets] = useState([]);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [editingId, setEditingId] = useState(null);
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

  function resetForm() {
    setName('');
    setCity('');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Outlet name is required');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/outlets/${editingId}`, { name: name.trim(), city: city.trim() });
      } else {
        await api.post('/outlets', { name: name.trim(), city: city.trim() });
      }
      resetForm();
      loadOutlets(); // refresh list
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save outlet');
    }
  }

  function startEdit(outlet) {
    setEditingId(outlet.id);
    setName(outlet.name);
    setCity(outlet.city || '');
  }

  async function handleDelete(outlet) {
    if (!window.confirm(`Delete "${outlet.name}"? Its dishes, orders and fee rules will also be deleted.`)) return;
    setError('');
    try {
      await api.delete(`/outlets/${outlet.id}`);
      if (editingId === outlet.id) resetForm();
      loadOutlets();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete outlet');
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
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
        {outlets.map((outlet) => (
          <div key={outlet.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{outlet.name}</p>
              <p className="text-sm text-gray-500">{outlet.city}</p>
            </div>
            <div className="flex gap-4 items-center text-sm">
              <Link to={`/outlets/${outlet.id}/dishes`} className="text-blue-600">Dishes</Link>
              <Link to={`/outlets/${outlet.id}/orders`} className="text-blue-600">Orders</Link>
              <Link to={`/outlets/${outlet.id}/fee-rules`} className="text-blue-600">Fee Rules</Link>
              <button onClick={() => startEdit(outlet)} className="text-gray-600 hover:text-gray-900">Edit</button>
              {isOwner() && (
                <button onClick={() => handleDelete(outlet)} className="text-red-600 hover:text-red-800">Delete</button>
              )}
            </div>
          </div>
        ))}
        {outlets.length === 0 && <p className="text-gray-500">No outlets yet. Add one above.</p>}
      </div>
    </div>
  );
}
