
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { isOwner, isStaff } from '../api/client';
import OutletTabs from '../components/OutletTabs';
import Icon from '../components/Icon';
import { formatINR, useConfirm, useLoad, useToast } from '../hooks';
import {
  Button,
  EditingBanner,
  ErrorText,
  Field,
  Input,
  Select,
  Skeleton,
} from '../components/ui';

// Prevent timezone shifts when displaying YYYY-MM-DD dates.
function showDate(value) {
  if (!value) return 'Date unavailable';

  const [y, m, d] = value.slice(0, 10).split('-').map(Number);

  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const platformStyles = {
  Zomato: {
    color: '#F07878',
    background: '#321F20',
    border: '#653235',
  },
  Swiggy: {
    color: '#F2B134',
    background: '#302719',
    border: '#65502A',
  },
  Direct: {
    color: '#3DD68C',
    background: '#1C2B21',
    border: '#31513E',
  },
};

function PlatformLabel({ name }) {
  const style = platformStyles[name] || {
    color: '#B5BBB4',
    background: '#242925',
    border: '#394039',
  };

  return (
    <span
      className="inline-flex items-center rounded border px-2 py-1 font-mono text-[9px] tracking-wider"
      style={{
        color: style.color,
        backgroundColor: style.background,
        borderColor: style.border,
      }}
    >
      {name}
    </span>
  );
}

export default function Orders() {
  const { outletId } = useParams();

  const [loaded, loadAll, loadError] = useLoad(
    () =>
      Promise.all([
        api.get(`/orders/outlet/${outletId}`),
        api.get(`/dishes/outlet/${outletId}`),
        api.get('/platforms'),
      ]).then(([o, d, p]) => ({
        orders: o.data,
        dishes: d.data,
        platforms: p.data,
      })),
    [outletId]
  );

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

  const staff = isStaff();
  const owner = isOwner();

  function resetForm() {
    setDishId('');
    setPlatformId('');
    setOrderDate('');
    setOrderValue('');
    setDiscountAmount('0');
    setPackagingCost('0');
    setEditingId(null);
    setError('');
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
        await api.post('/orders', {
          ...body,
          outlet_id: outletId,
        });
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
    setError('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(order) {
    const ok = await confirm({
      title: 'Delete this order?',
      message: `${order.dish_name} on ${order.platform_name}, ${showDate(order.order_date)}.`,
    });

    if (!ok) return;

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

  const totalOrderValue = orders
    ? orders.reduce((sum, order) => sum + Number(order.order_value || 0), 0)
    : 0;

  return (
    <div className="space-y-7">
      <OutletTabs
        outletId={outletId}
        title="Orders"
        subtitle="Record orders and track their platform, discounts and packaging costs."
      />

      {/* Order overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-4">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            TOTAL ORDERS
          </p>
          <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#F2EDE0]">
            {orders ? orders.length : '—'}
          </p>
        </div>

        <div className="rounded-xl border border-[#2A2F2B] bg-[#151816] p-4">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            ORDER VALUE
          </p>
          <p className="mt-2 truncate font-mono text-xl font-semibold tabular-nums text-[#3DD68C]">
            {orders ? formatINR(totalOrderValue) : '—'}
          </p>
        </div>

        <div className="col-span-2 rounded-xl border border-[#2A2F2B] bg-[#151816] p-4 sm:col-span-1">
          <p className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
            ACCESS LEVEL
          </p>
          <p className="mt-2 text-sm font-semibold text-[#F2EDE0]">
            {staff ? 'Order entry' : owner ? 'Owner access' : 'Manager access'}
          </p>
        </div>
      </div>

      {/* Add / edit order */}
      <section
        className={[
          'rounded-xl border bg-[#151816] p-5 sm:p-6',
          editingId ? 'border-[#8C6928]' : 'border-[#2A2F2B]',
        ].join(' ')}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#7E877F]">
              {editingId ? 'EDIT TRANSACTION' : 'ORDER ENTRY'}
            </p>

            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F2EDE0]">
              {editingId ? 'Update order details' : 'Record a new order'}
            </h2>

            <p className="mt-1 text-xs text-[#929891]">
              Enter the order details and additional costs.
            </p>
          </div>

          <span className="rounded border border-[#2A2F2B] bg-[#1A1D1B] px-2.5 py-1 font-mono text-[9px] tracking-wider text-[#929891]">
            {editingId ? 'EDIT MODE' : 'NEW ORDER'}
          </span>
        </div>

        <EditingBanner show={!!editingId} />

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Dish">
              <Select
                value={dishId}
                onChange={(e) => setDishId(e.target.value)}
                required
              >
                <option value="">Select dish</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Platform">
              <Select
                value={platformId}
                onChange={(e) => setPlatformId(e.target.value)}
                required
              >
                <option value="">Select platform</option>
                {platforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Order date">
              <Input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
              />
            </Field>

            <Field label="Order value (₹)">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={orderValue}
                onChange={(e) => setOrderValue(e.target.value)}
                required
              />
            </Field>

            <Field label="Discount (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(e.target.value)}
              />
            </Field>

            <Field label="Packaging cost (₹)">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={packagingCost}
                onChange={(e) => setPackagingCost(e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-5 rounded-lg border border-[#2A2F2B] bg-[#111412] p-3">
            <p className="flex items-center gap-2 text-[10px] text-[#929891]">
              <Icon name="info" className="h-3.5 w-3.5 text-[#F2B134]" />
              Discount and packaging costs are recorded separately from the
              order value.
            </p>
          </div>

          <ErrorText>{error}</ErrorText>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              type="submit"
              loading={saving}
              icon={editingId ? 'check' : 'plus'}
            >
              {editingId ? 'Save order' : 'Add order'}
            </Button>

            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>

      <ErrorText>{loadError}</ErrorText>

      {/* Order history */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#F2EDE0]">
              Order history
            </h2>
            <p className="mt-1 text-xs text-[#929891]">
              Recorded transactions for this outlet.
            </p>
          </div>

          {orders && (
            <span className="font-mono text-[9px] tracking-wider text-[#858D85]">
              {orders.length} RECORDS
            </span>
          )}
        </div>

        {!orders ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#394039] bg-[#151816] px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2A2F2B] bg-[#1A1D1B] text-[#3DD68C]">
              <Icon name="receipt" className="h-5 w-5" />
            </div>

            <h3 className="text-base font-semibold text-[#F2EDE0]">
              No orders yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-[#929891]">
              {dishes.length === 0
                ? 'Add a dish first, then record its orders here.'
                : 'Record the first order using the form above.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order, index) => (
              <article
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#2A2F2B] bg-[#151816] p-4 transition-colors hover:border-[#465047] sm:px-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#394039] bg-[#202520] text-[#AEB5AD]">
                    <Icon name="receipt" className="h-[17px] w-[17px]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-xs font-semibold text-[#F2EDE0]">
                        {order.dish_name}
                      </h3>

                      <PlatformLabel name={order.platform_name} />
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#858D85]">
                      <span>{showDate(order.order_date)}</span>

                      {order.discount_amount > 0 && (
                        <>
                          <span className="text-[#505850]">·</span>
                          <span>
                            Discount ₹{Number(order.discount_amount).toFixed(2)}
                          </span>
                        </>
                      )}

                      {order.packaging_cost > 0 && (
                        <>
                          <span className="text-[#505850]">·</span>
                          <span>
                            Packaging ₹{Number(order.packaging_cost).toFixed(2)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold tabular-nums text-[#3DD68C]">
                    {formatINR(order.order_value)}
                  </p>

                  {!staff && (
                    <button
                      type="button"
                      onClick={() => startEdit(order)}
                      aria-label={`Edit order for ${order.dish_name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#292E2A] hover:text-[#F2EDE0]"
                    >
                      <Icon name="edit" className="h-4 w-4" />
                    </button>
                  )}

                  {owner && (
                    <button
                      type="button"
                      onClick={() => handleDelete(order)}
                      aria-label={`Delete order for ${order.dish_name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#321F20] hover:text-[#E5484D]"
                    >
                      <Icon name="trash" className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <span className="sr-only">
                  Order record {index + 1}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
