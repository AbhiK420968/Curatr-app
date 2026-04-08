// Leaflet map HTML generator — uses OSRM for real road routing between POIs

export interface MapActivity {
    title: string;
    lat: number;
    lng: number;
    time?: string;
    index: number;
}

/**
 * Generate self-contained HTML for the Leaflet map.
 * Uses OSRM's free public routing API to draw actual road routes between POIs.
 */
export function generateMapHtml(
    activities: MapActivity[],
    accentColor: string = '#20856d',
    dayLabel?: string
): string {
    if (activities.length === 0) {
        return `<!DOCTYPE html><html>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;
font-family:system-ui;background:#f8f9fa;flex-direction:column;gap:8px;">
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
  <p style="color:#9CA3AF;font-size:14px;margin:0">No locations for this day</p>
</body></html>`;
    }

    const centerLat = activities.reduce((s, a) => s + a.lat, 0) / activities.length;
    const centerLng = activities.reduce((s, a) => s + a.lng, 0) / activities.length;
    const activitiesJson = JSON.stringify(activities);
    const dayLabelHtml = dayLabel ? `<div class="day-label">${dayLabel}</div>` : '';

    return `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
        .num-icon { background: transparent !important; border: none !important; }
        .leaflet-popup-content-wrapper {
            border-radius: 14px;
            font-family: system-ui, -apple-system, sans-serif;
            box-shadow: 0 4px 20px rgba(0,0,0,0.18);
            border: none;
        }
        .leaflet-popup-content { margin: 10px 14px; font-size: 13px; line-height: 1.5; }
        .leaflet-popup-tip { display: none; }
        .day-label {
            position: absolute; top: 10px; left: 10px;
            background: ${accentColor}; color: #fff;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 12px; font-weight: 700;
            padding: 5px 12px; border-radius: 20px;
            z-index: 1000; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            pointer-events: none;
        }
        .route-loading {
            position: absolute; bottom: 12px; right: 12px;
            background: rgba(255,255,255,0.92); border-radius: 10px;
            padding: 6px 12px; font-size: 11px; color: #666;
            font-family: system-ui; z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        @keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.3); } }
        .marker-highlight { animation: pulse 0.5s ease-in-out 2; }
    </style>
</head>
<body>
    <div id="map"></div>
    ${dayLabelHtml}
    <div class="route-loading" id="routeStatus">Plotting road route…</div>
    <script>
        var map = L.map('map', {
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: false,
        }).setView([${centerLat}, ${centerLng}], 13);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        var activities = ${activitiesJson};
        var accentColor = '${accentColor}';
        var markers = [];

        // ── Create numbered markers ────────────────────────────────
        activities.forEach(function(a, i) {
            var el = document.createElement('div');
            el.style.cssText = [
                'background:' + accentColor,
                'color:#fff', 'width:30px', 'height:30px',
                'border-radius:50%', 'display:flex', 'align-items:center',
                'justify-content:center', 'font-weight:700', 'font-size:13px',
                'border:2.5px solid #fff',
                'box-shadow:0 2px 10px rgba(0,0,0,0.3)',
                'cursor:pointer', 'transition:transform 0.2s,box-shadow 0.2s',
            ].join(';');
            el.textContent = String(i + 1);

            var icon = L.divIcon({
                className: 'num-icon',
                html: el.outerHTML,
                iconSize: [30, 30],
                iconAnchor: [15, 15],
                popupAnchor: [0, -18],
            });

            var timeStr = a.time
                ? '<span style="color:#888;font-size:11px;">' + a.time + '</span><br>' : '';
            var popup = L.popup({ closeButton: false, offset: [0, -10] })
                .setContent('<div style="font-weight:700;margin-bottom:3px;">' + (i + 1) + '. ' + a.title + '</div>' + timeStr);

            var marker = L.marker([a.lat, a.lng], { icon: icon })
                .addTo(map).bindPopup(popup);
            markers.push(marker);

            // Staggered fade-in
            setTimeout(function(m) {
                var iconEl = m.getElement && m.getElement();
                if (iconEl) {
                    var inner = iconEl.querySelector('div');
                    if (inner) { inner.style.opacity = '0'; inner.style.transition = 'opacity 0.4s'; setTimeout(function() { inner && (inner.style.opacity = '1'); }, 50); }
                }
            }.bind(null, marker), i * 120 + 200);
        });

        // Fit map to markers first
        if (activities.length > 1) {
            var bounds = activities.map(function(a) { return [a.lat, a.lng]; });
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        } else {
            map.setView([activities[0].lat, activities[0].lng], 14);
            setTimeout(function() { if (markers[0]) markers[0].openPopup(); }, 500);
        }

        // ── Road routing via OSRM ──────────────────────────────────
        ${activities.length > 1 ? `
        var routeLayer = null;

        function fetchOsrmRoute() {
            // OSRM routing — format: lon,lat;lon,lat;…
            var coords = activities.map(function(a) { return a.lng + ',' + a.lat; }).join(';');
            var url = 'https://router.project-osrm.org/route/v1/driving/' + coords
                + '?overview=full&geometries=geojson&steps=false';

            fetch(url)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.code !== 'Ok' || !data.routes || !data.routes[0]) {
                        throw new Error('OSRM failed');
                    }
                    var geom = data.routes[0].geometry;
                    routeLayer = L.geoJSON(geom, {
                        style: {
                            color: accentColor,
                            weight: 4,
                            opacity: 0.85,
                            lineJoin: 'round',
                            lineCap: 'round',
                        }
                    }).addTo(map);

                    // Hide loading status
                    var el = document.getElementById('routeStatus');
                    if (el) el.style.display = 'none';

                    // Open first marker popup
                    setTimeout(function() { if (markers[0]) markers[0].openPopup(); }, 300);
                })
                .catch(function() {
                    // Fallback: straight-line dashed polyline
                    var coords2 = activities.map(function(a) { return [a.lat, a.lng]; });
                    routeLayer = L.polyline(coords2, {
                        color: accentColor, weight: 3, opacity: 0.7, dashArray: '6, 8',
                    }).addTo(map);
                    var el = document.getElementById('routeStatus');
                    if (el) el.textContent = 'Road data unavailable — showing direct path';
                    setTimeout(function() {
                        if (el) el.style.display = 'none';
                        if (markers[0]) markers[0].openPopup();
                    }, 2000);
                });
        }

        // Small delay to let map tiles settle
        setTimeout(fetchOsrmRoute, 600);
        ` : `
        var el = document.getElementById('routeStatus');
        if (el) el.style.display = 'none';
        `}

        // ── Highlight markers via postMessage ─────────────────────
        function handleMsg(e) {
            try {
                var msg = JSON.parse(e.data);
                if (msg.type === 'HIGHLIGHT_MARKER' && typeof msg.index === 'number') {
                    var idx = msg.index;
                    if (markers[idx]) {
                        map.panTo(markers[idx].getLatLng(), { animate: true, duration: 0.5 });
                        markers[idx].openPopup();
                        var iconEl = markers[idx].getElement && markers[idx].getElement();
                        if (iconEl) {
                            var inner = iconEl.querySelector('div');
                            if (inner) {
                                inner.classList.add('marker-highlight');
                                setTimeout(function() { inner && inner.classList.remove('marker-highlight'); }, 1200);
                            }
                        }
                    }
                }
            } catch(e) {}
        }
        document.addEventListener('message', handleMsg);
        window.addEventListener('message', handleMsg);
    </script>
</body>
</html>`;
}
