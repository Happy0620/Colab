import express from 'express';
import Order from '../models/Order';
import User from '../models/User';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '../services/email';
import Notification from '../models/Notification';

const router = express.Router();

router.post('/confirm-qr', async (req: any, res: any) => {
  try {
    const { orderId, transactionId } = req.body;
    
    // Mock Validation: Ensure the transaction ID is present and order exists
    if (!transactionId) return res.status(400).json({ message: 'Invalid transaction ID' });
    
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.paymentStatus === 'PAID') return res.status(400).json({ message: 'Order is already paid' });

    // Update order status
    order.paymentStatus = 'PAID';
    order.status = 'Confirmed';
    await order.save();

    // Send confirmations
    try {
      await new Notification({
        userId: order.userId,
        isAdmin: false,
        title: 'Order Status Update',
        message: `Your order #${order._id.toString().slice(-6).toUpperCase()} status is now: Confirmed.`,
        type: 'ORDER_STATUS'
      }).save();
    } catch(e) {}

    try { const user = await User.findById(order.userId); if (user?.email) await sendOrderConfirmationEmail(user.email, user.name, order); } catch(e) {}
    try { await sendAdminNewOrderEmail(order); } catch (e) {}
    try { 
      await new Notification({ 
        title: 'New Order Received', 
        message: `Order #${order._id} has been placed for $${order.totalAmount.toFixed(2)} (Online Payment).`, 
        type: 'NEW_ORDER',
        isAdmin: true
      }).save(); 
    } catch(e) {}

    res.json({ success: true, order });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;