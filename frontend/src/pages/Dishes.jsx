
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import api, { isOwner } from '../api/client';
import RecipeItems from '../components/RecipeItems';
import OutletTabs from '../components/OutletTabs';
import Icon from '../components/Icon';
import { formatINR, useConfirm, useLoad, useToast } from '../hooks';
import {
  Button,
  EditingBanner,
  ErrorText,
  Input,
  Skeleton,
} from '../components/ui';

export default function Dishes() {
  const { outletId } = useParams();

  const [dishes, loadDishes, loadError] = useLoad(
    () => api.get(`/dishes/outlet/${outletId}`).then((res) => res.data),
    [outletId]
  );

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
    setError('');
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
        await api.put(`/dishes/${editingId}`, {
          name: name.trim(),
          price: priceNum,
        });
        toast('Dish updated');
      } else {
        await api.post('/dishes', {
          outlet_id: outletId,
          name: name.trim(),
          price: priceNum,
        });
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
    setError('');
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
      if (openRecipeId === dish.id) setOpenRecipeId(null);

      toast('Dish deleted');
      loadDishes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete dish');
    }
  }

  return (
    <div className="space-y-7">
      <OutletTabs
        outletId={outletId}
        title="Dishes"
        subtitle="Manage menu prices and the ingredient costs behind every dish."
      />

      {/* Menu summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A2F2B] pb-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#7E877F]">
            MENU MANAGEMENT
          </p>
          <p className="mt-1 text-sm text-[#B5BBB4]">
            {dishes
              ? `${dishes.length} ${dishes.length === 1 ? 'dish' : 'dishes'} in this menu`
              : 'Loading menu...'}
          </p>
        </div>

        {dishes && dishes.length > 0 && (
          <span className="rounded-md border border-[#2A2F2B] bg-[#151816] px-3 py-2 font-mono text-[10px] tracking-wider text-[#A3AAA2]">
            {dishes.length} MENU ITEMS
          </span>
        )}
      </div>

      {/* Add / edit dish */}
      <section
        className={[
          'rounded-xl border bg-[#151816] p-5 sm:p-6',
          editingId ? 'border-[#8C6928]' : 'border-[#2A2F2B]',
        ].join(' ')}
      >
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.16em] text-[#7E877F]">
              {editingId ? 'EDIT MENU ITEM' : 'MENU CONFIGURATION'}
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-[#F2EDE0]">
              {editingId ? 'Update dish details' : 'Add a new dish'}
            </h2>
            <p className="mt-1 text-xs text-[#929891]">
              Set the selling price before adding ingredient costs.
            </p>
          </div>

          <span className="rounded border border-[#2A2F2B] bg-[#1A1D1B] px-2.5 py-1 font-mono text-[9px] tracking-wider text-[#929891]">
            {editingId ? 'EDIT MODE' : 'NEW ITEM'}
          </span>
        </div>

        <EditingBanner show={!!editingId} />

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#C5CAC3]">
                Dish name <span className="text-[#E5484D]">*</span>
              </span>
              <Input
                type="text"
                placeholder="e.g. Paneer Butter Masala"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-medium text-[#C5CAC3]">
                Selling price (₹) <span className="text-[#E5484D]">*</span>
              </span>
              <Input
                type="number"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </label>
          </div>

          <ErrorText>{error}</ErrorText>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              loading={saving}
              icon={editingId ? 'check' : 'plus'}
            >
              {editingId ? 'Save changes' : 'Add dish'}
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

      {/* Dish list */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-[#F2EDE0]">
            Menu items
          </h2>
          <p className="mt-1 text-xs text-[#929891]">
            Open recipe cost to manage ingredients and food costs.
          </p>
        </div>

        {!dishes ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : dishes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#394039] bg-[#151816] px-5 py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[#2A2F2B] bg-[#1A1D1B] text-[#3DD68C]">
              <Icon name="chef" className="h-5 w-5" />
            </div>

            <h3 className="text-base font-semibold text-[#F2EDE0]">
              No dishes yet
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm text-[#929891]">
              Add your first menu item above, then configure its recipe costs
              to calculate food margins.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dishes.map((dish, index) => {
              const open = openRecipeId === dish.id;

              return (
                <article
                  key={dish.id}
                  className={[
                    'overflow-hidden rounded-xl border bg-[#151816] transition-colors duration-150',
                    open
                      ? 'border-[#45634D]'
                      : 'border-[#2A2F2B] hover:border-[#465047]',
                  ].join(' ')}
                >
                  {/* Dish row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#51452B] bg-[#292419] text-[#F2B134]">
                        <Icon name="chef" className="h-[18px] w-[18px]" />
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[#F2EDE0]">
                          {dish.name}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-medium tabular-nums text-[#3DD68C]">
                            {formatINR(dish.price)}
                          </span>

                          <span className="text-[#505850]">/</span>

                          <span className="font-mono text-[9px] tracking-wider text-[#7E877F]">
                            SELLING PRICE
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        size="sm"
                        variant={open ? 'primary' : 'ghost'}
                        icon="wallet"
                        onClick={() =>
                          setOpenRecipeId(open ? null : dish.id)
                        }
                      >
                        {open ? 'Hide recipe' : 'Recipe cost'}
                      </Button>

                      <Button
                        size="sm"
                        variant="subtle"
                        icon="edit"
                        onClick={() => startEdit(dish)}
                      >
                        Edit
                      </Button>

                      {isOwner() && (
                        <Button
                          size="sm"
                          variant="danger"
                          icon="trash"
                          onClick={() => handleDelete(dish)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Recipe cost section */}
                  {open && (
                    <div className="border-t border-[#2A2F2B] bg-[#111412] p-4 sm:p-5">
                      <div className="mb-4 flex items-center gap-2">
                        <Icon
                          name="wallet"
                          className="h-4 w-4 text-[#3DD68C]"
                        />
                        <h4 className="text-xs font-semibold text-[#F2EDE0]">
                          Ingredient cost breakdown
                        </h4>
                      </div>

                      <RecipeItems
                        dishId={dish.id}
                        dishPrice={parseFloat(dish.price)}
                      />
                    </div>
                  )}

                  {/* Item footer */}
                  <div className="flex items-center justify-between border-t border-[#252A26] bg-[#121513] px-5 py-2.5">
                    <span className="font-mono text-[9px] tracking-wider text-[#687168]">
                      ITEM {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="font-mono text-[9px] tracking-wider text-[#7E877F]">
                      {open ? 'RECIPE EXPANDED' : 'MENU ITEM'}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
