import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  MoreHorizontal, Award, UserPlus, ShieldAlert,
  Copy, Edit3, LogOut, Check, Sparkles,
  Lock, X, Camera, Plus, Trash2, CheckCircle, MapPin, Palette, Undo2,
  BookOpen, Map as MapIcon, Heart, ArrowLeft, Image
} from 'lucide-react';
import './Profile.css';
import { compressImage } from '../../utils/imageCompressor';
import { escapeHtml } from '../../utils/escapeHtml';

// ─── Default Stamps (City→Place data model) ───────────────────────────────────
const DEFAULT_STAMPS = [
  {
    id: 'stamp-victoria-memorial',
    placeName: 'Victoria Memorial',
    city: 'Kolkata',
    lat: 22.5448,
    lng: 88.3426,
    photos: [
      {
        id: 'kolkata-1',
        url: 'https://images.unsplash.com/photo-1558431382-27e303142255?q=80&w=600&auto=format&fit=crop',
        caption: 'Witnessing the breathtaking, serene Victoria Memorial in early morning fog.',
        location: 'Victoria Memorial, Kolkata',
        likes: 12,
      },
    ],
  },
  {
    id: 'stamp-howrah-bridge',
    placeName: 'Howrah Bridge',
    city: 'Kolkata',
    lat: 22.5851,
    lng: 88.3468,
    photos: [
      {
        id: 'kolkata-2',
        url: 'https://images.unsplash.com/photo-1605649487212-47bdab064df7?q=80&w=600&auto=format&fit=crop',
        caption: 'Yellow taxi cruising under the iconic Howrah Bridge.',
        location: 'Howrah Bridge, Kolkata',
        likes: 8,
      },
    ],
  },
  {
    id: 'stamp-palolem-beach',
    placeName: 'Palolem Beach',
    city: 'Goa',
    lat: 15.0100,
    lng: 74.0230,
    photos: [
      {
        id: 'goa-1',
        url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
        caption: 'Warm sands and golden hours at an incredible silent ocean bay.',
        location: 'Palolem Beach, South Goa',
        likes: 24,
      },
    ],
  },
  {
    id: 'stamp-gateway-of-india',
    placeName: 'Gateway of India',
    city: 'Mumbai',
    lat: 18.9220,
    lng: 72.8347,
    photos: [
      {
        id: 'mumbai-1',
        url: 'https://images.unsplash.com/photo-1566552881560-0be862a7c445?q=80&w=600&auto=format&fit=crop',
        caption: 'Elegant flights of pigeons near the majestic Gateway of India.',
        location: 'Colaba, Mumbai',
        likes: 19,
      },
    ],
  },
];

// ─── Nominatim reverse-geocode helper ────────────────────────────────────────
const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    const addr = data.address || {};
    return (
      addr.city || addr.town || addr.village ||
      addr.municipality || addr.county || addr.state || 'Unknown'
    );
  } catch (_) {
    return 'Unknown';
  }
};

// ─── MapLibre marker and clustering helpers are handled natively inside FullScreenMapPortfolio ───

const FullScreenMapPortfolio = ({
  stamps,
  scopeCity,
  isSelf,
  bannerTheme,
  onClose,
  onSelectStamp,
  onCreateStamp,
}) => {
  const [zoomLevel, setZoomLevel] = useState(5);
  const CLUSTER_ZOOM_THRESHOLD = 8;

  // Add-stamp wizard state
  const [addStep, setAddStep] = useState(null); // null | 'confirm' | 'name' | 'photos'
  const [pendingLat, setPendingLat] = useState(null);
  const [pendingLng, setPendingLng] = useState(null);
  const [pendingCity, setPendingCity] = useState('');
  const [pendingPlaceName, setPendingPlaceName] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  // Photos for the new stamp
  const [pendingPhotos, setPendingPhotos] = useState([]); // [{ id, url, caption, location }]
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoLocation, setPhotoLocation] = useState('');
  const photoInputRef = useRef(null);

  // Zoom to city trigger state
  const [zoomToCityTrigger, setZoomToCityTrigger] = useState(null);

  // Groups for clustering
  const cityGroups = stamps.reduce((acc, s) => {
    if (!acc[s.city]) acc[s.city] = [];
    acc[s.city].push(s);
    return acc;
  }, {});

  const centerLat = stamps.length ? stamps.reduce((sum, s) => sum + s.lat, 0) / stamps.length : 20.5937;
  const centerLng = stamps.length ? stamps.reduce((sum, s) => sum + s.lng, 0) / stamps.length : 78.9629;

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  // Prevent body scroll while fullscreen is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePinDrop = useCallback(async (lat, lng) => {
    setPendingLat(lat);
    setPendingLng(lng);
    setAddStep('confirm');
    setGeocoding(true);
    const city = await reverseGeocode(lat, lng);
    setPendingCity(city);
    setGeocoding(false);
  }, []);

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.82 });
      console.log(`⚡ Photo compressed: ${compressed.originalSizeFormatted} → ${compressed.compressedSizeFormatted} (${compressed.savingsPercent} space saved)`);
      setPhotoFile(compressed.dataUrl);
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onload = (ev) => setPhotoFile(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddPendingPhoto = () => {
    if (!photoFile || !photoCaption.trim() || !photoLocation.trim()) return;
    setPendingPhotos(prev => [...prev, {
      id: `photo-${Date.now()}`,
      url: photoFile,
      caption: photoCaption.trim(),
      location: photoLocation.trim(),
      likes: 0,
    }]);
    setPhotoFile(null);
    setPhotoCaption('');
    setPhotoLocation('');
  };

  const handleFinish = () => {
    onCreateStamp({
      placeName: pendingPlaceName.trim(),
      city: pendingCity,
      lat: pendingLat,
      lng: pendingLng,
      photos: pendingPhotos,
    });
    resetWizard();
  };

  const resetWizard = () => {
    setAddStep(null);
    setPendingLat(null);
    setPendingLng(null);
    setPendingCity('');
    setPendingPlaceName('');
    setPendingPhotos([]);
    setPhotoFile(null);
    setPhotoCaption('');
    setPhotoLocation('');
    setGeocoding(false);
  };

  const StepCard = ({ children, onBack }) => (
    <div className="fs-step-overlay animate-fade-in">
      <div className="fs-step-card animate-scale-up">
        {onBack && (
          <button className="fs-step-back" onClick={onBack}>
            <ArrowLeft size={16} /> Back
          </button>
        )}
        {children}
      </div>
    </div>
  );

  // Step screen rendered as an overlay OVER the full-screen map
  const renderStepOverlay = () => {
    if (!addStep) return null;

    if (addStep === 'confirm') {
      return (
        <StepCard onBack={resetWizard}>
          <div className="fs-step-icon"><MapPin size={22} /></div>
          <h3 className="fs-step-title">Confirm Location</h3>
          {geocoding ? (
            <div className="fs-geocoding-row">
              <div className="geocoding-spinner" />
              <span>Detecting city…</span>
            </div>
          ) : (
            <div className="fs-city-confirmed">
              <MapPin size={13} style={{ color: 'var(--primary)' }} />
              <span className="city-label">City detected:</span>
              <span className="city-value">{pendingCity}</span>
              <Lock size={11} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
            </div>
          )}
          <p className="fs-step-desc">This city label is auto-detected and cannot be edited to keep your shelves consistent.</p>
          <button
            className="btn-primary fs-step-cta"
            onClick={() => setAddStep('name')}
            disabled={geocoding || !pendingCity}
          >
            <Check size={14} /> Confirm & Continue
          </button>
        </StepCard>
      );
    }

    if (addStep === 'name') {
      return (
        <StepCard onBack={() => setAddStep('confirm')}>
          <div className="fs-step-icon"><Edit3 size={22} /></div>
          <h3 className="fs-step-title">Name this Place</h3>
          <p className="fs-step-desc">Give this landmark or place a label you'll remember.</p>
          <input
            type="text"
            className="form-input neumorphic-inset fs-step-input"
            placeholder="e.g. Victoria Memorial, Coffee House…"
            value={pendingPlaceName}
            onChange={e => setPendingPlaceName(e.target.value)}
            maxLength={40}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter' && pendingPlaceName.trim()) setAddStep('photos'); }}
          />
          <button
            className="btn-primary fs-step-cta"
            onClick={() => setAddStep('photos')}
            disabled={!pendingPlaceName.trim()}
          >
            Continue
          </button>
        </StepCard>
      );
    }

    if (addStep === 'photos') {
      return (
        <StepCard onBack={() => setAddStep('name')}>
          <div className="fs-step-icon"><Image size={22} /></div>
          <h3 className="fs-step-title">Add Photos</h3>
          <p className="fs-step-desc">Upload memories for <strong>{pendingPlaceName}</strong>. You can skip and add later.</p>

          {/* Already-added photos in this session */}
          {pendingPhotos.length > 0 && (
            <div className="fs-pending-photos">
              {pendingPhotos.map((ph, i) => (
                <div key={ph.id} className="fs-pending-photo-chip">
                  <img src={ph.url} alt={ph.caption} />
                  <span>{ph.caption}</span>
                  <button onClick={() => setPendingPhotos(prev => prev.filter((_, idx) => idx !== i))}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add one photo at a time */}
          <div className="fs-photo-add-row">
            <div
              className="image-dropzone neumorphic-inset fs-dropzone-sm"
              onClick={() => photoInputRef.current?.click()}
              style={{ backgroundImage: photoFile ? `url(${photoFile})` : 'none' }}
            >
              {!photoFile && (
                <div className="dropzone-placeholder">
                  <Camera size={18} className="dropzone-icon" />
                  <span>Select Photo</span>
                </div>
              )}
              <input type="file" ref={photoInputRef} onChange={handlePhotoFileChange} accept="image/*" style={{ display: 'none' }} />
            </div>
            <div className="fs-photo-meta">
              <input
                type="text"
                className="form-input neumorphic-inset"
                placeholder="Caption *"
                value={photoCaption}
                onChange={e => setPhotoCaption(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
              />
              <input
                type="text"
                className="form-input neumorphic-inset"
                placeholder="Location tag *"
                value={photoLocation}
                onChange={e => setPhotoLocation(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
              />
              <button
                className="btn-secondary-sm"
                onClick={handleAddPendingPhoto}
                disabled={!photoFile || !photoCaption.trim() || !photoLocation.trim()}
              >
                <Plus size={12} /> Add
              </button>
            </div>
          </div>

          <div className="fs-step-actions">
            <button className="btn-secondary-sm" onClick={handleFinish}>
              Skip & Save Stamp
            </button>
            <button
              className="btn-primary fs-step-cta"
              onClick={handleFinish}
              disabled={pendingPhotos.length === 0 && !photoFile}
              style={{ flex: 1 }}
            >
              <CheckCircle size={14} />
              Save Stamp {pendingPhotos.length > 0 ? `(${pendingPhotos.length} photo${pendingPhotos.length > 1 ? 's' : ''})` : ''}
            </button>
          </div>
        </StepCard>
      );
    }

    return null;
  };

  const mapHint = zoomLevel < CLUSTER_ZOOM_THRESHOLD
    ? 'Zoom in to see individual place pins'
    : addStep
      ? null
      : isSelf
        ? 'Hold press (or right click) on map to add stamp • Tap a pin to open album'
        : 'Tap a pin to open its album';

  // 1. Initialize MapLibre GL Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [centerLng, centerLat],
      zoom: zoomLevel,
      minZoom: 3,
      maxZoom: 19,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    map.on('load', () => {
      setMapReady(true);
    });

    map.on('zoomend', () => {
      setZoomLevel(map.getZoom());
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Fit Bounds when Stamps change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    if (stamps.length === 0) {
      map.setView([78.9629, 20.5937], 5);
      return;
    }
    if (stamps.length === 1) {
      map.setView([stamps[0].lng, stamps[0].lat], 13);
      return;
    }

    const lats = stamps.map(s => s.lat);
    const lngs = stamps.map(s => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50 });
  }, [stamps, mapReady]);

  // 3. Zoom to city trigger
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady || !zoomToCityTrigger) return;

    const { lat, lng, stamps: cityStamps } = zoomToCityTrigger;
    if (cityStamps.length > 1) {
      const lats = cityStamps.map(s => s.lat);
      const lngs = cityStamps.map(s => s.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 50, maxZoom: 14 });
    } else {
      map.setView([lng, lat], 13);
    }
  }, [zoomToCityTrigger, mapReady]);

  // 4. Gesture listeners for dropping pins
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    let timer = null;
    let clickedLngLat = null;

    const handleMapClick = (e) => {
      if (!isSelf) return;
      if (addStep === 'drop') {
        handlePinDrop(e.lngLat.lat, e.lngLat.lng);
      }
    };

    const handleMouseDown = (e) => {
      if (!isSelf) return;
      if (addStep === 'drop') return;
      if (e.originalEvent && e.originalEvent.button !== 0) return;
      clickedLngLat = e.lngLat;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (clickedLngLat) {
          handlePinDrop(clickedLngLat.lat, clickedLngLat.lng);
        }
      }, 600);
    };

    const handleMouseUpOrCancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      clickedLngLat = null;
    };

    const handleContextMenu = (e) => {
      if (!isSelf) return;
      e.preventDefault();
      handlePinDrop(e.lngLat.lat, e.lngLat.lng);
    };

    map.on('click', handleMapClick);
    map.on('mousedown', handleMouseDown);
    map.on('mouseup', handleMouseUpOrCancel);
    map.on('mousemove', handleMouseUpOrCancel);
    map.on('dragstart', handleMouseUpOrCancel);
    map.on('zoomstart', handleMouseUpOrCancel);
    map.on('contextmenu', handleContextMenu);

    return () => {
      if (timer) clearTimeout(timer);
      map.off('click', handleMapClick);
      map.off('mousedown', handleMouseDown);
      map.off('mouseup', handleMouseUpOrCancel);
      map.off('mousemove', handleMouseUpOrCancel);
      map.off('dragstart', handleMouseUpOrCancel);
      map.off('zoomstart', handleMouseUpOrCancel);
      map.off('contextmenu', handleContextMenu);
    };
  }, [isSelf, addStep, mapReady, handlePinDrop]);

  // 5. Marker syncing (stamps, clusters, pending pin)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Pending Pin
    if (pendingLat !== null && pendingLng !== null) {
      const el = document.createElement('div');
      el.className = 'stamp-map-pin pending-pin';
      el.innerHTML = `
        <svg width="34" height="34" viewBox="0 0 100 100" style="color: inherit;">
          <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.95)" stroke="currentColor" stroke-width="4" stroke-dasharray="8 4" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="1.5" />
          <path d="M50 20 L53 32 L65 32 L55 40 L58 52 L50 44 L42 52 L45 40 L35 32 L47 32 Z" fill="currentColor" />
          <circle cx="50" cy="58" r="3" fill="currentColor" />
        </svg>
      `;
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pendingLng, pendingLat])
        .addTo(map);
      markersRef.current.push(marker);
    }

    // Stamps or Clusters
    if (zoomLevel >= CLUSTER_ZOOM_THRESHOLD) {
      stamps.forEach(s => {
        const el = document.createElement('div');
        el.className = 'stamp-map-pin';
        el.innerHTML = `
          <svg width="34" height="34" viewBox="0 0 100 100" style="color: inherit;">
            <circle cx="50" cy="50" r="44" fill="rgba(255,255,255,0.9)" stroke="currentColor" stroke-width="4" stroke-dasharray="8 4" />
            <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="1.5" />
            <path d="M50 20 L53 32 L65 32 L55 40 L58 52 L50 44 L42 52 L45 40 L35 32 L47 32 Z" fill="currentColor" />
            <circle cx="50" cy="58" r="3" fill="currentColor" />
          </svg>
        `;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (!addStep) onSelectStamp(s.id);
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([s.lng, s.lat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    } else {
      Object.entries(cityGroups).forEach(([cityName, cityStamps]) => {
        const avgLat = cityStamps.reduce((sum, s) => sum + s.lat, 0) / cityStamps.length;
        const avgLng = cityStamps.reduce((sum, s) => sum + s.lng, 0) / cityStamps.length;

        const el = document.createElement('div');
        el.className = 'city-cluster-badge';
        el.innerHTML = `
          <span class="city-cluster-name">${escapeHtml(cityName)}</span>
          <span class="city-cluster-count">${cityStamps.length}</span>
        `;
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (addStep) return;
          setZoomToCityTrigger({ cityName, lat: avgLat, lng: avgLng, stamps: cityStamps, timestamp: Date.now() });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([avgLng, avgLat])
          .addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [stamps, pendingLat, pendingLng, zoomLevel, addStep, mapReady]);

  return createPortal(
    <div className={`fullscreen-map-portal map-theme-${bannerTheme} animate-fade-in`}>
      {/* Top bar */}
      <div className="fs-map-topbar">
        <button className="fs-map-close-btn" onClick={onClose}>
          <ArrowLeft size={18} />
          <span>Back to Profile</span>
        </button>
        <span className="fs-map-title">
          <MapIcon size={15} />
          {scopeCity ? `${scopeCity} Map` : 'Atlas'}
        </span>
        {/* Cancel wizard from top bar */}
        {isSelf && addStep && (
          <button className="fs-map-cancel-btn" onClick={resetWizard}>
            <X size={14} /> Cancel
          </button>
        )}
      </div>

      {/* Full-screen map */}
      <div className="fs-map-body" style={{ position: 'relative' }}>
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        {/* Floating Add Stamp button */}
        {isSelf && !addStep && (
          <button className="fs-floating-add-btn" onClick={() => setAddStep('drop')} title="Add Stamp">
            <Plus size={16} />
            <span>Add Stamp</span>
          </button>
        )}

        {/* Drop Pin Hint banner */}
        {addStep === 'drop' && (
          <div className="fs-map-drop-hint">
            <div className="fs-drop-pill">
              <MapPin size={14} className="animate-bounce" style={{ color: 'var(--primary)' }} />
              <span>Tap anywhere on map to drop a pin</span>
            </div>
            <button className="fs-drop-cancel" onClick={resetWizard}>
              Cancel
            </button>
          </div>
        )}

        {/* Empty portfolio prompt when user has 0 stamps */}
        {stamps.length === 0 && !addStep && isSelf && (
          <div className="fs-map-empty-prompt animate-fade-in" style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'var(--bg-card)', padding: '24px 32px', borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(59, 158, 92, 0.25)',
            zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '14px', textAlign: 'center', backdropFilter: 'blur(8px)', width: '90%', maxWidth: '340px'
          }}>
            <div style={{ background: 'rgba(59, 158, 92, 0.1)', padding: '12px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <MapPin size={32} style={{ color: 'var(--primary)' }} />
            </div>
            <div>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.05rem', fontWeight: 700 }}>Atlas</h4>
              <p style={{ margin: '6px 0 12px 0', color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                Add your first travel stamp to visualize your footprint!
              </p>
              <button className="btn-primary" onClick={() => setAddStep('drop')} style={{ padding: '8px 16px', fontSize: '0.8rem', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}>
                <Plus size={14} /> Add First Stamp
              </button>
            </div>
          </div>
        )}

        {/* Zoom hint (bottom of map, normal mode) */}
        {!addStep && mapHint && (
          <div className="portfolio-map-hint">{mapHint}</div>
        )}
      </div>

      {/* Step wizard overlay */}
      {addStep && addStep !== 'drop' && renderStepOverlay()}
    </div>,
    document.body
  );
};

// ─── Main ProfileView ─────────────────────────────────────────────────────────
const ProfileView = ({ user, isFriend, isSelf = false, onEditAccount, onLogout }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);

  const [bannerTheme, setBannerTheme] = useState('aurora');
  const [avatarImg, setAvatarImg] = useState(null);

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const photoFileInputRef = useRef(null);

  const userId = user.uuid || user._id || 'self';

  // ── Stamps state ──
  const [stamps, setStamps] = useState(() => {
    try {
      const raw = localStorage.getItem(`user_stamps_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) { }
    return DEFAULT_STAMPS;
  });

  const [activeStampId, setActiveStampId] = useState(null);
  const [showMapPortfolio, setShowMapPortfolio] = useState(false); // full-screen map open
  const [scopeCity, setScopeCity] = useState(null); // city to filter map view to

  // Photo uploader (for existing stamps)
  const [showAddPhotoForm, setShowAddPhotoForm] = useState(false);
  const [newPhotosList, setNewPhotosList] = useState([]);
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoLocation, setNewPhotoLocation] = useState('');

  // Lightbox
  const [expandedPhoto, setExpandedPhoto] = useState(null);
  const [expandedStampId, setExpandedStampId] = useState(null);

  // Stamp rename
  const [isEditingStampName, setIsEditingStampName] = useState(false);
  const [stampRenameValue, setStampRenameValue] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const key = `user_bio_${userId}`;
    const savedBio = localStorage.getItem(key);
    if (savedBio !== null) {
      setBio(savedBio);
    } else {
      setBio(isSelf ? 'Exploring the world one stamp at a time!' : 'Adventure is out there. Mapping my steps.');
    }
  }, [userId, isSelf]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(`user_theme_${userId}`);
    setBannerTheme(savedTheme || 'aurora');
  }, [userId]);

  useEffect(() => {
    const savedAvatar = localStorage.getItem(`user_avatar_${userId}`);
    setAvatarImg(savedAvatar || null);
  }, [userId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`user_stamps_${userId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) { setStamps(parsed); return; }
      }
    } catch (_) { }
    setStamps(DEFAULT_STAMPS);
  }, [userId]);

  const saveStamps = (updated) => {
    setStamps(updated);
    localStorage.setItem(`user_stamps_${userId}`, JSON.stringify(updated));
  };

  // ── Stamp handlers ──
  const handleCreateStamp = ({ placeName, city, lat, lng, photos }) => {
    const newStamp = {
      id: `stamp-${Date.now()}`,
      placeName,
      city,
      lat,
      lng,
      photos: photos || [],
    };
    const updated = [...stamps, newStamp];
    saveStamps(updated);
    setShowMapPortfolio(false);
    setActiveStampId(newStamp.id);
    setToastMessage(`"${placeName}" stamped in ${city}!`);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleRenameStamp = () => {
    if (!stampRenameValue.trim()) return;
    const updated = stamps.map(s =>
      s.id === activeStampId ? { ...s, placeName: stampRenameValue.trim() } : s
    );
    saveStamps(updated);
    setIsEditingStampName(false);
    setToastMessage(' Stamp renamed!');
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleDeleteStamp = (stampId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Delete this stamp and all its memories?')) return;
    const updated = stamps.filter(s => s.id !== stampId);
    saveStamps(updated);
    if (activeStampId === stampId) setActiveStampId(null);
    setToastMessage(' Stamp deleted.');
    setTimeout(() => setToastMessage(''), 2000);
  };

  // ── Photo handlers ──
  const handlePhotoFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 1920, quality: 0.82 });
      console.log(` Profile Photo compressed: ${compressed.originalSizeFormatted} → ${compressed.compressedSizeFormatted} (${compressed.savingsPercent} space saved)`);
      setNewPhotoFile(compressed.dataUrl);
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onload = (event) => setNewPhotoFile(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleQueueNewPhoto = () => {
    if (!newPhotoFile || !newPhotoCaption.trim() || !newPhotoLocation.trim()) return;
    setNewPhotosList(prev => [...prev, {
      id: `photo-${Date.now()}`,
      url: newPhotoFile,
      caption: newPhotoCaption.trim(),
      location: newPhotoLocation.trim(),
      likes: 0,
    }]);
    setNewPhotoFile(null);
    setNewPhotoCaption('');
  };

  const handleSaveAllPhotos = (e) => {
    if (e) e.preventDefault();

    let photosToAdd = [...newPhotosList];
    if (newPhotoFile && newPhotoCaption.trim() && newPhotoLocation.trim()) {
      photosToAdd.push({
        id: `photo-${Date.now()}`,
        url: newPhotoFile,
        caption: newPhotoCaption.trim(),
        location: newPhotoLocation.trim(),
        likes: 0,
      });
    }

    if (photosToAdd.length === 0) {
      setToastMessage('⚠️ Please add at least one photo.');
      setTimeout(() => setToastMessage(''), 2000);
      return;
    }

    const updated = stamps.map(s =>
      s.id === activeStampId ? { ...s, photos: [...s.photos, ...photosToAdd] } : s
    );
    saveStamps(updated);
    setNewPhotosList([]);
    setNewPhotoFile(null);
    setNewPhotoCaption('');
    setNewPhotoLocation('');
    setShowAddPhotoForm(false);
    setToastMessage(`📸 ${photosToAdd.length} memory/memories saved!`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleDeletePhoto = (photoId, stampId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Remove this memory?')) return;
    const updated = stamps.map(s =>
      s.id === stampId ? { ...s, photos: s.photos.filter(p => p.id !== photoId) } : s
    );
    saveStamps(updated);
    if (expandedPhoto && expandedPhoto.id === photoId) {
      setExpandedPhoto(null);
      setExpandedStampId(null);
    }
    setToastMessage(' Memory removed.');
    setTimeout(() => setToastMessage(''), 2000);
  };

  // ── Like handler ──
  const handleLikePhoto = (stampId, photoId) => {
    const likeKey = `like_${stampId}_${photoId}_${userId}`;
    const alreadyLiked = localStorage.getItem(likeKey);
    const updated = stamps.map(s => {
      if (s.id !== stampId) return s;
      return {
        ...s,
        photos: s.photos.map(p => {
          if (p.id !== photoId) return p;
          const newLikes = alreadyLiked ? Math.max(0, (p.likes || 0) - 1) : (p.likes || 0) + 1;
          return { ...p, likes: newLikes };
        }),
      };
    });
    saveStamps(updated);
    if (alreadyLiked) { localStorage.removeItem(likeKey); }
    else { localStorage.setItem(likeKey, '1'); }
    if (expandedPhoto && expandedPhoto.id === photoId) {
      const updatedStamp = updated.find(s => s.id === stampId);
      const updatedPhoto = updatedStamp?.photos.find(p => p.id === photoId);
      if (updatedPhoto) setExpandedPhoto(updatedPhoto);
    }
  };

  const isPhotoLiked = (stampId, photoId) =>
    !!localStorage.getItem(`like_${stampId}_${photoId}_${userId}`);

  // ── Profile handlers ──
  const longPressTimer = useRef(null);
  const startLongPress = (currentName) => {
    if (!isSelf) return;
    longPressTimer.current = setTimeout(() => {
      setIsEditingStampName(true);
      setStampRenameValue(currentName);
    }, 600);
  };
  const cancelLongPress = () => { if (longPressTimer.current) clearTimeout(longPressTimer.current); };

  const handleSaveBio = () => {
    localStorage.setItem(`user_bio_${userId}`, bio);
    setIsEditingBio(false);
    setToastMessage(' Bio updated!');
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.uuid || user._id || 'unknown-id');
    setCopied(true);
    setToastMessage(' User ID copied!');
    setShowDropdown(false);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleThemeChange = (newTheme) => {
    setBannerTheme(newTheme);
    localStorage.setItem(`user_theme_${userId}`, newTheme);
    setToastMessage(` Theme changed!`);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleAvatarClick = () => {
    if (isSelf && fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setToastMessage(' Image must be under 2MB.');
      setTimeout(() => setToastMessage(''), 2500);
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target.result;
      setAvatarImg(base64Data);
      localStorage.setItem(`user_avatar_${userId}`, base64Data);
      setToastMessage('Profile picture updated!');
      setTimeout(() => setToastMessage(''), 2500);
    };
    reader.readAsDataURL(file);
  };

  const handleAction = (actionName) => {
    setShowDropdown(false);
    if (actionName === 'edit') { if (onEditAccount) onEditAccount(); }
    else if (actionName === 'logout') { if (onLogout) onLogout(); }
    else { setToastMessage(`"${actionName}" simulated!`); setTimeout(() => setToastMessage(''), 2500); }
  };

  // ── Explorer tier ──
  const getExplorerTier = (count = 0) => {
    if (count === 0) return { title: 'Wanderer Initiate', nextMilestone: 3, progress: 0 };
    if (count <= 2) return { title: 'Local Scout', nextMilestone: 3, progress: Math.min(100, Math.round((count / 2) * 100)) };
    if (count <= 4) return { title: 'Regional Trekker', nextMilestone: 5, progress: Math.min(100, Math.round(((count - 2) / 2) * 100)) };
    if (count <= 7) return { title: 'Urban Pioneer', nextMilestone: 8, progress: Math.min(100, Math.round(((count - 4) / 3) * 100)) };
    if (count <= 12) return { title: 'National Pathfinder', nextMilestone: 15, progress: Math.min(100, Math.round(((count - 7) / 5) * 100)) };
    return { title: 'Elite Globetrotter', nextMilestone: 999, progress: 100 };
  };

  const stampCountValue = stamps.length;
  const explorerTier = getExplorerTier(stampCountValue);

  const getLikersList = (stampId, photoId, totalLikesCount) => {
    const userLiked = isPhotoLiked(stampId, photoId);
    const mockUsers = [
      { name: 'Aarav Mehta', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=60' },
      { name: 'Diya Sharma', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
      { name: 'Kabir Verma', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&auto=format&fit=crop&q=60' },
      { name: 'Riya Sen', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&auto=format&fit=crop&q=60' },
      { name: 'Arjun Nair', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60' },
    ];
    let likers = [];
    if (userLiked) {
      likers.push({ name: 'You', avatar: avatarImg || (user.username?.slice(0, 2).toUpperCase() || 'ME'), isCurrentUser: true });
    }
    const remainingLikes = totalLikesCount - (userLiked ? 1 : 0);
    const countToTake = Math.min(remainingLikes, mockUsers.length);
    for (let i = 0; i < countToTake; i++) {
      likers.push(mockUsers[i]);
    }
    const othersCount = totalLikesCount - likers.length;
    return { likers, othersCount };
  };

  // Group stamps by city
  const cityGroups = stamps.reduce((acc, s) => {
    if (!acc[s.city]) acc[s.city] = [];
    acc[s.city].push(s);
    return acc;
  }, {});

  const activeStamp = stamps.find(s => s.id === activeStampId) || null;

  const openStampFromMap = useCallback((id) => {
    const s = stamps.find(st => st.id === id);
    setShowMapPortfolio(false);
    setActiveStampId(id);
    if (s) setStampRenameValue(s.placeName);
    setIsEditingStampName(false);
    setShowAddPhotoForm(false);
  }, [stamps]);

  // Flat list of all photos (Instagram style, reverse chronological)
  const allPhotos = useMemo(() => {
    const list = stamps.flatMap(stamp =>
      stamp.photos.map(photo => ({
        ...photo,
        stampId: stamp.id,
        placeName: stamp.placeName,
        city: stamp.city
      }))
    );
    return list.reverse();
  }, [stamps]);

  // ─── Full-screen Photo Lightbox Photo Toggler ───
  const currentStamp = stamps.find(s => s.id === expandedStampId);
  const currentCityName = currentStamp ? currentStamp.city : null;

  const handleSwitchPhoto = useCallback((direction) => {
    if (allPhotos.length <= 1 || !expandedPhoto) return;
    const currentIdx = allPhotos.findIndex(p => p.id === expandedPhoto.id);
    if (currentIdx === -1) return;
    let nextIdx = currentIdx + direction;
    if (nextIdx < 0) nextIdx = allPhotos.length - 1;
    if (nextIdx >= allPhotos.length) nextIdx = 0;

    const nextPhoto = allPhotos[nextIdx];
    setExpandedPhoto(nextPhoto);
    setExpandedStampId(nextPhoto.stampId);
  }, [allPhotos, expandedPhoto]);

  useEffect(() => {
    if (!expandedPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        handleSwitchPhoto(-1);
      } else if (e.key === 'ArrowRight') {
        handleSwitchPhoto(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedPhoto, handleSwitchPhoto]);

  return (
    <div className="profile-view-container animate-fade-in" style={{ position: 'relative' }}>
      {/* Toast */}
      {(toastMessage || copied) && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(26, 38, 28, 0.95)', border: '1px solid rgba(59, 158, 92, 0.3)',
          color: '#ffffff', padding: '10px 20px', borderRadius: '50px',
          fontSize: '0.85rem', fontWeight: '600', boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
          zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px',
          pointerEvents: 'none', animation: 'fadeInSlide 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}>
          <Sparkles size={14} style={{ color: 'var(--primary)' }} />
          <span>{toastMessage || 'Copied!'}</span>
        </div>
      )}

      {/* Full-screen Map Portfolio Portal */}
      {showMapPortfolio && (
        <FullScreenMapPortfolio
          stamps={scopeCity ? stamps.filter(s => s.city === scopeCity) : stamps}
          scopeCity={scopeCity}
          isSelf={isSelf}
          bannerTheme={bannerTheme}
          onClose={() => { setShowMapPortfolio(false); setScopeCity(null); }}
          onSelectStamp={openStampFromMap}
          onCreateStamp={handleCreateStamp}
        />
      )}

      {/* Profile Header */}
      <div className="profile-header" style={{ position: 'relative' }}>
        <h2>{isSelf ? 'My Profile' : 'Profile'}</h2>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            className={`icon-btn ${showDropdown ? 'active' : ''}`}
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ background: showDropdown ? 'var(--primary)' : 'var(--bg-card)', color: showDropdown ? '#ffffff' : 'var(--text-muted)', transition: 'all 0.3s ease' }}
          >
            <MoreHorizontal size={20} />
          </button>

          {showDropdown && (
            <div className="glass-morphism dropdown-menu" style={{
              position: 'absolute', top: '46px', right: '0', borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '1px solid rgba(59, 158, 92, 0.12)',
              padding: '8px', zIndex: 1000, display: 'flex', flexDirection: 'column',
              gap: '4px', animation: 'fadeInSlide 0.2s ease'
            }}>
              {isSelf ? (
                <>
                  <button onClick={() => handleAction('edit')} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '10px', width: '100%', textAlign: 'left', transition: 'background 0.2s' }}>
                    <Edit3 size={15} style={{ color: 'var(--primary)' }} /><span>Edit Profile</span>
                  </button>
                  <button onClick={handleCopyId} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '10px', width: '100%', textAlign: 'left', transition: 'background 0.2s' }}>
                    <Copy size={15} style={{ color: 'var(--primary)' }} /><span>Copy ID</span>
                  </button>
                  <div className="dropdown-theme-row">
                    <span className="dropdown-theme-label">
                      <Palette size={13} style={{ color: 'var(--primary)' }} />Card Theme
                    </span>
                    <div className="dropdown-theme-swatches">
                      {[{ id: 'aurora', label: 'Aurora Mint' }, { id: 'cosmic', label: 'Cosmic Dusk' }, { id: 'solar', label: 'Solar Flare' }, { id: 'ocean', label: 'Ocean Tide' }].map(theme => (
                        <button key={theme.id} onClick={() => handleThemeChange(theme.id)}
                          className={`theme-swatch swatch-${theme.id} ${bannerTheme === theme.id ? 'active' : ''}`} title={theme.label} />
                      ))}
                    </div>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(59, 158, 92, 0.12)', margin: '4px 0' }} />
                  <button onClick={() => handleAction('logout')} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '10px', width: '100%', textAlign: 'left', transition: 'background 0.2s' }}>
                    <LogOut size={15} /><span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <button onClick={handleCopyId} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '10px', width: '100%', textAlign: 'left', transition: 'background 0.2s' }}>
                    <Copy size={15} style={{ color: 'var(--primary)' }} /><span>Copy User ID</span>
                  </button>
                  <button onClick={() => handleAction(isFriend ? 'Remove Friend' : 'Add Friend')} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', borderRadius: '10px', width: '100%', textAlign: 'left', transition: 'background 0.2s' }}>
                    <UserPlus size={15} style={{ color: 'var(--primary)' }} />
                    <span>{isFriend ? 'Remove Friend' : 'Add Friend'}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="profile-card">
        <div className={`profile-card-banner theme-${bannerTheme}`} />

        <div className="avatar-wrapper">
          <div className={`avatar-glow-ring ${(isFriend || isSelf) ? 'live' : ''}`} />
          <div className="profile-avatar-large" onClick={handleAvatarClick} style={{ cursor: isSelf ? 'pointer' : 'default' }}>
            {avatarImg ? <img src={avatarImg} alt="Avatar" /> : (user.username?.slice(0, 2).toUpperCase() || 'OR')}
          </div>
          {isSelf && (
            <>
              <button className="upload-avatar-btn" onClick={handleAvatarClick} title="Upload Photo"><Camera size={14} /></button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
            </>
          )}
        </div>

        <div className="profile-main-info">
          <h3 className="profile-username">@{user.username || 'unknown'}</h3>
          <div className="profile-id-row">
            <span>ID: {user.uuid?.slice(0, 8) || user._id?.slice(0, 8) || '------'}</span>
            <button className="btn-copy-mini" onClick={handleCopyId} title="Copy ID"><Copy size={12} /></button>
          </div>
          <div className={`status-badge ${isSelf || isFriend ? 'friend' : 'not-friend'}`}>
            {isSelf ? 'You' : isFriend ? 'Friend' : 'Not a friend'}
          </div>
        </div>

        <div className="profile-bio-and-map-row" style={{ display: 'flex', gap: '14px', padding: '0 1.5rem', marginBottom: '1.25rem', alignItems: 'stretch' }}>
          <div className="profile-bio-section" style={{ flex: 1, margin: 0, padding: 0, textAlign: 'left' }}>
            {isSelf ? (
              isEditingBio ? (
                <div className="bio-edit-container">
                  <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={120}
                    className="bio-textarea neumorphic-inset" placeholder="Tell your story..." autoFocus style={{ minHeight: '65px' }} />
                  <div className="bio-edit-actions">
                    <button onClick={handleSaveBio} className="icon-btn-confirm" title="Save Bio"><Check size={14} /></button>
                    <button onClick={() => setIsEditingBio(false)} className="icon-btn-cancel" title="Cancel"><X size={14} /></button>
                  </div>
                </div>
              ) : (
                <p className="profile-bio editable" onClick={() => setIsEditingBio(true)} title="Click to update bio" style={{ margin: 0, width: '100%', display: 'block', minHeight: '65px' }}>
                  {bio || 'Click to add a short status bio...'}
                  <Edit3 size={12} className="edit-icon-inline" style={{ color: 'var(--primary)' }} />
                </p>
              )
            ) : (
              <p className="profile-bio" style={{ margin: 0, minHeight: '65px' }}>{bio || 'No status bio shared.'}</p>
            )}
          </div>

          {(isSelf || isFriend) && (
            <button className="profile-map-card-btn" onClick={() => setShowMapPortfolio(true)} title="Open Map Portfolio" style={{
              width: '84px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '6px', background: 'var(--bg-card)', border: '1px solid rgba(59, 158, 92, 0.16)', borderRadius: '16px',
              boxShadow: 'var(--neu-shadow-sm)', cursor: 'pointer', transition: 'all 0.25s ease', color: 'var(--text-main)',
              flexShrink: 0, padding: '8px 0'
            }}>
              <div style={{ background: 'rgba(59, 158, 92, 0.1)', padding: '8px', borderRadius: '50%', color: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <MapIcon size={16} />
              </div>
              <span style={{ fontSize: '0.62rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>Atlas</span>
            </button>
          )}
        </div>

        {(isSelf || isFriend) && (
          <div className="explorer-level-container">
            <div className="level-badge">
              <Award size={14} /><span>{explorerTier.title}</span>
            </div>
            <div className="milestone-progress-bar-wrap">
              <div className="milestone-progress-bar-bg">
                <div className="milestone-progress-bar-fill" style={{ width: `${explorerTier.progress}%` }} />
              </div>
              <span className="milestone-label">{stampCountValue} / {explorerTier.nextMilestone} Stamps to next Rank</span>
            </div>
          </div>
        )}

        <div className="profile-stats-grid">
          <div className="stat-item">
            <span className="stat-value">{stampCountValue}</span>
            <span className="stat-label">Stamps</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{isSelf ? '4' : isFriend ? '5' : '—'}</span>
            <span className="stat-label">{isSelf ? 'Friends' : 'Mutual'}</span>
          </div>
          <div className="stat-item">
            <span className="stat-value" style={{ fontSize: '1.05rem', lineHeight: '1.8' }}>
              {user.joinDate ? new Date(user.joinDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'Jan 26'}
            </span>
            <span className="stat-label">Joined</span>
          </div>
        </div>

        {/* ═══════════ STAMPS SECTION ═══════════ */}
        <div className="stamps-section-header">
          <div className="profile-section-title" style={{ margin: 0 }}>Photos</div>
        </div>

        {(isFriend || isSelf) ? (
          <div className="stamps-inset-container" style={{ position: 'relative', padding: activeStampId ? '1.5rem 1rem' : '0px' }}>

            {!activeStampId ? (
              /* ─── INSTAGRAM PROFILE GRID VIEW ─── */
              <div className="instagram-grid-container animate-fade-in">
                {stamps.length === 0 ? (
                  <div className="chapter-empty-placeholder">
                    <MapPin size={28} className="empty-chapter-icon" />
                    <p className="empty-chapter-title">No stamps yet</p>
                    <p className="empty-chapter-desc">Open the Map view to drop your first travel stamp!</p>
                    {isSelf && (
                      <button className="btn-add-stamp-area" style={{ marginTop: '0.5rem', alignSelf: 'center' }}
                        onClick={() => setShowMapPortfolio(true)}>
                        <MapIcon size={12} /><span>Open Map</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="instagram-posts-grid">
                    {allPhotos.map(photo => {
                      return (
                        <div key={photo.id} className="instagram-grid-item"
                          onClick={() => { setExpandedPhoto(photo); setExpandedStampId(photo.stampId); }}
                          title={`Open photo memory`}
                        >
                          <div className="instagram-item-wrapper">
                            <img src={photo.url} alt={photo.caption} className="instagram-grid-image" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ═══ STAMP PHOTO VIEWER ═══ */
              (() => {
                if (!activeStamp) { setActiveStampId(null); return null; }
                return (
                  <div className="chapter-view-container animate-fade-in">
                    <div className="chapter-header-row">
                      <button className="chapter-back-btn" onClick={() => { setActiveStampId(null); setShowAddPhotoForm(false); }} title="Back">
                        <Undo2 size={14} /><span>Back</span>
                      </button>
                      {isSelf && (
                        <button
                          className={`btn-add-stamp-area ${showAddPhotoForm ? 'active' : ''}`}
                          onClick={() => {
                            setShowAddPhotoForm(!showAddPhotoForm);
                            setNewPhotoFile(null);
                            setNewPhotoCaption('');
                            setNewPhotoLocation('');
                            setNewPhotosList([]);
                          }}
                          title="Add a photo"
                        >
                          {showAddPhotoForm ? <X size={14} /> : <Plus size={14} />}
                          <span>{showAddPhotoForm ? 'Close' : 'Add Photos'}</span>
                        </button>
                      )}
                    </div>

                    <div className="chapter-title-section">
                      {isSelf && isEditingStampName ? (
                        <div className="chapter-title-edit-row">
                          <input type="text" className="chapter-title-input neumorphic-inset"
                            value={stampRenameValue} onChange={e => setStampRenameValue(e.target.value)}
                            maxLength={40} autoFocus
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameStamp(); if (e.key === 'Escape') setIsEditingStampName(false); }}
                          />
                          <button onClick={handleRenameStamp} className="chapter-title-save-btn" title="Save"><Check size={14} /></button>
                          <button onClick={() => setIsEditingStampName(false)} className="chapter-title-cancel-btn" title="Cancel"><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="chapter-title-display-wrap">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <h4 className="chapter-title-display"
                              onMouseDown={() => startLongPress(activeStamp.placeName)}
                              onMouseUp={cancelLongPress} onMouseLeave={cancelLongPress}
                              onTouchStart={() => startLongPress(activeStamp.placeName)} onTouchEnd={cancelLongPress}
                              title={isSelf ? 'Long press to rename' : ''}
                            >
                              {activeStamp.placeName}
                            </h4>
                            <span className="stamp-city-sub-label">
                              <MapPin size={9} />{activeStamp.city}
                            </span>
                          </div>
                          {isSelf && (
                            <button className="chapter-title-edit-btn"
                              onClick={() => { setIsEditingStampName(true); setStampRenameValue(activeStamp.placeName); }} title="Rename">
                              <Edit3 size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {showAddPhotoForm && isSelf && (
                      <form className="photo-uploader-card animate-slide-down" onSubmit={handleSaveAllPhotos}>
                        <div className="uploader-form-title">Capture Memories</div>

                        {/* Queued photos list */}
                        {newPhotosList.length > 0 && (
                          <div className="fs-pending-photos" style={{ marginBottom: '1rem', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                            {newPhotosList.map((ph, i) => (
                              <div key={ph.id} className="fs-pending-photo-chip" style={{ position: 'relative', flexShrink: 0 }}>
                                <img src={ph.url} alt={ph.caption} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                <button type="button" onClick={() => setNewPhotosList(prev => prev.filter((_, idx) => idx !== i))} style={{
                                  position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: '#fff',
                                  border: 'none', borderRadius: '50%', width: '16px', height: '16px', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px'
                                }}>
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
                          <div className="image-dropzone neumorphic-inset"
                            onClick={() => photoFileInputRef.current?.click()}
                            style={{ backgroundImage: newPhotoFile ? `url(${newPhotoFile})` : 'none', width: '100px', height: '100px', flexShrink: 0, margin: 0 }}
                          >
                            {!newPhotoFile && (
                              <div className="dropzone-placeholder" style={{ padding: 0 }}>
                                <Camera size={18} className="dropzone-icon" />
                                <span style={{ fontSize: '0.7rem' }}>Select Photo</span>
                              </div>
                            )}
                            <input type="file" ref={photoFileInputRef} onChange={handlePhotoFileChange} accept="image/*" style={{ display: 'none' }} />
                          </div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div className="form-group" style={{ margin: 0 }}>
                              <input type="text" className="form-input neumorphic-inset" placeholder="Caption *" value={newPhotoCaption} onChange={e => setNewPhotoCaption(e.target.value)} style={{ padding: '8px 12px', fontSize: '0.8rem' }} />
                            </div>
                            <div className="form-group" style={{ margin: 0 }}>
                              <div className="location-input-wrapper">
                                <MapPin size={12} className="loc-input-icon" />
                                <input type="text" className="form-input loc-input neumorphic-inset" placeholder="Location Tag *" value={newPhotoLocation} onChange={e => setNewPhotoLocation(e.target.value)} style={{ padding: '8px 12px 8px 28px', fontSize: '0.8rem' }} />
                              </div>
                            </div>
                            <button type="button" className="btn-secondary-sm" onClick={handleQueueNewPhoto} disabled={!newPhotoFile || !newPhotoCaption.trim() || !newPhotoLocation.trim()} style={{ alignSelf: 'flex-end', padding: '4px 12px', fontSize: '0.75rem' }}>
                              <Plus size={12} /> Add to Queue
                            </button>
                          </div>
                        </div>

                        <div className="uploader-actions" style={{ marginTop: '12px' }}>
                          <button type="submit" className="btn-primary uploader-submit-btn" disabled={newPhotosList.length === 0 && (!newPhotoFile || !newPhotoCaption.trim() || !newPhotoLocation.trim())}>
                            Save {newPhotosList.length + (newPhotoFile ? 1 : 0)} Memories
                          </button>
                        </div>
                      </form>
                    )}

                    <div className="photobook-page-grid">
                      {activeStamp.photos.map((p, pIdx) => {
                        const rotation = (pIdx % 3 === 0) ? '-2deg' : (pIdx % 3 === 1) ? '1.5deg' : '-1deg';
                        return (
                          <div key={p.id} className="polaroid-frame"
                            style={{ transform: `rotate(${rotation})` }}
                            onClick={() => { setExpandedPhoto(p); setExpandedStampId(activeStampId); }}
                            title="Expand memory"
                          >
                            <div className="polaroid-img-wrapper">
                              <img src={p.url} alt={p.caption} />
                              {isSelf && (
                                <button className="polaroid-delete-btn" onClick={e => handleDeletePhoto(p.id, e)} title="Delete">
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                            <div className="polaroid-details">
                              <p className="polaroid-caption">{p.caption}</p>
                              <div className="polaroid-location"><MapPin size={9} /><span>{p.location}</span></div>
                              <div className="polaroid-like-row">
                                <Heart size={9} className={isPhotoLiked(activeStampId, p.id) ? 'liked-heart' : ''} />
                                <span>{p.likes || 0}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {activeStamp.photos.length === 0 && (
                        <div className="chapter-empty-placeholder">
                          <Camera size={28} className="empty-chapter-icon" />
                          <p className="empty-chapter-title">Stamp album is empty</p>
                          <p className="empty-chapter-desc">Add beautiful memory snapshots with captions!</p>
                          {isSelf && (
                            <button className="btn-add-stamp-area" style={{ marginTop: '0.5rem', alignSelf: 'center' }}
                              onClick={() => setShowAddPhotoForm(true)}>
                              <Plus size={12} /><span>Add First Photo</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        ) : (
          <div className="hidden-content-placeholder">
            <ShieldAlert size={20} style={{ color: 'var(--danger)' }} />
            <p>Stamps are hidden until you connect as friends.</p>
          </div>
        )}

        {!isFriend && !isSelf && (
          <button className="btn-primary profile-action-btn">
            <UserPlus size={18} /> Send Friend Request
          </button>
        )}
      </div>

      {/* FULLSCREEN LIGHTBOX MODAL */}
      {expandedPhoto && createPortal(
        <div className="lightbox-modal-overlay animate-fade-in" onClick={() => { setExpandedPhoto(null); setExpandedStampId(null); }}>
          <button className="lightbox-close-btn" onClick={() => { setExpandedPhoto(null); setExpandedStampId(null); }}>
            <X size={20} />
          </button>

          {allPhotos.length > 1 && (
            <button className="lightbox-book-nav-btn prev" onClick={e => { e.stopPropagation(); handleSwitchPhoto(-1); }} title="Previous Photo">
              <ArrowLeft size={24} />
              <span className="nav-label">Prev</span>
            </button>
          )}

          <div className="lightbox-content-card animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="lightbox-header-title-area">
              <span className="lightbox-chapter-title">{currentStamp ? currentStamp.placeName : ''}</span>
            </div>
            <div className="lightbox-image-wrapper">
              <div className="lightbox-city-pill">
                {currentCityName}
              </div>
              <img src={expandedPhoto.url} alt="" className="lightbox-image-blur-bg" />
              <img src={expandedPhoto.url} alt={expandedPhoto.caption} className="lightbox-image-main" />
            </div>
            <div className="lightbox-details-bar">
              <p className="lightbox-caption">{expandedPhoto.caption}</p>
              <div className="lightbox-location-tag">
                <MapPin size={12} className="lightbox-pin-icon" style={{ color: '#4CAF50' }} />
                <span>{expandedPhoto.location}</span>
              </div>
              <div className="lightbox-like-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className={`lightbox-like-btn ${isPhotoLiked(expandedStampId, expandedPhoto.id) ? 'liked' : ''}`}
                    onClick={() => handleLikePhoto(expandedStampId, expandedPhoto.id)}
                    title={isPhotoLiked(expandedStampId, expandedPhoto.id) ? 'Unlike' : 'Like'}
                  >
                    <Heart size={18} className="like-heart-icon" />
                  </button>
                  <span className="lightbox-like-count">{expandedPhoto.likes || 0}</span>
                </div>

                {isSelf && (
                  <button
                    onClick={(e) => handleDeletePhoto(expandedPhoto.id, expandedStampId, e)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.08)',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      marginLeft: 'auto',
                      fontFamily: 'inherit'
                    }}
                    title="Delete Memory"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}

                {/* Likers Stack */}
                {expandedPhoto.likes > 0 && (() => {
                  const { likers } = getLikersList(expandedStampId, expandedPhoto.id, expandedPhoto.likes);
                  return (
                    <div className="likers-info-section">
                      <div className="likers-avatar-stack">
                        {likers.slice(0, 3).map((liker, idx) => (
                          <div key={idx} className="liker-avatar-wrapper" title={liker.name}>
                            {liker.isCurrentUser && (!avatarImg || avatarImg.length > 200 || !avatarImg.startsWith('http')) ? (
                              <div className="liker-avatar text-avatar">{liker.avatar}</div>
                            ) : (
                              <img src={liker.avatar} alt={liker.name} className="liker-avatar" />
                            )}
                          </div>
                        ))}
                      </div>
                      <span className="likers-text-summary">
                        {(() => {
                          const hasYou = likers.some(l => l.isCurrentUser);
                          const total = expandedPhoto.likes;
                          if (hasYou) {
                            if (total === 1) return 'You';
                            if (total === 2) return `You + ${likers.find(l => !l.isCurrentUser)?.name || '1 other'}`;
                            return `You + ${total - 1} others`;
                          } else {
                            if (total === 1) return `${likers[0]?.name}`;
                            if (total === 2) return `${likers[0]?.name} + 1 other`;
                            return `${likers[0]?.name} + ${total - 1} others`;
                          }
                        })()}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {allPhotos.length > 1 && (
            <button className="lightbox-book-nav-btn next" onClick={e => { e.stopPropagation(); handleSwitchPhoto(1); }} title="Next Photo">
              <span className="nav-label">Next</span>
              <ArrowLeft size={24} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default ProfileView;
