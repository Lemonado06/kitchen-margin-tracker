import { useState } from 'react';
import api, { isOwner } from '../api/client';
import Icon from './Icon';
import { useConfirm, useLoad, useToast } from '../hooks';
import { Button, Input } from './ui';

// Ingredient cost list for one dish; the total is the dish's food cost
export default function RecipeItems({ dishId, dishPrice }) {
  const [loaded, loadItems, loadError] = useLoad(() => api.get(`/recipe-items/dish/${dishId}`).then((res) => res.data), [dishId]);
  const items = loaded || [];
  const [ingredient, setIngredient] = useState('');
  const [cost, setCost] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const toast = useToast();
  const confirm = useConfirm();

  function resetForm() {
    setIngredient('');
    setCost('');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const costNum = parseFloat(cost);
    if (!ingredient.trim() || isNaN(costNum) || costNum < 0) {
      setError('Enter an ingredient and a cost of 0 or more');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/recipe-items/${editingId}`, { ingredient_name: ingredient.trim(), cost: costNum });
      } else {
        await api.post('/recipe-items', { dish_id: dishId, ingredient_name: ingredient.trim(), cost: costNum });
      }
      toast(editingId ? 'Ingredient updated' : 'Ingredient added');
      resetForm();
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save recipe item');
    }
  }

  function startEdit(item) {
    setEditingId(item.id);
    setIngredient(item.ingredient_name);
    setCost(String(item.cost));
  }

  async function handleDelete(item) {
    if (!(await confirm({ title: `Remove "${item.ingredient_name}"?`, message: 'The dish\'s food cost will drop by this amount.', confirmLabel: 'Remove' }))) return;
    try {
      await api.delete(`/recipe-items/${item.id}`);
      if (editingId === item.id) resetForm();
      loadItems();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete recipe item');
    }
  }

  const foodCost = items.reduce((s, i) => s + parseFloat(i.cost), 0);
  const foodCostPct = dishPrice > 0 ? (foodCost / dishPrice) * 100 : 0;
  const barTone = foodCostPct > 45 ? 'from-rose-500 to-rose-400' : foodCostPct > 30 ? 'from-amber-500 to-amber-300' : 'from-emerald-500 to-cyan-400';

  return (
    <div className="mt-4 border-t border-white/10 pt-4 animate-fade-up">
      <div className="mb-4">
        <div className="mb-1.5 flex items-baseline justify-between text-sm">
          <span className="font-semibold text-white">Food cost: ₹{foodCost.toFixed(2)}</span>
          <span className="text-slate-400">{foodCostPct.toFixed(1)}% of price</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${barTone}`} style={{ width: `${Math.min(100, foodCostPct)}%` }} />
        </div>
      </div>

      <ul className="mb-3 divide-y divide-white/5">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center justify-between py-2 text-sm animate-fade-in">
            <span className="text-slate-200">{item.ingredient_name}</span>
            <span className="flex items-center gap-3">
              <span className="text-slate-300">₹{item.cost}</span>
              <button onClick={() => startEdit(item)} className="rounded-md p-1 text-slate-500 transition hover:bg-white/10 hover:text-white" aria-label="Edit ingredient">
                <Icon name="edit" className="w-3.5 h-3.5" />
              </button>
              {isOwner() && (
                <button onClick={() => handleDelete(item)} className="rounded-md p-1 text-slate-500 transition hover:bg-rose-500/15 hover:text-rose-300" aria-label="Delete ingredient">
                  <Icon name="trash" className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          </li>
        ))}
        {items.length === 0 && <li className="py-2 text-sm text-slate-500">No ingredients yet. Food cost counts as ₹0.</li>}
      </ul>

      <form onSubmit={handleSubmit} className={`flex flex-col gap-2 sm:flex-row ${editingId ? 'rounded-xl ring-2 ring-amber-400/60 p-2' : ''}`}>
        <Input type="text" placeholder="Ingredient" value={ingredient} onChange={(e) => setIngredient(e.target.value)} required />
        <Input type="number" placeholder="Cost (₹)" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} className="sm:w-32" required />
        <div className="flex gap-2">
          <Button type="submit" variant="ghost" icon={editingId ? 'check' : 'plus'}>{editingId ? 'Save' : 'Add'}</Button>
          {editingId && <Button type="button" variant="subtle" onClick={resetForm}>Cancel</Button>}
        </div>
      </form>

      {(error || loadError) && <p className="mt-2 text-sm text-rose-300">{error || loadError}</p>}
    </div>
  );
}
