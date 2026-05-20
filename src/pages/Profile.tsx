import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

type Section = 'main' | 'favorites' | 'orders' | 'addresses' | 'vouchers' | 'edit';

const VOUCHERS = [
  { code: 'WELCOME20', discount: '20% off', desc: 'Welcome discount on your first order', expires: '2025-12-31', color: '#FF6B35' },
  { code: 'FEAST10',   discount: '10% off', desc: 'Regular customer reward',             expires: '2025-09-30', color: '#F88435' },
  { code: 'FREESHIP',  discount: '$2.99 off', desc: 'Free delivery on any order',        expires: '2025-08-15', color: '#4CAF82' },
  { code: 'SURPRISE5', discount: '$5 off',  desc: 'Surprise Me button bonus',            expires: '2025-07-01', color: '#9B59B6' },
];

export default function Profile() {
  const { user, setUser, token, logout } = useAppContext();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>("main");
  const [orders, setOrders] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<string[]>(() => {
    const saved = localStorage.getItem("feasto_addresses");
    return saved ? JSON.parse(saved) : [];
  });
  const [newAddress, setNewAddress] = useState("");
  const [editName, setEditName] = useState(user?.name || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [copiedCode, setCopiedCode] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() =>
    user ? localStorage.getItem('feasto_photo_' + user.id) : null
  );

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('Photo must be under 5MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      localStorage.setItem('feasto_photo_' + user!.id, base64);
      setProfilePhoto(base64);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => { if (!user) navigate("/login"); }, [user]);

  useEffect(() => {
    if (section === "orders" && user) {
      setOrdersLoading(true);
      fetch("/api/orders/user/" + user.id, { headers: { Authorization: "Bearer " + token } })
        .then(r => r.json())
        .then(data => { setOrders(Array.isArray(data) ? data : []); setOrdersLoading(false); })
        .catch(() => setOrdersLoading(false));
    }
  }, [section]);

  useEffect(() => {
    if (section === "favorites" && user?.favorites?.length) {
      fetch("/api/restaurants")
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setFavorites(data.filter((r: any) => user.favorites.includes(r._id))); });
    } else if (section === "favorites") {
      setFavorites([]);
    }
  }, [section]);

  useEffect(() => {
    if (section === "addresses" && user?.role === "admin") {
      setSection("main");
    }
  }, [section, user]);

  const saveAddress = () => {
    if (!newAddress.trim()) return;
    const updated = [...addresses, newAddress.trim()];
    setAddresses(updated);
    localStorage.setItem("feasto_addresses", JSON.stringify(updated));
    setNewAddress("");
  };

  const removeAddress = (idx: number) => {
    const updated = addresses.filter((_: any, i: number) => i !== idx);
    setAddresses(updated);
    localStorage.setItem("feasto_addresses", JSON.stringify(updated));
  };

  const saveProfile = async () => {
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ name: editName, email: editEmail, ...(editPassword ? { password: editPassword } : {}) }),
      });
      const data = await res.json();
      if (res.ok) { setUser({ ...user!, name: data.name, email: data.email }); setSaveMsg("Profile updated!"); setEditPassword(""); }
      else setSaveMsg(data.message || "Error saving");
    } catch { setSaveMsg("Network error"); }
    setSaving(false);
  };

  const copyVoucher = (code: string) => {
    navigator.clipboard.writeText(code).then(() => { setCopiedCode(code); setTimeout(() => setCopiedCode(""), 2000); });
  };

  const removeFavorite = (id: string) => {
    const newFavs = user!.favorites.filter((f: string) => f !== id);
    setUser({ ...user!, favorites: newFavs });
    setFavorites(prev => prev.filter(r => r._id !== id));
  };

  const statusColor: Record<string, string> = {
    Pending: "#F59E0B", Confirmed: "#3B82F6", Preparing: "#8B5CF6",
    "On the way": "#F97316", Delivered: "#10B981", Cancelled: "#EF4444",
  };

  const initials = user?.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  const s: Record<string, React.CSSProperties> = {
    page: { minHeight: "100vh", background: "#F8F8F8", fontFamily: "Poppins, sans-serif" },
    topBar: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 20px 10px", background: "white", borderBottom: "1px solid #F0F0F0", position: "sticky", top: 0, zIndex: 100 },
    topTitle: { fontSize: "1rem", fontWeight: 700, letterSpacing: "0.05em", margin: 0 },
    backBtn: { width: 36, height: 36, borderRadius: "50%", border: "1px solid #eee", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
    logoutBtn: { width: 36, height: 36, borderRadius: "50%", border: "1px solid #fee2e2", background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#EF4444" },
    content: { padding: "20px", maxWidth: 600, margin: "0 auto" },
    avatarSection: { display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 0 20px", background: "white", borderRadius: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
    avatar: { width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg, #F88435, #FF6B35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 700, color: "white", marginBottom: 12, boxShadow: "0 4px 20px rgba(248,132,53,0.3)" },
    userName: { fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 },
    userEmail: { fontSize: "0.85rem", color: "#888", marginBottom: 10 },
    adminBadge: { background: "#FFF3E0", color: "#F88435", fontSize: "0.72rem", fontWeight: 700, padding: "4px 14px", borderRadius: 20, marginBottom: 12 },
    editBtn: { background: "#F88435", color: "white", border: "none", borderRadius: 30, padding: "12px 44px", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "0.08em", cursor: "pointer", marginTop: 6, boxShadow: "0 4px 16px rgba(248,132,53,0.3)" },
    menuList: { background: "white", borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 14 },
    menuItem: { width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "15px 18px", border: "none", background: "white", cursor: "pointer", borderBottom: "1px solid #F5F5F5", textAlign: "left" },
    menuIcon: { width: 44, height: 44, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
    menuLabel: { fontSize: "0.92rem", fontWeight: 600, color: "#222", marginBottom: 1 },
    menuSub: { fontSize: "0.75rem", color: "#bbb" },
    adminLink: { display: "flex", alignItems: "center", padding: "14px 18px", background: "white", borderRadius: 16, color: "#333", textDecoration: "none", fontWeight: 600, fontSize: "0.88rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" },
    favCard: { display: "flex", alignItems: "center", gap: 13, background: "white", borderRadius: 16, padding: 13, marginBottom: 11, textDecoration: "none", color: "inherit", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
    favImg: { width: 68, height: 68, borderRadius: 12, objectFit: "cover" as const, flexShrink: 0 },
    orderCard: { background: "white", borderRadius: 16, padding: 16, marginBottom: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
    statusBadge: { color: "white", fontSize: "0.7rem", fontWeight: 600, padding: "4px 10px", borderRadius: 20 },
    voucherCard: { background: "white", borderRadius: 16, padding: 18, marginBottom: 13, borderLeftWidth: 5, borderLeftStyle: "solid" as const, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
    copyBtn: { color: "white", border: "none", borderRadius: 20, padding: "8px 14px", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, flexShrink: 0, whiteSpace: "nowrap" as const },
    input: { padding: "13px 16px", borderRadius: 12, border: "2px solid #eee", fontSize: "0.92rem", outline: "none", width: "100%", boxSizing: "border-box" as const, marginBottom: 4, fontFamily: "inherit" },
    label: { fontSize: "0.75rem", fontWeight: 600, color: "#999", letterSpacing: "0.05em", textTransform: "uppercase" as const, marginTop: 10, marginBottom: 4, display: "block" },
    saveBtn: { background: "#F88435", color: "white", border: "none", borderRadius: 14, padding: 14, fontWeight: 700, fontSize: "1rem", cursor: "pointer", marginTop: 14, width: "100%" },
    empty: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", color: "#bbb" },
    addBox: { display: "flex", gap: 10, marginBottom: 18 },
    addrInput: { flex: 1, padding: "12px 16px", borderRadius: 12, border: "2px solid #eee", fontSize: "0.9rem", outline: "none", fontFamily: "inherit" },
    addBtn: { width: 46, height: 46, borderRadius: 12, background: "#F88435", border: "none", color: "white", fontSize: "1.1rem", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" },
    addrCard: { display: "flex", alignItems: "center", gap: 13, background: "white", borderRadius: 13, padding: "13px 16px", marginBottom: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  };

  if (section === "favorites") return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button onClick={() => setSection("main")} style={s.backBtn}><i className="fa-solid fa-arrow-left"></i></button>
        <h2 style={s.topTitle}>My Favourites</h2>
        <div style={{ width: 36 }} />
      </div>
      <div style={s.content}>
        {favorites.length === 0 ? (
          <div style={s.empty}>
            <i className="fa-regular fa-heart" style={{ fontSize: "3rem", marginBottom: 14 }}></i>
            <p>No favourites yet</p>
            <p style={{ fontSize: "0.82rem", marginTop: 4 }}>Tap the heart icon on a restaurant to save it here</p>
          </div>
        ) : favorites.map(r => (
          <Link to={"/restaurant/" + r._id} key={r._id} style={s.favCard}>
            <img src={r.image} alt={r.name} style={s.favImg} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 3 }}>{r.name}</div>
              <div style={{ fontSize: "0.78rem", color: "#999" }}>{r.location} • {r.deliveryTime}</div>
              <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                {r.tags?.map((t: string) => <span key={t} style={{ fontSize: "0.68rem", background: "#FFF0E6", color: "#F88435", padding: "3px 8px", borderRadius: 10, fontWeight: 600 }}>{t}</span>)}
              </div>
            </div>
            <button onClick={e => { e.preventDefault(); removeFavorite(r._id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px 8px" }}>
              <i className="fa-solid fa-heart"></i>
            </button>
          </Link>
        ))}
      </div>
    </div>
  );

  if (section === "orders") return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button onClick={() => setSection("main")} style={s.backBtn}><i className="fa-solid fa-arrow-left"></i></button>
        <h2 style={s.topTitle}>Order History</h2>
        <div style={{ width: 36 }} />
      </div>
      <div style={s.content}>
        {ordersLoading ? (
          <div style={s.empty}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: "2rem", color: "#F88435" }}></i></div>
        ) : orders.length === 0 ? (
          <div style={s.empty}>
            <i className="fa-solid fa-bag-shopping" style={{ fontSize: "3rem", marginBottom: 14 }}></i>
            <p>No orders yet</p>
          </div>
        ) : orders.map(order => (
          <div key={order._id} style={s.orderCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{order.restaurantId?.name || "Restaurant"}</div>
                <div style={{ fontSize: "0.76rem", color: "#aaa", marginTop: 2 }}>{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
              </div>
              <span style={{ ...s.statusBadge, background: statusColor[order.status] || "#999" }}>{order.status}</span>
            </div>
            <div style={{ borderTop: "1px solid #F5F5F5", paddingTop: 10 }}>
              {order.items?.map((item: any, i: number) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: 3 }}>
                  <span>{item.name}</span><span style={{ color: "#aaa" }}>x{item.quantity}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F5F5F5", paddingTop: 10, marginTop: 8 }}>
              <span style={{ fontWeight: 700 }}>Total: ${order.totalAmount?.toFixed(2)}</span>
              <Link to="/orders" style={{ background: "#F88435", color: "white", padding: "6px 16px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>Track Order</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (section === "addresses") return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button onClick={() => setSection("main")} style={s.backBtn}><i className="fa-solid fa-arrow-left"></i></button>
        <h2 style={s.topTitle}>Delivery Addresses</h2>
        <div style={{ width: 36 }} />
      </div>
      <div style={s.content}>
        <div style={s.addBox}>
          <input value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Type a new address..." style={s.addrInput} onKeyDown={e => e.key === "Enter" && saveAddress()} />
          <button onClick={saveAddress} style={s.addBtn}><i className="fa-solid fa-plus"></i></button>
        </div>
        {addresses.length === 0 ? (
          <div style={s.empty}>
            <i className="fa-solid fa-location-dot" style={{ fontSize: "3rem", marginBottom: 14 }}></i>
            <p>No saved addresses</p>
          </div>
        ) : addresses.map((addr, i) => (
          <div key={i} style={s.addrCard}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#FFF3E0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="fa-solid fa-location-dot" style={{ color: "#F88435" }}></i>
            </div>
            <span style={{ flex: 1, fontSize: "0.9rem" }}>{addr}</span>
            <button onClick={() => removeAddress(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: "4px 8px" }}><i className="fa-solid fa-trash"></i></button>
          </div>
        ))}
      </div>
    </div>
  );

  if (section === "vouchers") return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button onClick={() => setSection("main")} style={s.backBtn}><i className="fa-solid fa-arrow-left"></i></button>
        <h2 style={s.topTitle}>Voucher Vault</h2>
        <div style={{ width: 36 }} />
      </div>
      <div style={s.content}>
        {VOUCHERS.map(v => (
          <div key={v.code} style={{ ...s.voucherCard, borderLeftColor: v.color }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: v.color, marginBottom: 3 }}>{v.discount}</div>
                <div style={{ fontSize: "0.84rem", color: "#555", marginBottom: 3 }}>{v.desc}</div>
                <div style={{ fontSize: "0.73rem", color: "#bbb" }}>Expires: {v.expires}</div>
              </div>
              <button onClick={() => copyVoucher(v.code)} style={{ ...s.copyBtn, background: copiedCode === v.code ? "#10B981" : v.color }}>
                {copiedCode === v.code ? <><i className="fa-solid fa-check"></i> Copied</> : <><i className="fa-solid fa-copy"></i> {v.code}</>}
              </button>
            </div>
          </div>
        ))}
        <p style={{ textAlign: "center", color: "#ccc", fontSize: "0.78rem", marginTop: 12 }}>Tap a voucher to copy the code and use it at checkout.</p>
      </div>
    </div>
  );

  if (section === "edit") return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button onClick={() => setSection("main")} style={s.backBtn}><i className="fa-solid fa-arrow-left"></i></button>
        <h2 style={s.topTitle}>Edit Profile</h2>
        <div style={{ width: 36 }} />
      </div>
      <div style={s.content}>
        <div style={{ background: "white", borderRadius: 20, padding: 22, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <label style={s.label}>Full Name</label>
          <input value={editName} onChange={e => setEditName(e.target.value)} style={s.input} placeholder="Your name" />
          <label style={s.label}>Email Address</label>
          <input value={editEmail} onChange={e => setEditEmail(e.target.value)} style={s.input} placeholder="your@email.com" type="email" />
          <label style={s.label}>New Password <span style={{ color: "#ccc", fontWeight: 400, textTransform: "none" }}>(leave blank to keep current)</span></label>
          <input value={editPassword} onChange={e => setEditPassword(e.target.value)} style={s.input} placeholder="New password" type="password" />
          {saveMsg && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: saveMsg.includes("updated") ? "#D1FAE5" : "#FEE2E2", color: saveMsg.includes("updated") ? "#065F46" : "#991B1B", marginBottom: 6, fontSize: "0.88rem" }}>
              {saveMsg}
            </div>
          )}
          <button onClick={saveProfile} disabled={saving} style={s.saveBtn}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <button onClick={() => navigate(-1)} style={s.backBtn}><i className="fa-solid fa-arrow-left"></i></button>
        <h2 style={s.topTitle}>MY PROFILE</h2>
        <button onClick={() => { logout(); navigate("/"); }} style={s.logoutBtn} title="Logout">
          <i className="fa-solid fa-power-off"></i>
        </button>
      </div>
      <div style={s.content}>
        <div style={s.avatarSection}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', border: '3px solid #F88435', display: 'block' }} />
            ) : (
              <div style={s.avatar}>{initials}</div>
            )}
            <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, background: '#F88435', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              <i className="fa-solid fa-camera" style={{ color: 'white', fontSize: '0.7rem' }}></i>
            </label>
            <input id="photo-upload" type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>
          <div style={s.userName}>{user?.name}</div>
          <div style={s.userEmail}><i className="fa-solid fa-envelope" style={{ marginRight: 5 }}></i>{user?.email}</div>
          {user?.role === "admin" && <span style={s.adminBadge}><i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }}></i>Admin</span>}
          <button onClick={() => setSection("edit")} style={s.editBtn}>EDIT PROFILE</button>
        </div>
        <div style={s.menuList}>
          {[
            { key: "favorites", icon: "fa-heart",        bg: "#FFE4E4", color: "#EF4444", label: "My Favourites",           sub: (user?.favorites?.length || 0) + " saved" },
            { key: "orders",    icon: "fa-bag-shopping",  bg: "#E0F0FF", color: "#3B82F6", label: "Order History",            sub: "View all orders" },
            ...(user?.role === "admin" ? [] : [{ key: "addresses", icon: "fa-location-dot",  bg: "#FFF3E0", color: "#F88435", label: "Manage Delivery Address",  sub: addresses.length + " saved" }]),
            { key: "vouchers",  icon: "fa-ticket",        bg: "#FFF0E0", color: "#F59E0B", label: "Voucher Vault",            sub: VOUCHERS.length + " available" },
          ].map(item => (
            <button key={item.key} onClick={() => setSection(item.key as Section)} style={s.menuItem}>
              <div style={{ ...s.menuIcon, background: item.bg }}>
                <i className={"fa-solid " + item.icon} style={{ color: item.color, fontSize: "1rem" }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={s.menuLabel}>{item.label}</div>
                <div style={s.menuSub}>{item.sub}</div>
              </div>
              <i className="fa-solid fa-chevron-right" style={{ color: "#ddd", fontSize: "0.78rem" }}></i>
            </button>
          ))}
        </div>
        {user?.role === "admin" && (
          <Link to="/admin" style={s.adminLink}>
            <i className="fa-solid fa-gauge-high" style={{ marginRight: 8, color: "#F88435" }}></i>
            Admin Dashboard
            <i className="fa-solid fa-arrow-right" style={{ marginLeft: "auto", color: "#ddd" }}></i>
          </Link>
        )}
      </div>
    </div>
  );
}
