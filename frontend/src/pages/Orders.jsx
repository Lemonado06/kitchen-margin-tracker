import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import OutletTabs from '../components/OutletTabs';
import Icon from '../components/Icon';
import { formatINR, useConfirm, useLoad, useToast } from '../hooks';
import { Badge, Button, Card, EditingBanner, EmptyState, ErrorText, Field, Input, Select, Skeleton } from '../components/ui';

// order_date arrives as "YYYY-MM-DD"; build the date from its parts so it never shifts by time zone
function showDate(value) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const platformTone = { Zomato: 'red', Swiggy: 'amber', Direct: 'green' };

export default function Orders() {
  const { outletId } = useParams();
  const [loaded, loadAll, loadError] = useLoad(() => Promise.all([
    api.get(`/orders/outlet/${outletId}`),
    api.get(`/dishes/outlet/${outletId}`),
    api.get('/platforms'),
  ]).then(([o, d, p]) => ({ orders: o.data, dishes: d.data, platforms: p.data })), [outletId]);
  const orders = loaded?.orders ?? null;
  const dishes = loaded?.dishes ?? [];
  const platforms = loaded?.platforms ?? [];
  const [dishId, setDishId] = useState('');
  const [platformId, setPlatformId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [orderValue, setOrderValue] = useState('');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [packagingCost, setPackagingCost] = useState('0');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

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
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/orders/${editingId}`, body);
        toast('Order updated');
      } else {
        await api.post('/orders', { ...body, outlet_id: outletId });
        toast('Order added');
      }
      resetForm();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save order');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(order) {
    setEditingId(order.id);
    setDishId(order.dish_id);
    setPlatformId(order.platform_id);
    setOrderDate(order.order_date.slice(0, 10));
    setOrderValue(String(order.order_value));
    setDiscountAmount(String(order.discount_amount));
    setPackagingCost(String(order.packaging_cost));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(order) {
    if (!(await confirm({ title: 'Delete this order?', message: `${order.dish_name} on ${order.platform_name}, ${showDate(order.order_date)}.` }))) return;
    setError('');
    try {
      await api.delete(`/orders/${order.id}`);
      if (editingId === order.id) resetForm();
      toast('Order deleted');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete order');
    }
  }

  return (
    <>
      <OutletTabs outletId={outletId} title="Orders" subtitle="Every order with its platform, discount and packaging cost." />

      <EditingBanner show={!!editingId} />
      <Card as="form" onSubmit={handleSubmit}
        className={`mb-6 grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 ${editingId ? 'ring-2 ring-warn' : ''}`}>
        <Field label="Dish">
          <Select value={dishId} onChange={(e) => setDishId(e.target.value)} required>
            <option value="">Select dish</option>
            {dishes.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Platform">
          <Select value={platformId} onChange={(e) => setPlatformId(e.target.value)} required>
            <option value="">Select platform</option>
            {platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Order date">
          <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} required />
        </Field>
        <Field label="Order value (₹)">
          <Input type="number" min="0.01" step="0.01" value={orderValue} onChange={(e) => setOrderValue(e.target.value)} required />
        </Field>
        <Field label="Discount (₹)">
          <Input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(e.target.value)} />
        </Field>
        <Field label="Packaging cost (₹)">
          <Input type="number" min="0" step="0.01" value={packagingCost} onChange={(e) => setPackagingCost(e.target.value)} />
        </Field>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
          <Button type="submit" loading={saving} icon={editingId ? 'check' : 'plus'} className="flex-1">
            {editingId ? 'Save order' : 'Add order'}
          </Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
      </Card>

      <ErrorText>{error || loadError}</ErrorText>

      {!orders ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState icon="receipt" title="No orders yet">{dishes.length === 0 ? 'Add a dish first, then record its orders here.' : 'Add the first order above.'}</EmptyState>
      ) : (
        <div className="space-y-2">
          {orders.map((order, i) => (
            <Card key={order.id} delay={Math.min(i, 12) * 40}
              className="group flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:border-ink/20 hover:bg-subtle">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-subtle text-info ring-1 ring-line"><Icon name="receipt" className="w-4 h-4" /></div>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {order.dish_name} <Badge tone={platformTone[order.platform_name] || 'slate'}>{order.platform_name}</Badge>
                  </p>
                  <p className="text-xs text-muted">
                    {showDate(order.order_date)}
                    {order.discount_amount > 0 && ` · ₹${order.discount_amount} discount`}
                    {order.packaging_cost > 0 && ` · ₹${order.packaging_cost} packaging`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="mr-2 text-base font-semibold text-ink">{formatINR(order.order_value)}</p>
                <button onClick={() => startEdit(order)} className="rounded-lg p-2 text-muted transition hover:bg-subtle hover:text-ink" aria-label="Edit order">
                  <Icon name="edit" className="w-4 h-4" />
                </button>
                {isOwner() && (
                  <button onClick={() => handleDelete(order)} className="rounded-lg p-2 text-muted transition hover:bg-bad-bg hover:text-bad" aria-label="Delete order">
                    <Icon name="trash" className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
