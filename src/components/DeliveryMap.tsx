import React, { useEffect, useRef, useState } from 'react';

interface Props {
  restaurantName: string;
}

export default function DeliveryMap({ restaurantName }: Props) {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [step, setStep] = useState(0);

  // Kathmandu area coordinates - restaurant and delivery points
  const restaurantPos: [number, number] = [27.7172, 85.3240];
  const customerPos: [number, number] = [27.7200, 85.3300];

  // Waypoints for the delivery person to follow
  const waypoints: [number, number][] = [
    [27.7172, 85.3240],
    [27.7178, 85.3255],
    [27.7183, 85.3265],
    [27.7189, 85.3275],
    [27.7194, 85.3285],
    [27.7200, 85.3300],
  ];

  useEffect(() => {
    if (mapInstanceRef.current) return;
    import('leaflet').then(L => {
      // Fix default icon
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([27.7186, 85.3270], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      mapInstanceRef.current = map;

      // Restaurant marker
      const restIcon = L.divIcon({ html: '<div style="font-size:24px">🏪</div>', className: '', iconAnchor: [12, 12] });
      L.marker(restaurantPos, { icon: restIcon }).addTo(map).bindPopup(restaurantName);

      // Customer marker
      const homeIcon = L.divIcon({ html: '<div style="font-size:24px">🏠</div>', className: '', iconAnchor: [12, 12] });
      L.marker(customerPos, { icon: homeIcon }).addTo(map).bindPopup('Your location');

      // Route line
      L.polyline(waypoints, { color: '#F88435', weight: 3, dashArray: '8,8' }).addTo(map);

      // Delivery person marker
      const bikeIcon = L.divIcon({ html: '<div style="font-size:28px">🛵</div>', className: '', iconAnchor: [14, 14] });
      markerRef.current = L.marker(waypoints[0], { icon: bikeIcon }).addTo(map);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Animate delivery person along route
  useEffect(() => {
    const interval = setInterval(() => {
      setStep(prev => {
        const next = prev + 1;
        if (next >= waypoints.length) { clearInterval(interval); return prev; }
        if (markerRef.current) markerRef.current.setLatLng(waypoints[next]);
        return next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const progress = Math.round((step / (waypoints.length - 1)) * 100);

  return (
    <div style={{ marginTop: 12, borderRadius: 14, overflow: 'hidden', border: '2px solid #FFE0CC' }}>
      <div style={{ background: '#FFF8F3', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#F88435' }}>🛵 Live Tracking</span>
        <span style={{ fontSize: '0.78rem', color: '#888' }}>{progress >= 100 ? 'Arriving!' : 'On the way...'}</span>
      </div>
      <div ref={mapRef} style={{ height: 220, width: '100%' }}></div>
      <div style={{ background: '#FFF8F3', padding: '8px 14px' }}>
        <div style={{ height: 6, background: '#FFE0CC', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: progress + '%', background: 'linear-gradient(90deg,#F88435,#FF6B35)', borderRadius: 10, transition: 'width 0.5s ease' }}></div>
        </div>
      </div>
    </div>
  );
}