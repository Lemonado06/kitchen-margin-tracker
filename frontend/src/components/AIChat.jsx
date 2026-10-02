import { useState } from 'react';
import api from '../api/client';

export default function AIChat({ outletId, filters }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Ask me about your dishes, platforms, or margins — e.g. \"which dishes lose money?\"" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/ai/chat', {
        message: userMessage,
        outlet_id: outletId,
        filters: filters || {},
      });
      setMessages((prev) => [...prev, { role: 'assistant', text: res.data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to get a response');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Ask the Assistant</h2>
        <p className="text-sm text-gray-500">Powered by your live order data</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-2 rounded-xl text-sm ${
                m.role === 'user'
                  ? 'bg-green-700 text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-xl rounded-bl-sm text-sm">
              Thinking...
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-red-600 text-xs px-4 pb-2">{error}</p>}

      <form onSubmit={handleSend} className="p-3 border-t border-gray-100 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-800 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}