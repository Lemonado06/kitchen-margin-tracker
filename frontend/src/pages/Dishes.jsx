import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import RecipeItems from '../components/RecipeItems';
import OutletTabs from '../components/OutletTabs';
import Icon from '../components/Icon';
import { formatINR, useConfirm, useLoad, useToast } from '../hooks';
import { Button, Card, EditingBanner, EmptyState, ErrorText, Input, Skeleton } from '../components/ui';

export default function Dishes() {
  const { outletId } = useParams();
  const [dishes, loadDishes, loadError] = useLoad(() => api.get(`/dishes/outlet/${outletId}`).then((res) => res.data), [outletId]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

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
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/dishes/${editingId}`, { name: name.trim(), price: priceNum });
        toast('Dish updated');
      } else {
        await api.post('/dishes', { outlet_id: outletId, name: name.trim(), price: priceNum });
        toast('Dish added');
      }
      resetForm();
      loadDishes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save dish');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(dish) {
    setEditingId(dish.id);
    setName(dish.name);
    setPrice(String(dish.price));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(dish) {
    const ok = await confirm({
      title: `Delete "${dish.name}"?`,
      message: 'Its orders and recipe costs will also be deleted.',
    });
    if (!ok) return;
    setError('');
    try {
      await api.delete(`/dishes/${dish.id}`);
      if (editingId === dish.id) resetForm();
      toast('Dish deleted');
      loadDishes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete dish');
    }
  }

  return (
    <>
      <OutletTabs outletId={outletId} title="Dishes" subtitle="Menu prices and the ingredient cost behind each dish." />

      <EditingBanner show={!!editingId} />
      <Card as="form" onSubmit={handleSubmit}
        className={`mb-6 flex flex-col gap-3 p-4 sm:flex-row ${editingId ? 'ring-2 ring-amber-400/60' : ''}`}>
        <Input type="text" placeholder="Dish name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input type="number" placeholder="Price (₹)" min="0.01" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="sm:w-40" required />
        <div className="flex gap-2">
          <Button type="submit" loading={saving} icon={editingId ? 'check' : 'plus'} className="flex-1 sm:flex-none">{editingId ? 'Save' : 'Add'}</Button>
          {editingId && <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>}
        </div>
      </Card>

      <ErrorText>{error || loadError}</ErrorText>

      {!dishes ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : dishes.length === 0 ? (
        <EmptyState icon="chef" title="No dishes yet">Add a dish above, then open its recipe cost to enter ingredients.</EmptyState>
      ) : (
        <div className="space-y-3">
          {dishes.map((dish, i) => {
            const open = openRecipeId === dish.id;
            return (
              <Card key={dish.id} delay={i * 50} className={`p-4 transition duration-300 ${open ? 'border-emerald-400/30' : 'hover:border-white/20'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-amber-300 ring-1 ring-white/10"><Icon name="chef" className="w-4 h-4" /></div>
                    <div>
                      <p className="font-semibold text-white">{dish.name}</p>
                      <p className="text-sm text-slate-400">{formatINR(dish.price)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant={open ? 'primary' : 'ghost'} icon="wallet" onClick={() => setOpenRecipeId(open ? null : dish.id)}>
                      {open ? 'Hide recipe cost' : 'Recipe cost'}
                    </Button>
                    <Button size="sm" variant="subtle" icon="edit" onClick={() => startEdit(dish)}>Edit</Button>
                    {isOwner() && <Button size="sm" variant="danger" icon="trash" onClick={() => handleDelete(dish)}>Delete</Button>}
                  </div>
                </div>
                {open && <RecipeItems dishId={dish.id} dishPrice={parseFloat(dish.price)} />}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
