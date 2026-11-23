
import { useState } from 'react';
import api, { isOwner } from '../api/client';
import Icon from './Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import { Button, Input } from './ui';

// Ingredient cost list for one dish; the total is the dish's food cost.
export default function RecipeItems({ dishId, dishPrice }) {
  const [loaded, loadItems, loadError] = useLoad(
    () => api.get(`/recipe-items/dish/${dishId}`).then((res) => res.data),
    [dishId]
  );

  const items = loaded || [];

  const [ingredient, setIngredient] = useState('');
  const [cost, setCost] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toast = useToast();
  const confirm = useConfirm();

  function resetForm() {
    setIngredient('');
    setCost('');
    setEditingId(null);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const costNum = parseFloat(cost);

    if (!ingredient.trim() || isNaN(costNum) || costNum < 0) {
      setError('Enter an ingredient and a cost of 0 or more');
      return;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.put(`/recipe-items/${editingId}`, {
          ingredient_name: ingredient.trim(),
          cost: costNum,
        });
      } else {
        await api.post('/recipe-items', {
          dish_id: dishId,
          ingredient_name: ingredient.trim(),
          cost: costNum,
        });
      }

      toast(editingId ? 'Ingredient updated' : 'Ingredient added');
      resetForm();
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recipe item');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setIngredient(item.ingredient_name);
    setCost(String(item.cost));
    setError('');
  }

  async function handleDelete(item) {
    const ok = await confirm({
      title: `Remove "${item.ingredient_name}"?`,
      message: "The dish's food cost will drop by this amount.",
      confirmLabel: 'Remove',
    });

    if (!ok) return;

    try {
      await api.delete(`/recipe-items/${item.id}`);

      if (editingId === item.id) resetForm();

      toast('Ingredient removed');
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete recipe item');
    }
  }

  const foodCost = items.reduce(
    (sum, item) => sum + (parseFloat(item.cost) || 0),
    0
  );

  const foodCostPct =
    dishPrice > 0 ? (foodCost / dishPrice) * 100 : 0;

  const costStatus =
    foodCostPct > 45
      ? {
        label: 'HIGH FOOD COST',
        color: '#E5484D',
        background: '#321F20',
        border: '#653235',
      }
      : foodCostPct > 30
        ? {
          label: 'WATCH COST',
          color: '#F2B134',
          background: '#302719',
          border: '#65502A',
        }
        : {
          label: 'WITHIN TARGET',
          color: '#3DD68C',
          background: '#1C2B21',
          border: '#31513E',
        };

  const barWidth = Math.min(100, Math.max(0, foodCostPct));

  return (
    <div className="space-y-5">
      {/* Food cost overview */}
      <section className="rounded-lg border border-[#2A2F2B] bg-[#151816] p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#7E877F]">
              TOTAL INGREDIENT COST
            </p>

            <p className="mt-2 font-mono text-2xl font-semibold tabular-nums tracking-tight text-[#F2EDE0]">
              ₹{foodCost.toFixed(2)}
            </p>

            <p className="mt-1 text-[11px] text-[#858D85]">
              Across {items.length} {items.length === 1 ? 'ingredient' : 'ingredients'}
            </p>
          </div>

          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.16em] text-[#7E877F]">
              FOOD COST RATIO
            </p>

            <p
              className="mt-2 font-mono text-2xl font-semibold tabular-nums"
              style={{ color: costStatus.color }}
            >
              {foodCostPct.toFixed(1)}%
            </p>

            <span
              className="mt-1 inline-flex rounded border px-2 py-1 font-mono text-[8px] tracking-wider"
              style={{
                color: costStatus.color,
                backgroundColor: costStatus.background,
                borderColor: costStatus.border,
              }}
            >
              {costStatus.label}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] text-[#929891]">
              Ingredient cost vs selling price
            </span>

            <span className="font-mono text-[10px] tabular-nums text-[#A8AEA7]">
              {foodCostPct.toFixed(1)} / 100%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-[#292E2A]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${barWidth}%`,
                backgroundColor: costStatus.color,
              }}
            />
          </div>

          <div className="mt-3 flex flex-wrap justify-between gap-2 font-mono text-[9px] tracking-wider text-[#737B74]">
            <span>SELLING PRICE</span>
            <span className="tabular-nums">
              ₹{Number(dishPrice || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      {/* Ingredient list */}
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-semibold text-[#F2EDE0]">
              Ingredient breakdown
            </h4>
            <p className="mt-1 text-[10px] text-[#858D85]">
              Individual costs contributing to this dish.
            </p>
          </div>

          <span className="rounded border border-[#2A2F2B] bg-[#1A1D1B] px-2 py-1 font-mono text-[9px] text-[#929891]">
            {items.length} ITEMS
          </span>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#2A2F2B] bg-[#151816]">
          <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#2A2F2B] bg-[#1A1D1B] px-4 py-2.5">
            <span className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
              INGREDIENT
            </span>

            <span className="font-mono text-[9px] tracking-[0.14em] text-[#7E877F]">
              COST
            </span>
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Icon
                name="wallet"
                className="mx-auto mb-2 h-5 w-5 text-[#687168]"
              />

              <p className="text-xs font-medium text-[#C1C6BF]">
                No ingredients added
              </p>

              <p className="mt-1 text-[10px] text-[#858D85]">
                Food cost currently counts as ₹0.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#252A26]">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-[#1A1D1B]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="font-mono text-[9px] text-[#626B63]">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <span className="truncate text-xs font-medium text-[#D9DDD6]">
                      {item.ingredient_name}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-mono text-xs tabular-nums text-[#F2EDE0]">
                      ₹{Number(item.cost).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      aria-label={`Edit ${item.ingredient_name}`}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#292E2A] hover:text-[#F2EDE0]"
                    >
                      <Icon name="edit" className="h-3.5 w-3.5" />
                    </button>

                    {isOwner() && (
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        aria-label={`Delete ${item.ingredient_name}`}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-[#858D85] transition-colors hover:bg-[#321F20] hover:text-[#E5484D]"
                      >
                        <Icon name="trash" className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center justify-between border-t border-[#2A2F2B] bg-[#121513] px-4 py-3">
            <span className="font-mono text-[9px] tracking-wider text-[#858D85]">
              TOTAL FOOD COST
            </span>

            <span className="font-mono text-sm font-semibold tabular-nums text-[#3DD68C]">
              ₹{foodCost.toFixed(2)}
            </span>
          </div>
        </div>
      </section>

      {/* Add / edit ingredient */}
      <section
        className={[
          'rounded-lg border bg-[#151816] p-4',
          editingId ? 'border-[#8C6928]' : 'border-[#2A2F2B]',
        ].join(' ')}
      >
        <div className="mb-4">
          <p className="font-mono text-[9px] tracking-[0.16em] text-[#7E877F]">
            {editingId ? 'EDIT INGREDIENT' : 'RECIPE CONFIGURATION'}
          </p>

          <h4 className="mt-1 text-xs font-semibold text-[#F2EDE0]">
            {editingId ? 'Update ingredient' : 'Add an ingredient'}
          </h4>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="block">
              <span className="mb-2 block text-[10px] font-medium text-[#AEB5AD]">
                Ingredient name
              </span>

              <Input
                type="text"
                placeholder="e.g. Paneer"
                value={ingredient}
                onChange={(e) => setIngredient(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-[10px] font-medium text-[#AEB5AD]">
                Cost (₹)
              </span>

              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                required
              />
            </label>
          </div>

          {error && (
            <p className="mt-3 text-xs text-[#E9787C]">{error}</p>
          )}

          {loadError && (
            <p className="mt-3 text-xs text-[#E9787C]">{loadError}</p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="submit"
              loading={saving}
              icon={editingId ? 'check' : 'plus'}
            >
              {editingId ? 'Save ingredient' : 'Add ingredient'}
            </Button>

            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={resetForm}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </section>
    </div>
  );
}
