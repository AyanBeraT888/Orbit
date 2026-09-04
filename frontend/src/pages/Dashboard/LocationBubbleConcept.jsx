import React, { useState, useRef, useEffect } from 'react';
import { MapPin, X, Sparkles, Check, Compass, Radio } from 'lucide-react';
import './LocationBubbleConcept.css';

const INITIAL_BUBBLES = [];

const LocationBubbleConcept = ({ onClose }) => {
  const [bubbles, setBubbles] = useState(
    INITIAL_BUBBLES.map(b => ({
      ...b,
      currentX: b.x,
      currentY: b.y,
      isDragging: false
    }))
  );

  const [activeDragId, setActiveDragId] = useState(null);
  const [nearTargetId, setNearTargetId] = useState(null);
  const [isLocationActive, setIsLocationActive] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [ripples, setRipples] = useState([]);
  const [dragActiveGlobal, setDragActiveGlobal] = useState(false);
  const [activeEntityName, setActiveEntityName] = useState('');

  // New states for location sharing logic
  const [activeSharingBubbleId, setActiveSharingBubbleId] = useState(null);
  const [isEndingSharing, setIsEndingSharing] = useState(false);

  // Refs for tracking mouse/touch drag offsets
  const dragStartRef = useRef({ x: 0, y: 0 });
  const bubbleStartRef = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const sharingTimeoutRef = useRef(null);

  // Target Location Button details
  // Relative position in 360x640 resolution canvas
  // Location button is placed bottom center
  const targetButtonCenter = { x: 180, y: 440 };

  const endLiveSharing = () => {
    if (sharingTimeoutRef.current) {
      clearTimeout(sharingTimeoutRef.current);
      sharingTimeoutRef.current = null;
    }

    const targetId = activeSharingBubbleId;

    setIsLocationActive(false);
    setToastMessage('');
    setRipples([]);
    setActiveEntityName('');
    setActiveSharingBubbleId(null);
    setIsEndingSharing(false);

    setBubbles(prev =>
      prev
        .filter(b => b.id !== targetId)
        .map(b => ({
          ...b,
          currentX: b.x,
          currentY: b.y,
          isDragging: false,
          isMerged: false
        }))
    );
  };

  const handleLocationButtonClick = () => {
    if (isLocationActive && !isEndingSharing) {
      endLiveSharing();
    }
  };

  const handleStartDrag = (id, e) => {
    e.preventDefault();
    if (isLocationActive) return; // prevent actions during success animation

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const bubble = bubbles.find(b => b.id === id);
    if (!bubble) return;

    dragStartRef.current = { x: clientX, y: clientY };
    bubbleStartRef.current = { x: bubble.currentX, y: bubble.currentY };
    setActiveDragId(id);
    setDragActiveGlobal(true);

    setBubbles(prev =>
      prev.map(b => (b.id === id ? { ...b, isDragging: true } : b))
    );
  };

  const handleMoveDrag = (e) => {
    if (!activeDragId) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;

    const targetX = bubbleStartRef.current.x + dx;
    const targetY = bubbleStartRef.current.y + dy;

    // Boundary constraints within 360x640 simulated canvas
    const maxBoundX = 360 - 60; // bubble is 60px wide
    const maxBoundY = 640 - 60;
    const constrainedX = Math.max(0, Math.min(maxBoundX, targetX));
    const constrainedY = Math.max(0, Math.min(maxBoundY, targetY));

    // Calculate distance to the Location target button
    const bubbleCenterX = constrainedX + 30; // 30 is half of 60 bubble size
    const bubbleCenterY = constrainedY + 30;

    const distance = Math.sqrt(
      Math.pow(bubbleCenterX - targetButtonCenter.x, 2) +
      Math.pow(bubbleCenterY - targetButtonCenter.y, 2)
    );

    const proximityThreshold = 75; // Proximity drop threshold
    const isNear = distance < proximityThreshold;

    if (isNear) {
      setNearTargetId(activeDragId);
    } else {
      setNearTargetId(null);
    }

    setBubbles(prev =>
      prev.map(b =>
        b.id === activeDragId
          ? { ...b, currentX: constrainedX, currentY: constrainedY }
          : b
      )
    );
  };

  const handleEndDrag = () => {
    if (!activeDragId) return;

    const draggedBubble = bubbles.find(b => b.id === activeDragId);
    if (!draggedBubble) return;

    // Check proximity drop on drop end
    const bubbleCenterX = draggedBubble.currentX + 30;
    const bubbleCenterY = draggedBubble.currentY + 30;

    const distance = Math.sqrt(
      Math.pow(bubbleCenterX - targetButtonCenter.x, 2) +
      Math.pow(bubbleCenterY - targetButtonCenter.y, 2)
    );

    const proximityThreshold = 75;
    const dropSuccess = distance < proximityThreshold;

    if (dropSuccess) {
      // SUCCESS ACTIVATION
      setIsLocationActive(true);
      setActiveEntityName(draggedBubble.name);
      setActiveSharingBubbleId(activeDragId);
      setToastMessage(`📍 Live Location Active for ${draggedBubble.name}!`);
      setTimeout(() => setToastMessage(''), 2000);

      // Trigger gorgeous Ripple ripples state sequence
      setRipples([0, 1, 2]);

      // Move active bubble directly above the Location button
      setBubbles(prev =>
        prev.map(b =>
          b.id === activeDragId
            ? {
              ...b,
              currentX: targetButtonCenter.x - 30, // center horizontally (180 - 30)
              currentY: targetButtonCenter.y - 160, // float above Location FAB (440 - 160)
              isDragging: false,
              isMerged: false
            }
            : b
        )
      );


    } else {
      // Elastic return to original floating home coordinate
      setBubbles(prev =>
        prev.map(b =>
          b.id === activeDragId
            ? {
              ...b,
              currentX: b.x,
              currentY: b.y,
              isDragging: false
            }
            : b
        )
      );
    }

    setActiveDragId(null);
    setNearTargetId(null);
    setDragActiveGlobal(false);
  };

  // Add global mousemove/mouseup listener for window bounds safety
  useEffect(() => {
    if (activeDragId) {
      window.addEventListener('mousemove', handleMoveDrag);
      window.addEventListener('mouseup', handleEndDrag);
      window.addEventListener('touchmove', handleMoveDrag, { passive: false });
      window.addEventListener('touchend', handleEndDrag);
    }

    return () => {
      window.removeEventListener('mousemove', handleMoveDrag);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleMoveDrag);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [activeDragId, bubbles]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sharingTimeoutRef.current) {
        clearTimeout(sharingTimeoutRef.current);
      }
    };
  }, []);

  const currentTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="simulator-modal-overlay" onClick={onClose}>
      <div className="simulator-modal-content" onClick={e => e.stopPropagation()}>
        <div className="mobile-frame" ref={canvasRef}>
          {/* Ambient Glowing Layer matching currently dragged element or state */}
          <div
            className="ambient-glow-bg"
            style={{
              '--glow-x': activeDragId ? `${bubbles.find(b => b.id === activeDragId).currentX + 30}px` : '50%',
              '--glow-y': activeDragId ? `${bubbles.find(b => b.id === activeDragId).currentY + 30}px` : '50%'
            }}
          />

          {/* Notch & Status Bar */}
          <div className="mobile-notch">
            <div className="notch-camera" />
            <div className="notch-speaker" />
          </div>

          <div className="mobile-status-bar">
            <span>{currentTimeStr}</span>
            <div className="status-bar-icons">
              <Compass size={12} style={{ animation: isLocationActive ? 'spin 4s linear infinite' : 'none' }} />
              <span>5G</span>
              <div style={{ width: 15, height: 8, border: '1px solid #fff', borderRadius: 2, padding: 1, display: 'flex' }}>
                <div style={{ width: '80%', height: '100%', background: '#fff', borderRadius: 1 }} />
              </div>
            </div>
          </div>

          {/* Simulator Header */}
          <div className="simulator-header">
            <div className="simulator-title-bar">
              <div>
                <h3>Location History Concept</h3>
                <p className="simulator-subtitle">
                  Drag bubble into center pin to share live location
                  {bubbles.length < INITIAL_BUBBLES.length && !isLocationActive && (
                    <button
                      className="simulator-reset-link"
                      onClick={() => {
                        setBubbles(
                          INITIAL_BUBBLES.map(b => ({
                            ...b,
                            currentX: b.x,
                            currentY: b.y,
                            isDragging: false
                          }))
                        );
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#22c55e',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        marginLeft: '8px',
                        fontSize: '0.68rem',
                        fontWeight: 'bold',
                        padding: 0
                      }}
                    >
                      (Reset Demo)
                    </button>
                  )}
                </p>
              </div>
              <button className="simulator-close-btn" onClick={onClose} title="Exit Simulator">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Floating Canvas Workspace Grid */}
          <div className="floating-canvas">
            <div className="canvas-grid-bg" />

            {/* Bubble Drag success Floating Toast alert */}
            {toastMessage && (
              <div className="concept-floating-toast animate-slide-down">
                <div className="toast-success-check">
                  <Check size={11} strokeWidth={4} />
                </div>
                <span>{toastMessage}</span>
              </div>
            )}

            {/* 5 Organic Floating Bobbing Bubbles */}
            {bubbles.map((bubble, index) => {
              if (bubble.isMerged) return null; // hide bubble if it successfully drops and merges

              const isSharing = activeSharingBubbleId === bubble.id;
              const isOther = activeSharingBubbleId !== null && !isSharing;
              const isEnding = isSharing && isEndingSharing;

              // Disable bobbing animation dynamically while dragging or sharing
              const bobbingClass = (bubble.isDragging || isSharing) ? '' : bubble.bobClass;

              return (
                <div
                  key={bubble.id}
                  className={`floating-bubble-wrapper 
                    ${bobbingClass} 
                    ${bubble.isDragging ? 'is-dragging' : ''} 
                    ${isSharing ? 'is-sharing-active' : ''} 
                    ${isEnding ? 'is-ending-shrink' : ''} 
                    ${isOther ? 'other-bubble-hidden' : ''}
                  `}
                  style={{
                    left: (bubble.isDragging || isSharing) ? bubble.currentX : bubble.x,
                    top: (bubble.isDragging || isSharing) ? bubble.currentY : bubble.y,
                    transform: (bubble.isDragging || isSharing) ? 'none' : undefined,
                    '--glow-color': bubble.color,
                    '--glow-color-rgb': bubble.rgb
                  }}
                  onMouseDown={(e) => handleStartDrag(bubble.id, e)}
                  onTouchStart={(e) => handleStartDrag(bubble.id, e)}
                >
                  {isSharing && (
                    <div className="live-pulsing-badge">
                      <span className="live-dot" />
                      <span>LIVE</span>
                    </div>
                  )}
                  <span className="bubble-label-tag">{isSharing ? `${bubble.name} (Sharing Live)` : bubble.label}</span>
                  <div className="bubble-body">
                    {/* Render Overlapping avatar groups clusters */}
                    {bubble.overlapsCount === 1 ? (
                      bubble.isGroup ? (
                        <span className="group-icon-avatar">{bubble.avatar}</span>
                      ) : (
                        <span className="bubble-avatar-text">{bubble.avatar}</span>
                      )
                    ) : bubble.overlapsCount === 2 ? (
                      <div className="cluster-2">
                        {bubble.overlaps.map((avatarChar, aIdx) => (
                          <div key={aIdx} className="cluster-avatar">{avatarChar}</div>
                        ))}
                      </div>
                    ) : (
                      <div className="cluster-3">
                        {bubble.overlaps.map((avatarChar, aIdx) => (
                          <div key={aIdx} className="cluster-avatar">{avatarChar}</div>
                        ))}
                      </div>
                    )}

                    {/* Small Location pin badge decoration */}
                    <div className="location-pin-badge">
                      <MapPin />
                    </div>
                  </div>

                  {/* Vertical Pill Capsule: Top D (Directions) & Bottom C (Chat) directly above bubble */}
                  {selectedBubble?.id === bubble.id && (
                    <div className="vertical-bubble-actions-pill">
                      <button 
                        className="v-action-btn dir-v-btn"
                        title={`Directions to ${bubble.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBubble(null);
                          setToastMessage(`🧭 Calculating live route to ${bubble.name}...`);
                          if (onGetDirections) onGetDirections(bubble.name);
                          setTimeout(() => setToastMessage(''), 3000);
                        }}
                      >
                        <Navigation size={18} />
                      </button>
                      <button 
                        className="v-action-btn chat-v-btn"
                        title={`Chat with ${bubble.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBubble(null);
                          setToastMessage(`💬 Opening chat thread with ${bubble.name}...`);
                          if (onOpenChat) onOpenChat(bubble.name);
                          setTimeout(() => setToastMessage(''), 3000);
                        }}
                      >
                        <MessageSquare size={18} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Interactive Location Target Dock Bottom Section */}
            <div className="target-dock-section">
              {/* Radial guidelines visually representing active drop target area */}
              <div className={`proximity-ring-visual ${dragActiveGlobal ? 'dragging-active' : ''}`} />

              {/* Outer rotating dashed ring while sharing is active */}
              <div className={`active-pulse-ring ${isLocationActive ? 'visible' : ''}`} />

              {/* Ripple expanding rings upon drop success */}
              <div className="ripple-waves-holder">
                {ripples.map((ripIdx) => (
                  <div key={ripIdx} className={`ripple-wave trigger-${ripIdx}`} />
                ))}
              </div>

              <div className="target-glow-ring">
                <button
                  className={`large-location-btn 
                    ${dragActiveGlobal ? 'dragging-active' : ''} 
                    ${nearTargetId ? 'near-target' : ''} 
                    ${isLocationActive ? 'location-active' : ''}
                  `}
                  title={isLocationActive ? "Stop Live Location Sharing" : "Target drop"}
                  onClick={handleLocationButtonClick}
                >
                  {isLocationActive ? (
                    <Radio className="broadcast-signal" />
                  ) : (
                    <MapPin />
                  )}
                </button>
              </div>

              {/* Status text details */}
              <span className={`location-status-label ${isLocationActive ? 'active' : ''}`}>
                {isLocationActive
                  ? `BROADCASTING: ${activeEntityName.toUpperCase()}`
                  : dragActiveGlobal
                    ? 'Drop avatar to share'
                    : 'Location Standby'
                }
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationBubbleConcept;
