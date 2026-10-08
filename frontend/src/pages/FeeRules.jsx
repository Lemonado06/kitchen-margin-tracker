import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api, { isOwner } from '../api/client';

export default function FeeRules() {
  const { outletId } = useParams();
  const [rules, setRules] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [platformId, setPlatformId] = useState('');
  const [commission, setCommission] = useState('');
  const [gst, setGst] = useState('18');
  const [editingId, setEditingId] = useState(null);
  const [newPlatform, setNewPlatform] = useState('');
  const [error, setError] = useState('');

  async function loadAll() {
    try {
      const [rulesRes, platformsRes] = await Promise.all([
        api.get(`/fee-rules/outlet/${outletId}`),
        api.get('/platforms'),
      ]);
      setRules(rulesRes.data);
      setPlatforms(platformsRes.data);
    } catch (err) {
      setError('Failed to load fee rules');
    }
  }

  useEffect(() => {
    loadAll();
  }, [outletId]);

  function resetForm() {
    setPlatformId('');
    setCommission('');
    setGst('18');
    setEditingId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const commissionNum = parseFloat(commission);
    const gstNum = parseFloat(gst);
    if (isNaN(commissionNum) || commissionNum < 0 || commissionNum > 100 || isNaN(gstNum) || gstNum < 0 || gstNum > 100) {
      setError('Commission and GST must be between 0 and 100');
      return;
    }
    try {
      if (editingId) {
        await api.put(`/fee-rules/${editingId}`, { commission_pct: commissionNum, gst_on_commission_pct: gstNum });
      } else {
        await api.post('/fee-rules', {
          outlet_id: outletId,
          platform_id: platformId,
          commission_pct: commissionNum,
          gst_on_commission_pct: gstNum,
        });
      }
      resetForm();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save fee rule');
    }
  }

  function startEdit(rule) {
    setEditingId(rule.id);
    setPlatformId(rule.platform_id);
    setCommission(String(rule.commission_pct));
    setGst(String(rule.gst_on_commission_pct));
  }

  async function handleDelete(rule) {
    if (!window.confirm(`Delete the ${rule.platform_name} fee rule? Its orders will count as 0% commission.`)) return;
    setError('');
    try {
      await api.delete(`/fee-rules/${rule.id}`);
      if (editingId === rule.id) resetForm();
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete fee rule');
    }
  }

  async function handleAddPlatform(e) {
    e.preventDefault();
    setError('');
    if (!newPlatform.trim()) return;
    try {
      await api.post('/platforms', { name: newPlatform.trim() });
      setNewPlatform('');
      loadAll();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add platform');
    }
  }

  // Only offer platforms that don't have a rule yet (unless editing)
  const usedPlatformIds = rules.map((r) => r.platform_id);
  const availablePlatforms = platforms.filter((p) => !usedPlatformIds.includes(p.id) || p.id === platformId);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link to="/outlets" className="text-blue-600 text-sm">&larr; Back to Outlets</Link>
      <h1 className="text-2xl font-bold mt-2 mb-1 text-gray-800">Platform Fee Rules</h1>
      <p className="text-sm text-gray-500 mb-6">Commission each platform takes, and the GST charged on that commission.</p>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-3 gap-3">
        <label className="text-xs text-gray-500">
          Platform
          <select
            value={platformId}
            onChange={(e) => setPlatformId(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800"
            disabled={!!editingId}
            required
          >
            <option value="">Select platform</option>
            {availablePlatforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-xs text-gray-500">
          Commission (%)
          <input type="number" min="0" max="100" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800" required />
        </label>
        <label className="text-xs text-gray-500">
          GST on commission (%)
          <input type="number" min="0" max="100" step="0.01" value={gst} onChange={(e) => setGst(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 mt-1 text-sm text-gray-800" required />
        </label>
        <div className="col-span-3 flex gap-2">
          <button type="submit" className="flex-1 bg-blue-600 text-white rounded px-4 py-2 font-medium hover:bg-blue-700">
            {editingId ? 'Save Rule' : 'Add Rule'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-gray-500 px-4 hover:text-gray-800">Cancel</button>
          )}
        </div>
      </form>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="text-left py-2 px-4">Platform</th>
              <th className="text-right py-2 px-4">Commission</th>
              <th className="text-right py-2 px-4">GST on commission</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td className="py-3 px-4 font-medium text-gray-800">{rule.platform_name}</td>
                <td className="py-3 px-4 text-right text-gray-700">{rule.commission_pct}%</td>
                <td className="py-3 px-4 text-right text-gray-700">{rule.gst_on_commission_pct}%</td>
                <td className="py-3 px-4 text-right">
                  <button onClick={() => startEdit(rule)} className="text-gray-600 hover:text-gray-900 mr-3">Edit</button>
                  {isOwner() && (
                    <button onClick={() => handleDelete(rule)} className="text-red-600 hover:text-red-800">Delete</button>
                  )}
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan="4" className="py-6 text-center text-gray-400">No fee rules yet. Orders count as 0% commission until you add one.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {isOwner() && (
        <form onSubmit={handleAddPlatform} className="flex gap-2 items-center">
          <span className="text-sm text-gray-500">Platform missing?</span>
          <input
            type="text"
            placeholder="e.g. Magicpin"
            value={newPlatform}
            onChange={(e) => setNewPlatform(e.target.value)}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm"
          />
          <button type="submit" className="bg-gray-800 text-white rounded px-3 py-1.5 text-sm hover:bg-gray-900">Add platform</button>
        </form>
      )}
    </div>
  );
}
