import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../context/AppContext';
import Navbar from '../components/Navbar';

export default function Checkout() {
  const { cart, user, token, clearCart } = useAppContext();
  const navigate = useNavigate();
  const [method, setMethod] = useState<'COD' | 'ONLINE_QR'>('COD');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null); // To store pending order for QR flow
  const [paid, setPaid] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = 2.99;
  const total = subtotal + delivery;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    setLoading(true);

    try {
      const restaurantId = cart[0].restaurantId;
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          userId: user?._id || user?.id,
          restaurantId,
          items: cart.map(i => ({ menuItemId: i.menuItemId || i._id, name: i.name, price: i.price, quantity: i.quantity })),
          totalAmount: total,
          deliveryAddress: address,
          status: 'Pending',
          paymentMethod: method,
          paymentStatus: 'PENDING'
        })
      });
      const newOrder = await res.json();
      if (!res.ok) {
        throw new Error(newOrder.message || 'Failed to place order');
      }
      
      if (method === 'COD') {
        clearCart();
        setPaid(true);
        setTimeout(() => navigate('/orders'), 3000);
      } else {
        // ONLINE_QR flow
        setOrder(newOrder);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Failed to place order');
    }
    setLoading(false);
  };

  const handleSimulatePayment = async () => {
    if (!order) return;
    setLoading(true);
    try {
      const res = await fetch('/api/payment/confirm-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          orderId: order._id,
          transactionId: 'SIMULATED_TXN_' + Date.now()
        })
      });
      const data = await res.json();
      if (data.success) {
        clearCart();
        setPaid(true);
        setTimeout(() => navigate('/orders'), 3000);
      }
    } catch (err) {
      console.error(err);
      alert('Payment confirmation failed');
    }
    setLoading(false);
  };

  if (paid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <i className='fa-solid fa-check' style={{ fontSize: '2rem', color: '#10B981' }}></i>
      </div>
      <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Order Successful!</h2>
      <p style={{ color: '#888' }}>Your order has been confirmed. Redirecting...</p>
    </div>
  );

  const s: Record<string, React.CSSProperties> = {
    input: { width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #eee', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 },
    label: { fontSize: '0.75rem', fontWeight: 700, color: '#999', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
    btn: { width: '100%', padding: 16, background: 'linear-gradient(135deg, #F88435, #FF6B35)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 8 }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F8', fontFamily: 'Poppins, sans-serif' }}>
      <div className='container'><Navbar /></div>
      <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px' }}>
        <h2 style={{ fontWeight: 800, marginBottom: 24 }}>Checkout</h2>
        
        {/* Order Summary */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, marginBottom: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', letterSpacing: '0.05em', marginBottom: 14, textTransform: 'uppercase' }}>Order Summary</div>
          {cart.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.9rem' }}>
              <span>{item.name} x{item.quantity}</span>
              <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0f0f0', marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#888', marginBottom: 6 }}>
              <span>Delivery fee</span><span>${delivery.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem', marginTop: 8 }}>
              <span>Total</span><span style={{ color: '#F88435' }}>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment Flow */}
        {!order ? (
          <form onSubmit={handlePlaceOrder} style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', letterSpacing: '0.05em', marginBottom: 16, textTransform: 'uppercase' }}>Delivery Details</div>
            
            <label style={s.label}>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder='John Doe' style={s.input} required />
            <label style={s.label}>Delivery Address</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder='123 Main St' style={s.input} required />

            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', letterSpacing: '0.05em', marginTop: 16, marginBottom: 12, textTransform: 'uppercase' }}>Payment Method</div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <div 
                onClick={() => setMethod('COD')}
                style={{ flex: 1, padding: '16px', borderRadius: 12, border: method === 'COD' ? '2px solid #F88435' : '2px solid #eee', background: method === 'COD' ? '#FFF8F3' : 'white', cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', color: method === 'COD' ? '#F88435' : '#555' }}
              >
                Cash on Delivery
              </div>
              <div 
                onClick={() => setMethod('ONLINE_QR')}
                style={{ flex: 1, padding: '16px', borderRadius: 12, border: method === 'ONLINE_QR' ? '2px solid #F88435' : '2px solid #eee', background: method === 'ONLINE_QR' ? '#FFF8F3' : 'white', cursor: 'pointer', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', color: method === 'ONLINE_QR' ? '#F88435' : '#555' }}
              >
                Online Payment
              </div>
            </div>

            <button type='submit' disabled={loading} style={s.btn}>
              {loading ? 'Processing...' : method === 'COD' ? 'Place Order - $' + total.toFixed(2) : 'Proceed to Payment'}
            </button>
          </form>
        ) : (
          <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center' }}>
            <h3 style={{ fontWeight: 800, marginBottom: 12, fontSize: '1.4rem' }}>Scan to Pay</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: 24 }}>Scan the QR code below using your favorite payment app to complete your order of <strong>${total.toFixed(2)}</strong>.</p>
            
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div style={{ padding: 16, background: 'white', borderRadius: 16, border: '1px solid #eee', display: 'inline-block' }}>
                <QRCodeSVG value={`feasto://pay?orderId=${order._id}&amount=${total}`} size={200} />
              </div>
            </div>

            <div style={{ background: '#FFF8F3', border: '1px solid #FFE0CC', borderRadius: 10, padding: '12px', marginBottom: 20, fontSize: '0.8rem', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className='fa-solid fa-circle-info' style={{ color: '#F88435' }}></i>
              For this demo, click below to simulate a successful payment.
            </div>

            <button onClick={handleSimulatePayment} disabled={loading} style={{ ...s.btn, background: loading ? '#ccc' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? 'Confirming...' : <><i className='fa-solid fa-check'></i> Simulate Payment Success</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}