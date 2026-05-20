import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

export default function Home() {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRestaurants, setSearchRestaurants] = useState<any[]>([]);
  const [searchFoods, setSearchFoods] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [surpriseItem, setSurpriseItem] = useState<any>(null);
  const [surpriseVisible, setSurpriseVisible] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { user, setUser } = useAppContext();

  const CATEGORIES = ['All', 'French', 'Japanese', 'Italian', 'Mediterranean', 'Organic', 'BBQ'];

  useEffect(() => {
    fetch('/api/restaurants')
      .then(r => r.json())
      .then(data => { setRestaurants(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => { setError('Server unreachable'); setLoading(false); });
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!q.trim()) { setIsSearching(false); setSearchRestaurants([]); setSearchFoods([]); setSearching(false); return; }
    setSearching(true);
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const [rRes, fRes] = await Promise.all([
          fetch(`/api/restaurants?search=${encodeURIComponent(q.trim())}`),
          fetch(`/api/menu/search?q=${encodeURIComponent(q.trim())}`)
        ]);
        const [rData, fData] = await Promise.all([rRes.json(), fRes.json()]);
        setSearchRestaurants(Array.isArray(rData) ? rData : []);
        setSearchFoods(Array.isArray(fData) ? fData : []);
      } catch { setSearchRestaurants([]); setSearchFoods([]); }
      setSearching(false);
    }, 350);
  };

  const clearSearch = () => { setSearchQuery(''); setIsSearching(false); setSearchRestaurants([]); setSearchFoods([]); setSearching(false); };

  const handleSurpriseMe = async () => {
    try {
      const res = await fetch('/api/menu/surprise');
      const item = await res.json();
      if (item && !item.message) { setSurpriseItem(item); setSurpriseVisible(true); }
    } catch {}
  };

  const closeSurprise = () => setSurpriseVisible(false);

  const toggleFavorite = (e: React.MouseEvent, restaurantId: string) => {
    e.preventDefault();
    if (!user) { alert('Please login to save favorites'); return; }
    const isFav = user.favorites?.includes(restaurantId);
    setUser({ ...user, favorites: isFav ? user.favorites.filter((id: string) => id !== restaurantId) : [...(user.favorites || []), restaurantId] });
  };

  const filteredRestaurants = restaurants.filter(r =>
    selectedCategory === 'All' || r.categories?.includes(selectedCategory)
  );

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const btn = document.getElementById('contactSubmitBtn') as HTMLButtonElement;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;
    setTimeout(() => { alert('Message sent!'); btn.innerHTML = 'Send Message'; btn.disabled = false; (e.target as HTMLFormElement).reset(); }, 1000);
  };

  useEffect(() => {
    document.body.classList.add('intro-active');
    let isOpening = false;
    const openWebsite = () => {
      if (isOpening) return; isOpening = true;
      document.body.style.overflow = 'hidden'; document.body.style.height = '100vh';
      document.body.classList.remove('intro-active');
      setTimeout(() => { document.body.style.overflow = ''; document.body.style.height = ''; }, 2500);
    };
    let acc = 0;
    const onWheel = (e: WheelEvent) => { if (document.body.classList.contains('intro-active') && e.deltaY > 0) { acc += e.deltaY; if (acc > 300) openWebsite(); } };
    let ty = 0;
    const onTouchStart = (e: TouchEvent) => { if (document.body.classList.contains('intro-active')) ty = e.touches[0].clientY; };
    const onTouchMove = (e: TouchEvent) => { if (document.body.classList.contains('intro-active') && ty && ty - e.touches[0].clientY > 150) openWebsite(); };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    const timer = setTimeout(() => { if (document.body.classList.contains('intro-active')) openWebsite(); }, 25000);
    return () => { window.removeEventListener('wheel', onWheel); window.removeEventListener('touchstart', onTouchStart); window.removeEventListener('touchmove', onTouchMove); clearTimeout(timer); document.body.classList.remove('intro-active'); document.body.style.overflow = ''; document.body.style.height = ''; };
  }, []);

  const RestaurantCard = ({ r }: { r: any; key?: any }) => {
    const isFav = user?.favorites?.includes(r._id);
    return (
      <Link to={`/restaurant/${r._id}`} className="food-card" style={{ display: 'block', color: 'inherit' }}>
        <div className="food-img-container">
          <span className="rating-badge"><i className="fa-solid fa-star"></i> {r.rating}</span>
          <button onClick={e => toggleFavorite(e, r._id)} style={{ position: 'absolute', top: 12, left: 12, background: 'white', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10 }}>
            <i className={isFav ? 'fa-solid fa-heart' : 'fa-regular fa-heart'} style={{ color: isFav ? '#ef4444' : 'var(--text-light)' }}></i>
          </button>
          <img src={r.image} alt={r.name} />
        </div>
        <div className="food-info" style={{ marginBottom: 4 }}><div className="food-title">{r.name}</div></div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
          <i className="fa-solid fa-location-dot"></i> {r.location} • {r.distance}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' as const }}>
          {r.categories?.map((c: string) => <span key={c} style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}><i className="fa-solid fa-utensils" style={{ fontSize: '0.7rem', marginRight: 4 }}></i>{c}</span>)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {r.tags?.map((t: string) => <span key={t} style={{ fontSize: '0.75rem', background: '#F0EBE6', padding: '4px 10px', borderRadius: 12, fontWeight: 600, color: 'var(--primary-color)' }}>{t}</span>)}
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)' }}>{r.deliveryTime}</span>
        </div>
      </Link>
    );
  };

  const FoodCard = ({ item }: { item: any; key?: any }) => (
    <Link to={`/restaurant/${item.restaurantId?._id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', borderRadius: 16, padding: 14, textDecoration: 'none', color: 'inherit', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', transition: 'transform 0.2s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
      <img src={item.image} alt={item.name} style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 3 }}>{item.name}</div>
        <div style={{ fontSize: '0.78rem', color: '#999', marginBottom: 5 }}>{item.restaurantId?.name}</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>${item.price?.toFixed(2)}</span>
          {item.calories && <span style={{ fontSize: '0.75rem', color: '#bbb' }}>{item.calories} cal</span>}
        </div>
      </div>
      <i className="fa-solid fa-chevron-right" style={{ color: '#ddd' }}></i>
    </Link>
  );

  return (
    <>
      {/* Surprise Me Popup */}
      {surpriseVisible && surpriseItem && (
        <div onClick={closeSurprise} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 24, maxWidth: 400, width: '100%', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', animation: 'slideUp 0.3s ease' }}>
            <div style={{ position: 'relative' }}>
              <img src={surpriseItem.image} alt={surpriseItem.name} style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)' }}></div>
              <div style={{ position: 'absolute', top: 14, right: 14, background: 'white', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} onClick={closeSurprise}>
                <i className="fa-solid fa-xmark" style={{ color: '#666' }}></i>
              </div>
              <div style={{ position: 'absolute', top: 14, left: 14, background: 'var(--primary-color)', color: 'white', borderRadius: 20, padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
                <i className="fa-solid fa-gift" style={{ marginRight: 5 }}></i>SURPRISE
              </div>
              <div style={{ position: 'absolute', bottom: 14, left: 16 }}>
                <div style={{ color: 'white', fontSize: '1.3rem', fontWeight: 800 }}>{surpriseItem.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.82rem' }}>{surpriseItem.restaurantId?.name}</div>
              </div>
            </div>
            <div style={{ padding: '20px 20px 24px' }}>
              <p style={{ color: '#666', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: 16 }}>{surpriseItem.description}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-color)' }}>${surpriseItem.price?.toFixed(2)}</span>
                {surpriseItem.calories && <span style={{ fontSize: '0.8rem', color: '#aaa', background: '#f5f5f5', padding: '4px 10px', borderRadius: 10 }}>{surpriseItem.calories} cal</span>}
              </div>
              {surpriseItem.funFact && (
                <div style={{ background: '#FFF8F3', border: '1px solid #FFE0CC', borderRadius: 12, padding: '10px 14px', marginBottom: 18, fontSize: '0.82rem', color: '#888', lineHeight: 1.5 }}>
                  <i className="fa-solid fa-lightbulb" style={{ color: 'var(--primary-color)', marginRight: 6 }}></i>{surpriseItem.funFact}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={closeSurprise} style={{ flex: 1, padding: '12px', borderRadius: 12, border: '2px solid #eee', background: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Maybe Later</button>
                <Link to={`/restaurant/${surpriseItem.restaurantId?._id}`} onClick={closeSurprise} style={{ flex: 2, padding: '12px', borderRadius: 12, background: 'var(--primary-color)', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <i className="fa-solid fa-arrow-right"></i> Order Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>

      <div className="container"><Navbar /></div>

      <section className="hero">
        <div className="video-container">
          <video autoPlay loop muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, borderRadius: 'inherit' }}>
            <source src="https://cdn.pixabay.com/video/2020/05/24/40090-424703565_large.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay-actions" style={{ zIndex: 10, bottom: 40 }}>
            <button onClick={handleSurpriseMe} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem', padding: '14px 28px' }}>
              <i className="fa-solid fa-gift"></i> Surprise Me!
            </button>
          </div>
        </div>
      </section>

      <section id="restaurants" className="foods-section container">
        <div className="section-header">
          <div><div className="sub-title">CURATED SELECTION</div><h2>Explore Local Flavors</h2></div>
        </div>

        {/* Search */}
        <div style={{ marginBottom: 24, maxWidth: 560 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 16, color: 'var(--text-light)', pointerEvents: 'none' }}></i>
            <input type="text" value={searchQuery} onChange={handleSearchChange}
              placeholder="Search restaurants or foods..."
              style={{ width: '100%', padding: '14px 48px 14px 44px', borderRadius: 14, border: '2px solid var(--border-color)', fontSize: '0.95rem', outline: 'none', background: 'white', boxSizing: 'border-box' as const }}
              onFocus={e => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-color)'} />
            {searching && <i className="fa-solid fa-spinner fa-spin" style={{ position: 'absolute', right: 16, color: 'var(--primary-color)' }}></i>}
            {searchQuery && !searching && <button onClick={clearSearch} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-light)', fontSize: '1rem' }}><i className="fa-solid fa-xmark"></i></button>}
          </div>
        </div>

        {/* Category filters — only show when not searching */}
        {!isSearching && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' as const }}>
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setSelectedCategory(cat)} style={{ padding: '8px 18px', borderRadius: 20, border: '2px solid', borderColor: selectedCategory === cat ? 'var(--primary-color)' : 'var(--border-color)', background: selectedCategory === cat ? 'var(--primary-color)' : 'white', color: selectedCategory === cat ? 'white' : 'var(--text-light)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s' }}>
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Search Results */}
        {isSearching ? (
          searching ? (
            <div style={{ textAlign: 'center', padding: 40 }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i></div>
          ) : (searchRestaurants.length === 0 && searchFoods.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <i className="fa-solid fa-magnifying-glass" style={{ fontSize: '2.5rem', color: '#ddd', marginBottom: 16 }}></i>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>No results found</p>
              <p style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>Try "pizza", "ramen", or "Italian"</p>
              <button onClick={clearSearch} className="btn btn-primary" style={{ marginTop: 20 }}>Show all</button>
            </div>
          ) : (
            <div>
              {searchRestaurants.length > 0 && (
                <div style={{ marginBottom: 36 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.08em', marginBottom: 16, textTransform: 'uppercase' as const }}>
                    Restaurants ({searchRestaurants.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                    {searchRestaurants.map(r => <RestaurantCard key={r._id} r={r} />)}
                  </div>
                </div>
              )}
              {searchFoods.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-light)', letterSpacing: '0.08em', marginBottom: 16, textTransform: 'uppercase' as const }}>
                    Foods ({searchFoods.length})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                    {searchFoods.map(item => <FoodCard key={item._id} item={item} />)}
                  </div>
                </div>
              )}
            </div>
          )
        ) : loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i></div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'red' }}><p>{error}</p></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 30 }}>
            {filteredRestaurants.map(r => <RestaurantCard key={r._id} r={r} />)}
          </div>
        )}
      </section>

      <section id="contact" className="contact-section">
        <div className="container contact-container">
          <div className="contact-info">
            <h2 className="contact-title">Let's Connect</h2>
            <p>Have a question or interested in partnering with Feasto? Reach out and our team will assist you.</p>
            <div className="contact-methods">
              <div className="contact-method"><div className="contact-icon"><i className="fa-solid fa-envelope"></i></div><div><p>Email Us</p><p>feastofood@gmail.com</p></div></div>
              <div className="contact-method"><div className="contact-icon"><i className="fa-solid fa-phone"></i></div><div><p>Call Us</p><p>9768380606</p></div></div>
            </div>
          </div>
          <div className="form-card contact-form">
            <form id="contactForm" onSubmit={handleContactSubmit}>
              <div className="form-group-row" style={{ marginBottom: 0 }}>
                <div className="form-group"><label>FULL NAME</label><div className="input-wrapper" style={{ padding: 0 }}><input type="text" placeholder="John Doe" style={{ paddingLeft: 16 }} required /></div></div>
                <div className="form-group"><label>EMAIL ADDRESS</label><div className="input-wrapper" style={{ padding: 0 }}><input type="email" placeholder="john@example.com" style={{ paddingLeft: 16 }} required /></div></div>
              </div>
              <div className="form-group"><label>YOUR MESSAGE</label><div className="input-wrapper" style={{ padding: 0 }}><textarea placeholder="How can we help you?" required></textarea></div></div>
              <button type="submit" id="contactSubmitBtn" className="btn btn-primary" style={{ width: '100%' }}>Send Message</button>
            </form>
          </div>
        </div>
      </section>
      <footer>&nbsp;&copy; 2024 Feasto. All rights reserved.</footer>
    </>
  );
}
