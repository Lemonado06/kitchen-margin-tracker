import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { isOwner } from '../api/client';

// DATE values arrive as local-midnight timestamps; keep them in local time for <input type="date">
function toDateInput(value) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function Orders() {
  const { outletId } = useParams();
  const [orders, setOrders] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [dishId, setDishId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [packagingCost, setPackagingCost] = useState('0');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  async function loadAll() {
    try {
      const [ordersRes, dishesRes, platformsRes] = await Promise.all([
        api.get(`/orders/outlet/${outletId}`),
        api.get(`/dishes/outlet/${outletId}`),
        api.get('/platforms'),
      ]);
      setOrders(ordersRes.data);
      setDishes(dishesRes.data);
      setPlatforms(platformsRes.data);
    } catch (err) {
      setError('Failed to load data');
    }
  }

  useEffect(() => {
    loadAll();
  }, [outletId]);

  function resetForm() {
    setDishId('');
    setPlatformId('');
    setOrderDate('');
    setOrderValue('');
    setDiscountAmount('0');
    setPackagingCost('0');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const value = parseFloat(orderValue);
    const discount = parseFloat(discountAmount) || 0;
    const packaging = parseFloat(packagingCost) || 0;
    if (isNaN(value) || value <= 0) {
      setError('Order value must be greater than 0');
      return;
    }
    if (discount < 0 || packaging < 0) {
      setError('Discount and packaging cost cannot be negative');
      return;
    }
    if (discount >= value) {
      setError('Discount must be less than the order value');
      return;
    }
    const body = {
      dish_id: dishId,
      platform_id: platformId,
      order_date: orderDate,
      order_value: value,
      discount_amount: discount,
      packaging_cost: packaging,
    };
    try {
      if (editingId) {
        await api.put(`/orders/${editingId}`, body);
      } else {
        await api.post('/orders', { ...body, outlet_id: outletId });
      }
      resetForm();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save order');
    }
  }

  function startEdit(order) {
    setEditingId(order.id);
    setDishId(order.dish_id);
    setPlatformId(order.platform_id);
    setOrderDate(toDateInput(order.order_date));
    setOrderValue(String(order.order_value));
    setDiscountAmount(String(order.discount_amount));
    setPackagingCost(String(order.packaging_cost));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(order) {
    if (!window.confirm(`Delete this ${order.dish_name} order?`)) return;
    setError('');
    try {
      await api.delete(`/orders/${order.id}`);
      if (editingId === order.id) resetForm();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete order');
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/outlets" className="text-blue-600 text-sm">&larr; Back to Outlets</Link>
      <h1 className="text-2xl font-bold mt-2 mb-6 text-gray-800">Orders</h1>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-2 gap-3">
        <select value={dishId} onChange={(e) => setDishId(e.target.value)} className="border border-gray-300 rounded px-3 py-2" required>
          <option value="">Select dish</option>
          {dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select value={platformId} onChange={(e) => setPlatformId(e.target.value)} className="border border-gray-300 rounded px-3 py-2" required>
          <option value="">Select platform</option>
          {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label className="text-xs text-gray-500">
          Order date
          <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800" required />
        </label>
        <label className="text-xs text-gray-500">
          Order value (₹)
          <input type="number" min="0.01" step="0.01" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800" required />
        </label>
        <label className="text-xs text-gray-500">
          Discount (₹)
          <input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800" />
        </label>
        <label className="text-xs text-gray-500">
          Packaging cost (₹)
          <input type="number" min="0" step="0.01" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800" />
        </label>

        <div className="col-span-2 flex gap-2">
          <button type="submit" className="flex-1 bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700">
            {editingId ? 'Save Order' : 'Add Order'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-gray-500 px-4 hover:text-gray-800">Cancel</button>
          )}
        </div>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{order.dish_name} — {order.platform_name}</p>
              <p className="text-sm text-gray-500">
                {new Date(order.order_date).toLocaleDateString()}
                {parseFloat(order.discount_amount) > 0 && ` · ₹${order.discount_amount} discount`}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <p className="text-gray-700 text-base">₹{order.order_value}</p>
              <button onClick={() => startEdit(order)} className="text-gray-600 hover:text-gray-900">Edit</button>
              {isOwner() && (
                <button onClick={() => handleDelete(order)} className="text-red-600 hover:text-red-800">Delete</button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500">No orders yet. Add one above.</p>}
      </div>
    </div>
  );
}
