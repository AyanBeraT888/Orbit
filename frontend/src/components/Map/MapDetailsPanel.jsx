import React, { useEffect, useRef } from 'react';
import { X, Sliders } from 'lucide-react';

export default function MapDetailsPanel({
  selectedLayers = ['transit'], // Array of layer IDs (supports multi-select)
  selectedMapType = 'default',   // 'default' | 'satellite'
  onLayerToggle,                // (layerId) => void
  onMapTypeChange,              // (mapType) => void
  onToolSelect,                 // (toolId) => void
  onClose,                      // () => void
  allowMultiple = false,        // If true, multiple layers can be active
  setAllowMultiple              // Optional callback to toggle single/multi behavior
}) {
  const panelRef = useRef(null);

  // Close on Click Outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking on the FAB that toggles the panel
      if (event.target.closest('.layers-fab-trigger')) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape Key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus Trapping and Accessibility
  useEffect(() => {
    if (!panelRef.current) return;

    // Get all focusable elements inside the panel
    const focusableElements = panelRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element (usually the close button)
    if (firstElement) firstElement.focus();

    const handleTabTrap = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab: if on first element, wrap to last
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        // Tab: if on last element, wrap to first
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    const panelEl = panelRef.current;
    panelEl.addEventListener('keydown', handleTabTrap);
    return () => {
      panelEl.removeEventListener('keydown', handleTabTrap);
    };
  }, []);

  // Check if a layer is currently active
  const isLayerActive = (layerId) => {
    return selectedLayers.includes(layerId);
  };

  // Modern SVG Icons designed specifically as flat, colorful illustrations
  const icons = {
    defaultMap: (
      <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', borderRadius: 10 }}>
        {/* Land Background */}
        <rect width="80" height="80" fill="#e8f5e9" />
        {/* Wavy Blue River */}
        <path d="M 0 50 Q 20 40 40 55 T 80 45 L 80 80 L 0 80 Z" fill="#90caf9" />
        {/* Green Parks */}
        <rect x="8" y="8" width="20" height="20" rx="4" fill="#a5d6a7" />
        <rect x="48" y="10" width="24" height="24" rx="6" fill="#a5d6a7" />
        {/* Roads Grid */}
        <line x1="0" y1="35" x2="80" y2="35" stroke="#ffffff" strokeWidth="6" />
        <line x1="38" y1="0" x2="38" y2="80" stroke="#ffffff" strokeWidth="6" />
        <line x1="0" y1="35" x2="80" y2="35" stroke="#ffe082" strokeWidth="2.5" />
        <line x1="38" y1="0" x2="38" y2="80" stroke="#ffe082" strokeWidth="2.5" />
        {/* Route Pin */}
        <circle cx="38" cy="35" r="4" fill="#1565c0" />
      </svg>
    ),
    satellite: (
      <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%', borderRadius: 10 }}>
        {/* Deep Green Fields */}
        <rect width="80" height="80" fill="#1b4d3e" />
        {/* Dark Water */}
        <path d="M 0 55 Q 25 35 45 60 T 80 50 L 80 80 L 0 80 Z" fill="#0f2537" />
        {/* Grid pattern mimicking agricultural sectors */}
        <rect x="5" y="5" width="30" height="25" fill="none" stroke="#2d6a4f" strokeWidth="1" strokeDasharray="3,3" />
        <rect x="45" y="8" width="30" height="30" fill="none" stroke="#2d6a4f" strokeWidth="1" strokeDasharray="3,3" />
        {/* Stylized rooftops/buildings */}
        <rect x="10" y="12" width="10" height="8" fill="#5c677d" rx="1" />
        <rect x="22" y="10" width="8" height="6" fill="#4a4e69" rx="1" />
        <rect x="50" y="15" width="12" height="12" fill="#5c677d" rx="2" />
        <rect x="64" y="22" width="8" height="10" fill="#3d5a80" rx="1" />
      </svg>
    ),
    transit: (
      <svg viewBox="0 0 60 60" style={{ width: '100%', height: '100%', borderRadius: 10 }}>
        <rect width="60" height="60" fill="#e3f2fd" />
        {/* Tracks */}
        <line x1="0" y1="30" x2="60" y2="30" stroke="#78909c" strokeWidth="3" strokeDasharray="2,2" />
        <line x1="30" y1="0" x2="30" y2="60" stroke="#90a4ae" strokeWidth="1.5" />
        {/* Blue transit node circle */}
        <circle cx="30" cy="30" r="16" fill="#1976d2" />
        {/* Train front */}
        <rect x="21" y="20" width="18" height="18" rx="4" fill="#ffffff" />
        <rect x="24" y="23" width="12" height="6" rx="1" fill="#1565c0" />
        <circle cx="26" cy="34" r="1.5" fill="#f57c00" />
        <circle cx="34" cy="34" r="1.5" fill="#f57c00" />
        {/* Train Grill */}
        <line x1="28" y1="31" x2="32" y2="31" stroke="#b0bec5" strokeWidth="2" />
      </svg>
    ),
    traffic: (
      <svg viewBox="0 0 60 60" style={{ width: '100%', height: '100%', borderRadius: 10 }}>
        <rect width="60" height="60" fill="#eceff1" />
        {/* Winding roads */}
        <path d="M 10 0 C 10 20 50 20 50 60" fill="none" stroke="#cfd8dc" strokeWidth="10" strokeLinecap="round" />
        <path d="M 50 0 C 50 30 10 30 10 60" fill="none" stroke="#cfd8dc" strokeWidth="10" strokeLinecap="round" />
        {/* Green Flow (fast) */}
        <path d="M 10 0 C 10 20 50 20 50 60" fill="none" stroke="#4caf50" strokeWidth="3" strokeLinecap="round" strokeDasharray="30, 60" />
        {/* Orange Flow (medium) */}
        <path d="M 50 0 C 50 30 10 30 10 35" fill="none" stroke="#ff9800" strokeWidth="3" strokeLinecap="round" />
        {/* Red Flow (congested) */}
        <path d="M 23 38 C 17 44 12 52 10 60" fill="none" stroke="#f44336" strokeWidth="4" strokeLinecap="round" />
        {/* Speed nodes */}
        <circle cx="10" cy="12" r="3.5" fill="#4caf50" />
        <circle cx="34" cy="27" r="3.5" fill="#ff9800" />
        <circle cx="14" cy="50" r="3.5" fill="#f44336" />
      </svg>
    ),
    travelTime: (
      <svg viewBox="0 0 60 60" style={{ width: '100%', height: '100%', borderRadius: 10 }}>
        <rect width="60" height="60" fill="#fff9c4" />
        {/* Route path */}
        <path d="M 12 45 C 12 30 35 48 35 28 C 35 15 48 20 48 12" fill="none" stroke="#fbc02d" strokeWidth="4" strokeLinecap="round" />
        <path d="M 12 45 C 12 30 35 48 35 28 C 35 15 48 20 48 12" fill="none" stroke="#f57f17" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3,3" />
        {/* Start point */}
        <circle cx="12" cy="45" r="5" fill="#f57f17" />
        <circle cx="12" cy="45" r="2" fill="#ffffff" />
        {/* Route Pin */}
        <path d="M 48 4 C 45.8 4 44 5.8 44 8 C 44 11.5 48 16 48 16 C 48 16 52 11.5 52 8 C 52 5.8 50.2 4 48 4 Z" fill="#d32f2f" />
        <circle cx="48" cy="8" r="1.5" fill="#ffffff" />
        {/* Watch badge */}
        <circle cx="34" cy="36" r="9" fill="#1A73E8" stroke="#ffffff" strokeWidth="1.5" />
        <path d="M 34 31 L 34 36 L 37 36" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    measure: (
      <svg viewBox="0 0 60 60" style={{ width: '100%', height: '100%', borderRadius: 10 }}>
        <rect width="60" height="60" fill="#efebe9" />
        {/* Ruler Background */}
        <rect x="5" y="42" width="50" height="12" fill="#bcaaa4" rx="2" />
        {/* Ruler ticks */}
        <line x1="10" y1="42" x2="10" y2="48" stroke="#5d4037" strokeWidth="1.5" />
        <line x1="18" y1="42" x2="18" y2="45" stroke="#5d4037" strokeWidth="1" />
        <line x1="26" y1="42" x2="26" y2="48" stroke="#5d4037" strokeWidth="1.5" />
        <line x1="34" y1="42" x2="34" y2="45" stroke="#5d4037" strokeWidth="1" />
        <line x1="42" y1="42" x2="42" y2="48" stroke="#5d4037" strokeWidth="1.5" />
        <line x1="50" y1="42" x2="50" y2="45" stroke="#5d4037" strokeWidth="1" />
        {/* Winding line measurements with nodes */}
        <path d="M 12 14 L 30 28 L 48 18" fill="none" stroke="#5d4037" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4,3" />
        <circle cx="12" cy="14" r="4.5" fill="#d84315" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="30" cy="28" r="4.5" fill="#d84315" stroke="#ffffff" strokeWidth="1.5" />
        <circle cx="48" cy="18" r="4.5" fill="#d84315" stroke="#ffffff" strokeWidth="1.5" />
      </svg>
    )
  };

  const layersList = [
    { id: 'transit', label: 'Railway', icon: icons.transit },
    { id: 'traffic', label: 'Roadways', icon: icons.traffic }
  ];

  const toolsList = [
    { id: 'travel-time', label: 'Travel time', icon: icons.travelTime },
    { id: 'measure', label: 'Measure', icon: icons.measure }
  ];

  const mapTypesList = [
    { id: 'default', label: 'Default', icon: icons.defaultMap },
    { id: 'satellite', label: 'Satellite', icon: icons.satellite }
  ];

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Map details"
      style={{
        position: 'absolute',
        top: '6.5rem',
        right: '1.5rem',
        zIndex: 500,
        width: 270,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: '16px',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontFamily: "'Outfit', sans-serif",
        animation: 'mapDetailsSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        border: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>Map details</span>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            background: 'rgba(15, 23, 42, 0.05)',
            border: 'none',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b',
            transition: 'background-color 0.2s, color 0.2s'
          }}
          className="map-details-close-btn"
        >
          <X size={15} />
        </button>
      </div>

      {/* Map Type Section */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Map type
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {mapTypesList.map((type) => {
            const isSelected = selectedMapType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => onMapTypeChange(type.id)}
                aria-pressed={isSelected}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                className="map-type-tile"
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 12,
                    border: `2px solid ${isSelected ? '#1a73e8' : 'transparent'}`,
                    padding: 2,
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(26, 115, 232, 0.15)' : 'none'
                  }}
                  className="icon-container"
                >
                  {type.icon}
                </div>
                <span
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#1a73e8' : '#5f6368',
                    transition: 'color 0.2s'
                  }}
                >
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(0, 0, 0, 0.06)', margin: 0 }} />

      {/* Map Layers Section */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Map layers
          </span>
          {/* Sleek configurable toggler */}
          {setAllowMultiple && (
            <button
              onClick={() => setAllowMultiple(!allowMultiple)}
              title={allowMultiple ? "Switch to single layer mode" : "Switch to multi-layer mode"}
              style={{
                background: 'none',
                border: 'none',
                color: allowMultiple ? '#1a73e8' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: 8,
                transition: 'all 0.2s',
                backgroundColor: allowMultiple ? 'rgba(26, 115, 232, 0.06)' : 'transparent'
              }}
            >
              <Sliders size={10} />
              {allowMultiple ? 'Multi' : 'Single'}
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px 14px',
        }}>
          {layersList.map((layer) => {
            const isActive = isLayerActive(layer.id);
            return (
              <button
                key={layer.id}
                onClick={() => onLayerToggle(layer.id)}
                aria-pressed={isActive}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                className="layer-tile"
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    border: `2px solid ${isActive ? '#1a73e8' : 'transparent'}`,
                    padding: 2,
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(26, 115, 232, 0.25)' : 'none',
                    position: 'relative'
                  }}
                  className="icon-container"
                >
                  {layer.icon}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      backgroundColor: '#1a73e8',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #ffffff'
                    }}>
                      ✓
                    </div>
                  )}
                </div>
                <span
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#1a73e8' : '#5f6368',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    transition: 'color 0.2s',
                    width: '64px',
                    whiteSpace: 'normal',
                    wordBreak: 'break-word'
                  }}
                >
                  {layer.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid rgba(0, 0, 0, 0.06)', margin: 0 }} />

      {/* Map Tools Section */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Map tools
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {toolsList.map((tool) => {
            return (
              <button
                key={tool.id}
                onClick={() => onToolSelect(tool.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  outline: 'none',
                }}
                className="tool-tile"
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1.2',
                    borderRadius: 12,
                    border: '2px solid transparent',
                    padding: 2,
                    boxSizing: 'border-box',
                    transition: 'all 0.2s ease',
                  }}
                  className="icon-container"
                >
                  {tool.icon}
                </div>
                <span
                  style={{
                    marginTop: 4,
                    fontSize: 10,
                    fontWeight: 500,
                    color: '#5f6368',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}
                >
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Custom styles for hover/active effects */}
      <style>{`
        @keyframes mapDetailsSlideIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .map-details-close-btn:hover {
          background-color: rgba(15, 23, 42, 0.1) !important;
          color: #0f172a !important;
        }
        .map-type-tile:hover .icon-container,
        .layer-tile:hover .icon-container,
        .tool-tile:hover .icon-container {
          transform: translateY(-2px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
        }
        .map-type-tile:active .icon-container,
        .layer-tile:active .icon-container,
        .tool-tile:active .icon-container {
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}
