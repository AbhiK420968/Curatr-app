import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    ActivityIndicator, Dimensions, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { WebView } from 'react-native-webview';
import { Colors, FontFamily, FontSize, Spacing, BorderRadius, Shadows } from '@/constants';
import { Search, MapPin, Users, CalendarDays, ChevronUp, ChevronDown, X } from 'lucide-react-native';

const MAPS_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';
const GEO_KEY = process.env.EXPO_PUBLIC_GEOAPIFY_KEY ?? '';

// ── Mock Data ─────────────────────────────────────────────────────────────
interface ExploreUser {
    id: string;
    name: string;
    avatar: string;
    city: string;
    lat: number;
    lng: number;
    destination?: string;
    status: 'here' | 'planning';
}

interface ExploreEvent {
    id: string;
    title: string;
    city: string;
    lat: number;
    lng: number;
    date: string;
    category: 'festival' | 'meetup' | 'concert' | 'exhibition';
    emoji: string;
}

const MOCK_USERS: ExploreUser[] = [
    { id: '1', name: 'Aarav Sharma', avatar: 'https://i.pravatar.cc/150?u=aarav', city: 'Delhi', lat: 28.6139, lng: 77.2090, destination: 'Going to Goa in June', status: 'planning' },
    { id: '2', name: 'Priya Patel', avatar: 'https://i.pravatar.cc/150?u=priya', city: 'Delhi', lat: 28.6350, lng: 77.2250, destination: 'Exploring Old Delhi', status: 'here' },
    { id: '3', name: 'Ravi Kumar', avatar: 'https://i.pravatar.cc/150?u=ravi', city: 'Mumbai', lat: 19.0760, lng: 72.8777, destination: 'Weekend in Lonavala', status: 'planning' },
    { id: '4', name: 'Ananya Gupta', avatar: 'https://i.pravatar.cc/150?u=ananya', city: 'Mumbai', lat: 19.0600, lng: 72.8600, status: 'here' },
    { id: '5', name: 'Kiran Das', avatar: 'https://i.pravatar.cc/150?u=kiran', city: 'Bangalore', lat: 12.9716, lng: 77.5946, destination: 'Heading to Coorg', status: 'planning' },
    { id: '6', name: 'Meera Iyer', avatar: 'https://i.pravatar.cc/150?u=meera', city: 'Jaipur', lat: 26.9124, lng: 75.7873, destination: 'Palace tour this week', status: 'here' },
    { id: '7', name: 'Arjun Nair', avatar: 'https://i.pravatar.cc/150?u=arjun', city: 'Goa', lat: 15.2993, lng: 74.1240, status: 'here' },
];

const MOCK_EVENTS: ExploreEvent[] = [
    { id: 'e1', title: 'Delhi Food Festival', city: 'Delhi', lat: 28.6280, lng: 77.2190, date: 'May 15–18', category: 'festival', emoji: '🍜' },
    { id: 'e2', title: 'Mumbai Music Night', city: 'Mumbai', lat: 19.0820, lng: 72.8810, date: 'May 22', category: 'concert', emoji: '🎵' },
    { id: 'e3', title: 'Jaipur Art Exhibition', city: 'Jaipur', lat: 26.9220, lng: 75.7780, date: 'Jun 1–5', category: 'exhibition', emoji: '🎨' },
    { id: 'e4', title: 'Goa Beach Meetup', city: 'Goa', lat: 15.3000, lng: 74.1300, date: 'May 30', category: 'meetup', emoji: '🏖️' },
    { id: 'e5', title: 'Bangalore Tech & Travel', city: 'Bangalore', lat: 12.9800, lng: 77.5900, date: 'Jun 10', category: 'meetup', emoji: '💻' },
];

// ── Map HTML Generator ────────────────────────────────────────────────────
function generateExploreMapHtml(
    users: ExploreUser[],
    events: ExploreEvent[],
    center: { lat: number; lng: number },
    zoom: number = 5
): string {
    if (!MAPS_KEY) {
        return `<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#1a0e09;color:#fdb19c;font-family:system-ui;"><p>Google Maps key not configured</p></body></html>`;
    }

    const usersJson = JSON.stringify(users);
    const eventsJson = JSON.stringify(events);

    return `<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        html, body { width:100%; height:100%; overflow:hidden; }
        #map { position:absolute; top:0; left:0; width:100%; height:100%; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        function initMap() {
            var users = ${usersJson};
            var events = ${eventsJson};
            var center = { lat: ${center.lat}, lng: ${center.lng} };

            var map = new google.maps.Map(document.getElementById('map'), {
                zoom: ${zoom},
                center: center,
                disableDefaultUI: true,
                gestureHandling: 'greedy',
                styles: [
                    { elementType: 'geometry', stylers: [{ color: '#1d1d1d' }] },
                    { elementType: 'labels.text.stroke', stylers: [{ color: '#1d1d1d' }] },
                    { elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
                    { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#333333' }] },
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c2c2c' }] },
                    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e0e' }] },
                    { featureType: 'water', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                ]
            });

            // User markers
            users.forEach(function(u) {
                var marker = new google.maps.Marker({
                    position: { lat: u.lat, lng: u.lng },
                    map: map,
                    icon: {
                        url: u.avatar,
                        scaledSize: new google.maps.Size(36, 36),
                        anchor: new google.maps.Point(18, 18),
                    },
                    title: u.name,
                });
                var infoContent = '<div style="font-family:system-ui;min-width:140px;padding:4px;">' +
                    '<div style="font-weight:700;font-size:13px;color:#333;">' + u.name + '</div>' +
                    (u.destination ? '<div style="font-size:11px;color:#666;margin-top:3px;">✈️ ' + u.destination + '</div>' : '') +
                    '<div style="font-size:10px;color:#999;margin-top:2px;">📍 ' + u.city + '</div>' +
                    '</div>';
                var info = new google.maps.InfoWindow({ content: infoContent });
                marker.addListener('click', function() { info.open(map, marker); });
            });

            // Event markers
            events.forEach(function(e) {
                var marker = new google.maps.Marker({
                    position: { lat: e.lat, lng: e.lng },
                    map: map,
                    label: { text: e.emoji, fontSize: '18px' },
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 18,
                        fillColor: '#fdb19c',
                        fillOpacity: 0.9,
                        strokeColor: '#a4351c',
                        strokeWeight: 2,
                    },
                    title: e.title,
                });
                var infoContent = '<div style="font-family:system-ui;min-width:140px;padding:4px;">' +
                    '<div style="font-weight:700;font-size:13px;color:#333;">' + e.emoji + ' ' + e.title + '</div>' +
                    '<div style="font-size:11px;color:#666;margin-top:3px;">📅 ' + e.date + '</div>' +
                    '<div style="font-size:10px;color:#999;margin-top:2px;">📍 ' + e.city + '</div>' +
                    '</div>';
                var info = new google.maps.InfoWindow({ content: infoContent });
                marker.addListener('click', function() { info.open(map, marker); });
            });

            // Listen for recenter messages from RN
            window.addEventListener('message', function(event) {
                try {
                    var msg = JSON.parse(event.data);
                    if (msg.type === 'recenter') {
                        map.setCenter({ lat: msg.lat, lng: msg.lng });
                        map.setZoom(msg.zoom || 12);
                    }
                } catch(e) {}
            });
        }
    </script>
    <script src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap" async defer></script>
</body>
</html>`;
}

// ── Explore Screen ────────────────────────────────────────────────────────
export default function ExploreScreen() {
    const webViewRef = useRef<WebView>(null);
    const [searchText, setSearchText] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCity, setSelectedCity] = useState('');
    const [sheetExpanded, setSheetExpanded] = useState(false);

    const [center, setCenter] = useState({ lat: 22.5, lng: 78.9 }); // India center
    const [zoom, setZoom] = useState(5);
    const [filteredUsers, setFilteredUsers] = useState(MOCK_USERS);
    const [filteredEvents, setFilteredEvents] = useState(MOCK_EVENTS);

    // Geoapify autocomplete
    useEffect(() => {
        if (!searchText || searchText.length < 3) { setSuggestions([]); return; }
        const timeout = setTimeout(async () => {
            setIsSearching(true);
            try {
                if (!GEO_KEY) return;
                const res = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(searchText)}&type=city&limit=5&apiKey=${GEO_KEY}`);
                const data = await res.json();
                if (data.features) setSuggestions(data.features);
            } catch { /* ignore */ } finally { setIsSearching(false); }
        }, 400);
        return () => clearTimeout(timeout);
    }, [searchText]);

    const handleSelectCity = (feat: any) => {
        const cityName = feat.properties.city || feat.properties.name || feat.properties.formatted;
        const lat = feat.properties.lat;
        const lng = feat.properties.lon;
        setSelectedCity(cityName);
        setSearchText(cityName);
        setSuggestions([]);
        setCenter({ lat, lng });
        setZoom(12);

        // Filter data by selected city
        const cityLower = cityName.toLowerCase();
        setFilteredUsers(MOCK_USERS.filter(u => u.city.toLowerCase().includes(cityLower)));
        setFilteredEvents(MOCK_EVENTS.filter(e => e.city.toLowerCase().includes(cityLower)));

        // Tell WebView to recenter
        webViewRef.current?.postMessage(JSON.stringify({ type: 'recenter', lat, lng, zoom: 12 }));
        setSheetExpanded(true);
    };

    const clearSearch = () => {
        setSearchText('');
        setSelectedCity('');
        setSuggestions([]);
        setFilteredUsers(MOCK_USERS);
        setFilteredEvents(MOCK_EVENTS);
        setCenter({ lat: 22.5, lng: 78.9 });
        setZoom(5);
        webViewRef.current?.postMessage(JSON.stringify({ type: 'recenter', lat: 22.5, lng: 78.9, zoom: 5 }));
    };

    const mapHtml = generateExploreMapHtml(filteredUsers, filteredEvents, center, zoom);

    return (
        <View style={styles.container}>
            {/* Full-screen Map */}
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.webview}
                javaScriptEnabled
                domStorageEnabled
                scrollEnabled={false}
                overScrollMode="never"
            />

            {/* Search Bar (floating) */}
            <SafeAreaView style={styles.searchSafe} edges={['top']} pointerEvents="box-none">
                <View style={styles.searchWrapper}>
                    <View style={styles.searchBar}>
                        <Search size={18} color="rgba(255,255,255,0.6)" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search cities..."
                            placeholderTextColor="rgba(255,255,255,0.4)"
                            value={searchText}
                            onChangeText={(val) => { setSearchText(val); setSelectedCity(''); }}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={clearSearch}>
                                <X size={18} color="rgba(255,255,255,0.6)" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {suggestions.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            {suggestions.map((feat, idx) => (
                                <TouchableOpacity key={idx} style={styles.suggestionItem} onPress={() => handleSelectCity(feat)}>
                                    <MapPin size={14} color="#fdb19c" />
                                    <Text style={styles.suggestionText} numberOfLines={1}>{feat.properties.formatted}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </SafeAreaView>

            {/* Bottom Sheet */}
            <View style={[styles.bottomSheet, sheetExpanded && styles.bottomSheetExpanded]}>
                <TouchableOpacity style={styles.sheetHandle} onPress={() => setSheetExpanded(!sheetExpanded)}>
                    <View style={styles.handleBar} />
                    <Text style={styles.sheetTitle}>
                        {selectedCity ? `${selectedCity}` : 'Discover People & Events'}
                    </Text>
                    {sheetExpanded ? <ChevronDown size={20} color="rgba(255,255,255,0.6)" /> : <ChevronUp size={20} color="rgba(255,255,255,0.6)" />}
                </TouchableOpacity>

                {sheetExpanded && (
                    <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                        {/* People Section */}
                        <View style={styles.sheetSection}>
                            <View style={styles.sectionHeader}>
                                <Users size={16} color="#fdb19c" />
                                <Text style={styles.sectionTitle}>People Here ({filteredUsers.length})</Text>
                            </View>
                            {filteredUsers.length === 0 && (
                                <Text style={styles.emptyText}>No friends in this city yet</Text>
                            )}
                            {filteredUsers.map(u => (
                                <View key={u.id} style={styles.personCard}>
                                    <View style={styles.avatarContainer}>
                                        <View style={[styles.statusDot, u.status === 'here' ? styles.statusHere : styles.statusPlanning]} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.personName}>{u.name}</Text>
                                        {u.destination ? (
                                            <Text style={styles.personDest}>✈️ {u.destination}</Text>
                                        ) : (
                                            <Text style={styles.personDest}>📍 {u.city}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Events Section */}
                        <View style={styles.sheetSection}>
                            <View style={styles.sectionHeader}>
                                <CalendarDays size={16} color="#fdb19c" />
                                <Text style={styles.sectionTitle}>Events ({filteredEvents.length})</Text>
                            </View>
                            {filteredEvents.length === 0 && (
                                <Text style={styles.emptyText}>No events in this city</Text>
                            )}
                            {filteredEvents.map(e => (
                                <View key={e.id} style={styles.eventCard}>
                                    <Text style={styles.eventEmoji}>{e.emoji}</Text>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.eventTitle}>{e.title}</Text>
                                        <Text style={styles.eventMeta}>📅 {e.date} · 📍 {e.city}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        </View>
    );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a0e09' },
    webview: { flex: 1 },

    // Search
    searchSafe: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    searchWrapper: { paddingHorizontal: Spacing.lg, paddingTop: Platform.OS === 'ios' ? 8 : Spacing.md },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(40,20,12,0.85)', borderRadius: 28, height: 52,
        paddingHorizontal: 18, borderWidth: 1, borderColor: 'rgba(253,177,156,0.2)',
    },
    searchInput: {
        flex: 1, fontFamily: FontFamily.medium, fontSize: FontSize.base,
        color: '#ffffff', height: '100%',
    },
    suggestionsContainer: {
        marginTop: 6, backgroundColor: 'rgba(40,20,12,0.95)', borderRadius: 16,
        padding: 8, borderWidth: 1, borderColor: 'rgba(253,177,156,0.15)',
    },
    suggestionItem: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 10, paddingHorizontal: 8,
    },
    suggestionText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: '#ffffff', flex: 1 },

    // Bottom Sheet
    bottomSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(40,20,12,0.92)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        borderTopWidth: 1, borderTopColor: 'rgba(253,177,156,0.15)',
        maxHeight: SCREEN_HEIGHT * 0.15,
    },
    bottomSheetExpanded: { maxHeight: SCREEN_HEIGHT * 0.55 },
    sheetHandle: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg, paddingVertical: 14,
    },
    handleBar: {
        position: 'absolute', top: 8, left: '50%', marginLeft: -20,
        width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)',
    },
    sheetTitle: {
        fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: '#ffffff', flex: 1,
    },
    sheetScroll: { paddingHorizontal: Spacing.lg },

    // Sections
    sheetSection: { marginBottom: Spacing.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
    sectionTitle: {
        fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: '#fdb19c',
        textTransform: 'uppercase', letterSpacing: 0.5,
    },
    emptyText: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.4)', paddingVertical: 8 },

    // Person card
    personCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    avatarContainer: { position: 'relative' },
    statusDot: {
        width: 10, height: 10, borderRadius: 5,
        borderWidth: 2, borderColor: 'rgba(40,20,12,0.92)',
    },
    statusHere: { backgroundColor: '#22C55E' },
    statusPlanning: { backgroundColor: '#fdb19c' },
    personName: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: '#ffffff' },
    personDest: { fontFamily: FontFamily.regular, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

    // Event card
    eventCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    eventEmoji: { fontSize: 28 },
    eventTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: '#ffffff' },
    eventMeta: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },
});
