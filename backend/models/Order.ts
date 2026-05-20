import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [{
    menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: String,
    price: Number,
    quantity: { type: Number, required: true, min: 1 }
  }],
  totalAmount: { type: Number, required: true },
  deliveryAddress: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'On the way', 'Delivered', 'Cancelled'], default: 'Pending' },
  paymentMethod: { type: String, enum: ['COD', 'ONLINE_QR'], default: 'COD' },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
  promoCode: { type: String },
  discountAmount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);
