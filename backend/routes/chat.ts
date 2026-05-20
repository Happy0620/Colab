import express from 'express';
import Groq from 'groq-sdk';
import Restaurant from '../models/Restaurant';
import MenuItem from '../models/MenuItem';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
  try {
    const { message, history } = req.body;
    if (!message) return res.status(400).json({ message: 'No message provided' });

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const restaurants = await Restaurant.find().limit(20);
    const menuItems = await MenuItem.find().populate('restaurantId', 'name').limit(50);

    const restaurantList = restaurants.map((r: any) =>
      r.name + ' (' + r.location + ') - Rating: ' + r.rating + ' - Delivery: ' + r.deliveryTime
    ).join('\n');

    const menuList = menuItems.map((m: any) =>
      m.name + ' at ' + (m.restaurantId?.name || 'Unknown') + ' - $' + m.price + ' - ' + (m.calories || '?') + ' cal'
    ).join('\n');

    const systemPrompt = [
      'You are Feasto AI, a friendly food delivery assistant.',
      'Help users find restaurants, suggest meals, and answer food questions.',
      'Be friendly, concise, use emojis occasionally.',
      'Available restaurants:',
      restaurantList,
      'Available menu items:',
      menuList,
      'Only recommend items from the above list. Keep responses to 2-4 sentences.'
    ].join('\n');

    const chatHistory = (history || [])
      .filter((m: any) => m.role === 'user' || m.role === 'assistant')
      .map((m: any) => ({ role: m.role, content: m.content }));

    const messages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: message }
    ];

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: messages as any,
      max_tokens: 300
    });

    const reply = completion.choices[0]?.message?.content || 'Sorry, I could not get a response.';
    res.json({ reply });

  } catch (error: any) {
    console.error('Chat error:', error.message);
    res.status(500).json({ reply: 'Sorry, try again later', message: 'Chat error', error: error.message });
  }
});

export default router;