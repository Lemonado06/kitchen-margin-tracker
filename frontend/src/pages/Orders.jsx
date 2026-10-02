import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/orders', {
        outlet_id: outletId,
        dish_id: dishId,
        platform_id: platformId,
        order_date: orderDate,
        order_value: parseFloat(orderValue),
        discount_amount: parseFloat(discountAmount) || 0,
        packaging_cost: parseFloat(packagingCost) || 0,
      });
      setDishId('');
      setPlatformId('');
      setOrderDate('');
      setOrderValue('');
      setDiscountAmount('0');
      setPackagingCost('0');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create order');
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

        <input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} className="border border-gray-300 rounded px-3 py-2" required />
        <input type="number" placeholder="Order value (₹)" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} className="border border-gray-300 rounded px-3 py-2" required />
        <input type="number" placeholder="Discount (₹)" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} className="border border-gray-300 rounded px-3 py-2" />
        <input type="number" placeholder="Packaging cost (₹)" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} className="border border-gray-300 rounded px-3 py-2" />

        <button type="submit" className="col-span-2 bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700">
          Add Order
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="space-y-2">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800">{order.dish_name} — {order.platform_name}</p>
              <p className="text-sm text-gray-500">{new Date(order.order_date).toLocaleDateString()}</p>
            </div>
            <p className="text-gray-700">₹{order.order_value}</p>
          </div>
        ))}
        {orders.length === 0 && <p className="text-gray-500">No orders yet. Add one above.</p>}
      </div>
    </div>
  );
}