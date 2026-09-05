import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Copy, Navigation, Search, X, Car, Footprints, Bike, MapPin,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Compass, Play, Square, ArrowRight,
  CornerUpLeft, CornerUpRight, MoveUp, Check, ArrowUpDown,
  Bookmark, Share2, Sparkles, Clock, Volume2, RotateCcw, Bus, Star, Info, MoreVertical, Phone, HelpCircle, Trash2,
  Sliders, Map as MapIcon, Plus, Utensils, Fuel, Coffee, ShoppingCart, Users, Grid
} from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import api from '../../services/api';
import MapDetailsPanel from './MapDetailsPanel';
import { escapeHtml } from '../../utils/escapeHtml';

// TomTom API Key for real-time traffic flow and incident layers
const TOMTOM_API_KEY = import.meta.env.VITE_TOMTOM_API_KEY || 'yD5XM0QjP9bAjEemIJgJsUTm1qE94bjW';

// ─── Distance helper (Haversine formula) ─────────────────────────────────────

const getDistanceKm = (pos1, pos2) => {
  if (!pos1 || !pos2) return null;
  const R = 6371;
  const dLat = (pos2[0] - pos1[0]) * Math.PI / 180;
  const dLon = (pos2[1] - pos1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(pos1[0] * Math.PI / 180) * Math.cos(pos2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDistance = (km) => {
  if (km === null || km === undefined) return null;
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

// ─── Rich Mock Location Data (For Search Disambiguation) ────────────────────

const RICH_PLACES = [
  {
    id: 'victoria-memorial',
    name: 'Victoria Memorial Hall',
    alternateName: 'ভিক্টোরিয়া মেমোরিয়াল হল',
    category: 'Museum & Historical Landmark',
    rating: 4.8,
    reviewsCount: 12450,
    position: [22.5448, 88.3426],
    address: '1, Queens Way, Maidan, Kolkata, West Bengal 700071',
    description: 'A magnificent white marble palace built in memory of Queen Victoria, now representing an iconic museum and garden space.',
    statusText: 'Open · Closes 6:00 PM',
    isOpen: true,
    hours: '10:00 AM - 6:00 PM',
    phone: '+91 33 2223 1890',
    images: [
      'https://images.unsplash.com/photo-1598977123418-45f04b615e57?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1565359781198-d147fa06093d?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1623946025175-103328e3b7b2?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'howrah-bridge',
    name: 'Howrah Bridge',
    alternateName: 'রবীন্দ্র সেতু (Rabindra Setu)',
    category: 'Scenic Bridge / Landmark',
    rating: 4.7,
    reviewsCount: 8920,
    position: [22.5851, 88.3468],
    address: 'Hooghly River, Kolkata, West Bengal 700001',
    description: 'An architectural marvel connecting Kolkata and Howrah, carrying hundreds of thousands of commuters daily.',
    statusText: 'Open · 24 Hours',
    isOpen: true,
    hours: 'Open 24 hours',
    phone: 'N/A',
    images: [
      'https://images.unsplash.com/photo-1595180630737-efcf223ff972?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1626285861696-9f0be5a49c6e?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'indian-museum',
    name: 'Indian Museum Kolkata',
    alternateName: 'ভারতীয় সংগ্রহালয়',
    category: 'National History Museum',
    rating: 4.5,
    reviewsCount: 4560,
    position: [22.5579, 88.3512],
    address: '27, Jawaharlal Nehru Rd, Colootola, Park Street, Kolkata 700016',
    description: 'The oldest and largest multipurpose museum in the Asia-Pacific region, boasting incredible collections of artifacts.',
    statusText: 'Closed · Opens 10:00 AM',
    isOpen: false,
    hours: '10:00 AM - 5:00 PM (Closed Mondays)',
    phone: '+91 33 2286 1699',
    images: [
      'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1566121318599-52e8b2c2b3e8?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'flurys-tearoom',
    name: 'Flurys Park Street',
    alternateName: 'ফ্লুরিস টি-রুম',
    category: 'Heritage Cafe & Patisserie',
    rating: 4.4,
    reviewsCount: 5300,
    position: [22.5528, 88.3541],
    address: '18A, Park St, Park Street area, Kolkata, West Bengal 700071',
    description: 'A stylish 1920s tearoom famous for its five-star English breakfasts, rum balls, and old-school colonial charm.',
    statusText: 'Open · Closes 10:00 PM',
    isOpen: true,
    hours: '7:30 AM - 10:00 PM',
    phone: '+91 33 4000 7453',
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'peter-cat',
    name: 'Peter Cat Restaurant',
    alternateName: 'পিটার ক্যাট রেস্তোরাঁ',
    category: 'Indian & Continental Fine Dining',
    rating: 4.6,
    reviewsCount: 9800,
    position: [22.5531, 88.3538],
    address: '18A, Park St, Park Street area, Kolkata, West Bengal 700071',
    description: 'Home of the world-famous Chelo Kabab, featuring signature vintage interiors and high-quality sizzlers.',
    statusText: 'Closed · Opens 12:00 PM',
    isOpen: false,
    hours: '12:00 PM - 11:00 PM',
    phone: '+91 33 2229 8830',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&auto=format&fit=crop&q=80'
    ]
  }
];

const PEOPLE = [
  { id: 1, name: 'Ayan Bera', initials: 'AB', color: '#7c3aed', status: 'active', position: [22.5726, 88.3639], address: 'WB/insulting+0/benedictions+0Y', lastSeen: '2 min ago' },
  { id: 2, name: 'Priya Sengupta', initials: 'PS', color: '#0f6e56', status: 'active', position: [22.5850, 88.3500], address: 'WB/dong+2/bards+0B', lastSeen: '7 min ago' },
  { id: 3, name: 'Rohan Das', initials: 'RD', color: '#d85a30', status: 'idle', position: [22.5600, 88.3700], address: 'WB/vno+8/saucer+0J', lastSeen: '34 min ago' },
  { id: 4, name: 'Kavya Nair', initials: 'KN', color: '#185fa5', status: 'active', position: [22.5520, 88.3480], address: 'WB/guilt+0/pent+0D', lastSeen: 'Just now' },
  { id: 5, name: 'Siddharth Roy', initials: 'SR', color: '#3b6d11', status: 'offline', position: [22.5900, 88.3750], address: 'WB/fujinami+2/patriarch+0E', lastSeen: '2 hr ago' },
];

const QUICK_CATEGORIES = [
  { label: 'Restaurants', icon: <Utensils size={14} />, query: 'Restaurant' },
  { label: 'Gas Station', icon: <Fuel size={14} />, query: 'Gas Station' },
  { label: 'Cafes', icon: <Coffee size={14} />, query: 'Cafe' },
  { label: 'Groceries', icon: <ShoppingCart size={14} />, query: 'Supermarket' },
  { label: 'Friends', icon: <Users size={14} />, filter: 'friend' },
  { label: '3x3m Grid', icon: <Grid size={14} />, filter: 'grid' },
];

const STATUS_META = {
  active: { label: 'Active', dot: '#22c55e' },
  idle: { label: 'Idle', dot: '#f59e0b' },
  offline: { label: 'Offline', dot: '#94a3b8' },
};

const STATUS_COLORS = {
  active: '#3B9E5C',  // Theme Green (Online)
  idle: '#f59e0b',    // Amber / Orange (Idle)
  offline: '#94a3b8', // Cool Grey (Offline)
};



// ─── Sub-components ───────────────────────────────────────────────────────────

const Avatar = ({ initials, color, size = 36 }) => (
  <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.35, fontWeight: 600, color: '#fff', flexShrink: 0, fontFamily: "'Outfit', sans-serif", letterSpacing: '0.03em' }}>
    {initials}
  </div>
);

const getStepIcon = (maneuverType, modifier) => {
  if (!maneuverType) return <MoveUp size={16} />;
  const type = maneuverType.toLowerCase();
  const mod = (modifier || '').toLowerCase();

  if (type.includes('turn') && mod.includes('left')) return <CornerUpLeft size={16} />;
  if (type.includes('turn') && mod.includes('right')) return <CornerUpRight size={16} />;
  if (type.includes('roundabout') || type.includes('rotary')) return <RotateCcw size={16} />;
  if (type.includes('arrive')) return <MapPin size={16} />;
  return <MoveUp size={16} />;
};

// ─── Main Map Component ─────────────────────────────────────────────────────────

export default function MapComponent({ center, markers, currentUserId }) {
  const [peopleList, setPeopleList] = useState(PEOPLE);
  const [selected, setSelected] = useState(PEOPLE[0]);
  const [mapCenter, setMapCenter] = useState(center || [22.5626, 88.3639]);
  const [mapStyle, setMapStyle] = useState('street'); // 'street' or 'satellite'
  const [currentZoom, setCurrentZoom] = useState(11);
  const [showTraffic, setShowTraffic] = useState(false);
  const [gridData, setGridData] = useState(null);
  const [clickedBoxAddress, setClickedBoxAddress] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Gamified Posts and Stamps State
  const [showPostModal, setShowPostModal] = useState(false);
  const [postCoords, setPostCoords] = useState(null);
  const [postGridAddress, setPostGridAddress] = useState('');
  const [postGridName, setPostGridName] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [postDesc, setPostDesc] = useState('');
  const [postVisibility, setPostVisibility] = useState('public');
  const [postPhotos, setPostPhotos] = useState([]); // base64 data URLs of user-uploaded images
  const [stampPosts, setStampPosts] = useState([]);
  const stampMarkersRef = useRef(new Map());

  // Helper to format grid address into a human-readable grid name: "Wensch0 Plaintiff0 . Howrah"
  const formatGridName = (addressStr, placeArea = '') => {
    if (!addressStr) return '';
    const parts = addressStr.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const words = parts.slice(1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      return placeArea ? `${words} . ${placeArea}` : words;
    }
    return placeArea || addressStr;
  };

  // Automatically encode and fetch the 3x3m grid address and grid name when post modal opens
  useEffect(() => {
    if (showPostModal) {
      const updateGridInfo = (addr, coords) => {
        setPostGridAddress(addr);
        setPostTitle(prev => prev || addr);

        const initialName = formatGridName(addr);
        setPostGridName(initialName);

        if (coords && coords.lat && coords.lng) {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`)
            .then(res => res.json())
            .then(data => {
              const loc = data.address || {};
              const city = loc.city || loc.town || loc.suburb || loc.neighbourhood || loc.village || loc.municipality || loc.city_district || loc.state_district || loc.county || '';
              if (city) {
                setPostGridName(formatGridName(addr, city));
              }
            })
            .catch(() => {
              // keep initial name on failure
            });
        }
      };

      if (clickedBoxAddress && clickedBoxAddress.address) {
        updateGridInfo(clickedBoxAddress.address, clickedBoxAddress);
      } else if (postCoords) {
        api.get('/location/encode', { params: { lat: postCoords.lat, lng: postCoords.lng } })
          .then(res => {
            if (res.data && res.data.address) {
              updateGridInfo(res.data.address, postCoords);
            }
          })
          .catch(err => {
            console.warn("Failed to encode postCoords grid address:", err);
            const fallbackAddr = `GRID/${postCoords.lat.toFixed(5)}_${postCoords.lng.toFixed(5)}`;
            updateGridInfo(fallbackAddr);
          });
      }
    } else {
      setPostGridAddress('');
      setPostGridName('');
    }
  }, [showPostModal, postCoords]);

  // Map Details Panel States
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [allowMultipleLayers, setAllowMultipleLayers] = useState(false);
  const [activeLayers, setActiveLayers] = useState([]);
  const [activeTool, setActiveTool] = useState(null);

  // Grid Address Decoder States
  const [userGridAddress, setUserGridAddress] = useState(null);
  const [isAddressTrackerCollapsed, setIsAddressTrackerCollapsed] = useState(true);
  const [isLocatingGrid, setIsLocatingGrid] = useState(false);
  const [tempTargetCoords, setTempTargetCoords] = useState(null);

  // Tool Specific States
  const [measurePoints, setMeasurePoints] = useState([]);
  const [measureDistance, setMeasureDistance] = useState(0);
  const measureMarkersRef = useRef([]);

  const [travelPoints, setTravelPoints] = useState([]);
  const [travelDurations, setTravelDurations] = useState(null);
  const travelMarkersRef = useRef([]);



  // ── Google Maps Search State ───────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentMapProvider, setCurrentMapProvider] = useState('locationiq');
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // UX State Machine
  // state 1: Ambiguous suggestion list
  const [ambiguousList, setAmbiguousList] = useState([]); // Array of candidate place items
  // state 2: Exact place details
  const [selectedPlace, setSelectedPlace] = useState(null);
  // state 3: Route View details
  const [inDirectionsMode, setInDirectionsMode] = useState(false);
  const [originTarget, setOriginTarget] = useState({ name: 'Your Location', lat: 22.5726, lng: 88.3639, type: 'user' });
  const [navTarget, setNavTarget] = useState(null);
  const [travelMode, setTravelMode] = useState('driving'); // 'driving', 'twowheeler', 'transit', 'walking'
  const [routeInfo, setRouteInfo] = useState(null);
  const [showStepsDrawer, setShowStepsDrawer] = useState(false);
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [showRoutesMenu, setShowRoutesMenu] = useState(false);

  // Saved bookmark list
  const [savedPlaces, setSavedPlaces] = useState([]);

  // Active Navigation simulation state
  const [isSimulatingNav, setIsSimulatingNav] = useState(false);
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [navRemainingDist, setNavRemainingDist] = useState(0);
  const [navRemainingTime, setNavRemainingTime] = useState(0);

  const searchDebounceRef = useRef(null);
  const animIntervalRef = useRef(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const destinationMarkersRef = useRef([]); // holds array of search pin markers on the map
  const routeLineRef = useRef(null);
  const simMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const fetchTimeoutRef = useRef(null);

  // Refs for zero-latency grid nudging and background request cancellation
  const clickedBoxAddressRef = useRef(clickedBoxAddress);
  const encodeAbortControllerRef = useRef(null);
  const encodeDebounceTimerRef = useRef(null);

  // Sync ref with state synchronously for zero-lag lookups
  useEffect(() => {
    clickedBoxAddressRef.current = clickedBoxAddress;
  }, [clickedBoxAddress]);

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ── Precision Grid Nudge D-Pad Handler (Optimized for Mobile Touch) ──
  const nudgeGridLocation = useCallback((direction) => {
    const current = clickedBoxAddressRef.current;
    if (!current) return;

    const currentLat = current.lat;
    const currentLng = current.lng;

    // ~3 meter step in latitude & longitude
    const latStep = 0.000027;
    const lngStep = 0.000027 / Math.max(0.1, Math.cos((currentLat * Math.PI) / 180));

    let newLat = currentLat;
    let newLng = currentLng;

    if (direction === 'north' || direction === 'up') newLat += latStep;
    if (direction === 'south' || direction === 'down') newLat -= latStep;
    if (direction === 'west' || direction === 'left') newLng -= lngStep;
    if (direction === 'east' || direction === 'right') newLng += lngStep;

    // 1. Optimistic local movement (instant response, no waiting for network)
    const optimisticAddress = current.address || `Resolving Address...`;
    const nextTarget = {
      lat: newLat,
      lng: newLng,
      address: optimisticAddress
    };

    // Update ref & state immediately so rapid successive taps operate on updated position
    clickedBoxAddressRef.current = nextTarget;
    setClickedBoxAddress(nextTarget);

    // 2. Pan map view IMMEDIATELY with ultra-fast ease animation
    if (mapInstanceRef.current) {
      mapInstanceRef.current.easeTo({
        center: [newLng, newLat],
        duration: 150
      });
    }

    // 3. Debounce & Cancel previous background API call ("latest wins" queueing)
    if (encodeDebounceTimerRef.current) {
      clearTimeout(encodeDebounceTimerRef.current);
    }
    if (encodeAbortControllerRef.current) {
      encodeAbortControllerRef.current.abort();
    }

    encodeDebounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      encodeAbortControllerRef.current = controller;

      try {
        setIsLocatingGrid(true);
        const res = await api.get('/location/encode', {
          params: { lat: newLat, lng: newLng },
          signal: controller.signal
        });

        if (res.data && res.data.address) {
          const finalAddress = res.data.address;
          const resolvedLat = res.data.center_lat || newLat;
          const resolvedLng = res.data.center_lng || newLng;

          // Resolve authoritative label text without moving or jumping map position
          setClickedBoxAddress(prev => {
            if (!prev) return null;
            if (Math.abs(prev.lat - newLat) < 0.00001 && Math.abs(prev.lng - newLng) < 0.00001) {
              return { lat: resolvedLat, lng: resolvedLng, address: finalAddress };
            }
            return prev;
          });
        }
      } catch (err) {
        if (err.name !== 'CanceledError' && err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
          console.warn('Background grid address encode notice:', err);
        }
      } finally {
        if (encodeAbortControllerRef.current === controller) {
          setIsLocatingGrid(false);
        }
      }
    }, 150);
  }, []);

  // Keyboard shortcut for grid nudging (Ref-based, no stale closures)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!clickedBoxAddressRef.current) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        nudgeGridLocation('north');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        nudgeGridLocation('south');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nudgeGridLocation('west');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nudgeGridLocation('east');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nudgeGridLocation]);

  // Determine if searching/detailed/routing UI is active to hide satellite/style toggles
  const isSearchFlowActive = isSearching || ambiguousList.length > 0 || selectedPlace !== null || inDirectionsMode;

  // Dispatch map-search-flow active state to hide dashboard sidebars/headers
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('map-search-flow', {
      detail: { active: isSearchFlowActive, inDirectionsMode: inDirectionsMode }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('map-search-flow', {
        detail: { active: false, inDirectionsMode: false }
      }));
    };
  }, [isSearchFlowActive, inDirectionsMode]);

  // Listen to search query changes from Dashboard's existing search input
  useEffect(() => {
    const handleQueryChanged = (e) => {
      handleSearchInput(e.detail.query);
    };
    const handleFocus = () => {
      setShowSearchDropdown(true);
    };
    window.addEventListener('map-search-query-changed', handleQueryChanged);
    window.addEventListener('map-search-focus', handleFocus);
    return () => {
      window.removeEventListener('map-search-query-changed', handleQueryChanged);
      window.removeEventListener('map-search-focus', handleFocus);
    };
  }, [peopleList, mapCenter]);

  // Search logic satisfying the Ambiguous vs. Exact Match specification
  const handleSearchInput = (val) => {
    setSearchQuery(val);

    if (!val.trim()) {
      setSearchResults([]);
      setAmbiguousList([]);
      return;
    }

    setShowSearchDropdown(true);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);

      // Check if it's a grid address (e.g. contains slashes like WB/eastport6/absurdly0)
      const cleanVal = val.replace(/^grid\s+address:\s*/i, '').trim();
      const parts = cleanVal.split('/');
      if (parts.length >= 3) {
        try {
          const res = await api.get('/location/decode', { params: { address: cleanVal } });
          const { lat, lng } = res.data;
          if (lat !== undefined && lng !== undefined) {
            setClickedBoxAddress({ lat, lng, address: cleanVal });
            const map = mapInstanceRef.current;
            if (map) {
              map.flyTo({ center: [lng, lat], zoom: 17 });
            }
            setIsSearching(false);
            setShowSearchDropdown(false);
            setSearchResults([]);
            setAmbiguousList([]);
            return;
          }
        } catch (err) {
          console.warn("Failed to decode grid address search:", err);
        }
      }

      // Filter mock rich places
      const term = val.toLowerCase();
      const localMatches = RICH_PLACES.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        p.address.toLowerCase().includes(term)
      );

      // Friends query matches
      const friendMatches = peopleList.filter(p => p.name.toLowerCase().includes(term)).map(p => ({
        id: `friend-${p.id}`,
        name: p.name,
        alternateName: p.name,
        category: 'Friend Location',
        rating: 5.0,
        reviewsCount: 1,
        position: p.position,
        address: p.address || 'Friend current location',
        description: `${p.name} is currently ${p.status} on Orb.`,
        statusText: `Last seen ${p.lastSeen}`,
        isOpen: p.status !== 'offline',
        hours: 'Live Location Sharing',
        phone: 'N/A',
        images: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop'],
        original: p
      }));

      // Combine matched items
      const combinedMatches = [...localMatches, ...friendMatches];

      // Simulate network loader
      setTimeout(() => {
        setIsSearching(false);
        if (combinedMatches.length === 1) {
          // Rule: Specific query matches EXACTLY ONE item -> Go straight to State 2
          handleSelectPlaceDetail(combinedMatches[0]);
        } else if (combinedMatches.length > 1) {
          // Rule: Ambiguous Query matches MULTIPLE items -> Show suggestion list (State 1)
          setAmbiguousList(combinedMatches);
          setShowSearchDropdown(false);
        } else {
          // Fallback to LocationIQ (or Nominatim if key missing) search to populate list if no local matches found
          const locationIqKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
          const searchUrl = locationIqKey && locationIqKey !== 'YOUR_LOCATIONIQ_API_KEY'
            ? `https://us1.locationiq.com/v1/search.php?key=${locationIqKey}&q=${encodeURIComponent(val)}&format=json&limit=5`
            : `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&limit=5`;
          fetch(searchUrl)
            .then(res => res.json())
            .then(async (data) => {
              if (data && data.length > 0) {
                const nominatimResults = data.map((item, idx) => {
                  const placeName = item.display_name.split(',')[0];
                  const category = item.type || 'Point of Interest';

                  return {
                    id: `osm-${idx}`,
                    name: placeName,
                    alternateName: item.display_name.split(',')[1] || '',
                    category: category,
                    rating: (4.1 + Math.random() * 0.8).toFixed(1),
                    reviewsCount: Math.floor(20 + Math.random() * 300),
                    position: [parseFloat(item.lat), parseFloat(item.lon)],
                    address: item.display_name,
                    description: 'Search result matching OSM geocoding database.',
                    statusText: 'Open · Closes 8:00 PM',
                    isOpen: true,
                    hours: '9:00 AM - 8:00 PM',
                    phone: 'N/A',
                    images: []
                  };
                });

                if (nominatimResults.length === 1) {
                  handleSelectPlaceDetail(nominatimResults[0]);
                } else {
                  setAmbiguousList(nominatimResults);
                  setShowSearchDropdown(false);
                }
              } else {
                // Zero results
                setAmbiguousList([]);
                setShowSearchDropdown(false);
              }
            }).catch(err => {
              console.warn(err);
              setAmbiguousList([]);
            });
        }
      }, 600); // 600ms artificial network latency to showcase skeleton loaders!
    }, 280);
  };

  // State Transition handlers
  const handleSelectPlaceDetail = (place) => {
    setSelectedPlace(place);
    setAmbiguousList([]);
    setShowSearchDropdown(false);
    setSearchQuery(place.name);
    window.dispatchEvent(new CustomEvent('map-search-set-input', {
      detail: { query: place.name }
    }));

    const map = mapInstanceRef.current;
    if (map && mapReady) {
      map.flyTo({ center: [place.position[1], place.position[0]], zoom: 15.5, duration: 1200 });
    }
  };

  const handleOpenDirections = (place) => {
    setNavTarget(place);
    setInDirectionsMode(true);
    setSelectedPlace(null);
    setAmbiguousList([]);
  };

  const getBearing = (from, to) => {
    const lat1 = from[1] * Math.PI / 180;
    const lon1 = from[0] * Math.PI / 180;
    const lat2 = to[1] * Math.PI / 180;
    const lon2 = to[0] * Math.PI / 180;

    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  const handleStartSimulatedNav = () => {
    if (!routeInfo || !routeInfo.coordinates || routeInfo.coordinates.length === 0) {
      triggerToast("No route available for navigation");
      return;
    }

    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    setIsSimulatingNav(true);
    setNavStepIndex(0);
    setNavRemainingDist(routeInfo.distanceKm);
    setNavRemainingTime(routeInfo.durationMin);

    const coords = routeInfo.coordinates;
    let currentCoordIndex = 0;

    // Remove any existing sim marker
    if (simMarkerRef.current) {
      simMarkerRef.current.remove();
    }

    // Create custom vehicle element
    const el = document.createElement('div');
    el.style.width = '36px';
    el.style.height = '36px';
    el.style.background = '#16a34a';
    el.style.border = '3px solid #ffffff';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = '#ffffff';
    el.style.fontSize = '14px';
    el.style.fontWeight = 'bold';
    el.innerHTML = '▲';
    el.style.transition = 'transform 0.15s ease-out';

    const startLngLat = coords[0];
    const marker = new maplibregl.Marker({ element: el })
      .setLngLat(startLngLat)
      .addTo(map);

    simMarkerRef.current = marker;

    // Center map on navigation start
    map.flyTo({
      center: startLngLat,
      zoom: 17.5,
      pitch: 55,
      bearing: 0,
      duration: 1000
    });

    if (animIntervalRef.current) clearInterval(animIntervalRef.current);

    animIntervalRef.current = setInterval(() => {
      currentCoordIndex += 1;
      if (currentCoordIndex >= coords.length) {
        // Arrived at destination
        clearInterval(animIntervalRef.current);
        animIntervalRef.current = null;
        setIsSimulatingNav(false);
        if (simMarkerRef.current) {
          simMarkerRef.current.remove();
          simMarkerRef.current = null;
        }
        triggerToast("Arrived at destination!");
        return;
      }

      const prevPos = coords[currentCoordIndex - 1];
      const currentPos = coords[currentCoordIndex];

      // Rotate arrow marker towards direction of movement
      const bearing = getBearing(prevPos, currentPos);
      el.style.transform = `rotate(${bearing}deg)`;

      // Update marker coordinates
      marker.setLngLat(currentPos);

      // Ease map to follow the movement
      map.easeTo({
        center: currentPos,
        bearing: bearing,
        pitch: 55,
        zoom: 17.5,
        duration: 350
      });

      // Calculate progress and update remaining time and distance
      const pctDone = currentCoordIndex / coords.length;
      const remDist = Math.max(0, parseFloat((routeInfo.distanceKm * (1 - pctDone)).toFixed(2)));
      const remTime = Math.max(0, Math.ceil(routeInfo.durationMin * (1 - pctDone)));

      setNavRemainingDist(remDist);
      setNavRemainingTime(remTime);

      if (routeInfo.steps && routeInfo.steps.length > 0) {
        const stepCount = routeInfo.steps.length;
        const approxStepIdx = Math.min(stepCount - 1, Math.floor(pctDone * stepCount));
        setNavStepIndex(approxStepIdx);
      }

      // Propagate location update to parent component
      window.dispatchEvent(new CustomEvent('orb_simulated_location_update', {
        detail: { lat: currentPos[1], lng: currentPos[0] }
      }));
    }, 850);
  };

  const handleSwapLocations = () => {
    if (!originTarget || !navTarget) return;
    const oldOrigin = originTarget;
    const oldNav = navTarget;

    setOriginTarget({
      name: oldNav.name,
      lat: oldNav.position ? oldNav.position[0] : oldNav.lat,
      lng: oldNav.position ? oldNav.position[1] : oldNav.lng,
      type: oldNav.category || 'place'
    });
    setNavTarget({
      name: oldOrigin.name,
      position: [oldOrigin.lat, oldOrigin.lng],
      category: oldOrigin.type || 'place',
      address: 'Swapped Route Origin'
    });
    triggerToast('Swapped Origin and Destination ⇅');
  };

  const toggleSavePlace = (place) => {
    setSavedPlaces(prev => {
      const exists = prev.some(p => p.id === place.id);
      if (exists) {
        triggerToast(`Removed "${place.name}" from Saved`);
        return prev.filter(p => p.id !== place.id);
      } else {
        triggerToast(`Saved "${place.name}" to Favorites!`);
        return [...prev, place];
      }
    });
  };

  const fetchFeedStamps = async () => {
    try {
      const res = await api.get('/stamps/feed');
      setStampPosts(res.data);
    } catch (err) {
      console.warn("Failed to fetch stamps feed:", err);
    }
  };

  useEffect(() => {
    if (mapReady) {
      fetchFeedStamps();
    }
  }, [mapReady]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!postCoords && !clickedBoxAddress) return;
    const targetLat = postCoords?.lat || clickedBoxAddress?.lat;
    const targetLng = postCoords?.lng || clickedBoxAddress?.lng;

    const postPayload = {
      lat: targetLat,
      lng: targetLng,
      title: postTitle || postGridAddress || 'Orb Location Post',
      description: postDesc,
      visibility: postVisibility,
      photos: postPhotos,
      grid_address: postGridAddress,
      grid_name: postGridName
    };

    // Optimistically close modal tab immediately and reset states
    setShowPostModal(false);
    triggerToast('Location posted! +100 XP 🏆');

    // Create optimistic local stamp so user sees their stamp pin dropped immediately
    const localStamp = {
      id: `stamp-${Date.now()}`,
      ...postPayload,
      timestamp: new Date().toISOString(),
      reactions: {}
    };
    setStampPosts(prev => [...prev, localStamp]);

    // Reset all modal form states
    setPostTitle('');
    setPostDesc('');
    setPostVisibility('public');
    setPostPhotos([]);
    setPostGridAddress('');
    setPostGridName('');
    setPostCoords(null);
    setClickedBoxAddress(null);

    // Send payload to backend asynchronously
    try {
      await api.post('/stamps/drop', postPayload);
      fetchFeedStamps();
    } catch (err) {
      console.warn("Backend drop stamp notice (optimistic post retained):", err);
    }
  };

  const handleDirectPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      const validExtensions = ['.jpg', '.jpeg', '.png'];
      const lowerName = file.name.toLowerCase();

      const hasValidType = validTypes.includes(file.type);
      const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

      if (!hasValidType || !hasValidExt) {
        alert("Only JPG, JPEG, and PNG image formats are supported.");
        return false;
      }
      return true;
    });

    if (!validFiles.length || !selectedPlace) return;

    const readers = validFiles.slice(0, 3).map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = ev => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));

    const newPhotos = await Promise.all(readers);

    if (selectedPlace.isPost) {
      try {
        await api.post(`/stamps/${selectedPlace.id}/photos`, { photos: newPhotos });
        triggerToast("Photo uploaded successfully!");
        fetchFeedStamps();
      } catch (err) {
        console.error("Failed to upload photo:", err);
        triggerToast("Failed to upload photo.");
      }
    } else {
      triggerToast("Photo added to view!");
    }

    setSelectedPlace(prev => ({
      ...prev,
      images: [...(prev?.images || []), ...newPhotos]
    }));
  };

  const userLocationMarkerRef = useRef(null);

  const locateUser = useCallback((silent = false) => {
    if (!navigator.geolocation) {
      if (!silent) triggerToast("Geolocation is not supported by your browser.");
      return;
    }

    if (!silent) {
      triggerToast("Requesting location permission...");
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        setMapCenter([lat, lng]);

        const map = mapInstanceRef.current;
        if (map) {
          map.flyTo({
            center: [lng, lat],
            zoom: 15,
            duration: 1800,
            essential: true
          });

          // Add or update pulsing Blue User Location Marker on the map
          if (userLocationMarkerRef.current) {
            userLocationMarkerRef.current.setLngLat([lng, lat]);
          } else {
            const el = document.createElement('div');
            el.className = 'user-gps-marker';
            el.innerHTML = `
              <div style="
                width: 22px;
                height: 22px;
                background: #1A73E8;
                border: 3px solid #ffffff;
                border-radius: 50%;
                box-shadow: 0 0 12px rgba(26, 115, 232, 0.8);
                position: relative;
                cursor: pointer;
              ">
                <div style="
                  position: absolute;
                  top: -8px;
                  left: -8px;
                  right: -8px;
                  bottom: -8px;
                  border: 2px solid #1A73E8;
                  border-radius: 50%;
                  animation: pulseNavPin 2s infinite;
                  opacity: 0.6;
                "></div>
              </div>
            `;
            userLocationMarkerRef.current = new maplibregl.Marker({ element: el })
              .setLngLat([lng, lat])
              .setPopup(new maplibregl.Popup({ offset: 15 }).setHTML('<b style="font-family: Outfit, sans-serif; font-size: 13px;">Your Current GPS Location</b>'))
              .addTo(map);
          }
        }

        // Reverse geocode to get grid address
        try {
          const res = await api.get('/location/encode', { params: { lat, lng } });
          if (res.data && res.data.address) {
            triggerToast(`Located! ${res.data.address}`);
            setUserGridAddress(res.data.address);
          } else {
            triggerToast("Centered at your current location!");
          }
        } catch {
          triggerToast("Centered at your current location!");
        }
      },
      (error) => {
        console.warn("Geolocation error:", error);
        if (error.code === error.PERMISSION_DENIED) {
          triggerToast("Location permission denied. Defaulting to map center.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          triggerToast("GPS Location unavailable.");
        } else if (error.code === error.TIMEOUT) {
          triggerToast("GPS request timed out.");
        } else {
          triggerToast("Unable to acquire location.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);

  const handleDeletePost = async (stampId) => {
    if (!window.confirm("Are you sure you want to delete this custom location post?")) return;
    try {
      await api.delete(`/stamps/${stampId}`);
      triggerToast("Post deleted successfully.");
      setSelectedPlace(null);
      fetchFeedStamps();
    } catch (err) {
      console.error("Failed to delete stamp post:", err);
      triggerToast("Failed to delete post.");
    }
  };

  const handleToggleReaction = async (stampId, emoji) => {
    const hasReacted = selectedPlace.reactions?.[currentUserId] === emoji;
    try {
      if (hasReacted) {
        await api.delete(`/stamps/${stampId}/react`);
        setSelectedPlace(prev => {
          const updatedReactions = { ...prev.reactions };
          delete updatedReactions[currentUserId];
          return { ...prev, reactions: updatedReactions, reviewsCount: Object.keys(updatedReactions).length };
        });
      } else {
        await api.post(`/stamps/${stampId}/react`, { emoji });
        setSelectedPlace(prev => {
          const updatedReactions = { ...prev.reactions, [currentUserId]: emoji };
          return { ...prev, reactions: updatedReactions, reviewsCount: Object.keys(updatedReactions).length };
        });
      }
      fetchFeedStamps();
    } catch (err) {
      console.error("Failed to toggle reaction:", err);
      triggerToast("Failed to update reaction.");
    }
  };

  const countReactions = (reactions) => {
    const counts = {};
    if (!reactions) return counts;
    Object.values(reactions).forEach(emoji => {
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    return counts;
  };

  // Clear all states and return to normal home view
  const handleResetSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setAmbiguousList([]);
    setSelectedPlace(null);
    setInDirectionsMode(false);
    setNavTarget(null);
    setRouteInfo(null);
    setShowStepsDrawer(false);
    setIsSimulatingNav(false);
    window.dispatchEvent(new CustomEvent('map-search-set-input', {
      detail: { query: '' }
    }));
    if (animIntervalRef.current) clearInterval(animIntervalRef.current);
    if (simMarkerRef.current) {
      simMarkerRef.current.remove();
      simMarkerRef.current = null;
    }
  };

  // Fetch 3m Grid (STRICTLY visible at max zoom level 19 and level 18 right before it only!)
  const fetchGridData = useCallback((map) => {
    const zoom = map.getZoom();
    if (zoom < 17.75) {
      setGridData(null);
      return;
    }

    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const center = map.getCenter();

    // Clamp bounding box to ~1.5km so backend size limit is never exceeded
    let min_lat = sw.lat;
    let max_lat = ne.lat;
    let min_lon = sw.lng;
    let max_lon = ne.lng;

    if (Math.abs(max_lat - min_lat) > 0.015) {
      min_lat = center.lat - 0.0075;
      max_lat = center.lat + 0.0075;
    }
    if (Math.abs(max_lon - min_lon) > 0.015) {
      min_lon = center.lng - 0.0075;
      max_lon = center.lng + 0.0075;
    }

    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get('/location/grid', {
          params: { min_lat, min_lon, max_lat, max_lon }
        });
        setGridData(response.data);
      } catch (err) {
        console.warn("Failed to fetch grid overlay:", err);
      }
    }, 250);
  }, []);

  const olaKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
  const locationIqKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
  const mapStyles = {
    locationiq: locationIqKey && locationIqKey !== 'YOUR_LOCATIONIQ_API_KEY'
      ? `https://tiles.locationiq.com/v3/streets/vector.json?key=${locationIqKey}`
      : 'https://tiles.openfreemap.org/styles/liberty',
    ola: olaKey && olaKey !== 'YOUR_OLA_MAPS_API_KEY'
      ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${olaKey}`
      : 'https://tiles.openfreemap.org/styles/liberty',
    mappls: 'https://tiles.openfreemap.org/styles/liberty' // Fallback for Mappls until native integration
  };

  // Dynamically change map style when provider changes
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const targetStyle = mapStyles[currentMapProvider] || mapStyles.locationiq;
    mapInstanceRef.current.setStyle(targetStyle);

    // We must re-add our custom layers (like satellite and 3m grid) when style changes
    mapInstanceRef.current.once('styledata', () => {
      if (!mapInstanceRef.current.getSource('satellite')) {
        mapInstanceRef.current.addSource('satellite', {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256
        });
      }
      // Retrigger grid overlay logic by artificially bumping state if needed, but it handles via gridData effect
    });
  }, [currentMapProvider, mapReady]);

  // 1. Initialize MapLibre Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const olaKey = import.meta.env.VITE_OLA_MAPS_API_KEY;
    const locationIqKey = import.meta.env.VITE_LOCATIONIQ_API_KEY;
    // MapLibre doesn't support MapmyIndia easily without their SDK, but if you have a valid style URL you can plug it here.
    const mapStyles = {
      locationiq: locationIqKey && locationIqKey !== 'YOUR_LOCATIONIQ_API_KEY'
        ? `https://tiles.locationiq.com/v3/streets/vector.json?key=${locationIqKey}`
        : 'https://tiles.openfreemap.org/styles/liberty',
      ola: olaKey && olaKey !== 'YOUR_OLA_MAPS_API_KEY'
        ? `https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=${olaKey}`
        : 'https://tiles.openfreemap.org/styles/liberty',
      mappls: 'https://tiles.openfreemap.org/styles/liberty' // Fallback for Mappls until native integration
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: mapStyles[currentMapProvider] || mapStyles.locationiq,
      center: [mapCenter[1], mapCenter[0]],
      zoom: currentZoom,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: false,
      doubleClickZoom: false
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      map.addSource('satellite', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      });

      const layers = map.getStyle().layers;
      let firstSymbolId;
      for (const layer of layers) {
        if (layer.type === 'symbol') {
          firstSymbolId = layer.id;
          break;
        }
      }

      map.addLayer({
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite',
        layout: {
          visibility: mapStyle === 'satellite' ? 'visible' : 'none'
        }
      }, firstSymbolId);

      // Real-time Traffic Flow Layer (TomTom Live Traffic via Backend Proxy)
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      map.addSource('traffic', {
        type: 'raster',
        tiles: [`${apiBaseUrl}/location/traffic/tiles/{z}/{x}/{y}`],
        tileSize: 256
      });

      map.addLayer({
        id: 'traffic-layer',
        type: 'raster',
        source: 'traffic',
        paint: { 'raster-opacity': 0.75 },
        layout: { visibility: (showTraffic || activeLayers.includes('traffic')) ? 'visible' : 'none' }
      });

      // Transit layer (ÖPNVKarte & OpenRailwayMap Global Transit, Metro, Subway & Rail networks via backend proxy)
      map.addSource('transit', {
        type: 'raster',
        tiles: [`${apiBaseUrl}/location/transit/tiles/{z}/{x}/{y}`],
        tileSize: 256
      });
      map.addLayer({
        id: 'transit-layer',
        type: 'raster',
        source: 'transit',
        paint: { 'raster-opacity': 0.85 },
        layout: { visibility: activeLayers.includes('transit') ? 'visible' : 'none' }
      });

      setMapReady(true);
      fetchGridData(map);
    });

    map.on('zoomend', () => {
      const zoom = map.getZoom();
      setCurrentZoom(zoom);
      fetchGridData(map);
    });

    map.on('moveend', () => {
      fetchGridData(map);
    });

    map.on('click', (e) => {
      handleMapClick({ latlng: e.lngLat });
    });

    map.on('dblclick', async (e) => {
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }

      const { lat, lng } = e.lngLat;

      // 1. Target this location for Post Location (✨) FAB Tool shortcut
      setPostCoords({ lat, lng });

      // 2. Hide Place Details Card (bottom-left drawer) completely
      setSelectedPlace(null);

      // 3. Encode grid address & update top-right Floating Grid Address Card
      setIsLocatingGrid(true);
      setTempTargetCoords({ lat, lng });

      try {
        let displayLat = lat;
        let displayLng = lng;
        let gridAddr = `Resolving Address...`;

        const res = await api.get('/location/encode', { params: { lat, lng } });
        if (res.data && res.data.address) {
          displayLat = res.data.center_lat || lat;
          displayLng = res.data.center_lng || lng;
          gridAddr = res.data.address;
        }

        setClickedBoxAddress({ lat: displayLat, lng: displayLng, address: gridAddr });
        triggerToast(`Targeted for Post Location ! ${gridAddr}`);
      } catch (err) {
        console.warn('Could not encode double-clicked grid address:', err);
      } finally {
        setIsLocatingGrid(false);
      }
    });

    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Helper to find the first symbol layer for placing rasters underneath
  const getFirstSymbolId = (map) => {
    const layers = map.getStyle().layers || [];
    for (const layer of layers) {
      if (layer.type === 'symbol') return layer.id;
    }
    return undefined;
  };

  // 2. Handle map style (satellite vs street)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (!map.getSource('satellite')) {
      map.addSource('satellite', {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256
      });
    }
    if (!map.getLayer('satellite-layer')) {
      map.addLayer({
        id: 'satellite-layer',
        type: 'raster',
        source: 'satellite',
        layout: { visibility: mapStyle === 'satellite' ? 'visible' : 'none' }
      }, getFirstSymbolId(map));
    } else {
      map.setLayoutProperty('satellite-layer', 'visibility', mapStyle === 'satellite' ? 'visible' : 'none');
    }
  }, [mapStyle, mapReady, currentMapProvider]);

  // 3. Sync traffic helper state with activeLayers
  useEffect(() => {
    const isTrafficActive = activeLayers.includes('traffic');
    if (showTraffic !== isTrafficActive) {
      setShowTraffic(isTrafficActive);
    }
  }, [activeLayers, showTraffic]);

  // 3.1 Handle traffic layer visibility
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (!map.getSource('traffic')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      map.addSource('traffic', {
        type: 'raster',
        tiles: [`${apiBaseUrl}/location/traffic/tiles/{z}/{x}/{y}`],
        tileSize: 256
      });
    }
    if (!map.getLayer('traffic-layer')) {
      map.addLayer({
        id: 'traffic-layer',
        type: 'raster',
        source: 'traffic',
        paint: { 'raster-opacity': 0.75 },
        layout: { visibility: showTraffic ? 'visible' : 'none' }
      }, getFirstSymbolId(map));
    } else {
      map.setLayoutProperty('traffic-layer', 'visibility', showTraffic ? 'visible' : 'none');
    }
  }, [showTraffic, mapReady, currentMapProvider]);

  // 3.2 Sync other custom layers visibility (transit)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (!map.getSource('transit')) {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      map.addSource('transit', {
        type: 'raster',
        tiles: [`${apiBaseUrl}/location/transit/tiles/{z}/{x}/{y}`],
        tileSize: 256
      });
    }
    if (!map.getLayer('transit-layer')) {
      map.addLayer({
        id: 'transit-layer',
        type: 'raster',
        source: 'transit',
        paint: { 'raster-opacity': 0.85 },
        layout: { visibility: activeLayers.includes('transit') ? 'visible' : 'none' }
      }, getFirstSymbolId(map));
    } else {
      map.setLayoutProperty('transit-layer', 'visibility', activeLayers.includes('transit') ? 'visible' : 'none');
    }
  }, [activeLayers, mapReady, currentMapProvider]);

  // 3.2.1 Notice Toast for Transit Layer
  useEffect(() => {
    if (!mapReady || !activeLayers.includes('transit')) return;
    triggerToast('This layer only shows the railways, metro routes');
  }, [activeLayers, mapReady]);

  // 3.3 Periodic Live Traffic Refresh Timer (every 90s) & Notice Toast
  useEffect(() => {
    const isTrafficActive = showTraffic || activeLayers.includes('traffic');
    if (!mapReady || !isTrafficActive) return;

    // Show information notice when Roadways layer is viewed
    triggerToast('The traffic shown on the map may differ from the actual traffic.');

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

    // Verify backend traffic proxy status when traffic layer is turned on
    api.get('/location/traffic/tiles/0/0/0')
      .catch(err => {
        if (err.response && err.response.status === 503) {
          triggerToast('Traffic Data Unavailable: TOMTOM_API_KEY not configured in backend/.env');
        }
      });

    const interval = setInterval(() => {
      const map = mapInstanceRef.current;
      if (map && map.getSource('traffic')) {
        const timestamp = Date.now();
        map.getSource('traffic').setTiles([`${apiBaseUrl}/location/traffic/tiles/{z}/{x}/{y}?_t=${timestamp}`]);
      }
    }, 90000); // 90 seconds live traffic refresh

    return () => clearInterval(interval);
  }, [showTraffic, activeLayers, mapReady]);

  // 3.3 Clean up tools on activeTool switch
  useEffect(() => {
    if (activeTool !== 'measure') {
      handleClearMeasure();
    }
    if (activeTool !== 'travel-time') {
      handleClearTravelTime();
    }
  }, [activeTool]);

  // Automatically request GPS location & alert user on site load
  useEffect(() => {
    if (mapReady) {
      locateUser(false);
    }
  }, [mapReady, locateUser]);

  // ── Render Sleek Minimal White Dotted Grid lines ──────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const sourceId = 'micro-grid-source';
    const layerId = 'micro-grid-lines';

    if (!gridData || !gridData.features || gridData.features.length === 0) {
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none');
      return;
    }

    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(gridData);
      if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'visible');
    } else {
      map.addSource(sourceId, {
        type: 'geojson',
        data: gridData
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        minzoom: 17.75, // Strictly visible at zoom levels 18 and 19 only!
        paint: {
          'line-color': '#1e293b', // Sleek dark slate
          'line-width': 0.75,       // Slimmest line width
          'line-opacity': 0.5,      // Clean subtle visibility
          'line-dasharray': [2, 2]  // Fine grid dashes
        }
      });
    }
  }, [gridData, mapReady, currentMapProvider]);

  // 4. Friends list markers rendering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Remove existing friends markers to avoid collision with search states if desired,
    // or just leave them. We will update them cleanly.
    const currentIds = new Set();

    peopleList.forEach(p => {
      currentIds.add(p.id);

      const initials = p.initials;
      const color = STATUS_COLORS[p.status] || '#3B9E5C';

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:3.5px;transition:transform 0.2s;">
          <div style="width:38px;height:38px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-family:'Outfit',sans-serif;font-size:13px;font-weight:700;color:#fff;border:2.5px solid rgba(255,255,255,0.95);box-shadow:0 3px 12px rgba(0,0,0,0.3);letter-spacing:0.02em;">${escapeHtml(initials)}</div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handleSelectPlaceDetail({
          id: `friend-${p.id}`,
          name: p.name,
          alternateName: p.name,
          category: 'Friend Location',
          rating: 4.9,
          reviewsCount: 12,
          position: p.position,
          address: p.address || 'Friend location',
          description: `${p.name} is online on Orb.`,
          statusText: `Last seen ${p.lastSeen}`,
          isOpen: p.status !== 'offline',
          hours: 'Live Location Sharing',
          images: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop'],
          original: p
        });
      });

      if (markersRef.current.has(p.id)) {
        const marker = markersRef.current.get(p.id);
        marker.setLngLat([p.position[1], p.position[0]]);
      } else {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([p.position[1], p.position[0]])
          .addTo(map);
        markersRef.current.set(p.id, marker);
      }
    });

    for (const [id, marker] of markersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }
  }, [peopleList, mapReady]);

  // Stamp posts markers rendering
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const currentIds = new Set();

    stampPosts.forEach(stamp => {
      currentIds.add(stamp.id);

      let pinColor = '#10B981'; // Public - Emerald
      let badgeLabel = '🌍';
      if (stamp.visibility === 'friends') {
        pinColor = '#3B82F6'; // Friends - Blue
        badgeLabel = '👥';
      } else if (stamp.visibility === 'private') {
        pinColor = '#F59E0B'; // Private - Amber
        badgeLabel = '🔒';
      }

      const el = document.createElement('div');
      el.className = 'stamp-post-marker';
      el.style.cursor = 'pointer';
      el.innerHTML = `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;transition:all 0.2s;">
          <div style="width:36px;height:44px;display:flex;align-items:center;justify-content:center;filter:drop-shadow(0 4px 10px rgba(0,0,0,0.25));">
            <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 44 18 44C18 44 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="${pinColor}"/>
              <circle cx="18" cy="18" r="8" fill="#FFFFFF"/>
              <text x="18" y="21" font-size="11" text-anchor="middle" dominant-baseline="middle">${badgeLabel}</text>
            </svg>
          </div>
        </div>
      `;

      el.addEventListener('click', (e) => {
        e.stopPropagation();

        handleSelectPlaceDetail({
          id: stamp.id,
          name: stamp.title || 'Custom Location',
          alternateName: `Posted by @${stamp.creatorName || 'user'}`,
          category: (stamp.visibility || 'public').toUpperCase() + ' POST',
          rating: 5.0,
          reviewsCount: stamp.reactions ? Object.keys(stamp.reactions).length : 0,
          position: [stamp.lat, stamp.lng],
          address: stamp.geoAddress || 'Custom Location Coordinate',
          description: stamp.description || 'No description provided.',
          statusText: `Posted at ${new Date(stamp.timestamp).toLocaleDateString()}`,
          isOpen: true,
          hours: `Visibility: ${stamp.visibility}`,
          phone: '',
          images: [],
          isPost: true,
          reactions: stamp.reactions || {},
          userId: stamp.userId
        });
      });

      if (stampMarkersRef.current.has(stamp.id)) {
        const marker = stampMarkersRef.current.get(stamp.id);
        marker.setLngLat([stamp.lng, stamp.lat]);
      } else {
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([stamp.lng, stamp.lat])
          .addTo(map);
        stampMarkersRef.current.set(stamp.id, marker);
      }
    });

    for (const [id, marker] of stampMarkersRef.current.entries()) {
      if (!currentIds.has(id)) {
        marker.remove();
        stampMarkersRef.current.delete(id);
      }
    }

    return () => {
      if (!mapReady) {
        stampMarkersRef.current.forEach(m => m.remove());
        stampMarkersRef.current.clear();
      }
    };
  }, [stampPosts, mapReady]);

  // 5. Update Map Pins for Disambiguation Candidates (State 1) or Exact Place Target (State 2)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    // Clear previous search pin markers
    destinationMarkersRef.current.forEach(m => m.remove());
    destinationMarkersRef.current = [];

    // Determine pins to draw
    let pinsToDraw = [];
    if (selectedPlace) {
      pinsToDraw = [selectedPlace];
    } else if (ambiguousList.length > 0) {
      pinsToDraw = ambiguousList;
    } else if (inDirectionsMode && navTarget) {
      pinsToDraw = [navTarget];
    } else if (isLocatingGrid && tempTargetCoords) {
      pinsToDraw = [{
        id: 'locating-grid-pin',
        position: [tempTargetCoords.lat, tempTargetCoords.lng],
        isLocating: true
      }];
    } else if (clickedBoxAddress) {
      pinsToDraw = [{
        id: `grid-${clickedBoxAddress.address}`,
        name: `Grid Address: ${clickedBoxAddress.address}`,
        position: [clickedBoxAddress.lat, clickedBoxAddress.lng],
        isTargetedGrid: true
      }];
    }

    pinsToDraw.forEach((p, idx) => {
      if (!p.position) return;
      const el = document.createElement('div');
      el.className = 'gmaps-red-pin';
      el.style.perspective = '1000px';
      el.style.transformStyle = 'preserve-3d';

      // If ambiguous list, show numbers inside the pins matching the list order!
      const label = ambiguousList.length > 0 ? (idx + 1) : '';

      // Determine animation styles for rotation
      let animationStyle = '';
      if (p.isLocating) {
        animationStyle = 'animation: spinHorizontal 2s linear infinite;';
      } else if (p.isGrid) {
        animationStyle = 'animation: spinHorizontal 8s linear infinite;';
      } else if (!p.isTargetedGrid) {
        animationStyle = 'animation: dropPin 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);';
      }

      if (p.isTargetedGrid) {
        el.innerHTML = `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <!-- Target Red Pin Marker -->
            <div style="position:relative;width:36px;height:46px;">
              <div style="position:absolute;top:0;left:0;width:36px;height:46px;filter:drop-shadow(0 6px 12px rgba(220,38,38,0.5));">
                <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#EA4335"/>
                  <circle cx="18" cy="18" r="8" fill="#FFFFFF"/>
                  <circle cx="18" cy="18" r="4" fill="#B31412"/>
                </svg>
              </div>
            </div>
            <!-- Base Shadow -->
            <div style="width:14px;height:4px;background:rgba(0,0,0,0.25);border-radius:50%;margin-top:2px;filter:blur(1px);"></div>
          </div>
        `;
      } else {
        el.innerHTML = `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;transform-style:preserve-3d;${animationStyle}">
            <!-- 3D Layer Extrusion Stack -->
            <div style="position:relative;width:36px;height:46px;transform-style:preserve-3d;">
              
              <!-- Layer 1 (Back Shadow Layer) -->
              <div style="position:absolute;top:0;left:0;width:36px;height:46px;transform:translateZ(-1.5px);filter:brightness(0.7);transform-style:preserve-3d;">
                <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#EA4335"/>
                </svg>
              </div>

              <!-- Layer 2 (Middle Thickness Layer) -->
              <div style="position:absolute;top:0;left:0;width:36px;height:46px;transform:translateZ(-0.75px);filter:brightness(0.85);transform-style:preserve-3d;">
                <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#EA4335"/>
                </svg>
              </div>

              <!-- Layer 3 (Front Detail Layer) -->
              <div style="position:absolute;top:0;left:0;width:36px;height:46px;transform:translateZ(0px);filter:drop-shadow(0 4px 8px rgba(220, 38, 38, 0.4));transform-style:preserve-3d;">
                <svg width="36" height="46" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 0C8.05887 0 0 8.05887 0 18C0 31.5 18 46 18 46C18 46 36 31.5 36 18C36 8.05887 27.9411 0 18 0Z" fill="#EA4335"/>
                  <circle cx="18" cy="18" r="8" fill="#FFFFFF"/>
                  ${label ? `<text x="18" y="22" font-family="'Outfit',sans-serif" font-weight="800" font-size="11" fill="#EA4335" text-anchor="middle">${label}</text>` : `<circle cx="18" cy="18" r="4" fill="#B31412"/>`}
                </svg>
              </div>

            </div>
            <div style="width:14px;height:4px;background:rgba(0,0,0,0.22);border-radius:50%;margin-top:2px;filter:blur(1px);"></div>
          </div>
        `;
      }

      el.addEventListener('click', () => {
        handleSelectPlaceDetail(p);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([p.position[1], p.position[0]])
        .addTo(map);

      destinationMarkersRef.current.push(marker);
    });

  }, [ambiguousList, selectedPlace, inDirectionsMode, navTarget, isLocatingGrid, tempTargetCoords, clickedBoxAddress, mapReady, nudgeGridLocation]);

  // 6. Draw Routing & Alternative ETA waypoints (State 3: Route View)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    const clearRoute = () => {
      if (map.getLayer('route-line-halo')) map.removeLayer('route-line-halo');
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');
    };

    if (!inDirectionsMode || !originTarget || !navTarget) {
      clearRoute();
      setRouteInfo(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const startLng = originTarget.lng || originTarget.position?.[1];
        const startLat = originTarget.lat || originTarget.position?.[0];
        const endLng = navTarget.position?.[1] || navTarget.lng;
        const endLat = navTarget.position?.[0] || navTarget.lat;

        if (!startLng || !startLat || !endLng || !endLat) return;

        let mode = 'driving';
        let routingService = 'driving';
        if (travelMode === 'walking') { mode = 'foot'; routingService = 'foot'; }
        if (travelMode === 'twowheeler' || travelMode === 'cycling') { mode = 'bike'; routingService = 'bike'; }

        let url = `https://router.project-osrm.org/route/v1/${routingService}/${startLng},${startLat};${endLng},${endLat}?overview=full&steps=true&geometries=geojson`;
        let res = await fetch(url);
        let data = await res.json();

        if (!data.routes || data.routes.length === 0) {
          url = `https://routing.openstreetmap.de/routed-${mode}/route/v1/${routingService}/${startLng},${startLat};${endLng},${endLat}?overview=full&steps=true&geometries=geojson`;
          res = await fetch(url);
          data = await res.json();
        }

        if (!data.routes || data.routes.length === 0) return;

        const route = data.routes[0];
        const geom = route.geometry;
        if (!geom || !geom.coordinates || !Array.isArray(geom.coordinates) || geom.coordinates.length === 0) return;

        const dist = (route.distance / 1000).toFixed(1);
        const duration = Math.max(1, Math.ceil(route.duration / 60));
        const steps = route.legs?.[0]?.steps || [];

        setRouteInfo({
          distanceKm: dist,
          durationMin: duration,
          steps: steps,
          coordinates: geom.coordinates
        });

        if (map.getSource('route')) {
          map.getSource('route').setData(geom);
        } else {
          map.addSource('route', { type: 'geojson', data: geom });

          map.addLayer({
            id: 'route-line-halo',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': '#1A73E8',
              'line-width': 10,
              'line-opacity': 0.2
            }
          });

          map.addLayer({
            id: 'route-line',
            type: 'line',
            source: 'route',
            paint: {
              'line-color': '#1A73E8',
              'line-width': 6,
              'line-opacity': 0.95
            }
          });
        }

        // Fit map bounds safely
        const lats = geom.coordinates.map(c => c[1]).filter(n => typeof n === 'number' && !isNaN(n));
        const lngs = geom.coordinates.map(c => c[0]).filter(n => typeof n === 'number' && !isNaN(n));

        if (lats.length > 0 && lngs.length > 0) {
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          if (isFinite(minLat) && isFinite(maxLat) && isFinite(minLng) && isFinite(maxLng)) {
            map.fitBounds([
              [minLng, minLat],
              [maxLng, maxLat]
            ], {
              padding: { top: 160, bottom: 280, left: 60, right: 60 },
              duration: 1000
            });
          }
        }

      } catch (err) {
        console.warn('Failed to calculate route:', err);
      }
    };

    fetchRoute();
  }, [inDirectionsMode, originTarget, navTarget, travelMode, mapReady]);

  // Sync prop center updates
  useEffect(() => {
    if (center) {
      setMapCenter(center);
      const map = mapInstanceRef.current;
      if (map && mapReady) {
        map.flyTo({ center: [center[1], center[0]], zoom: 13 });
      }
      api.get('/location/encode', { params: { lat: center[0], lng: center[1] } })
        .then(res => {
          if (res.data && res.data.address) {
            setUserGridAddress(res.data.address);
          }
        })
        .catch(err => console.warn('Could not encode center coordinates:', err));
    }
  }, [center, mapReady]);

  // ── MEASURE TOOL FUNCTIONS ──
  const handleMeasureClick = (lat, lng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const el = document.createElement('div');
    el.style.width = '10px';
    el.style.height = '10px';
    el.style.backgroundColor = '#d84315';
    el.style.border = '2px solid #ffffff';
    el.style.borderRadius = '50%';
    el.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    measureMarkersRef.current.push(marker);

    setMeasurePoints(prev => {
      const newPoints = [...prev, [lng, lat]];
      updateMeasureLine(newPoints);
      return newPoints;
    });
  };

  const updateMeasureLine = (points) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const geojson = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: points
      }
    };

    const sourceId = 'measure-line-source';
    if (map.getSource(sourceId)) {
      map.getSource(sourceId).setData(geojson);
    } else {
      map.addSource(sourceId, { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'measure-line',
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': '#d84315',
          'line-width': 3,
          'line-dasharray': [3, 2]
        }
      });
    }

    // Calculate cumulative distance using Haversine
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const p1 = [points[i - 1][1], points[i - 1][0]]; // [lat, lng]
      const p2 = [points[i][1], points[i][0]];
      total += getDistanceKm(p1, p2);
    }
    setMeasureDistance(total);
  };

  const handleClearMeasure = () => {
    setMeasurePoints([]);
    setMeasureDistance(0);
    measureMarkersRef.current.forEach(m => m.remove());
    measureMarkersRef.current = [];
    const map = mapInstanceRef.current;
    if (map) {
      if (map.getLayer('measure-line')) map.removeLayer('measure-line');
      if (map.getSource('measure-line-source')) map.removeSource('measure-line-source');
    }
  };

  // ── TRAVEL TIME TOOL FUNCTIONS ──
  const handleTravelTimeClick = async (lat, lng) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reset if we clicked after 2 points were set
    if (travelPoints.length >= 2) {
      handleClearTravelTime();
    }

    const isStart = travelPoints.length === 0;
    const color = isStart ? '#16a34a' : '#d32f2f'; // Green for A, Red for B
    const label = isStart ? 'A' : 'B';

    const el = document.createElement('div');
    el.style.width = '24px';
    el.style.height = '24px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2px solid #ffffff';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.color = '#ffffff';
    el.style.fontSize = '12px';
    el.style.fontWeight = '800';
    el.style.fontFamily = 'Outfit, sans-serif';
    el.innerText = label;

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    travelMarkersRef.current.push(marker);

    const newPoints = [...travelPoints, { lat, lng }];
    setTravelPoints(newPoints);

    if (newPoints.length === 2) {
      const start = newPoints[0];
      const end = newPoints[1];
      await calculateTravelTimes(start, end);
    }
  };

  const calculateTravelTimes = async (start, end) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    try {
      const modes = [
        { id: 'driving', service: 'driving' },
        { id: 'walking', service: 'foot' },
        { id: 'biking', service: 'bike' }
      ];

      const results = {};
      let routeGeometry = null;

      for (const m of modes) {
        const url = `https://router.project-osrm.org/route/v1/${m.service}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
        let res = await fetch(url);
        let data = await res.json();

        if (!data.routes || data.routes.length === 0) {
          const urlFallback = `https://routing.openstreetmap.de/routed-${m.id}/route/v1/${m.service}/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
          res = await fetch(urlFallback);
          data = await res.json();
        }

        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          results[m.id] = {
            durationMin: Math.max(1, Math.ceil(route.duration / 60)),
            distanceKm: (route.distance / 1000).toFixed(1)
          };
          if (m.id === 'driving') {
            routeGeometry = route.geometry;
          }
        }
      }

      setTravelDurations(results);

      if (routeGeometry) {
        const sourceId = 'travel-route-source';
        if (map.getSource(sourceId)) {
          map.getSource(sourceId).setData(routeGeometry);
        } else {
          map.addSource(sourceId, { type: 'geojson', data: routeGeometry });
          map.addLayer({
            id: 'travel-route-halo',
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#1a73e8',
              'line-width': 8,
              'line-opacity': 0.25
            }
          });
          map.addLayer({
            id: 'travel-route',
            type: 'line',
            source: sourceId,
            paint: {
              'line-color': '#1a73e8',
              'line-width': 4,
              'line-opacity': 0.9,
              'line-dasharray': [2, 1]
            }
          });
        }
      }
    } catch (err) {
      console.warn("Failed to calculate travel times:", err);
      triggerToast("Failed to calculate travel times.");
    }
  };

  const handleClearTravelTime = () => {
    setTravelPoints([]);
    setTravelDurations(null);
    travelMarkersRef.current.forEach(m => m.remove());
    travelMarkersRef.current = [];
    const map = mapInstanceRef.current;
    if (map) {
      if (map.getLayer('travel-route')) map.removeLayer('travel-route');
      if (map.getLayer('travel-route-halo')) map.removeLayer('travel-route-halo');
      if (map.getSource('travel-route-source')) map.removeSource('travel-route-source');
    }
  };

  const handleLayerToggle = (layerId) => {
    if (allowMultipleLayers) {
      setActiveLayers(prev => {
        if (prev.includes(layerId)) {
          return prev.filter(l => l !== layerId);
        } else {
          return [...prev, layerId];
        }
      });
    } else {
      setActiveLayers(prev => prev.includes(layerId) ? [] : [layerId]);
    }
  };

  const handleMapTypeChange = (typeId) => {
    setMapStyle(typeId === 'satellite' ? 'satellite' : 'street');
  };

  const showGridPlaceDetail = (gridAddr, lat, lng) => {
    if (!gridAddr) return;
    const displayLat = lat || mapCenter[0];
    const displayLng = lng || mapCenter[1];
    handleSelectPlaceDetail({
      id: `grid-${gridAddr}`,
      name: `Grid Address: ${gridAddr.slice(0, -1)}`,
      alternateName: 'Micro-Grid Coordinates',
      category: '3x3m Micro-Grid Target',
      rating: 5.0,
      reviewsCount: 1,
      position: [displayLat, displayLng],
      address: `3x3 Meter Micro-Grid · ${gridAddr}`,
      description: 'A verified micro-grid address representing 3x3 meters geographic space.',
      statusText: 'Always Accessible',
      isOpen: true,
      hours: 'Accessible 24/7',
      images: ['https://images.unsplash.com/photo-1524661135-423995f22d0b?w=500&auto=format&fit=crop'],
      isGrid: true
    });
  };

  const handlePostLocationFabClick = () => {
    if (clickedBoxAddress) {
      setPostCoords({ lat: clickedBoxAddress.lat, lng: clickedBoxAddress.lng });
      setPostGridAddress(clickedBoxAddress.address);
      setPostTitle(clickedBoxAddress.address);
    } else {
      const map = mapInstanceRef.current;
      if (map) {
        const center = map.getCenter();
        setPostCoords({ lat: center.lat, lng: center.lng });
      } else {
        setPostCoords({ lat: mapCenter[0], lng: mapCenter[1] });
      }
    }
    setShowPostModal(true);
  };


  // Map Click encoder (Grid coding)
  const handleMapClick = async (e) => {
    const { lat, lng } = e.latlng;

    // Ensure Place Details Card (bottom-left drawer) is closed when clicking map
    setSelectedPlace(null);

    // Intercept click if tools active
    if (activeTool === 'measure') {
      handleMeasureClick(lat, lng);
      return;
    }
    if (activeTool === 'travel-time') {
      handleTravelTimeClick(lat, lng);
      return;
    }

    if (inDirectionsMode || isSimulatingNav) return;

    setIsLocatingGrid(true);
    setTempTargetCoords({ lat, lng });

    const startTime = Date.now();
    try {
      let displayLat = lat;
      let displayLng = lng;
      let gridAddr = `Resolving Address...`;

      try {
        const res = await api.get('/location/encode', { params: { lat, lng } });
        displayLat = res.data.center_lat || lat;
        displayLng = res.data.center_lng || lng;
        gridAddr = res.data.address;
      } catch (encodeErr) {
        console.warn('Backend encode API unavailable, using clicked coords:', encodeErr);
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 300 - elapsed);
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }

      setClickedBoxAddress({ lat: displayLat, lng: displayLng, address: gridAddr });
    } catch (err) {
      console.warn('Could not encode clicked location:', err);
    } finally {
      setIsLocatingGrid(false);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Maplibre Canvas ── */}
      <div
        ref={mapContainerRef}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }}
      />

      {/* ── Glass Toast Messages ── */}
      {toastMessage && (
        <div className="glass-toast" style={{
          position: 'absolute',
          top: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 350,
          background: 'rgba(15, 23, 42, 0.94)',
          color: '#ffffff',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '8px 18px',
          fontSize: 12,
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <Sparkles size={14} style={{ color: '#38bdf8' }} />
          {toastMessage}
        </div>
      )}

      {/* ── STATE 3: Active Turn-by-Turn GPS Navigation HUD (Simulation) ── */}
      {isSimulatingNav && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1.5rem',
          right: '1.5rem',
          maxWidth: 480,
          margin: '0 auto',
          zIndex: 250,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          animation: 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <div style={{
            background: '#0F5257',
            color: '#ffffff',
            borderRadius: '20px',
            padding: '14px 18px',
            boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CornerUpRight size={24} style={{ color: '#34d399' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6ee7b7' }}>
                In 150 meters
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {routeInfo?.steps?.[navStepIndex]?.name ? `Turn right onto ${routeInfo.steps[navStepIndex].name}` : `Follow route to ${navTarget?.name}`}
              </div>
            </div>
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>
                {navRemainingTime} <span style={{ fontSize: 13, fontWeight: 600 }}>min</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                {navRemainingDist} km left · ETA {new Date(Date.now() + navRemainingTime * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <button
              onClick={() => {
                if (animIntervalRef.current) clearInterval(animIntervalRef.current);
                setIsSimulatingNav(false);
                triggerToast('Navigation ended');
              }}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '8px 16px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
              }}
            >
              <Square size={14} fill="#ffffff" />
              Exit Nav
            </button>
          </div>
        </div>
      )}

      {/* ── SEARCH DISAMBIGUATION OVERLAYS (Chips & Suggestions list) ── */}
      {!isSimulatingNav && (
        <div style={{
          position: 'absolute',
          top: '7rem', // Float cleanly below the main top bar header
          left: '1.5rem',
          zIndex: 110,
          width: 'calc(100% - 3rem)',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 10
        }}>
          {/* QUICK CATEGORY CHIPS BAR (Only visible in normal home state to reduce clutter) */}
          {!isSearchFlowActive && (
            <div style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 4,
              scrollbarWidth: 'none',
            }}>
              {QUICK_CATEGORIES.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCategoryClick(cat)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.88)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                    fontFamily: "'Outfit', sans-serif",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.88)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Instant Dropdown Search Suggestions */}
          {showSearchDropdown && searchQuery && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(28px)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '20px',
              padding: '10px',
              boxShadow: '0 16px 40px rgba(0,0,0,0.15)',
              maxHeight: 280,
              overflowY: 'auto',
              animation: 'fadeIn 0.2s ease',
            }}>
              {isSearching ? (
                /* SKELETON LOADER (Spec: Slow network skeletons) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 8 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="skeleton-block" style={{ width: 32, height: 32, borderRadius: '50%', background: '#e2e8f0' }}></div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="skeleton-block" style={{ width: '60%', height: 12, borderRadius: 4, background: '#e2e8f0' }}></div>
                        <div className="skeleton-block" style={{ width: '40%', height: 10, borderRadius: 4, background: '#e2e8f0' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {/* Matches List */}
                  {RICH_PLACES.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map((place) => (
                    <div
                      key={place.id}
                      onClick={() => handleSelectPlaceDetail(place)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 12px',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(66, 133, 244, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <MapPin size={16} style={{ color: '#EA4335' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.name}</div>
                        <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{place.address}</div>
                      </div>
                    </div>
                  ))}
                  {/* General search suggestion */}
                  <div
                    onClick={() => handleSearchInput(searchQuery)}
                    style={{ fontSize: 11, color: '#4285F4', fontWeight: 700, padding: '8px 12px', borderTop: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}
                  >
                    <Search size={12} /> Search for "{searchQuery}"
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STATE 1: AMBIGUOUS QUERY → SUGGESTION LIST CARD OVERLAY ── */}
      {ambiguousList.length > 0 && !isSimulatingNav && (
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '1.5rem',
          width: 'calc(100% - 3rem)',
          maxWidth: 420,
          maxHeight: '520px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          boxShadow: '0 20px 45px rgba(0,0,0,0.18)',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Header summary of matching count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>Multiple matches found</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b' }}>Showing {ambiguousList.length} items ranked by relevance</div>
            </div>
            <button
              onClick={() => setAmbiguousList([])}
              style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* List candidate items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
            {ambiguousList.map((item, idx) => {
              const ratingVal = item.rating || 4.5;
              const reviews = item.reviewsCount || 45;
              const isClosed = !item.isOpen;

              return (
                <div key={item.id} style={{
                  padding: '16px 4px',
                  borderBottom: idx === ambiguousList.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  {/* Name, category badge, and index */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div
                        onClick={() => handleSelectPlaceDetail(item)}
                        style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'baseline' }}
                      >
                        <span style={{ color: '#EA4335', fontWeight: 900 }}>{idx + 1}.</span>
                        <span className="hover-underline">{item.name}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.category}</div>
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '2px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                      {formatDistance(getDistanceKm([22.5726, 88.3639], item.position))}
                    </span>
                  </div>

                  {/* Rating + Proximity/Relevance */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#f59e0b', fontWeight: 800 }}>
                      <Star size={13} fill="#f59e0b" /> {ratingVal}
                    </span>
                    <span style={{ color: '#64748b' }}>({reviews})</span>
                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#94a3b8' }}></span>
                    <span style={{
                      fontWeight: 700,
                      color: isClosed ? '#dc2626' : '#16a34a'
                    }}>
                      {isClosed ? `Closed · Opens 10:00 AM` : `Open · Closes 6:00 PM`}
                    </span>
                  </div>

                  {/* User-uploaded Photo Strip */}
                  {item.images && item.images.length > 0 && (
                    <div style={{
                      display: 'flex',
                      gap: 8,
                      overflowX: 'auto',
                      scrollbarWidth: 'none',
                      padding: '2px 0'
                    }}>
                      {item.images.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt="Place photo"
                          style={{ width: 100, height: 65, borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.06)' }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Description snippet */}
                  <div style={{ fontSize: 12, color: '#475569', lineHeight: '1.4' }}>
                    {item.description}
                  </div>

                  {/* Action buttons row */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button
                      onClick={() => handleSelectPlaceDetail(item)}
                      style={{
                        flex: 1,
                        background: '#f1f5f9',
                        color: '#1e293b',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    >
                      Select
                    </button>

                    <button
                      onClick={() => handleOpenDirections(item)}
                      style={{
                        flex: 1.2,
                        background: '#1A73E8',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '14px',
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        boxShadow: '0 4px 10px rgba(26,115,232,0.25)'
                      }}
                    >
                      <Navigation size={13} fill="#ffffff" />
                      Directions
                    </button>

                    <button
                      onClick={() => toggleSavePlace(item)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '14px',
                        width: 38,
                        height: 36,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: savedPlaces.some(p => p.id === item.id) ? '#d97706' : '#475569'
                      }}
                      title="Save Bookmark"
                    >
                      <Bookmark size={14} fill={savedPlaces.some(p => p.id === item.id) ? '#d97706' : 'none'} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STATE 2: EXACT MATCH → SINGLE ITEM DETAIL VIEW ── */}
      {selectedPlace && !inDirectionsMode && !isSimulatingNav && (
        <div style={{
          position: 'absolute',
          bottom: '1.5rem',
          left: '1.5rem',
          width: 'calc(100% - 3rem)',
          maxWidth: 400,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '18px',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.18)',
          zIndex: 150,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          {/* Header Action row / Title details */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', color: '#1A73E8', background: 'rgba(26,115,232,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                  {selectedPlace.category}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Star size={12} fill="#f59e0b" /> {selectedPlace.rating}
                </span>
                <span style={{ fontSize: 10, color: '#64748b' }}>({selectedPlace.reviewsCount || 10})</span>
              </div>

              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', lineHeight: '1.3' }}>
                {selectedPlace.name}
              </div>

              {selectedPlace.alternateName && (
                <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 1 }}>
                  {selectedPlace.alternateName}
                </div>
              )}
            </div>

            {/* Utility icons inside exact detail */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => toggleSavePlace(selectedPlace)}
                style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: savedPlaces.some(p => p.id === selectedPlace.id) ? '#d97706' : '#64748b' }}
                title="Save Place"
              >
                <Bookmark size={14} fill={savedPlaces.some(p => p.id === selectedPlace.id) ? '#d97706' : 'none'} />
              </button>

              <button
                onClick={() => setSelectedPlace(null)}
                style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
                title="Close Info Card"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Place specific ratings metadata & proximity */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(22,163,74,0.1)', color: '#16a34a', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
              ⚡ {formatDistance(getDistanceKm([22.5726, 88.3639], selectedPlace.position))} away
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#cbd5e1' }}></span>
            <span style={{ fontWeight: 700, color: selectedPlace.isOpen ? '#16a34a' : '#dc2626' }}>
              {selectedPlace.statusText}
            </span>
          </div>

          <div style={{ fontSize: 12, color: '#475569', lineHeight: '1.4' }}>
            {selectedPlace.description}
          </div>

          {/* Details / Address row */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '8px 12px', background: 'rgba(0,0,0,0.02)', borderRadius: '14px', fontSize: 11, color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Address:</span>
              <span>{selectedPlace.address}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Hours:</span>
              <span>{selectedPlace.hours}</span>
            </div>
            {selectedPlace.phone && selectedPlace.phone !== 'N/A' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 700 }}>Phone:</span>
                <span style={{ color: '#1A73E8', cursor: 'pointer' }}>{selectedPlace.phone}</span>
              </div>
            )}
          </div>

          {/* Photo Gallery & Direct Upload Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Photos ({selectedPlace.images?.length || 0})
              </span>
              <label style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.08)',
                padding: '4px 10px',
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                transition: 'all 0.2s'
              }}>
                <span>📷 Upload Photo</span>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleDirectPhotoUpload}
                />
              </label>
            </div>

            {selectedPlace.images && selectedPlace.images.length > 0 ? (
              <div style={{ display: 'flex', gap: 8, height: 108, borderRadius: 14, overflow: 'hidden' }}>
                <img
                  src={selectedPlace.images[0]}
                  alt="Location photo"
                  style={{ width: selectedPlace.images.length > 1 ? '62%' : '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
                />
                {selectedPlace.images.length > 1 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedPlace.images.slice(1, 3).map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Location photo"
                        style={{ flex: 1, width: '100%', objectFit: 'cover', borderRadius: '10px' }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <label style={{
                height: 72,
                borderRadius: 14,
                background: 'rgba(16,185,129,0.03)',
                border: '1.5px dashed rgba(16,185,129,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: '#10B981',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer'
              }}>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleDirectPhotoUpload}
                />
                <span>📷 Tap here to upload a photo for this location</span>
              </label>
            )}
          </div>

          {/* Reaction Bar (For custom posted locations) */}
          {selectedPlace.isPost && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 14px', background: 'rgba(0,0,0,0.02)', borderRadius: '14px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Reactions & Feedback
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {['👍', '❤️', '🔥', '🎉', '😮'].map(emoji => {
                  const counts = countReactions(selectedPlace.reactions);
                  const count = counts[emoji] || 0;
                  const hasReacted = selectedPlace.reactions?.[currentUserId] === emoji;

                  return (
                    <button
                      key={emoji}
                      onClick={() => handleToggleReaction(selectedPlace.id, emoji)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: hasReacted ? '#10B981' : 'rgba(0,0,0,0.06)',
                        background: hasReacted ? 'rgba(16, 185, 129, 0.05)' : '#ffffff',
                        fontSize: 12,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.2s'
                      }}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span style={{ fontWeight: 700, color: hasReacted ? '#10B981' : '#64748b' }}>{count}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <button
              onClick={() => handleOpenDirections(selectedPlace)}
              style={{
                flex: 1.5,
                background: '#1A73E8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '16px',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(26,115,232,0.3)',
              }}
            >
              <Navigation size={14} fill="#ffffff" />
              Directions
            </button>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`${selectedPlace.name}: ${selectedPlace.address}`);
                triggerToast('Copied address detail! 📋');
              }}
              style={{
                flex: 1,
                background: 'rgba(0,0,0,0.04)',
                border: 'none',
                borderRadius: '16px',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 700,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <Copy size={13} />
              Copy
            </button>

            {selectedPlace.isPost && selectedPlace.userId === currentUserId ? (
              <button
                onClick={() => handleDeletePost(selectedPlace.id)}
                style={{
                  flex: 1,
                  background: 'rgba(220,38,38,0.1)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#dc2626',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Trash2 size={13} />
                Delete
              </button>
            ) : (
              <button
                onClick={() => {
                  if (selectedPlace.phone && selectedPlace.phone !== 'N/A') {
                    triggerToast(`Calling ${selectedPlace.phone}...`);
                  } else {
                    triggerToast('No phone number available.');
                  }
                }}
                style={{
                  flex: 1,
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                }}
              >
                <Phone size={13} />
                Call
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STATE 3: DIRECTIONS & ROUTE VIEW SETUP PANEL ── */}
      {inDirectionsMode && navTarget && (
        <div style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1.5rem',
          zIndex: 200,
          width: 'calc(100% - 3rem)',
          maxWidth: 420,
          background: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(28px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          borderRadius: '24px',
          padding: '14px 18px',
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          animation: 'fadeIn 0.3s ease',
        }}>
          {/* Header fields: Origin, Target, Swapper, Close, and Options Overflow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Design elements route dots */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1A73E8', border: '2px solid #fff', boxShadow: '0 0 4px rgba(26,115,232,0.5)' }}></div>
              <div style={{ width: 2, height: 20, background: '#cbd5e1', borderRadius: 1 }}></div>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#EA4335', border: '2px solid #fff', boxShadow: '0 0 4px rgba(234,67,53,0.5)' }}></div>
            </div>

            {/* Inputs displays */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Origin */}
              <div style={{
                background: 'rgba(241, 245, 249, 0.8)',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{originTarget.name}</span>
                <span style={{ fontSize: 10, color: '#1A73E8', fontWeight: 700 }}>Start</span>
              </div>

              {/* Destination */}
              <div style={{
                background: 'rgba(241, 245, 249, 0.8)',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{navTarget.name}</span>
                <span style={{ fontSize: 10, color: '#EA4335', fontWeight: 700 }}>End</span>
              </div>
            </div>

            {/* Actions panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
              <button
                onClick={handleSwapLocations}
                style={{
                  background: 'rgba(66, 133, 244, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#1A73E8',
                }}
                title="Swap Locations"
              >
                <ArrowUpDown size={14} />
              </button>

              <button
                onClick={() => setShowRoutesMenu(p => !p)}
                style={{
                  background: 'rgba(0,0,0,0.04)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#475569',
                }}
                title="Route Options"
              >
                <MoreVertical size={14} />
              </button>

              <button
                onClick={handleResetSearch}
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ef4444',
                }}
                title="Cancel Route"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Options Dropdown Overlay */}
          {showRoutesMenu && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '10px',
              fontSize: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              animation: 'fadeIn 0.2s'
            }}>
              <div style={{ fontWeight: 700, color: '#334155' }}>Route Preferences</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={avoidTolls}
                  onChange={() => {
                    setAvoidTolls(!avoidTolls);
                    triggerToast(!avoidTolls ? 'Avoiding toll roads 🛣️' : 'Including toll roads');
                  }}
                />
                Avoid Tolls
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked />
                Prefer eco-friendly routing
              </label>
            </div>
          )}

          {/* Transport mode tabs */}
          <div style={{ display: 'flex', gap: 3, background: 'rgba(241, 245, 249, 0.95)', padding: 3, borderRadius: '16px' }}>
            {[
              { id: 'driving', label: 'Drive', icon: <Car size={13} />, duration: routeInfo ? `${routeInfo.durationMin}m` : '--' },
              { id: 'twowheeler', label: 'Moto', icon: <Bike size={13} />, duration: routeInfo ? `${Math.ceil(routeInfo.durationMin * 0.75)}m` : '--' },
              { id: 'transit', label: 'Transit', icon: <Bus size={13} />, duration: routeInfo ? `${Math.ceil(routeInfo.durationMin * 1.8)}m` : '--' },
              { id: 'walking', label: 'Walk', icon: <Footprints size={13} />, duration: routeInfo ? `${Math.ceil(routeInfo.durationMin * 4.2)}m` : '--' },
            ].map((mode) => (
              <button
                key={mode.id}
                onClick={() => setTravelMode(mode.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  padding: '6px 4px',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: travelMode === mode.id ? '#1A73E8' : 'transparent',
                  color: travelMode === mode.id ? '#ffffff' : '#64748b',
                  transition: 'all 0.2s',
                  fontFamily: "'Outfit', sans-serif",
                }}
              >
                {mode.icon}
                <span>{mode.duration}</span>
              </button>
            ))}
          </div>

          {/* Selected mode rationale details */}
          {routeInfo && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'rgba(22, 163, 74, 0.05)', borderRadius: '14px', border: '1px solid rgba(22, 163, 74, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#16a34a' }}>{routeInfo.durationMin} min</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>({routeInfo.distanceKm} km)</span>
              </div>
              <div style={{ fontSize: 11, color: '#3f6212', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                🌱 Fastest route due to traffic. Saves 8% fuel.
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setShowStepsDrawer(prev => !prev)}
              style={{
                flex: 1,
                background: '#f1f5f9',
                color: '#1e293b',
                border: 'none',
                borderRadius: '14px',
                padding: '10px 14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              Steps {showStepsDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            <button
              onClick={handleStartSimulatedNav}
              style={{
                flex: 1.5,
                background: '#16a34a',
                border: 'none',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '14px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
              }}
            >
              <Navigation size={14} fill="#ffffff" />
              Start Nav
            </button>
          </div>

          {/* Route turn steps details list */}
          {showStepsDrawer && routeInfo?.steps && (
            <div style={{
              maxHeight: 160,
              overflowY: 'auto',
              borderTop: '1px solid rgba(0,0,0,0.06)',
              paddingTop: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {routeInfo.steps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 11, color: '#0f172a' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(26,115,232,0.1)', color: '#1A73E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    {getStepIcon(step.maneuver?.type, step.maneuver?.modifier)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{step.name ? `Onto ${step.name}` : step.maneuver?.type}</div>
                    <div style={{ color: '#64748b', fontSize: 10 }}>{(step.distance / 1000).toFixed(2)} km · {Math.ceil(step.duration)} sec</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 5. Standard Map layer control buttons (Disappear in search flow) ── */}
      {!isSearchFlowActive && (
        <div style={{
          position: 'absolute',
          top: '6.5rem',
          right: '1.5rem',
          zIndex: 499,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* 1. Address Tracker Collapse/Expand FAB */}
          <button
            onClick={() => setIsAddressTrackerCollapsed(prev => !prev)}
            aria-label="Toggle Grid Tracker"
            title="Toggle Grid Address Tracker"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: !isAddressTrackerCollapsed ? '#1a73e8' : '#5f6368',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            <MapIcon size={18} />
          </button>

          {/* 2. Layers FAB Trigger */}
          <button
            className="layers-fab-trigger"
            onClick={() => setIsLayersPanelOpen(prev => !prev)}
            aria-label="Map layers and tools"
            title="Map layers & tools"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: isLayersPanelOpen ? '#1a73e8' : '#5f6368',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            <Sliders size={18} />
          </button>

          {/* 3. Post Location FAB */}
          <button
            onClick={handlePostLocationFabClick}
            aria-label="Post Location to Orb"
            title="Post Location to Orb"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#d97706',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            <Sparkles size={18} />
          </button>

          {/* 4. GPS Re-center FAB */}
          <button
            onClick={() => locateUser(false)}
            aria-label="Recenter to GPS Location"
            title="Recenter to GPS Location"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0,0,0,0.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#10B981',
              transition: 'all 0.2s',
              outline: 'none'
            }}
          >
            <Navigation size={18} fill="#10B981" />
          </button>
        </div>
      )}

      {/* Map Details Overlay Panel */}
      {isLayersPanelOpen && !isSearchFlowActive && (
        <MapDetailsPanel
          selectedLayers={activeLayers}
          selectedMapType={mapStyle === 'satellite' ? 'satellite' : 'default'}
          allowMultiple={allowMultipleLayers}
          setAllowMultiple={setAllowMultipleLayers}
          onLayerToggle={handleLayerToggle}
          onMapTypeChange={handleMapTypeChange}
          onToolSelect={(toolId) => {
            setActiveTool(prev => prev === toolId ? null : toolId);
          }}
          onClose={() => setIsLayersPanelOpen(false)}
        />
      )}

      {/* Active Tool Control Banner */}
      {activeTool && !isSearchFlowActive && (
        <div className="glass-morphism" style={{
          position: 'absolute',
          top: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 499,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '10px 18px',
          borderRadius: '20px',
          border: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
          fontFamily: "'Outfit', sans-serif",
          animation: 'slideInDown 0.3s'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>
              {activeTool === 'measure' ? '📏' : '⏱️'}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
              {activeTool === 'measure'
                ? `Measure: ${formatDistance(measureDistance) || 'Click map to drop nodes'}`
                : travelPoints.length === 0
                  ? 'Travel Time: Click point A (start)'
                  : travelPoints.length === 1
                    ? 'Travel Time: Click point B (end)'
                    : 'Travel Time: Calculated!'
              }
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {((activeTool === 'measure' ? measurePoints.length > 0 : travelPoints.length > 0)) && (
              <button
                onClick={activeTool === 'measure' ? handleClearMeasure : handleClearTravelTime}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  fontFamily: 'inherit'
                }}
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setActiveTool(null)}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 700,
                color: '#ef4444',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                fontFamily: 'inherit'
              }}
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Floating Active Layers HUD Status Pill */}
      {activeLayers.length > 0 && !isSearchFlowActive && (
        <div
          className="glass-morphism animate-slide-in-up"
          onClick={() => setIsLayersPanelOpen(prev => !prev)}
          title="Click to manage map layers"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '5.5rem',
            zIndex: 490,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            color: '#ffffff',
            backdropFilter: 'blur(16px)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
          <span>Active: {activeLayers.map(l => l.charAt(0).toUpperCase() + l.slice(1)).join(', ')}</span>
        </div>
      )}

      {/* Travel Time Results Details Card */}
      {activeTool === 'travel-time' && travelDurations && !isSearchFlowActive && (
        <div className="glass-morphism animate-slide-in-up" style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 499,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          padding: '16px 20px',
          borderRadius: '24px',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          minWidth: 280,
          fontFamily: "'Outfit', sans-serif",
          animation: 'slideInUp 0.3s'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>⏱️ Route Travel Times</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#1a73e8', backgroundColor: 'rgba(26,115,232,0.06)', padding: '2px 8px', borderRadius: 8 }}>
              {travelDurations.driving?.distanceKm || '0'} km
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { mode: 'driving', label: 'Driving', icon: '🚗', color: '#3b82f6' },
              { mode: 'biking', label: 'Biking', icon: '🚴', color: '#10b981' },
              { mode: 'walking', label: 'Walking', icon: '🚶', color: '#f59e0b' }
            ].map(item => {
              const info = travelDurations[item.mode];
              return (
                <div key={item.mode} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: item.color }}>
                    {info ? `${info.durationMin} min` : '--'}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleClearTravelTime}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: 12,
              border: 'none',
              backgroundColor: '#1a73e8',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(26,115,232,0.2)',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            Clear Route
          </button>
        </div>
      )}

      {/* Floating Active Layers HUD Status Pill */}
      {activeLayers.length > 0 && !isSearchFlowActive && (
        <div
          className="glass-morphism animate-slide-in-up"
          onClick={() => setIsLayersPanelOpen(prev => !prev)}
          title="Click to manage map layers"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '5.5rem',
            zIndex: 490,
            backgroundColor: 'rgba(15, 23, 42, 0.88)',
            color: '#ffffff',
            backdropFilter: 'blur(16px)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif"
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }} />
          <span>Active: {activeLayers.map(l => l === 'traffic' ? 'Roadways' : (l === 'transit' ? 'Railway' : (l.charAt(0).toUpperCase() + l.slice(1)))).join(', ')}</span>
        </div>
      )}



      {/* ── Grid Address Tracker (My Location vs Targeted Location) ── */}
      {!isSearchFlowActive && !isAddressTrackerCollapsed && (
        /* Expanded Card Style Comparison Panel */
        <div className="glass-morphism animate-slide-in-up" style={{
          position: 'absolute',
          top: '6.5rem',
          right: isLayersPanelOpen ? '19.5rem' : '5.5rem',
          zIndex: 499,
          width: '280px',
          background: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          borderRadius: '20px',
          padding: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          fontFamily: "'Outfit', sans-serif",
          transition: 'right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {/* User Address (My Location) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                My Grid Location
              </span>
              {userGridAddress && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(userGridAddress);
                    triggerToast('Copied My Grid Code!');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#1a73e8',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: 'inherit'
                  }}
                >
                  Copy
                </button>
              )}
            </div>
            <button
              onClick={() => showGridPlaceDetail(userGridAddress, mapCenter[0], mapCenter[1])}
              disabled={!userGridAddress}
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: userGridAddress ? '#1a73e8' : '#94a3b8',
                backgroundColor: 'rgba(26,115,232,0.04)',
                padding: '6px 10px',
                borderRadius: '10px',
                border: '1.5px solid rgba(26,115,232,0.08)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                textAlign: 'left',
                cursor: userGridAddress ? 'pointer' : 'default',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              className="grid-link-button"
            >
              {userGridAddress || 'Locating current GPS...'}
            </button>
          </div>

          {/* Tapped Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                🎯 Targeted Grid
              </span>
              {clickedBoxAddress && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(clickedBoxAddress.address);
                      triggerToast('Copied Target Grid Code! 📋');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#16a34a',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'inherit'
                    }}
                  >
                    Copy
                  </button>
                  <span style={{ color: '#cbd5e1', fontSize: 10 }}>|</span>
                  <button
                    onClick={() => setClickedBoxAddress(null)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#ef4444',
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: 'inherit'
                    }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={() => showGridPlaceDetail(clickedBoxAddress.address, clickedBoxAddress.lat, clickedBoxAddress.lng)}
              disabled={!clickedBoxAddress}
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: clickedBoxAddress ? '#16a34a' : '#64748b',
                backgroundColor: clickedBoxAddress ? 'rgba(22,163,74,0.04)' : 'rgba(0,0,0,0.02)',
                padding: '6px 10px',
                borderRadius: '10px',
                border: clickedBoxAddress ? '1.5px solid rgba(22,163,74,0.08)' : '1px dashed rgba(0,0,0,0.08)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                textAlign: 'left',
                cursor: clickedBoxAddress ? 'pointer' : 'default',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              className="grid-link-button"
            >
              {clickedBoxAddress ? clickedBoxAddress.address : 'Click map to target...'}
            </button>
            {clickedBoxAddress && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(99,102,241,0.06)', padding: '10px 12px', borderRadius: '14px', marginTop: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Nudge D-Pad (1 Box)
                  </span>
                  {isLocatingGrid && (
                    <span style={{ fontSize: 9, color: '#6366f1', fontWeight: 600, opacity: 0.85, animation: 'pulse 1.2s infinite' }}>
                      Encoding...
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button className="grid-card-nudge-btn" onClick={() => nudgeGridLocation('left')} title="Nudge West (Left Arrow)" aria-label="Nudge West">
                      <ChevronLeft size={18} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textShadow: '0 1px 2px rgba(99, 102, 241, 0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      West
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button className="grid-card-nudge-btn" onClick={() => nudgeGridLocation('north')} title="Nudge North (Up Arrow)" aria-label="Nudge North">
                      <ChevronUp size={18} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textShadow: '0 1px 2px rgba(99, 102, 241, 0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      North
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button className="grid-card-nudge-btn" onClick={() => nudgeGridLocation('south')} title="Nudge South (Down Arrow)" aria-label="Nudge South">
                      <ChevronDown size={18} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textShadow: '0 1px 2px rgba(99, 102, 241, 0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      South
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <button className="grid-card-nudge-btn" onClick={() => nudgeGridLocation('right')} title="Nudge East (Right Arrow)" aria-label="Nudge East">
                      <ChevronRight size={18} strokeWidth={2.5} />
                    </button>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#6366f1', textShadow: '0 1px 2px rgba(99, 102, 241, 0.25)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      East
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CUSTOM POST LOCATION DIALOG MODAL ── */}
      {showPostModal && postCoords && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          animation: 'fadeIn 0.25s ease'
        }}>
          <div style={{
            width: '100%',
            maxWidth: 380,
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            fontFamily: "'Outfit', sans-serif"
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={18} style={{ color: '#d97706' }} /> Post Location to Orb
              </h3>
              <button
                onClick={() => { setShowPostModal(false); setPostPhotos([]); }}
                style={{ background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#64748b', background: '#f8fafc', padding: '12px 14px', borderRadius: '14px', border: '1.5px solid rgba(99,102,241,0.18)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 9, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Grid size={11} style={{ color: '#6366f1' }} />
                  <span>GRID NAME</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', letterSpacing: '-0.01em', wordBreak: 'break-word' }}>
                  {postGridName || formatGridName(postGridAddress || clickedBoxAddress?.address) || 'Resolving Grid Name...'}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: 8 }}>
                <div style={{ fontWeight: 800, fontSize: 9, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🎯 GRID ADDRESS / CODE</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', letterSpacing: '-0.01em', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {postGridAddress || clickedBoxAddress?.address || postTitle || 'Encoding 3x3m Grid...'}
                </div>
              </div>

              <div style={{ borderTop: '1px dashed rgba(0,0,0,0.08)', paddingTop: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>COORDINATES</div>
                <div style={{ fontWeight: 600, color: '#475569', fontSize: 12 }}>{postCoords.lat.toFixed(5)}, {postCoords.lng.toFixed(5)}</div>
              </div>
            </div>

            <form onSubmit={handleCreatePost} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>TITLE / NAME</label>
                <input
                  type="text"
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="e.g., Hidden Rooftop View"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(0,0,0,0.08)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>DESCRIPTION / TIPS</label>
                <textarea
                  value={postDesc}
                  onChange={(e) => setPostDesc(e.target.value)}
                  placeholder="Share details, access codes, or why this place is special..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(0,0,0,0.08)',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    outline: 'none',
                    background: '#f8fafc',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Photo Upload */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>PHOTOS (UP TO 3)</label>
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    padding: '14px',
                    borderRadius: '14px',
                    border: '1.5px dashed rgba(16,185,129,0.4)',
                    background: postPhotos.length > 0 ? 'rgba(16,185,129,0.03)' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      const validFiles = files.filter(file => {
                        const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
                        const validExtensions = ['.jpg', '.jpeg', '.png'];
                        const lowerName = file.name.toLowerCase();

                        const hasValidType = validTypes.includes(file.type);
                        const hasValidExt = validExtensions.some(ext => lowerName.endsWith(ext));

                        if (!hasValidType || !hasValidExt) {
                          alert("Only JPG, JPEG, and PNG image formats are supported.");
                          return false;
                        }
                        return true;
                      }).slice(0, 3);

                      const readers = validFiles.map(file => new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = ev => resolve(ev.target.result);
                        reader.readAsDataURL(file);
                      }));
                      Promise.all(readers).then(results => setPostPhotos(results));
                    }}
                  />
                  {postPhotos.length > 0 ? (
                    <div style={{ display: 'flex', gap: 6, width: '100%' }}>
                      {postPhotos.map((src, i) => (
                        <img key={i} src={src} alt="Preview" style={{ flex: 1, height: 60, objectFit: 'cover', borderRadius: 10 }} />
                      ))}
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: 22 }}>📷</span>
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>Tap to upload photos</span>
                      <span style={{ fontSize: 10, color: '#cbd5e1' }}>JPG, PNG, WEBP · max 3 photos</span>
                    </>
                  )}
                </label>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>VISIBILITY PRIVACY</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { id: 'public', label: '🌍 Public', desc: 'Anyone can see' },
                    { id: 'friends', label: '👥 Friends', desc: 'Mutual friends' },
                    { id: 'private', label: '🔒 Private', desc: 'Only me' }
                  ].map(tier => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setPostVisibility(tier.id)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: postVisibility === tier.id ? '#10B981' : 'rgba(0,0,0,0.06)',
                        background: postVisibility === tier.id ? 'rgba(16, 185, 129, 0.05)' : '#ffffff',
                        fontSize: 11,
                        fontWeight: 700,
                        color: postVisibility === tier.id ? '#10B981' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <span>{tier.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                style={{
                  background: '#10B981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  padding: '12px',
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginTop: 6,
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                <Navigation size={14} fill="#ffffff" /> Post Location (+100 XP)
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 99, fontSize: 9, color: 'rgba(0,0,0,0.4)', background: 'rgba(255,255,255,0.7)', padding: '2px 6px', borderRadius: 4 }}>
        {mapStyle === 'street' ? '© OpenFreeMap © OpenStreetMap' : '© Esri World Imagery © OpenStreetMap'}
      </div>

      {/* Animations styling */}
      <style>{`
        .hover-underline:hover {
          text-decoration: underline;
        }

        .skeleton-block {
          animation: pulseSkeleton 1.5s infinite ease-in-out;
        }

        @keyframes pulseSkeleton {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }

        @keyframes dropPin {
          0% { transform: translateY(-40px) scale(0.6); opacity: 0; }
          60% { transform: translateY(5px) scale(1.1); opacity: 1; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }

        @keyframes spinHorizontal {
          from { transform: rotateY(0deg); }
          to { transform: rotateY(360deg); }
        }

        @keyframes pulseNavPin {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26,115,232,0.6); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 16px rgba(26,115,232,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(26,115,232,0); }
        }

        .grid-link-button:hover:not(:disabled) {
          background-color: rgba(0, 0, 0, 0.05) !important;
          text-decoration: underline;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -15px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
