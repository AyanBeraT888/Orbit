import React from 'react';
import './LottieToggle.css';

/**
 * Animated Enable/Disable Toggle Switch
 * Replaces standard checkbox/toggle buttons with a smooth elastic animated switch
 */
const LottieToggle = ({ checked = false, onChange, disabled = false, size = 'md', label = '' }) => {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div 
      className={`lottie-toggle-wrapper ${size} ${checked ? 'is-on' : 'is-off'} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
    >
      <div className="lottie-toggle-track">
        {/* Glow & ripple backdrop */}
        <div className="lottie-toggle-glow" />
        
        {/* State icons inside track */}
        <span className="lottie-toggle-icon icon-on">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <span className="lottie-toggle-icon icon-off">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>

        {/* Sliding elastic knob */}
        <div className="lottie-toggle-knob">
          <div className="knob-pulse" />
        </div>
      </div>
      {label && <span className="lottie-toggle-label">{label}</span>}
    </div>
  );
};

export default LottieToggle;
