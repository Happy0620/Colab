import { sendOrderConfirmationEmail, sendStatusUpdateEmail, sendAdminNewOrderEmail } from '../services/email';
import User from '../models/User';
import express from 'express';
import Order from '../models/Order';
import Notification from '../models/Notification';

const router = express.Router();

router.post('/', async (req: any, res: any) => {
  try {
    const order = new Order(req.body);
    await order.save();
    
    // Save customer notification
    try {
      await new Notification({
        userId: order.userId,
        isAdmin: false,
        title: 'Order Placed',
        message: `Your order #${order._id.toString().slice(-6).toUpperCase()} has been placed successfully for $${order.totalAmount.toFixed(2)}.`,
        type: 'ORDER_STATUS'
      }).save();
    } catch(e) {}
    
    if (order.paymentMethod === 'COD') {
      try { const user = await User.findById(order.userId); if (user?.email) await sendOrderConfirmationEmail(user.email, user.name, order); } catch(e) {}
      try { await sendAdminNewOrderEmail(order); } catch (e) {}
      try { 
        await new Notification({ 
          title: 'New Order Received', 
          message: `Order #${order._id} has been placed for $${order.totalAmount.toFixed(2)} (COD).`, 
          type: 'NEW_ORDER',
          isAdmin: true
        }).save(); 
      } catch(e) {}
    }
    
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
    
    // Save customer notification for status update
    try {
      await new Notification({
        userId: order.userId,
        isAdmin: false,
        title: 'Order Status Update',
        message: `Your order #${order._id.toString().slice(-6).toUpperCase()} status is now: ${order.status}.`,
        type: 'ORDER_STATUS'
      }).save();
    } catch (e) {}

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
