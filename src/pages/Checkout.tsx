import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAppContext } from '../context/AppContext';
import Navbar from '../components/Navbar';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function CheckoutForm({ total, onSuccess }: { total: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total })
      });
      const { clientSecret } = await res.json();
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement)!,
          billing_details: { name, address: { line1: address } }
        }
      });
      if (result.error) {
        setError(result.error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError('Payment failed. Please try again.');
    }
    setLoading(false);
  };

  const s: Record<string, React.CSSProperties> = {
    input: { width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #eee', fontSize: '0.92rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 12 },
    label: { fontSize: '0.75rem', fontWeight: 700, color: '#999', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6, display: 'block' },
    btn: { width: '100%', padding: 16, background: 'linear-gradient(135deg, #F88435, #FF6B35)', color: 'white', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: '1rem', cursor: 'pointer', marginTop: 8 }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label style={s.label}>Full Name</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder='John Doe' style={s.input} required />
      <label style={s.label}>Delivery Address</label>
      <input value={address} onChange={e => setAddress(e.target.value)} placeholder='123 Main St' style={s.input} required />
      <label style={s.label}>Card Details</label>
      <div style={{ padding: '14px 16px', borderRadius: 12, border: '2px solid #eee', marginBottom: 12 }}>
        <CardElement options={{ style: { base: { fontSize: '16px', color: '#333', '::placeholder': { color: '#aaa' } } } }} />
      </div>
      <div style={{ background: '#FFF8F3', border: '1px solid #FFE0CC', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: '0.8rem', color: '#888' }}>
        <i className='fa-solid fa-circle-info' style={{ marginRight: 6, color: '#F88435' }}></i>
        Test card: <strong>4242 4242 4242 4242</strong> | Any future date | Any CVC
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: 10 }}>{error}</div>}
      <button type='submit' disabled={loading || !stripe} style={s.btn}>
        {loading ? 'Processing...' : 'Pay $' + total.toFixed(2)}
      </button>
    </form>
  );
}

export default function Checkout() {
  const { cart, user, token, clearCart } = useAppContext();
  const navigate = useNavigate();
  const [paid, setPaid] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const delivery = 2.99;
  const total = subtotal + delivery;

  const handleSuccess = async () => {
    setPaid(true);
    if (cart.length > 0) {
      const restaurantId = cart[0].restaurantId;
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          userId: user?.id,
          restaurantId,
          items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
          totalAmount: total,
          status: 'Confirmed',
          paymentMethod: 'card',
          paymentStatus: 'paid'
        })
      });
      clearCart();
    }
    setTimeout(() => navigate('/orders'), 3000);
  };

  if (paid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', fontFamily: 'Poppins, sans-serif' }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <i className='fa-solid fa-check' style={{ fontSize: '2rem', color: '#10B981' }}></i>
      </div>
      <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Payment Successful!</h2>
      <p style={{ color: '#888' }}>Your order has been confirmed. Redirecting...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#F8F8F8', fontFamily: 'Poppins, sans-serif' }}>
      <div className='container'><Navbar /></div>
      <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 20px' }}>
        <h2 style={{ fontWeight: 800, marginBottom: 24 }}>Checkout</h2>
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
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#999', letterSpacing: '0.05em', marginBottom: 16, textTransform: 'uppercase' }}>Payment Details</div>
          <Elements stripe={stripePromise}>
            <CheckoutForm total={total} onSuccess={handleSuccess} />
          </Elements>
        </div>
      </div>
    </div>
  );
}