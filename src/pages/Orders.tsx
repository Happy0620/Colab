import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAppContext } from '../context/AppContext';
import DeliveryMap from '../components/DeliveryMap';

const STATUS_STEPS = ['Pending', 'Confirmed', 'Preparing', 'On the way', 'Delivered'];

const STATUS_META: Record<string, { color: string; bg: string; icon: string; message: string }> = {
  'Pending':    { color: '#F59E0B', bg: '#FFFBEB', icon: '🕐', message: 'Waiting for restaurant to confirm...' },
  'Confirmed':  { color: '#3B82F6', bg: '#EFF6FF', icon: '✅', message: 'Restaurant confirmed your order!' },
  'Preparing':  { color: '#8B5CF6', bg: '#F5F3FF', icon: '👨‍🍳', message: 'Chef is preparing your food...' },
  'On the way': { color: '#F97316', bg: '#FFF7ED', icon: '🛵', message: 'Your order is on the way!' },
  'Delivered':  { color: '#22C55E', bg: '#F0FDF4', icon: '🎉', message: 'Order delivered! Enjoy your meal!' },
  'Cancelled':  { color: '#EF4444', bg: '#FEF2F2', icon: '❌', message: 'Order was cancelled.' },
};


function useCountdown(order: any) {
  const [timeLeft, setTimeLeft] = React.useState('');
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (['Delivered', 'Cancelled'].includes(order.status)) return;

    const deliveryMinutes: Record<string, number> = {
      'Pending': 45, 'Confirmed': 40, 'Preparing': 30, 'On the way': 15
    };

    const totalMins = deliveryMinutes[order.status] || 45;
    const orderTime = new Date(order.createdAt).getTime();
    const deliveryTime = orderTime + totalMins * 60 * 1000;

    const tick = () => {
      const now = Date.now();
      const diff = deliveryTime - now;
      if (diff <= 0) { setTimeLeft('Arriving soon!'); setProgress(100); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(mins + 'm ' + secs + 's');
      const elapsed = now - orderTime;
      const total = deliveryTime - orderTime;
      setProgress(Math.min(100, Math.round((elapsed / total) * 100)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [order.status, order.createdAt]);

  return { timeLeft, progress };
}

function OrderCard({ order, expanded, onToggle, onReorder, onCancel, past = false }: any) {
  const meta = STATUS_META[order.status] || STATUS_META['Pending'];
  const stepIdx = STATUS_STEPS.indexOf(order.status);
  const isCancelled = order.status === 'Cancelled';

  return (
    <div style={{ background: '#fff', border: `2px solid ${past ? '#EDE8E3' : meta.color + '44'}`, borderRadius: '20px', overflow: 'hidden', boxShadow: past ? 'none' : `0 4px 20px ${meta.color}22` }}>
      {!past && !isCancelled && (
        <div style={{ background: meta.bg, borderBottom: `1px solid ${meta.color}33`, padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
          <span style={{ color: meta.color, fontWeight: 600, fontSize: '0.9rem' }}>{meta.message}</span>
        </div>
      )}
      <div style={{ background: past ? '#F9F7F5' : '#1A1208', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ color: past ? '#1A1208' : '#fff', fontWeight: 700 }}>{order.restaurantId?.name || 'Restaurant'}</div>
          <div style={{ color: past ? '#8A7060' : '#888', fontSize: '0.78rem', marginTop: '2px' }}>
            #{order._id.slice(-6).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: meta.color + '22', color: meta.color, padding: '5px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.8rem', border: `1px solid ${meta.color}44` }}>
            {meta.icon} {order.status}
          </span>
          <button onClick={onToggle} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: past ? '#8A7060' : '#fff', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isCancelled && !past && (
        <div style={{ padding: '20px 24px', background: '#FAF8F5', borderBottom: '1px solid #EDE8E3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {STATUS_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: i <= stepIdx ? '#F88435' : '#EDE8E3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', boxShadow: i === stepIdx ? '0 0 0 4px #F8843533' : 'none', transition: 'all 0.5s ease' }}>
                    {i < stepIdx ? '✓' : STATUS_META[step]?.icon}
                  </div>
                  <span style={{ fontSize: '0.68rem', color: i <= stepIdx ? '#F88435' : '#8A7060', fontWeight: i === stepIdx ? 700 : 400, textAlign: 'center', maxWidth: '60px' }}>{step}</span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{ flex: 1, height: '3px', background: i < stepIdx ? '#F88435' : '#EDE8E3', margin: '0 4px', marginBottom: '22px', borderRadius: '2px', transition: 'all 0.5s ease' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.88rem', color: '#8A7060' }}>{order.items?.length} item{order.items?.length !== 1 ? 's' : ''} · {order.deliveryAddress}</span>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>${order.totalAmount?.toFixed(2)}</span>
        </div>
        {expanded && (
          <div style={{ marginTop: '16px', borderTop: '1px solid #EDE8E3', paddingTop: '16px' }}>
            {order.items?.map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px dashed #EDE8E3', fontSize: '0.88rem' }}>
                <span>{item.menuItemId?.name || item.name || 'Item'} <span style={{ color: '#8A7060' }}>× {item.quantity}</span></span>
                <span style={{ fontWeight: 600 }}>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontWeight: 700 }}>
              <span>Total</span><span style={{ color: '#F88435' }}>${order.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        )}
        {!['Delivered', 'Cancelled'].includes(order.status) && !past && (() => {
        const { timeLeft, progress } = useCountdown(order);
        return (
          <div style={{ margin: '0 0 12px', padding: '14px 16px', background: '#FFF8F3', borderRadius: 14, border: '1px solid #FFE0CC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#F88435' }}>
                <i className="fa-solid fa-clock" style={{ marginRight: 6 }}></i>Estimated Delivery
              </span>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#F88435', fontVariantNumeric: 'tabular-nums' }}>
                {timeLeft}
              </span>
            </div>
            <div style={{ height: 8, background: '#FFE0CC', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg, #F88435, #FF6B35)', borderRadius: 10, transition: 'width 1s linear' }}></div>
            </div>
          </div>
        );
      })()}
      {order.status === 'On the way' && !past && (
          <DeliveryMap restaurantName={order.restaurantId?.name || 'Restaurant'} />
        )}
      {order.status === 'Pending' && !past && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => onCancel(order._id)} style={{ padding: '8px 18px', borderRadius: '20px', border: '2px solid #EF4444', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              Cancel Order
            </button>
          </div>
        )}
      {order.status === 'Delivered' && (
          <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => onReorder(order)} style={{ padding: '8px 18px', borderRadius: '20px', border: '2px solid #F88435', background: '#FFF0E6', color: '#F88435', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              🔄 Reorder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Orders() {
  const { user, token, addToCart } = useAppContext();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const pollRef = useRef<any>(null);

  const fetchOrders = useCallback(async (silent = false) => {
    if (!user || !token) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/orders/user/${user.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(prev => {
          if (silent && prev.length > 0) {
            data.forEach((newOrder: any) => {
              const old = prev.find((o: any) => o._id === newOrder._id);
              if (old && old.status !== newOrder.status) {
                if (Notification.permission === 'granted') {
                  new Notification('Feasto Order Update 🍕', {
                    body: `Order #${newOrder._id.slice(-6).toUpperCase()} is now: ${newOrder.status} ${STATUS_META[newOrder.status]?.icon || ''}`,
                  });
                }
              }
            });
          }
          return data;
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, token]);

  useEffect(() => {
    fetchOrders();
    if (Notification.permission === 'default') Notification.requestPermission();
  }, [fetchOrders]);

  useEffect(() => {
    pollRef.current = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(pollRef.current);
  }, [fetchOrders]);

  const handleReorder = (order: any) => {
    order.items.forEach((item: any) => {
      addToCart({ menuItemId: item.menuItemId?._id || item.menuItemId, name: item.menuItemId?.name || item.name || 'Item', price: item.price, quantity: item.quantity, restaurantId: order.restaurantId?._id || order.restaurantId });
    });
    alert('Items added to cart!');
  };

  const handleCancel = async (orderId: string) => {
    setCancelConfirmId(orderId);
  };

  const confirmCancel = async () => {
    const orderId = cancelConfirmId;
    setCancelConfirmId(null);
    if (!orderId) return;
    try {
      const res = await fetch('/api/orders/' + orderId + '/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ status: 'Cancelled' })
      });
      if (res.ok) {
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: 'Cancelled' } : o));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return (
      <>
        <div className="container"><Navbar /></div>
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ marginBottom: '12px' }}>Please login to view your orders</h2>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: '8px' }}>Login</Link>
        </div>
      </>
    );
  }

  const activeOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
  const pastOrders = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.status));

  return (
    <>
      {cancelConfirmId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '1.8rem' }}>❌</div>
            <h3 style={{ fontWeight: 800, marginBottom: 8 }}>Cancel Order?</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: 24 }}>Are you sure you want to cancel this order? This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setCancelConfirmId(null)} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #eee', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                Keep Order
              </button>
              <button onClick={confirmCancel} style={{ flex: 1, padding: '12px', borderRadius: 12, border: 'none', background: '#EF4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="container"><Navbar /></div>
      <div className="container" style={{ padding: '40px 20px', maxWidth: '860px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia,serif', marginBottom: '4px' }}>My Orders</h1>
            <p style={{ color: '#8A7060', fontSize: '0.85rem' }}>🔄 Live tracking · Last updated: {lastUpdated.toLocaleTimeString()}</p>
          </div>
          <button onClick={() => fetchOrders()} style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid #EDE8E3', background: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}>
            🔄 Refresh Now
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#8A7060' }}>⏳ Loading your orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '20px', border: '1px solid #EDE8E3' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🛍️</div>
            <h3 style={{ marginBottom: '8px' }}>No orders yet</h3>
            <p style={{ color: '#8A7060', marginBottom: '24px' }}>Explore our restaurants and place your first order!</p>
            <Link to="/" className="btn btn-primary">Browse Restaurants</Link>
          </div>
        ) : (
          <>
            {activeOrders.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ background: '#F88435', color: '#fff', borderRadius: '50%', width: '24px', height: '24px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>{activeOrders.length}</span>
                  Active Orders
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {activeOrders.map(order => <OrderCard key={order._id} order={order} expanded={expandedOrder === order._id} onToggle={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)} onReorder={handleReorder} onCancel={handleCancel} />)}
                </div>
              </div>
            )}
            {pastOrders.length > 0 && (
              <div>
                <h2 style={{ fontFamily: 'Georgia,serif', fontSize: '1.2rem', marginBottom: '16px', color: '#8A7060' }}>Order History</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {pastOrders.map(order => <OrderCard key={order._id} order={order} expanded={expandedOrder === order._id} onToggle={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)} onReorder={handleReorder} past />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}