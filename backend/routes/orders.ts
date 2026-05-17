import { sendOrderConfirmationEmail, sendStatusUpdateEmail } from '../services/email';
import User from '../models/User';
import express from 'express';
import Order from '../models/Order';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
  try {
    const order = new Order(req.body);
    await order.save();
    try { const user = await User.findById(order.userId); if (user?.email) await sendOrderConfirmationEmail(user.email, user.name, order); } catch(e) {}
    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/user/:userId', async (req: any, res: any) => {
  try {
    const orders = await Order.find({ userId: req.params.userId })
      .populate('restaurantId', 'name image')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/all', async (req: any, res: any) => {
  try {
    const orders = await Order.find()
      .populate('restaurantId', 'name image')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.patch('/:id/status', async (req: any, res: any) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    try { const user = await User.findById(order.userId); if (user?.email) await sendStatusUpdateEmail(user.email, user.name, req.body.status); } catch(e) {}
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req: any, res: any) => {
  try {
    const order = await Order.findById(req.params.id).populate('restaurantId', 'name image');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    try { const user = await User.findById(order.userId); if (user?.email) await sendStatusUpdateEmail(user.email, user.name, req.body.status); } catch(e) {}
    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
