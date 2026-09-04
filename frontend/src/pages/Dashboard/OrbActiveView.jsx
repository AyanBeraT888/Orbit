import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Radio, 
  Play, 
  Pause, 
  Search, 
  PlusCircle, 
  CheckCircle, 
  ShieldAlert, 
  Navigation, 
  Volume2, 
  Camera, 
  Eye, 
  TrendingDown, 
  Zap, 
  Users, 
  Gauge, 
  Sparkles, 
  Undo2, 
  Rss, 
  AlertTriangle,
  Bike,
  Flame,
  Waves,
  Mountain
} from 'lucide-react';
import './OrbActiveView.css';

const ACTIVITIES = [
  { id: 'bike_touring', name: 'BIKE TOURING', icon: 'directions_bike', LucideIcon: Bike },
  { id: 'trail_run', name: 'TRAIL RUN', icon: 'running_with_errors', LucideIcon: Flame },
  { id: 'open_water', name: 'OPEN WATER', icon: 'pool', LucideIcon: Waves },
  { id: 'alpinism', name: 'ALPINISM', icon: 'downhill_skiing', LucideIcon: Mountain },
  { id: 'downhill_skiing', name: 'ALPINE SKI', icon: 'downhill_skiing', LucideIcon: Mountain },
  { id: 'endurance_cycling', name: 'SPEED CYCLING', icon: 'directions_bike', LucideIcon: Bike }
];

const INITIAL_SQUAD = [
  {
    id: 'peak-pursuit',
    name: 'Peak Pursuit Club',
    members: '8 Members Active',
    type: 'group',
    isNearby: false,
    avatar: 'https://images.unsplash.com/photo-1517649763962-0c623266010b?w=150&auto=format&fit=crop&q=80',
    selected: false
  },
  {
    id: 'rider-one',
    name: 'Rider One',
    members: 'Connected via Mesh',
    type: 'friend',
    isNearby: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    selected: true
  },
  {
    id: 'sarah-k',
    name: 'Sarah K.',
    members: 'Last seen 10m ago',
    type: 'friend',
    isNearby: false,
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    selected: false
  },
  {
    id: 'marcus-chen',
    name: 'Marcus Chen',
    members: 'Away',
    type: 'friend',
    isNearby: false,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    selected: false
  }
];

const INITIAL_GROUP_MEMBERS = [
  {
    id: 'you',
    name: 'YOU',
    role: 'LEADER',
    distOffset: '0m',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    isLeader: true
  },
  {
    id: 'mike',
    name: 'MIKE',
    role: 'SQUAD',
    distOffset: '-150m',
    status: 'normal',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    isLeader: false
  },
  {
    id: 'sarah',
    name: 'SARAH',
    role: 'SQUAD',
    distOffset: '-210m',
    status: 'normal',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    isLeader: false
  },
  {
    id: 'alex',
    name: 'ALEX',
    role: 'SQUAD',
    distOffset: '-620m',
    status: 'lagging',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    isLeader: false
  }
];

const OrbActiveView = ({ onClose, onSendNotification }) => {
  // ── Modes & Sub-Tabs ───────────────────────────────────────────────────────
  const [mode, setMode] = useState('setup'); // 'setup' | 'live_dash' | 'group_escalation'
  const [dashTab, setDashTab] = useState('dash'); // 'dash' | 'group' | 'comms' | 'modes'

  // ── Setup Mode States ─────────────────────────────────────────────────────
  const [selectedActivity, setSelectedActivity] = useState('bike_touring');
  const [squadSearch, setSquadSearch] = useState('');
  const [squadList, setSquadList] = useState(INITIAL_SQUAD);
  const [isInitializing, setIsInitializing] = useState(false);

  // ── Live Dash Telemetry States ───────────────────────────────────────────
  const [speed, setSpeed] = useState(32.4);
  const [peakSpeed, setPeakSpeed] = useState(48.2);
  const [distance, setDistance] = useState(14.8);
  const [secondsElapsed, setSecondsElapsed] = useState(2535); // 00:42:15
  const [isPaused, setIsPaused] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // ── Group Escalation States ──────────────────────────────────────────────
  const [groupMembers, setGroupMembers] = useState(INITIAL_GROUP_MEMBERS);
  const [groupViewFilter, setGroupViewFilter] = useState('group'); // 'group' | 'personal'
  const [isPinging, setIsPinging] = useState(false);

  // ── Timer & Telemetry Simulation ─────────────────────────────────────────
  useEffect(() => {
    let interval = null;
    if (mode === 'live_dash' && !isPaused) {
      interval = setInterval(() => {
        // Micro fluctuation speed
        setSpeed((prev) => {
          const delta = (Math.random() - 0.48) * 0.5;
          const nextVal = Math.max(18.0, Math.min(52.0, prev + delta));
          if (nextVal > peakSpeed) setPeakSpeed(parseFloat(nextVal.toFixed(1)));
          return parseFloat(nextVal.toFixed(1));
        });

        // Increment distance slightly
        setDistance((prev) => parseFloat((prev + 0.009).toFixed(2)));

        // Increment duration
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, isPaused, peakSpeed]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  const formatDuration = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const handleToggleSquadItem = (id) => {
    setSquadList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleStartSession = () => {
    setIsInitializing(true);
    setTimeout(() => {
      setIsInitializing(false);
      setMode('live_dash');
      showToast('⚡ Session Initialized. GPS Lock Secured.');
    }, 1200);
  };

  const handlePingLagging = () => {
    setIsPinging(true);
    showToast('📡 Pinging Alex (-620m) & lagging squad members...');

    if (window.dispatchEvent) {
      window.dispatchEvent(
        new CustomEvent('orb_user_action', {
          detail: {
            text: '📡 ORB ACTIVE: Escalation alert sent to lagging squad member Alex (-620m).',
            isAllowedUndo: false,
            actionType: 'orb_active_escalation'
          }
        })
      );
    }

    setTimeout(() => {
      setIsPinging(false);
    }, 1500);
  };

  const filteredSquad = squadList.filter((item) =>
    item.name.toLowerCase().includes(squadSearch.toLowerCase())
  );

  return (
    <div className="orb-active-container">
      {/* ── Sub-Nav Top Bar ───────────────────────────────────────────────── */}
      <header className="orb-active-header">
        <div className="header-brand-wrap">
          {onClose && (
            <button className="header-back-btn" onClick={onClose} title="Back to Map">
              <Undo2 size={16} />
            </button>
          )}
          <div className="active-badge-tag">
            <Radio size={14} className="badge-signal-icon" />
            <span className="badge-title">ORB ACTIVE</span>
          </div>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="mode-segmented-tabs">
          <button
            className={`mode-tab-btn ${mode === 'setup' ? 'active' : ''}`}
            onClick={() => setMode('setup')}
          >
            Setup
          </button>
          <button
            className={`mode-tab-btn ${mode === 'live_dash' ? 'active' : ''}`}
            onClick={() => setMode('live_dash')}
          >
            Telemetry
          </button>
          <button
            className={`mode-tab-btn ${mode === 'group_escalation' ? 'active' : ''}`}
            onClick={() => setMode('group_escalation')}
          >
            Escalation
          </button>
        </div>

        <div className="header-status-wrap">
          <span className="live-status-pill">LIVE</span>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="orb-active-toast animate-slide-down">
          <Sparkles size={14} className="toast-sparkle" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── VIEW 1: SETUP & SQUAD SELECTION ─────────────────────────────── */}
      {mode === 'setup' && (
        <div className="orb-active-content setup-view-content animate-fade-in">
          <div className="setup-title-section">
            <h2 className="setup-headline">New Session</h2>
            <p className="setup-subtext">SELECT MODE & SQUAD MESH NETWORK</p>
          </div>

          {/* Activity Horizontal Scroll */}
          <section className="setup-section">
            <div className="section-label-row">
              <span className="label-title">ACTIVITY TYPE</span>
              <span className="label-badge">6 MODES AVAILABLE</span>
            </div>
            <div className="activity-scroll-row no-scrollbar">
              {ACTIVITIES.map((act) => {
                const isSelected = selectedActivity === act.id;
                const IconComp = act.LucideIcon;
                return (
                  <div
                    key={act.id}
                    className={`activity-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedActivity(act.id)}
                  >
                    {isSelected && <div className="pulse-ring-effect" />}
                    <IconComp size={36} className="activity-icon" />
                    <span className="activity-name">{act.name}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Squad Invitation Section */}
          <section className="setup-section">
            <div className="section-label-row">
              <span className="label-title">INVITE SQUAD</span>
              <span className="label-status">GPS LOCK: STRONG</span>
            </div>

            <div className="squad-search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Find friends or groups..."
                value={squadSearch}
                onChange={(e) => setSquadSearch(e.target.value)}
              />
            </div>

            <div className="squad-list-grid">
              {filteredSquad.map((item) => (
                <div
                  key={item.id}
                  className={`squad-card-item ${item.selected ? 'selected-card' : ''}`}
                  onClick={() => handleToggleSquadItem(item.id)}
                >
                  <div className="squad-avatar-wrap">
                    <img src={item.avatar} alt={item.name} className="squad-avatar-img" />
                  </div>
                  <div className="squad-info flex-1">
                    <p className="squad-name">
                      {item.name}
                      {item.isNearby && <span className="nearby-pill">NEARBY</span>}
                    </p>
                    <p className="squad-meta">{item.members}</p>
                  </div>
                  <button className="squad-action-btn">
                    {item.selected ? (
                      <CheckCircle size={22} className="text-lime" />
                    ) : (
                      <PlusCircle size={22} className="text-muted" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* Fixed Bottom Action Start Button */}
          <div className="setup-action-footer">
            <button
              className={`start-session-btn ${isInitializing ? 'loading' : ''}`}
              onClick={handleStartSession}
              disabled={isInitializing}
            >
              {isInitializing ? (
                <>
                  <Activity size={20} className="spin-animate" />
                  <span>CONNECTING MESH...</span>
                </>
              ) : (
                <>
                  <Play size={20} fill="currentColor" />
                  <span>START SESSION</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW 2: LIVE TELEMETRY DASHBOARD ────────────────────────────── */}
      {mode === 'live_dash' && (
        <div className="orb-active-content live-dash-content animate-fade-in">
          {/* Top Topo Map Context Banner */}
          <div className="topo-map-header-banner">
            <div className="topo-overlay-text">
              <span className="topo-loc-label">LOCATION: FRENCH ALPS PASS</span>
              <span className="topo-coord-label">ALTITUDE: 1,420M</span>
            </div>
          </div>

          {/* Telemetry Bento Grid */}
          <div className="telemetry-bento-grid">
            {/* Speedometer Card */}
            <div className="bento-card speed-main-card">
              <div className="speed-card-header">
                <span className="card-lbl">SPEED</span>
                <div className="peak-speed-tag">
                  <Zap size={12} />
                  <span>PEAK {peakSpeed}</span>
                </div>
              </div>

              <div className="speed-value-display">
                <span className="speed-num">{speed}</span>
                <span className="speed-unit">KM/H</span>
              </div>

              {/* Sparkline Graph */}
              <div className="sparkline-container">
                <div className="sparkline-bar bar-1" />
                <div className="sparkline-bar bar-2" />
                <div className="sparkline-bar bar-3" />
                <div className="sparkline-bar bar-4" />
                <div className="sparkline-bar bar-5" />
                <div className="sparkline-bar bar-6" />
                <div className="sparkline-bar bar-7" />
                <div className="sparkline-bar bar-8" />
              </div>
            </div>

            {/* Distance Card */}
            <div className="bento-card stat-sub-card">
              <span className="card-lbl">DISTANCE</span>
              <div className="stat-value">
                <span className="stat-num">{distance}</span>
                <span className="stat-unit">KM</span>
              </div>
            </div>

            {/* Duration Card */}
            <div className="bento-card stat-sub-card">
              <span className="card-lbl">DURATION</span>
              <div className="stat-value">
                <span className="stat-num">{formatDuration(secondsElapsed)}</span>
              </div>
            </div>

            {/* Screen Wake Lock Status Pill */}
            <div
              className={`wake-lock-pill ${wakeLockActive ? 'active' : ''}`}
              onClick={() => {
                setWakeLockActive(!wakeLockActive);
                showToast(
                  wakeLockActive ? 'Wake Lock Disabled' : 'Wake Lock Always On Enabled'
                );
              }}
            >
              <div className="wake-left">
                <Eye size={16} className="wake-icon" />
                <span>WAKE LOCK ACTIVE</span>
              </div>
              <span className="wake-badge">{wakeLockActive ? 'ALWAYS ON' : 'OFF'}</span>
            </div>

            {/* Proximity Alert Callout */}
            <div className="proximity-alert-box" onClick={() => setMode('group_escalation')}>
              <div className="prox-left">
                <div className="prox-avatar-wrap pulse-ring-small">
                  <img
                    src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80"
                    alt="Sara"
                  />
                </div>
                <div>
                  <span className="prox-tag">RIDER DETECTED</span>
                  <h4 className="prox-name">SARA CROSSING</h4>
                </div>
              </div>
              <div className="prox-right">
                <span className="prox-dist">12m</span>
                <div className="prox-sub">
                  <TrendingDown size={12} />
                  <span>Closing</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Floating Controls (Voice, Pause, Camera) */}
          <div className="telemetry-controls-row">
            <button
              className="ctrl-btn-secondary"
              onClick={() => showToast('🎙️ Push-to-Talk Channel Open')}
              title="Voice Comms"
            >
              <Volume2 size={24} />
            </button>

            <button
              className="ctrl-btn-primary"
              onClick={() => {
                setIsPaused(!isPaused);
                showToast(isPaused ? '▶️ Session Resumed' : '⏸️ Session Paused');
              }}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play size={32} fill="currentColor" /> : <Pause size={32} fill="currentColor" />}
            </button>

            <button
              className="ctrl-btn-secondary"
              onClick={() => showToast('📷 Session Snapshot Captured')}
              title="Capture Moment"
            >
              <Camera size={24} />
            </button>
          </div>

          {/* Bottom Sub-Nav bar */}
          <nav className="telemetry-subnav">
            <button
              className={`subnav-item ${dashTab === 'dash' ? 'active' : ''}`}
              onClick={() => setDashTab('dash')}
            >
              <Gauge size={18} />
              <span>DASH</span>
            </button>
            <button
              className={`subnav-item ${dashTab === 'group' ? 'active' : ''}`}
              onClick={() => {
                setDashTab('group');
                setMode('group_escalation');
              }}
            >
              <Users size={18} />
              <span>GROUP</span>
            </button>
            <button
              className={`subnav-item ${dashTab === 'comms' ? 'active' : ''}`}
              onClick={() => {
                setDashTab('comms');
                showToast('📡 Radio Mesh Comms Active');
              }}
            >
              <Radio size={18} />
              <span>COMMS</span>
            </button>
            <button
              className={`subnav-item ${dashTab === 'modes' ? 'active' : ''}`}
              onClick={() => {
                setDashTab('modes');
                setMode('setup');
              }}
            >
              <Activity size={18} />
              <span>MODES</span>
            </button>
          </nav>
        </div>
      )}

      {/* ── VIEW 3: GROUP ESCALATION & RADAR ────────────────────────────── */}
      {mode === 'group_escalation' && (
        <div className="orb-active-content group-escalation-content animate-fade-in">
          {/* Header Bar */}
          <div className="escalation-header-banner">
            <div>
              <div className="escalation-tag">
                <ShieldAlert size={14} className="tag-alert-icon" />
                <span>GROUP ESCALATION VIEW</span>
              </div>
              <p className="escalation-alert-text">ALEX IS 620M BEHIND LEADER</p>
            </div>
            <button
              className="toggle-view-btn"
              onClick={() =>
                setGroupViewFilter(groupViewFilter === 'group' ? 'personal' : 'group')
              }
            >
              {groupViewFilter === 'group' ? 'PERSONAL VIEW' : 'GROUP VIEW'}
            </button>
          </div>

          {/* Radar Map Canvas Overlay */}
          <div className="radar-map-canvas">
            <div className="radar-grid-bg" />

            {/* Radar Markers */}
            <div className="radar-markers-wrap">
              {/* Leader (YOU) */}
              <div className="radar-marker marker-leader">
                <div className="leader-pulse-ring" />
                <div className="marker-avatar-circle border-lime">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                    alt="You"
                  />
                </div>
                <span className="marker-badge badge-lime">YOU (LEADER)</span>
              </div>

              {/* Mike */}
              <div className="radar-marker marker-mike">
                <div className="marker-avatar-circle border-white">
                  <img
                    src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80"
                    alt="Mike"
                  />
                </div>
                <span className="marker-badge badge-dark">MIKE -150m</span>
              </div>

              {/* Alex (Lagging) */}
              <div className="radar-marker marker-alex lagging-pulse">
                <div className="marker-avatar-circle border-red">
                  <img
                    src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80"
                    alt="Alex"
                  />
                </div>
                <span className="marker-badge badge-red">ALEX -620m LAGGING</span>
              </div>
            </div>
          </div>

          {/* Group List & Ping Actions Panel */}
          <div className="group-members-panel">
            <div className="panel-top-row">
              <span className="panel-title">ACTIVE SQUAD MEMBERS (4)</span>
              <button
                className={`ping-all-btn ${isPinging ? 'pinging' : ''}`}
                onClick={handlePingLagging}
                disabled={isPinging}
              >
                <Rss size={14} />
                <span>{isPinging ? 'BROADCASTING...' : 'PING ALL LAGGING'}</span>
              </button>
            </div>

            <div className="member-rows-list">
              {groupMembers.map((member) => (
                <div
                  key={member.id}
                  className={`member-row-item ${
                    member.status === 'lagging' ? 'lagging-item' : ''
                  }`}
                >
                  <div className="member-left flex items-center gap-3">
                    <img src={member.avatar} alt={member.name} className="member-avatar" />
                    <div>
                      <span className="member-name">{member.name}</span>
                      <span className="member-role">{member.role}</span>
                    </div>
                  </div>

                  <div className="member-right flex items-center gap-2">
                    <span
                      className={`offset-badge ${
                        member.status === 'lagging' ? 'offset-lagging' : ''
                      }`}
                    >
                      {member.distOffset}
                    </span>
                    {member.status === 'lagging' && (
                      <AlertTriangle size={16} className="text-red-alert animate-bounce" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrbActiveView;
