import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAppContext } from '../context/AppContext';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart, clearCart, user, token } = useAppContext();
  const navigate = useNavigate();
  const [address, setAddress] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryFee = 2.99;
  const total = subtotal + deliveryFee;

  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) { navigate('/login'); return; }
    if (cart.length === 0) return;
    navigate('/checkout');
  };

  return (
    <>
      <div className="container"><Navbar /></div>
      <div className="container" style={{ padding: '40px 20px', maxWidth: '900px' }}>
        <h1 style={{ marginBottom: '8px', fontFamily: 'Georgia,serif' }}>Your Cart</h1>
        <p style={{ color: '#8A7060', marginBottom: '32px' }}>
          {cart.length > 0 ? `${cart.reduce((a, i) => a + i.quantity, 0)} items from ${cart[0] ? 'your selected restaurant' : ''}` : 'Your cart is empty'}
        </p>

        {cart.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '20px', border: '1px solid #EDE8E3' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🛒</div>
            <h3 style={{ marginBottom: '8px' }}>Your cart is empty</h3>
            <p style={{ color: '#8A7060', marginBottom: '24px' }}>Add some delicious food to get started!</p>
            <Link to="/" className="btn btn-primary">Browse Restaurants</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: '1fr 340px', alignItems: 'start' }}>
            {/* Cart Items */}
            <div style={{ background: '#fff', border: '1px solid #EDE8E3', borderRadius: '20px', padding: '24px' }}>
              <h3 style={{ marginBottom: '20px', fontFamily: 'Georgia,serif' }}>Order Items</h3>
              {cart.map(item => (
                <div key={item.menuItemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid #F5F0EB' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{item.name}</div>
                    <div style={{ color: '#F88435', fontWeight: 700 }}>${(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #EDE8E3', borderRadius: '10px', overflow: 'hidden' }}>
                      <button onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} style={{ padding: '6px 14px', background: '#FAF8F5', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>−</button>
                      <span style={{ padding: '0 14px', fontWeight: 600 }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} style={{ padding: '6px 14px', background: '#FAF8F5', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>+</button>
                    </div>
                    <button onClick={() => removeFromCart(item.menuItemId)} style={{ background: '#FEF2F2', border: '1px solid #FEE2E2', color: '#EF4444', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' }}>
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={() => clearCart()} style={{ marginTop: '16px', background: 'none', border: 'none', color: '#8A7060', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>
                Clear cart
              </button>
            </div>

            {/* Order Summary + Checkout */}
            <div>
              <div style={{ background: '#fff', border: '1px solid #EDE8E3', borderRadius: '20px', padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '20px', fontFamily: 'Georgia,serif' }}>Order Summary</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.9rem', color: '#8A7060' }}>
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem', color: '#8A7060' }}>
                  <span>Delivery Fee</span><span>${deliveryFee.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1.15rem', borderTop: '2px solid #EDE8E3', paddingTop: '16px' }}>
                  <span>Total</span><span style={{ color: '#F88435' }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #EDE8E3', borderRadius: '20px', padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontFamily: 'Georgia,serif' }}>Ready to Order?</h3>
                <form onSubmit={handleCheckout}>
                  <button
                    type="submit"
                    style={{
                      width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                      background: '#F88435', color: '#fff',
                      fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                  >
                    Proceed to Checkout
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}