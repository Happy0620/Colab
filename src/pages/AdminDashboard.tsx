import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ImageUpload from '../components/ImageUpload';
import { useAppContext } from '../context/AppContext';

type Tab = 'orders' | 'restaurants' | 'menu' | 'analytics';

const STATUS_COLORS: Record<string, string> = {
  'Pending':    '#F59E0B',
  'Confirmed':  '#3B82F6',
  'Preparing':  '#8B5CF6',
  'On the way': '#F97316',
  'Delivered':  '#22C55E',
  'Cancelled':  '#EF4444',
};

export default function AdminDashboard() {
  const { user, token } = useAppContext();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('orders');

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const pollRef = useRef<any>(null);
  const audioRef = useRef<boolean>(false);

  // Restaurants state
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [restLoading, setRestLoading] = useState(false);
  const [showRestForm, setShowRestForm] = useState(false);
  const [editingRest, setEditingRest] = useState<any>(null);
  const [restForm, setRestForm] = useState({ name: '', location: '', distance: '', image: '', rating: 0, deliveryTime: '', categories: '', tags: '' });

  // Menu state
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: 0, image: '', category: 'Main Course', calories: 0, funFact: '', restaurantId: '' });

  const authHeaders = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', { headers: authHeaders });
      const data = await res.json();
      if (Array.isArray(data)) setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  }, [token]);

  const markAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH', headers: authHeaders });
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PATCH', headers: authHeaders });
    fetchNotifications();
  };



  // ── Fetch Orders ──────────────────────────────────────────
  // JIRA: ADMIN-02 - Real-time Order Polling & Notifications
  const fetchOrders = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setOrdersLoading(true);
    try {
      const res = await fetch('/api/orders/all', { headers: authHeaders });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
        setLastUpdated(new Date());

        // Detect new orders
        const pendingCount = data.filter((o: any) => o.status === 'Pending').length;
        if (silent && pendingCount > lastOrderCount && lastOrderCount > 0) {
          setNewOrderCount(prev => prev + (pendingCount - lastOrderCount));
          // Flash title
          document.title = `🔔 New Order! — Feasto Admin`;
          setTimeout(() => { document.title = 'Feasto Admin'; }, 5000);
        }
        setLastOrderCount(pendingCount);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setOrdersLoading(false);
    }
  }, [token, lastOrderCount]);

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
    fetchOrders();
    fetchNotifications();
  }, [user, navigate, fetchOrders, fetchNotifications]);

  // Poll every 15 seconds for new orders
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchOrders(true);
      fetchNotifications();
    }, 15000);
    return () => clearInterval(pollRef.current);
  }, [fetchOrders, fetchNotifications]);

  // ── Fetch Restaurants ──────────────────────────────────────
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setter(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const fetchRestaurants = async () => {
    setRestLoading(true);
    const res = await fetch('/api/restaurants');
    const data = await res.json();
    setRestaurants(Array.isArray(data) ? data : []);
    setRestLoading(false);
  };

  // ── Fetch Menu Items ───────────────────────────────────────
  const fetchMenuItems = async () => {
    setMenuLoading(true);
    const items: any[] = [];
    const rests = restaurants.length > 0 ? restaurants : await fetch('/api/restaurants').then(r => r.json());
    for (const r of rests) {
      const res = await fetch(`/api/menu/restaurant/${r._id}`);
      const data = await res.json();
      if (Array.isArray(data)) items.push(...data.map((d: any) => ({ ...d, restaurantName: r.name })));
    }
    setMenuItems(items);
    setMenuLoading(false);
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    if (t === 'restaurants' && restaurants.length === 0) fetchRestaurants();
    if (t === 'menu' && menuItems.length === 0) fetchMenuItems();
    if (t === 'orders') { setNewOrderCount(0); fetchOrders(); }
  };

  // ── Update Order Status ────────────────────────────────────
  const updateStatus = async (orderId: string, status: string) => {
    await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH', headers: authHeaders, body: JSON.stringify({ status })
    });
    fetchOrders(true);
  };

  // ── Restaurant CRUD ────────────────────────────────────────
  const saveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { ...restForm, categories: restForm.categories.split(',').map(c => c.trim()), tags: restForm.tags.split(',').map(t => t.trim()) };
    const url = editingRest ? `/api/restaurants/${editingRest._id}` : '/api/restaurants';
    const method = editingRest ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(body) });
    if (res.ok) { setShowRestForm(false); setEditingRest(null); fetchRestaurants(); }
    else alert('Failed to save restaurant');
  };

  const deleteRestaurant = async (id: string) => {
    if (!confirm('Delete this restaurant and all its menu items?')) return;
    await fetch(`/api/restaurants/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchRestaurants();
  };

  const openEditRest = (r: any) => {
    setEditingRest(r);
    setRestForm({ name: r.name, location: r.location, distance: r.distance || '', image: r.image, rating: r.rating, deliveryTime: r.deliveryTime, categories: r.categories?.join(', ') || '', tags: r.tags?.join(', ') || '' });
    setShowRestForm(true);
  };

  // ── Menu CRUD ──────────────────────────────────────────────
  const saveMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingMenu ? `/api/menu/${editingMenu._id}` : '/api/menu';
    const method = editingMenu ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: authHeaders, body: JSON.stringify(menuForm) });
    if (res.ok) { setShowMenuForm(false); setEditingMenu(null); fetchMenuItems(); }
    else alert('Failed to save menu item');
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Delete this menu item?')) return;
    await fetch(`/api/menu/${id}`, { method: 'DELETE', headers: authHeaders });
    fetchMenuItems();
  };

  const openEditMenu = (item: any) => {
    setEditingMenu(item);
    setMenuForm({ name: item.name, description: item.description, price: item.price, image: item.image, category: item.category, calories: item.calories, funFact: item.funFact || '', restaurantId: item.restaurantId?._id || item.restaurantId });
    setShowMenuForm(true);
  };

  if (!user || user.role !== 'admin') return null;

  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const stats = [
    { label: 'New Orders', value: pendingOrders.length, icon: '🔔', color: '#F59E0B', pulse: pendingOrders.length > 0 },
    { label: 'Total Orders', value: orders.length, icon: '📦', color: '#3B82F6' },
    { label: 'Restaurants', value: restaurants.length, icon: '🏪', color: '#F88435' },
    { label: 'Delivered Today', value: orders.filter(o => o.status === 'Delivered').length, icon: '✅', color: '#22C55E' },
  ];

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '10px', border: '2px solid #EDE8E3', background: '#FFF8F3', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: '#8A7060', textTransform: 'uppercase', letterSpacing: '0.05em' };

  return (
    <div style={{ minHeight: '100vh', background: '#FAF8F5' }}>
      <div className="container"><Navbar /></div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 70px)' }}>

        {/* Sidebar */}
        {/* JIRA: ADMIN-03 - Dedicated Admin Sidebar Navigation */}
        <aside style={{ width: '230px', background: '#1A1208', padding: '24px 14px', display: 'flex', flexDirection: 'column', gap: '4px', position: 'sticky', top: '70px', height: 'calc(100vh - 70px)' }}>
          <div style={{ fontFamily: 'Georgia,serif', fontSize: '1rem', color: '#F88435', padding: '0 8px 20px', borderBottom: '1px solid #333', marginBottom: '12px' }}>🍴 Feasto Admin</div>

          {(['orders', 'restaurants', 'menu', 'analytics'] as Tab[]).map(t => (
            <button key={t} onClick={() => handleTabChange(t)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px', border: 'none', cursor: 'pointer', background: tab === t ? 'rgba(248,132,53,0.15)' : 'transparent', color: tab === t ? '#F88435' : '#aaa', fontWeight: 500, fontSize: '0.9rem' }}>
              <span>{t === 'orders' ? '📦 Orders' : t === 'restaurants' ? '🏪 Restaurants' : t === 'menu' ? '🍽️ Menu Items' : '📊 Analytics'}</span>
              {t === 'orders' && newOrderCount > 0 && <span style={{ background: '#EF4444', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{newOrderCount}</span>}
            </button>
          ))}

          {/* Removed 'Back to Site' to enforce strict Admin isolation */}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>

          {/* Header & Notifications */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px', position: 'relative' }}>
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ background: '#fff', border: '1px solid #EDE8E3', borderRadius: '50%', width: '44px', height: '44px', fontSize: '1.2rem', cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}
            >
              🔔
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#EF4444', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {notifications.filter(n => !n.read).length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showNotifications && (
              <div style={{ position: 'absolute', top: '50px', right: 0, width: '320px', background: '#fff', border: '1px solid #EDE8E3', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #EDE8E3', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAF8F5' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#333' }}>Notifications</h4>
                  <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#F88435', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#8A7060', fontSize: '0.85rem' }}>No notifications yet.</div>
                  ) : notifications.map(n => (
                    <div key={n._id} onClick={() => { if (!n.read) markAsRead(n._id); }} style={{ padding: '12px 16px', borderBottom: '1px solid #f5f5f5', background: n.read ? '#fff' : '#FFFBEB', cursor: n.read ? 'default' : 'pointer', transition: 'background 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>{n.title}</span>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>{new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#666', lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '32px' }}>
            {stats.map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: '16px', padding: '20px', border: `1px solid ${s.pulse ? s.color + '44' : '#EDE8E3'}`, boxShadow: s.pulse ? `0 0 0 3px ${s.color}22` : 'none', animation: s.pulse ? 'pulse 2s infinite' : 'none' }}>
                <div style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.78rem', color: '#8A7060' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Orders Tab ── */}
          {/* JIRA: ADMIN-04 - Order Management Table & Status Updates */}
          {tab === 'orders' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontFamily: 'Georgia,serif' }}>
                  All Orders
                  {pendingOrders.length > 0 && <span style={{ marginLeft: '10px', background: '#F59E0B', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 700 }}>🔔 {pendingOrders.length} need attention</span>}
                </h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#8A7060' }}>Auto-refreshes every 15s · {lastUpdated.toLocaleTimeString()}</span>
                  <button onClick={() => fetchOrders()} style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #EDE8E3', background: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>🔄 Refresh</button>
                </div>
              </div>

              {ordersLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#8A7060' }}>Loading orders...</div>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E3', color: '#8A7060' }}>No orders yet.</div>
              ) : (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E3', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #EDE8E3', background: '#FAF8F5' }}>
                        {['Order', 'Customer', 'Restaurant', 'Items', 'Total', 'Status', 'Update', 'Date'].map(h => (
                          <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8A7060' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => (
                        <tr key={o._id} style={{ borderBottom: '1px solid #EDE8E3', background: o.status === 'Pending' ? '#FFFBEB' : '#fff' }}>
                          <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: '0.8rem', color: '#8A7060' }}>#{o._id.slice(-6).toUpperCase()}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 500 }}>{o.userId?.name || 'Guest'}<br /><span style={{ color: '#8A7060', fontSize: '0.75rem' }}>{o.userId?.email}</span></td>
                          <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{o.restaurantId?.name || '—'}</td>
                          <td style={{ padding: '12px 14px', fontSize: '0.82rem', color: '#8A7060' }}>{o.items?.length} item{o.items?.length !== 1 ? 's' : ''}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#F88435' }}>${o.totalAmount?.toFixed(2)}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={{ color: STATUS_COLORS[o.status] || '#888', fontWeight: 700, fontSize: '0.82rem', background: (STATUS_COLORS[o.status] || '#888') + '22', padding: '3px 10px', borderRadius: '20px' }}>
                              {o.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <select value={o.status} onChange={e => updateStatus(o._id, e.target.value)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #EDE8E3', fontFamily: 'inherit', fontSize: '0.82rem', cursor: 'pointer', background: '#fff' }}>
                              {['Pending', 'Confirmed', 'Preparing', 'On the way', 'Delivered', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: '#8A7060' }}>{new Date(o.createdAt).toLocaleDateString()}<br />{new Date(o.createdAt).toLocaleTimeString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Restaurants Tab ── */}
          {/* JIRA: ADMIN-05 - Restaurant CRUD Operations */}
          {tab === 'restaurants' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'Georgia,serif' }}>Restaurants</h2>
                <button onClick={() => { setEditingRest(null); setRestForm({ name: '', location: '', distance: '', image: '', rating: 0, deliveryTime: '', categories: '', tags: '' }); setShowRestForm(true); }} className="btn btn-primary">＋ Add Restaurant</button>
              </div>

              {showRestForm && (
                <div style={{ background: '#fff', border: '1px solid #EDE8E3', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '20px' }}>{editingRest ? 'Edit Restaurant' : 'New Restaurant'}</h3>
                  <form onSubmit={saveRestaurant}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {[['Name', 'name', 'text'], ['Location', 'location', 'text'], ['Distance (e.g. Approx 1.2 km)', 'distance', 'text'], ['Delivery Time (e.g. 30-40 mins)', 'deliveryTime', 'text'], ['Rating (0-5)', 'rating', 'number'], ['Categories (comma separated)', 'categories', 'text'], ['Tags (comma separated)', 'tags', 'text']].map(([label, key, type]) => (
                        <div key={key}>
                          <label style={labelStyle}>{label}</label>
                          <input type={type} required value={(restForm as any)[key]} onChange={e => setRestForm({ ...restForm, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value })} style={inputStyle} />
                        </div>
                      ))}
                      <div style={{ gridColumn: '1/-1' }}>
                        <ImageUpload
                          label="Image"
                          value={restForm.image}
                          onChange={(url) => setRestForm({ ...restForm, image: url })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button type="submit" className="btn btn-primary">Save</button>
                      <button type="button" onClick={() => setShowRestForm(false)} className="btn btn-outline">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E3', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #EDE8E3', background: '#FAF8F5' }}>
                      {['Restaurant', 'Category', 'Rating', 'Delivery', 'Actions'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: '#8A7060' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {restLoading ? <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#8A7060' }}>Loading...</td></tr>
                      : restaurants.map(r => (
                        <tr key={r._id} style={{ borderBottom: '1px solid #EDE8E3' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={r.image} alt={r.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
                              <div><div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{r.name}</div><div style={{ fontSize: '0.78rem', color: '#8A7060' }}>{r.location}</div></div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px' }}><span style={{ background: '#FFF0E6', color: '#F88435', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 }}>{r.categories?.[0]}</span></td>
                          <td style={{ padding: '14px 16px', fontSize: '0.88rem' }}>⭐ {r.rating}</td>
                          <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#8A7060' }}>{r.deliveryTime}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => openEditRest(r)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #EDE8E3', background: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>Edit</button>
                              <button onClick={() => deleteRestaurant(r._id)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #FEE2E2', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: '0.82rem' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Menu Tab ── */}
          {/* JIRA: ADMIN-06 - Menu Item CRUD Operations */}
          {tab === 'menu' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontFamily: 'Georgia,serif' }}>Menu Items</h2>
                <button onClick={() => { setEditingMenu(null); setMenuForm({ name: '', description: '', price: 0, image: '', category: 'Main Course', calories: 0, funFact: '', restaurantId: restaurants[0]?._id || '' }); setShowMenuForm(true); }} className="btn btn-primary">＋ Add Item</button>
              </div>

              {showMenuForm && (
                <div style={{ background: '#fff', border: '1px solid #EDE8E3', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '20px' }}>{editingMenu ? 'Edit Menu Item' : 'New Menu Item'}</h3>
                  <form onSubmit={saveMenuItem}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={labelStyle}>Restaurant</label>
                        <select value={menuForm.restaurantId} onChange={e => setMenuForm({ ...menuForm, restaurantId: e.target.value })} style={inputStyle}>
                          {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Category</label>
                        <select value={menuForm.category} onChange={e => setMenuForm({ ...menuForm, category: e.target.value })} style={inputStyle}>
                          {['Starter', 'Main Course', 'Pizza', 'Pasta', 'Sushi', 'Breakfast', 'Dessert', 'Drinks'].map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      {[['Name', 'name', 'text'], ['Price ($)', 'price', 'number'], ['Calories', 'calories', 'number']].map(([label, key, type]) => (
                        <div key={key}>
                          <label style={labelStyle}>{label}</label>
                          <input type={type} required value={(menuForm as any)[key]} onChange={e => setMenuForm({ ...menuForm, [key]: type === 'number' ? parseFloat(e.target.value) : e.target.value })} style={inputStyle} />
                        </div>
                      ))}
                      <div style={{ gridColumn: '1/-1' }}>
                        <ImageUpload
                          label="Image"
                          value={menuForm.image}
                          onChange={(url) => setMenuForm({ ...menuForm, image: url })}
                        />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={labelStyle}>Description</label>
                        <textarea required value={menuForm.description} onChange={e => setMenuForm({ ...menuForm, description: e.target.value })} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <label style={labelStyle}>Fun Fact (optional)</label>
                        <input type="text" value={menuForm.funFact} onChange={e => setMenuForm({ ...menuForm, funFact: e.target.value })} placeholder="An interesting fact about this dish..." style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                      <button type="submit" className="btn btn-primary">Save</button>
                      <button type="button" onClick={() => setShowMenuForm(false)} className="btn btn-outline">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #EDE8E3', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #EDE8E3', background: '#FAF8F5' }}>
                      {['Item', 'Restaurant', 'Category', 'Price', 'Calories', 'Actions'].map(h => <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', color: '#8A7060' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {menuLoading ? <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#8A7060' }}>Loading...</td></tr>
                      : menuItems.length === 0 ? <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#8A7060' }}>No menu items yet.</td></tr>
                      : menuItems.map(item => (
                        <tr key={item._id} style={{ borderBottom: '1px solid #EDE8E3' }}>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={item.image} alt={item.name} style={{ width: '44px', height: '44px', borderRadius: '10px', objectFit: 'cover' }} />
                              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{item.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#8A7060' }}>{item.restaurantName}</td>
                          <td style={{ padding: '14px 16px' }}><span style={{ background: '#F3F4F6', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem' }}>{item.category}</span></td>
                          <td style={{ padding: '14px 16px', fontWeight: 700, color: '#F88435' }}>${item.price?.toFixed(2)}</td>
                          <td style={{ padding: '14px 16px', fontSize: '0.85rem', color: '#8A7060' }}>🔥 {item.calories}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => openEditMenu(item)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #EDE8E3', background: '#fff', cursor: 'pointer', fontSize: '0.82rem' }}>Edit</button>
                              <button onClick={() => deleteMenuItem(item._id)} style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #FEE2E2', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', fontSize: '0.82rem' }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* Analytics Tab */}
          {tab === 'analytics' && (() => {
            const statusCounts = ['Pending','Confirmed','Preparing','On the way','Delivered','Cancelled'].map(s => ({
              name: s, value: orders.filter((o: any) => o.status === s).length
            })).filter(s => s.value > 0);

            const COLORS = ['#F59E0B','#3B82F6','#8B5CF6','#F97316','#22C55E','#EF4444'];

            const revenueByDay: Record<string, number> = {};
            orders.filter((o: any) => o.status === 'Delivered').forEach((o: any) => {
              const day = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              revenueByDay[day] = (revenueByDay[day] || 0) + (o.totalAmount || 0);
            });
            const revenueData = Object.entries(revenueByDay).slice(-7).map(([day, revenue]) => ({ day, revenue: parseFloat((revenue as number).toFixed(2)) }));

            const totalRevenue = orders.filter((o: any) => o.status === 'Delivered').reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
            const totalOrders = orders.length;
            const deliveredOrders = orders.filter((o: any) => o.status === 'Delivered').length;
            const cancelledOrders = orders.filter((o: any) => o.status === 'Cancelled').length;

            return (
              <div>
                <h2 style={{ fontWeight: 800, marginBottom: 24 }}>Analytics Overview</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {[
                    { label: 'Total Revenue', value: '$' + totalRevenue.toFixed(2), color: '#22C55E', icon: '💰' },
                    { label: 'Total Orders', value: totalOrders, color: '#3B82F6', icon: '📦' },
                    { label: 'Delivered', value: deliveredOrders, color: '#22C55E', icon: '✅' },
                    { label: 'Cancelled', value: cancelledOrders, color: '#EF4444', icon: '❌' },
                  ].map((stat: any) => (
                    <div key={stat.label} style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: '4px solid ' + stat.color }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>{stat.icon}</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 4 }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                  <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '0.95rem' }}>Revenue Last 7 Days</h3>
                    {revenueData.length === 0 ? (
                      <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>No delivered orders yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={revenueData}>
                          <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: any) => ['$' + v, 'Revenue']} />
                          <Bar dataKey="revenue" fill="#F88435" radius={[6,6,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: '0.95rem' }}>Orders by Status</h3>
                    {statusCounts.length === 0 ? (
                      <p style={{ color: '#aaa', textAlign: 'center', padding: '40px 0' }}>No orders yet</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie data={statusCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }: any) => name + ': ' + value}>
                            {statusCounts.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.95rem' }}>Top Restaurants by Orders</h3>
                  {(() => {
                    const restCounts: Record<string, number> = {};
                    orders.forEach((o: any) => {
                      const name = o.restaurantId?.name || 'Unknown';
                      restCounts[name] = (restCounts[name] || 0) + 1;
                    });
                    const topRests = Object.entries(restCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count }));
                    return topRests.length === 0 ? <p style={{ color: '#aaa' }}>No data yet</p> : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={topRests} layout="vertical">
                          <XAxis type="number" tick={{ fontSize: 11 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#F88435" radius={[0,6,6,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </main>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
          50% { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
        }
      `}</style>
    </div>
  );
}