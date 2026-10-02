const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { requireAuth } = require('./middleware');
const { marginByDish, marginByPlatform, discountImpact } = require('./aiTools');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const toolDeclarations = [
  { name: 'margin_by_dish', description: 'Get profit margin breakdown per dish, sorted worst margin first', parameters: { type: 'object', properties: {} } },
  { name: 'margin_by_platform', description: 'Get profit margin breakdown per platform (Zomato, Swiggy, Direct)', parameters: { type: 'object', properties: {} } },
  { name: 'discount_impact', description: 'Compare average profit on discounted vs non-discounted orders', parameters: { type: 'object', properties: {} } },
];

async function sendWithRetry(chat, payload, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await chat.sendMessage(payload);
    } catch (err) {
      const is503 = err.message?.includes('503') || err.message?.includes('UNAVAILABLE');
      if (is503 && i < retries) {
        console.log(`503 busy, retrying... (${i + 1}/${retries})`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
}

module.exports = (pool) => {
  router.post('/chat', requireAuth, async (req, res) => {
    const { message, outlet_id, filters } = req.body;
    if (!message || !outlet_id) return res.status(400).json({ error: 'message and outlet_id required' });

    try {
      const chat = ai.chats.create({
        model: 'gemini-3.8-flash',
        config: { tools: [{ functionDeclarations: toolDeclarations }] },
      });

      let response = await sendWithRetry(chat, { message });
      console.log('First response received');

      let calls = response.functionCalls;
      let iterations = 0;

      while (calls && calls.length > 0 && iterations < 5) {
        iterations++;
        const call = calls[0];
        console.log('Tool call requested:', call.name);

        let toolResult;
        if (call.name === 'margin_by_dish') toolResult = await marginByDish(pool, outlet_id, filters || {});
        else if (call.name === 'margin_by_platform') toolResult = await marginByPlatform(pool, outlet_id, filters || {});
        else if (call.name === 'discount_impact') toolResult = await discountImpact(pool, outlet_id, filters || {});

        console.log('Tool result:', toolResult);

        response = await sendWithRetry(chat, {
          message: [{ functionResponse: { name: call.name, response: { result: toolResult } } }],
        });
        calls = response.functionCalls;
      }

      console.log('Final response text:', response.text);
      res.json({ reply: response.text });
    } catch (err) {
      console.error('AI chat error:', err);
      res.status(500).json({ error: err.message || err.toString() || 'Unknown error' });
    }
  });

  return router;
};