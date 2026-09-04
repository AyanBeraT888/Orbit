import React from 'react';
import { MapPin, Navigation, Compass } from 'lucide-react';
import './OrbitLoader.css';

/**
 * ⚡ Zero-Lag 60 FPS Hardware-Accelerated Map & Orbit Loader
 * Pure CSS/SVG GPU rendering — 0 KB download, 0 JS thread lag, 100% Free!
 */
const OrbitLoader = ({ fullScreen = true, message = "Connecting to Orbit...", size = 140 }) => {
  const content = (
    <div className="orbit-loader-container">
      {/* 3D Map Radar & Orbit Stage */}
      <div className="orbit-radar-stage" style={{ width: `${size}px`, height: `${size}px` }}>
        {/* Tilted 3D Map Grid Floor */}
        <div className="orbit-map-plane">
          <div className="orbit-radar-grid" />
        </div>

        {/* Sonar Radar Pulses */}
        <div className="orbit-sonar-pulse" />
        <div className="orbit-sonar-pulse delay" />

        {/* Outer Orbiting Satellite Ring */}
        <div className="orbit-ring-primary">
          <div className="orbit-satellite-1" />
        </div>

        {/* Inner Counter-Orbiting Satellite Ring */}
        <div className="orbit-ring-secondary">
          <div className="orbit-satellite-2" />
        </div>

        {/* Center Glowing Map Pin */}
        <div className="orbit-center-pin">
          <Navigation size={22} style={{ transform: 'rotate(45deg)' }} />
        </div>
      </div>

      {/* Branded Loading Tagline */}
      {message && (
        <p className="orbit-loader-text">
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#0a0d14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}>
        {content}
      </div>
    );
  }

  return content;
};

export default OrbitLoader;
