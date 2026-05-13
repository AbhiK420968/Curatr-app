/**
 * Google Maps JS API-based map HTML generator.
 *
 * Uses the Google Maps JS SDK to render a highly customizable map.
 * This allows us to hide all default POIs and details so ONLY the itinerary pins are visible!
 */

export interface MapActivity {
    title: string;
    lat: number;
    lng: number;
    time?: string;
    index: number;
}

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';

/**
 * Generate self-contained HTML that embeds a Google Maps JS instance.
 * Hides all extraneous map details (POIs, transit stops) and draws the route + legend.
 */
export function generateMapHtml(
    activities: MapActivity[],
    accentColor: string = '#135bec',
    dayLabel?: string
): string {
    if (activities.length === 0) {
        return `<!DOCTYPE html><html>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;
font-family:system-ui;background:#f4fafd;flex-direction:column;gap:8px;">
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
  <p style="color:#9CA3AF;font-size:14px;margin:0">No locations for this day</p>
</body></html>`;
    }

    // Numbered legend chips for each activity
    const legendHtml = activities.map((a, i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 4px;font-family:system-ui;">
            <div style="min-width:24px;height:24px;border-radius:50%;background:${accentColor};
                color:#fff;display:flex;align-items:center;justify-content:center;
                font-size:11px;font-weight:700;flex-shrink:0;">${i + 1}</div>
            <div>
                <div style="font-size:12px;font-weight:600;color:#1a1a2e;line-height:1.3;">${a.title}</div>
                ${a.time ? `<div style="font-size:10px;color:#888;">${a.time}</div>` : ''}
            </div>
        </div>`
    ).join('<div style="height:1px;background:#f0f0f0;margin:0 4px;"></div>');

    // If no key, show a friendly fallback
    if (!MAPS_KEY) {
        const centerLat = activities.reduce((s, a) => s + a.lat, 0) / activities.length;
        const centerLng = activities.reduce((s, a) => s + a.lng, 0) / activities.length;
        return `<!DOCTYPE html><html>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;
background:#f4fafd;font-family:system-ui;flex-direction:column;gap:8px;">
    <p style="color:#666;font-size:13px;">Google Maps key not configured</p>
    <p style="color:#aaa;font-size:11px;">Center: ${centerLat.toFixed(4)}, ${centerLng.toFixed(4)}</p>
</body></html>`;
    }

    const dayLabelHtml = dayLabel
        ? `<div style="position:absolute;top:12px;left:12px;background:${accentColor};color:#fff;
           font-family:system-ui;font-size:12px;font-weight:700;padding:5px 14px;
           border-radius:20px;z-index:10;box-shadow:0 2px 8px rgba(0,0,0,0.22);pointer-events:none;">${dayLabel}</div>`
        : '';

    // Convert activities to a JSON string safe for injection
    const activitiesJson = JSON.stringify(activities);

    // The map style array hides POIs and limits road labels for a clean look
    return `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; background:#f4fafd; }
        #map {
            position:absolute; top:0; left:0;
            width:100%; height:100%;
        }
        #legend {
            position:absolute; bottom:0; left:0; right:0;
            background:rgba(255,255,255,0.96);
            padding:8px 12px;
            max-height:160px;
            overflow-y:auto;
            box-shadow:0 -2px 20px rgba(0,0,0,0.10);
        }
    </style>
</head>
<body>
    <div id="map"></div>
    ${dayLabelHtml}
    <div id="legend">${legendHtml}</div>
    <script>
        function initMap() {
            var activities = ${activitiesJson};
            if (activities.length === 0) return;

            var startLatLng = { lat: activities[0].lat, lng: activities[0].lng };

            // Create map and hide ALL POIs / transit to keep only our itinerary visible
            var map = new google.maps.Map(document.getElementById('map'), {
                zoom: 14,
                center: startLatLng,
                disableDefaultUI: true, // Hide all controls
                gestureHandling: 'cooperative',
                styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] },
                    { featureType: "transit", stylers: [{ visibility: "off" }] },
                    { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] }
                ]
            });

            // Create custom numbered markers
            var bounds = new google.maps.LatLngBounds();
            activities.forEach(function(act, index) {
                var position = { lat: act.lat, lng: act.lng };
                bounds.extend(position);
                
                // Use a marker icon matching the accent color
                new google.maps.Marker({
                    position: position,
                    map: map,
                    label: { text: String(index + 1), color: "white", fontWeight: "bold" },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 12,
                        fillColor: "${accentColor}",
                        fillOpacity: 1,
                        strokeColor: "white",
                        strokeWeight: 2
                    }
                });
            });

            // If only 1 activity, just center. If more, fit bounds and draw route.
            if (activities.length > 1) {
                map.fitBounds(bounds);
                
                // Draw walking directions
                var ds = new google.maps.DirectionsService();
                var dr = new google.maps.DirectionsRenderer({
                    map: map,
                    suppressMarkers: true,     // We draw our own custom markers
                    preserveViewport: true,    // We already fitBounds
                    polylineOptions: { strokeColor: "${accentColor}", strokeWeight: 4 }
                });

                var waypoints = activities.slice(1, -1).map(function(act) {
                    return { location: { lat: act.lat, lng: act.lng }, stopover: true };
                });

                ds.route({
                    origin: { lat: activities[0].lat, lng: activities[0].lng },
                    destination: { lat: activities[activities.length - 1].lat, lng: activities[activities.length - 1].lng },
                    waypoints: waypoints,
                    travelMode: google.maps.TravelMode.WALKING
                }, function(response, status) {
                    if (status === google.maps.DirectionsStatus.OK) {
                        dr.setDirections(response);
                    }
                });
            }
            }
        }
    </script>
    <script src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap" async defer></script>
</body>
</html>`;
}
