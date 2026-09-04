import React, { useState, useEffect, useRef } from 'react';
import { Users, Settings, User, Bell, MessageSquare, Navigation, UsersRound, Globe, Trash2, X, Phone, Menu, Search, MapPin, Undo2, Radio, Check, Sparkles, History, Copy, Trophy } from 'lucide-react';
import './Dashboard.css';

import MapComponent from '../../components/Map/MapComponent';
import ProfileView from './ProfileView';
import AccountDetails from './AccountDetails';
import FriendsView from './FriendsView';
import MessagesView from './MessagesView';
import GroupsView from './GroupsView';
import CommunitiesView from './CommunitiesView';
import SocialView from './SocialView';
import LocationBubbleConcept from './LocationBubbleConcept';
import LeaderboardView from './LeaderboardView';
import socketService from '../../services/socket';
import logoImg from '../../assets/logo.png';
import OrbActiveView from './OrbActiveView';
import LottieToggle from '../../components/LottieToggle';
import { useAuth } from '../../context/AuthContext';

const INITIAL_HOME_BUBBLES = [];

const Dashboard = () => {
  // ── All state declarations first ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('map');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMapSearchActive, setIsMapSearchActive] = useState(false);
  const [inDirectionsMode, setInDirectionsMode] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const countdownIntervalRef = useRef(null);

  const [selectedChatPartner, setSelectedChatPartner] = useState(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const [showBubbleDemo, setShowBubbleDemo] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: 1, text: "Welcome to Orb! Turn on live location sharing in Groups to notify members.", time: "Just now", type: "system", read: false }
  ]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [holdingNotifId, setHoldingNotifId] = useState(null);
  const pressTimer = useRef(null);

  const { logout } = useAuth();
  const [userData, setUserData] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const token = localStorage.getItem('token');

  const [myLocation, setMyLocation] = useState(null);
  const [myAddress, setMyAddress] = useState(null);
  const [friendLocations, setFriendLocations] = useState({});
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState('friends');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [homeSelectedBubble, setHomeSelectedBubble] = useState(null);

  // Floating Home Location Bubbles State
  const [homeBubbles, setHomeBubbles] = useState(() => {
    const saved = localStorage.getItem('orb_last_shared_contacts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(b => ({
            ...b,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            isMerged: false,
            isActiveShare: false
          }));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_HOME_BUBBLES.map(b => ({
      ...b,
      offsetX: 0,
      offsetY: 0,
      isDragging: false,
      isMerged: false
    }));
  });

  const [activeHomeDragId, setActiveHomeDragId] = useState(null);
  const [nearHomeTargetId, setNearHomeTargetId] = useState(null);
  const [homeToastMessage, setHomeToastMessage] = useState('');
  const [homeRipples, setHomeRipples] = useState([]);
  const [homeDragActiveGlobal, setHomeDragActiveGlobal] = useState(false);
  const [homeActiveEntityName, setHomeActiveEntityName] = useState('');
  const [activeHomeShareId, setActiveHomeShareId] = useState(null);

  // Inactivity reminder states & refs
  const [showInactivityReminder, setShowInactivityReminder] = useState(false);
  const inactivityTimerRef = useRef(null);
  const inactivityDismissTimerRef = useRef(null);


  // Scroll reveal state and track ref for horizontal carousel
  const [isCarouselExpanded, setIsCarouselExpanded] = useState(false);
  const carouselTrackRef = useRef(null);

  // Swipe/scroll-down close gesture refs
  const touchStartY = useRef(null);
  const touchStartX = useRef(null);

  const updateShareHistory = (name, isGroup, setActive = false) => {
    const existing = homeBubbles.find(b => b.name === name) || INITIAL_HOME_BUBBLES.find(b => b.name === name);

    let contact;
    if (existing) {
      contact = { ...existing };
    } else {
      const colors = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899'];
      const rgbs = ['59, 130, 246', '245, 158, 11', '139, 92, 246', '16, 185, 129', '236, 72, 153'];
      const index = Math.abs(name.charCodeAt(0) + name.length) % colors.length;

      contact = {
        id: `solo-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name: name,
        avatar: isGroup ? '👥' : name.charAt(0).toUpperCase(),
        color: colors[index],
        rgb: rgbs[index],
        label: isGroup ? `${name} Group` : `${name}`,
        isGroup: isGroup,
        overlapsCount: 1
      };
    }

    setHomeBubbles(prev => {
      const filtered = prev.filter(b => b.name !== name);
      const newList = [contact, ...filtered].slice(0, 5);

      const mappedList = newList.map((b, idx) => ({
        ...b,
        bobClass: `home-bobbing-${idx}`,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        isMerged: setActive ? true : false,
        isActiveShare: false,
        isDisappearing: false
      }));

      const finalMapped = mappedList.map(b => {
        if (b.name === name && setActive) {
          return {
            ...b,
            isMerged: false,
            isActiveShare: true
          };
        }
        return b;
      });

      localStorage.setItem('orb_last_shared_contacts', JSON.stringify(finalMapped));
      return finalMapped;
    });
  };

  const homeDragStartRef = useRef({ x: 0, y: 0 });
  const homeBubbleStartRef = useRef({ x: 0, y: 0 });

  const handleHomeStartDrag = (id, e) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const bubble = homeBubbles.find(b => b.id === id);
    if (!bubble) return;

    homeDragStartRef.current = { x: clientX, y: clientY };
    homeBubbleStartRef.current = { x: bubble.offsetX || 0, y: bubble.offsetY || 0 };
    setActiveHomeDragId(id);
    setHomeDragActiveGlobal(true);

    setHomeBubbles(prev =>
      prev.map(b => (b.id === id ? { ...b, isDragging: true } : b))
    );
  };

  const handleHomeMoveDrag = (e) => {
    if (!activeHomeDragId) return;

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    const dx = clientX - homeDragStartRef.current.x;
    const dy = clientY - homeDragStartRef.current.y;

    const targetOffsetX = homeBubbleStartRef.current.x + dx;
    const targetOffsetY = homeBubbleStartRef.current.y + dy;

    // Check proximity to the Location FAB
    const fabEl = document.querySelector('.location-fab');
    const bubbleEl = document.getElementById(`home-bubble-${activeHomeDragId}`);

    let isNear = false;
    if (fabEl && bubbleEl) {
      const fabRect = fabEl.getBoundingClientRect();
      const bubbleRect = bubbleEl.getBoundingClientRect();

      const fabCenter = {
        x: fabRect.left + fabRect.width / 2,
        y: fabRect.top + fabRect.height / 2
      };

      const bubbleCenter = {
        x: bubbleRect.left + bubbleRect.width / 2,
        y: bubbleRect.top + bubbleRect.height / 2
      };

      const distance = Math.sqrt(
        Math.pow(bubbleCenter.x - fabCenter.x, 2) +
        Math.pow(bubbleCenter.y - fabCenter.y, 2)
      );

      isNear = distance < 85;
    }

    if (isNear) {
      setNearHomeTargetId(activeHomeDragId);
    } else {
      setNearHomeTargetId(null);
    }

    setHomeBubbles(prev =>
      prev.map(b =>
        b.id === activeHomeDragId
          ? { ...b, offsetX: targetOffsetX, offsetY: targetOffsetY }
          : b
      )
    );
  };

  const handleHomeEndDrag = () => {
    if (!activeHomeDragId) return;

    const isSuccessfulDrop = !!nearHomeTargetId;
    const currentDraggedId = activeHomeDragId;

    if (isSuccessfulDrop) {
      const draggedBubble = homeBubbles.find(b => b.id === currentDraggedId);
      if (draggedBubble) {
        setIsSharingLocation(true);
        setActiveHomeShareId(draggedBubble.id);
        setHomeActiveEntityName(draggedBubble.name);
        setHomeToastMessage(`Live Location Active for ${draggedBubble.name}!`);
        setTimeout(() => setHomeToastMessage(''), 2000);
        setHomeRipples([0, 1, 2]);

        updateShareHistory(draggedBubble.name, draggedBubble.isGroup, true);

        if (draggedBubble.isGroup) {
          // Trigger actual group live share in GroupsView!
          window.dispatchEvent(new CustomEvent('orb_group_live_share_trigger', {
            detail: { groupId: draggedBubble.id, active: true }
          }));

          window.dispatchEvent(new CustomEvent('orb_user_action', {
            detail: {
              text: `Shared location in group: "${draggedBubble.name}".`,
              actionType: 'group_live_share',
              payload: { groupId: draggedBubble.id, active: true }
            }
          }));
        } else {
          // Solo friend share
          window.dispatchEvent(new CustomEvent('orb_user_action', {
            detail: {
              text: `Started live location sharing with ${draggedBubble.name}.`,
              actionType: 'share_location',
              payload: { active: true }
            }
          }));
        }
      }
    } else {
      setHomeBubbles(prev =>
        prev.map(b =>
          b.id === currentDraggedId
            ? { ...b, offsetX: 0, offsetY: 0, isDragging: false }
            : b
        )
      );
    }

    setActiveHomeDragId(null);
    setNearHomeTargetId(null);
    setHomeDragActiveGlobal(false);
  };

  useEffect(() => {
    if (activeHomeDragId) {
      window.addEventListener('mousemove', handleHomeMoveDrag);
      window.addEventListener('mouseup', handleHomeEndDrag);
      window.addEventListener('touchmove', handleHomeMoveDrag, { passive: false });
      window.addEventListener('touchend', handleHomeEndDrag);
    }
    return () => {
      window.removeEventListener('mousemove', handleHomeMoveDrag);
      window.removeEventListener('mouseup', handleHomeEndDrag);
      window.removeEventListener('touchmove', handleHomeMoveDrag);
      window.removeEventListener('touchend', handleHomeEndDrag);
    };
  }, [activeHomeDragId, homeBubbles]);

  // Track 10 seconds of inactivity to remind user to share location
  useEffect(() => {
    const resetInactivityTimer = () => {
      setShowInactivityReminder(false);

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (inactivityDismissTimerRef.current) {
        clearTimeout(inactivityDismissTimerRef.current);
        inactivityDismissTimerRef.current = null;
      }

      // Only start inactivity timer if location sharing is not active and map tab is selected
      if (!isSharingLocation && activeTab === 'map') {
        inactivityTimerRef.current = setTimeout(() => {
          setShowInactivityReminder(true);

          // Disappear automatically after exactly 3 seconds
          inactivityDismissTimerRef.current = setTimeout(() => {
            setShowInactivityReminder(false);
            inactivityDismissTimerRef.current = null;
          }, 3000);
        }, 10000); // 10 seconds of inactivity
      }
    };

    // Attach listeners for any user activity
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    activityEvents.forEach(evt => {
      window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });

    // Start timer initially
    resetInactivityTimer();

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (inactivityDismissTimerRef.current) {
        clearTimeout(inactivityDismissTimerRef.current);
      }
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, resetInactivityTimer);
      });
    };
  }, [isSharingLocation, activeTab]);

  useEffect(() => {
    const handleLiveShareNotif = (e) => {
      const { type, name, active } = e.detail;
      const isGroup = type === 'group';

      if (active) {
        const existing = homeBubbles.find(b => b.name === name) || INITIAL_HOME_BUBBLES.find(b => b.name === name);
        const contactId = existing ? existing.id : `solo-${name.toLowerCase().replace(/\s+/g, '-')}`;

        setIsSharingLocation(true);
        setActiveHomeShareId(contactId);
        setHomeActiveEntityName(name);
        setHomeToastMessage(`Live Location Active for ${name}!`);
        setTimeout(() => setHomeToastMessage(''), 2000);
        setHomeRipples([0, 1, 2]);

        updateShareHistory(name, isGroup, true);
      } else {
        setIsSharingLocation(false);
        setHomeActiveEntityName('');
        setActiveHomeShareId(null);
        setHomeToastMessage('');
        setHomeRipples([]);

        setHomeBubbles(prev => {
          const resetList = prev.map(b => ({
            ...b,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            isMerged: false,
            isActiveShare: false,
            isDisappearing: false
          }));
          localStorage.setItem('orb_last_shared_contacts', JSON.stringify(resetList));
          return resetList;
        });
      }
    };

    const handleUndo = (e) => {
      const { actionType } = e.detail;

      if (actionType === 'share_location' || actionType === 'group_live_share') {
        setIsSharingLocation(false);
        setHomeActiveEntityName('');
        setActiveHomeShareId(null);
        setHomeToastMessage('');
        setHomeRipples([]);

        setHomeBubbles(prev => {
          const resetList = prev.map(b => ({
            ...b,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            isMerged: false,
            isActiveShare: false,
            isDisappearing: false
          }));
          localStorage.setItem('orb_last_shared_contacts', JSON.stringify(resetList));
          return resetList;
        });
      }
    };

    window.addEventListener('live_share_notification', handleLiveShareNotif);
    window.addEventListener('orb_undo_action', handleUndo);
    return () => {
      window.removeEventListener('live_share_notification', handleLiveShareNotif);
      window.removeEventListener('orb_undo_action', handleUndo);
    };
  }, [homeBubbles]);



  // ── Handlers (state is declared above, so these close over correct values) ─
  const startCountdown = () => {
    let currentVal = 4;
    setCountdown(4);
    countdownIntervalRef.current = setInterval(() => {
      currentVal -= 1;
      if (currentVal <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setCountdown(null);
        setIsSharingLocation(true);

        // Determine section label based on privacyLevel/customPrivacyValue
        let sections = [];
        if (privacyLevel === 'friends' || privacyLevel === 'custom') {
          sections.push('Friends');
        }
        if (privacyLevel === 'groups_community' || privacyLevel === 'custom') {
          sections.push('Groups');
        }
        const sectionLabel = sections.join(', ');

        window.dispatchEvent(new CustomEvent('orb_user_action', {
          detail: {
            text: `Location sharing activated successfully for ${sectionLabel}.`,
            actionType: 'global_live_share',
            payload: { isSharing: false }
          }
        }));
      } else {
        setCountdown(currentVal);
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
  };

  const startPress = (id) => {
    pressTimer.current = setTimeout(() => {
      setHoldingNotifId(id);
    }, 500);
  };

  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const handleNotifDelete = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (holdingNotifId === id) setHoldingNotifId(null);
  };

  const handleUndoNotification = (notif) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, undone: true } : n));

    if (notif.actionType === 'global_live_share') {
      setIsSharingLocation(notif.payload.isSharing);
    } else if (notif.actionType === 'change_privacy') {
      setPrivacyLevel(notif.payload.oldPrivacy);
    } else if (notif.actionType === 'toggle_notifications_enabled') {
      setNotificationsEnabled(notif.payload.oldEnabled);
    } else {
      window.dispatchEvent(new CustomEvent('orb_undo_action', {
        detail: {
          actionType: notif.actionType,
          payload: notif.payload
        }
      }));
    }
  };

  const handleToggleNotificationsEnabled = () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: nextVal ? ` Enabled notifications.` : ` Disabled notifications.`,
        actionType: 'toggle_notifications_enabled',
        payload: { oldEnabled: !nextVal }
      }
    }));
  };

  const handleLocationFabClick = () => {
    if (isSharingLocation) {
      setIsSharingLocation(false);

      // Trigger disappearing state for exit transition
      setHomeBubbles(prev =>
        prev.map(b => b.isActiveShare ? { ...b, isDisappearing: true } : b)
      );

      if (activeHomeShareId) {
        window.dispatchEvent(new CustomEvent('orb_group_live_share_trigger', {
          detail: { groupId: activeHomeShareId, active: false }
        }));
      }

      const targetId = activeHomeShareId;
      // Complete reset after 600ms fade-out animation
      setTimeout(() => {
        setHomeToastMessage('');
        setHomeRipples([]);
        setHomeActiveEntityName('');

        setHomeBubbles(prev => {
          const resetList = prev.map(b => ({
            ...b,
            offsetX: 0,
            offsetY: 0,
            isDragging: false,
            isMerged: false,
            isActiveShare: false,
            isDisappearing: false
          }));
          localStorage.setItem('orb_last_shared_contacts', JSON.stringify(resetList));
          return resetList;
        });

        setActiveHomeShareId(null);
      }, 600);

      window.dispatchEvent(new CustomEvent('orb_user_action', {
        detail: {
          text: 'Stopped live location sharing.',
          actionType: 'global_live_share',
          payload: { isSharing: true }
        }
      }));
      return;
    }

    if (countdown !== null) {
      cancelCountdown();
      return;
    }

    // Main page location button should not turn on location, show interactivity reminder banner instead
    setShowInactivityReminder(true);
    if (inactivityDismissTimerRef.current) {
      clearTimeout(inactivityDismissTimerRef.current);
    }
    inactivityDismissTimerRef.current = setTimeout(() => {
      setShowInactivityReminder(false);
      inactivityDismissTimerRef.current = null;
    }, 4000);
  };

  const [customPrivacyValue, setCustomPrivacyValue] = useState('both');

  const handlePrivacyChange = (level) => {
    const oldPrivacy = privacyLevel;
    setPrivacyLevel(level);
    if ((level === 'groups_community' || (level === 'custom' && customPrivacyValue === 'off')) && isSharingLocation) {
      setIsSharingLocation(false);
    }

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: ` Changed privacy level to "${level === 'groups_community' ? 'Groups' : level === 'friends' ? 'Friends' : 'Custom'}".`,
        actionType: 'change_privacy',
        payload: { oldPrivacy, newPrivacy: level }
      }
    }));
  };

  const handleCustomPrivacyValueChange = (val) => {
    setCustomPrivacyValue(val);
    if (val === 'off' && isSharingLocation) {
      setIsSharingLocation(false);
    }
  };

  const handleToggleNotifications = () => {
    const nextShow = !showNotifications;
    setShowNotifications(nextShow);
    if (nextShow) {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setUserData(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Handle simulated location updates from navigation
  useEffect(() => {
    const handleSimulatedLocation = (e) => {
      const { lat, lng } = e.detail;
      setMyLocation([lat, lng]);

      const emitPrivacy = privacyLevel === 'custom'
        ? (customPrivacyValue === 'both' ? 'all' : 'only_me')
        : privacyLevel;
      socketService.emit('location_update', { lat, lng, privacy: emitPrivacy });
    };

    window.addEventListener('orb_simulated_location_update', handleSimulatedLocation);
    return () => {
      window.removeEventListener('orb_simulated_location_update', handleSimulatedLocation);
    };
  }, [privacyLevel, customPrivacyValue]);

  useEffect(() => {
    if (!token) return;

    socketService.connect(token);
    socketService.emit('join_room');

    socketService.on('friend_location', (data) => {
      setFriendLocations(prev => ({
        ...prev,
        [data.uid]: { position: [data.lat, data.lng], lastSeen: new Date().toLocaleTimeString(), uid: data.uid }
      }));
    });

    socketService.on('friend_stopped', (data) => {
      setFriendLocations(prev => {
        const newLocs = { ...prev };
        delete newLocs[data.uid];
        return newLocs;
      });
    });

    return () => {
      socketService.disconnect();
    };
  }, [token]);

  // Sync state with Map Search Disambiguation Flow
  useEffect(() => {
    const handleMapSearchActive = (e) => {
      setIsMapSearchActive(e.detail.active);
      setInDirectionsMode(e.detail.inDirectionsMode || false);
      if (e.detail.active) {
        setActiveTab('map'); // Close any side drawer overlays
      }
    };
    const handleSetInput = (e) => {
      setSearchQuery(e.detail.query);
    };
    window.addEventListener('map-search-flow', handleMapSearchActive);
    window.addEventListener('map-search-set-input', handleSetInput);
    return () => {
      window.removeEventListener('map-search-flow', handleMapSearchActive);
      window.removeEventListener('map-search-set-input', handleSetInput);
    };
  }, []);

  // Initial location fetch (even if not sharing)
  useEffect(() => {
    if (navigator.geolocation && !myLocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn("Could not get initial location:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    }
  }, []);

  // Fetch encoded address whenever myLocation changes
  useEffect(() => {
    if (myLocation) {
      const [lat, lng] = myLocation;
      import('../../services/api').then(module => {
        const api = module.default;
        api.get('/location/encode', { params: { lat, lng } })
          .then(res => setMyAddress(res.data.address))
          .catch(err => console.warn('Could not encode my location:', err));
      });
    }
  }, [myLocation]);

  useEffect(() => {
    let watchId;
    if (isSharingLocation) {
      const emitPrivacy = privacyLevel === 'custom'
        ? (customPrivacyValue === 'both' ? 'all' : 'only_me')
        : privacyLevel;

      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setMyLocation([latitude, longitude]);
            socketService.emit('location_update', { lat: latitude, lng: longitude, privacy: emitPrivacy });
          },
          (error) => {
            console.error("Error watching position, falling back to default:", error);
            const fallbackLat = 22.5726;
            const fallbackLng = 88.3639;
            setMyLocation([fallbackLat, fallbackLng]);
            socketService.emit('location_update', { lat: fallbackLat, lng: fallbackLng, privacy: emitPrivacy });
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
        );
      } else {
        console.warn("Geolocation not supported by this browser/origin, falling back to default.");
        const fallbackLat = 22.5726;
        const fallbackLng = 88.3639;
        setMyLocation([fallbackLat, fallbackLng]);
        socketService.emit('location_update', { lat: fallbackLat, lng: fallbackLng, privacy: emitPrivacy });
      }
    } else {
      socketService.emit('stop_sharing');
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isSharingLocation, privacyLevel, customPrivacyValue]);

  useEffect(() => {
    const handleLiveNotification = (e) => {
      const { type, name, active } = e.detail;
      let text = '';
      if (type === 'friend') {
        text = active
          ? `You are now sharing location with friend: "${name}"`
          : `Stopped sharing location with friend: "${name}"`;
      } else {
        const entityType = type === 'group' ? 'group' : 'community';
        text = active
          ? `You are now live in ${entityType}: "${name}"`
          : `Stopped live location in ${entityType}: "${name}"`;
      }

      const newNotification = {
        id: Date.now(),
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'live',
        read: false
      };

      setNotifications(prev => [newNotification, ...prev]);
    };

    window.addEventListener('live_share_notification', handleLiveNotification);
    return () => {
      window.removeEventListener('live_share_notification', handleLiveNotification);
    };
  }, []);

  useEffect(() => {
    const handleUserAction = (e) => {
      const { text, actionType, payload } = e.detail;

      // Filter actions based on the user's specific 3 allowed categories:
      let isAllowedUndo = false;

      // 1. location on from any section or home page
      if (actionType === 'global_live_share' && payload.isSharing === false) {
        isAllowedUndo = true;
      }
      if (actionType === 'group_live_share' && payload.active === true) {
        isAllowedUndo = true;
      }
      if (actionType === 'share_location' && payload.active === true) {
        isAllowedUndo = true;
      }

      // 2. any changes in group settings
      if (['create_group', 'exit_group', 'delete_group', 'favourite_group'].includes(actionType)) {
        isAllowedUndo = true;
      }

      // 3. accept or decline any friend request, blocking any person
      if (['accept_request', 'decline_request', 'block_user', 'unblock_user'].includes(actionType)) {
        isAllowedUndo = true;
      }

      // If this is a STOP location sharing action, immediately remove the undo option from past start notifications
      if (actionType === 'global_live_share' && payload.isSharing === true) {
        setNotifications(prev =>
          prev.map(n => n.actionType === 'global_live_share' ? { ...n, undoable: false } : n)
        );
      }
      if (actionType === 'group_live_share' && payload.active === false) {
        setNotifications(prev =>
          prev.map(n => (n.actionType === 'group_live_share' && n.payload?.groupId === payload.groupId) ? { ...n, undoable: false } : n)
        );
      }
      if (actionType === 'share_location' && payload.active === false) {
        setNotifications(prev =>
          prev.map(n => (n.actionType === 'share_location' && n.payload?.friendId === payload.friendId) ? { ...n, undoable: false } : n)
        );
      }

      const notifId = Date.now();
      const newNotif = {
        id: notifId,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'action',
        read: false,
        undoable: isAllowedUndo,
        undone: false,
        actionType,
        payload
      };

      setNotifications(prev => [newNotif, ...prev]);

      // Expire the undo option after exactly 10 seconds (10000ms)
      if (isAllowedUndo) {
        setTimeout(() => {
          setNotifications(prev =>
            prev.map(n => n.id === notifId ? { ...n, undoable: false, expired: true } : n)
          );
        }, 10000);
      }
    };

    window.addEventListener('orb_user_action', handleUserAction);
    return () => {
      window.removeEventListener('orb_user_action', handleUserAction);
    };
  }, []);

  useEffect(() => {
    if (!isSharingLocation) {
      setNotifications(prev =>
        prev.map(n =>
          ['global_live_share', 'group_live_share', 'share_location'].includes(n.actionType)
            ? { ...n, undoable: false }
            : n
        )
      );
    }
  }, [isSharingLocation]);

  const markers = [];
  if (myLocation) {
    markers.push({ position: myLocation, name: "You", lastSeen: "Now" });
  }
  Object.values(friendLocations).forEach(friend => {
    markers.push({ position: friend.position, name: `Friend ${friend.uid.substring(0, 4)}`, lastSeen: friend.lastSeen });
  });

  // Swipe / Scroll Down to close panel gesture detection
  const checkIfAtTop = (target, container) => {
    let current = target;
    while (current && current !== container) {
      if (current.scrollHeight > current.clientHeight) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY || style.overflow;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          if (current.scrollTop > 8) {
            return false;
          }
        }
      }
      current = current.parentElement;
    }
    const body = container.querySelector('.floating-panel-body');
    if (body && body.scrollTop > 8) {
      return false;
    }
    return true;
  };

  const isInteractiveElement = (el) => {
    let current = el;
    while (current && current !== document.body) {
      const tagName = current.tagName.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'button' || tagName === 'select') {
        return true;
      }
      if (current.classList && (
        current.classList.contains('chat-input-bar') ||
        current.classList.contains('emoji-picker-wrap') ||
        current.classList.contains('poll-shortcut-panel') ||
        current.classList.contains('convo-search-wrap') ||
        current.classList.contains('card-actions')
      )) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  };

  const handleTouchStart = (e) => {
    if (!['chat', 'friends', 'communities', 'groups', 'settings', 'profile', 'active'].includes(activeTab)) return;
    if (isInteractiveElement(e.target)) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!['chat', 'friends', 'communities', 'groups', 'settings', 'profile', 'active'].includes(activeTab)) return;
    if (touchStartY.current === null || touchStartX.current === null) return;
    if (isInteractiveElement(e.target)) return;

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - touchStartY.current;
    const deltaX = currentX - touchStartX.current;

    // Swipe down gesture (finger moving down)
    if (deltaY > 70 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      if (checkIfAtTop(e.target, e.currentTarget)) {
        setActiveTab('map');
        touchStartY.current = null;
        touchStartX.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    touchStartX.current = null;
  };

  const handleWheel = (e) => {
    if (!['chat', 'friends', 'communities', 'groups', 'settings', 'profile', 'active'].includes(activeTab)) return;
    if (isInteractiveElement(e.target)) return;

    // e.deltaY < 0 is rolling the wheel up (trying to scroll past top)
    if (e.deltaY < -20) {
      if (checkIfAtTop(e.target, e.currentTarget)) {
        setActiveTab('map');
      }
    }
  };

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <div className="dashboard-layout">
      {/* Homepage Map Background Layer */}
      <div className="homepage-map-bg">
        <MapComponent
          center={myLocation || [22.5726, 88.3639]}
          markers={markers}
          currentUserId={userData.firebaseUid || userData.uid}
        />
      </div>

      {/* Sidebar Hover Trigger Zone */}
      {!isMapSearchActive && <div className="sidebar-hover-zone"></div>}

      {/* Floating Sidebar Icon Deck */}
      {!isMapSearchActive && (
        <aside className="sidebar floating-deck glass-morphism">
          <div className="sidebar-brand">
            <img src={logoImg} alt="Orb Logo" className="brand-logo" />
          </div>

          <nav className="nav-menu">
            <button
              className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => setActiveTab('map')}
              title="Map (Default View)"
            >
              <MapPin size={22} />
            </button>
            <button
              className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'chat' ? 'map' : 'chat')}
              title="Messages (Chats & Groups)"
            >
              <MessageSquare size={22} />
            </button>
            <button
              className={`nav-item ${activeTab === 'social' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'social' ? 'map' : 'social')}
              title="Social (Friends & Leaderboard)"
            >
              <Users size={22} />
            </button>
            {/* Orb Active Tab (Hidden for Vercel launch) */}
            {/* <button
              className={`nav-item ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'active' ? 'map' : 'active')}
              title="Orb Active (Telemetry & Mesh)"
            >
              <Radio size={22} />
            </button> */}
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'profile' ? 'map' : 'profile')}
              title="Profile & Settings"
            >
              <User size={22} />
            </button>
          </nav>

          <div className="bottom-actions">
            <button
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab(activeTab === 'settings' ? 'map' : 'settings')}
              title="Settings"
            >
              <Settings size={22} />
            </button>
          </div>
        </aside>
      )}

      {/* Interactive Main Overlay Content */}
      <main className="main-content-overlay">

        {/* Sleek Floating Top Search Bar on Map (Clean Map Overlay) */}
        {activeTab === 'map' && !inDirectionsMode && (
          <div style={{
            position: 'absolute',
            top: 20,
            left: 80,
            zIndex: 30,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            pointerEvents: 'auto'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255, 255, 255, 0.88)',
              backdropFilter: 'blur(16px)',
              borderRadius: '24px',
              padding: '8px 16px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              border: '1px solid rgba(255,255,255,0.4)',
              width: '320px',
              transition: 'all 0.3s ease'
            }}>
              <Search size={18} style={{ color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search Victoria, Flurys, Museum..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  window.dispatchEvent(new CustomEvent('map-search-query-changed', {
                    detail: { query: e.target.value }
                  }));
                }}
                onFocus={() => {
                  window.dispatchEvent(new CustomEvent('map-search-focus', { detail: { focused: true } }));
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.9rem',
                  width: '100%',
                  fontFamily: "'Outfit', sans-serif"
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    window.dispatchEvent(new CustomEvent('map-search-query-changed', {
                      detail: { query: '' }
                    }));
                  }}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating sliding glassmorphic action panels */}
        {activeTab !== 'map' && (
          <div
            className={`floating-panel glass-morphism animate-slide-right ${activeTab === 'chat' || activeTab === 'groups' || activeTab === 'communities' || activeTab === 'active' ? 'wide-panel' : ''} ${(activeTab === 'chat' || activeTab === 'groups' || activeTab === 'communities' || activeTab === 'active') ? 'chat-full-panel' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <div className="floating-panel-body">
              {activeTab === 'active' && (
                <OrbActiveView
                  onClose={() => setActiveTab('map')}
                />
              )}

              {activeTab === 'friends' && (
                <FriendsView
                  onOpenMessage={(friend) => {
                    setSelectedChatPartner(friend);
                    setActiveTab('chat');
                  }}
                  isSharingLocation={isSharingLocation}
                  setIsSharingLocation={setIsSharingLocation}
                />
              )}

              {activeTab === 'chat' && (
                <MessagesView
                  initialPartner={selectedChatPartner}
                  onClearInitialPartner={() => setSelectedChatPartner(null)}
                  onClose={() => setActiveTab('map')}
                  isSharingLocation={isSharingLocation}
                  setIsSharingLocation={setIsSharingLocation}
                />
              )}

              {activeTab === 'social' && (
                <SocialView
                  onOpenMessage={(friend) => {
                    setSelectedChatPartner(friend);
                    setActiveTab('chat');
                  }}
                  onClose={() => setActiveTab('map')}
                  isSharingLocation={isSharingLocation}
                  setIsSharingLocation={setIsSharingLocation}
                />
              )}




              {activeTab === 'profile' && (
                <ProfileView
                  user={userData}
                  isFriend={true}
                  isSelf={true}
                  onEditAccount={() => setShowAccountDetails(true)}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === 'settings' && (
                <div className="settings-view animate-fade-in">
                  <h2>Settings</h2>
                  <div className="settings-card glass-morphism" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                          <h3 style={{ marginBottom: '4px' }}>Location Privacy</h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Control who can see your location</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '12px', boxShadow: 'var(--neu-shadow-inner)', flexWrap: 'nowrap' }}>
                          {[
                            { id: 'friends', label: 'Friends' },
                            { id: 'groups_community', label: 'Groups' },
                            { id: 'custom', label: 'Custom' }
                          ].map(option => (
                            <button
                              key={option.id}
                              onClick={() => handlePrivacyChange(option.id)}
                              style={{
                                background: privacyLevel === option.id ? '#ffffff' : 'transparent',
                                color: privacyLevel === option.id ? '#1a1a1a' : 'var(--text-muted)',
                                boxShadow: privacyLevel === option.id ? 'var(--neu-shadow-outer)' : 'none',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '50px',
                                fontWeight: '600',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {privacyLevel === 'custom' && (
                        <div style={{
                          marginTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          padding: '16px',
                          background: 'var(--bg-card)',
                          borderRadius: '16px',
                          boxShadow: 'var(--neu-shadow-inner)',
                          animation: 'fadeInSlide 0.3s ease',
                          border: '1px solid rgba(59, 158, 92, 0.05)',
                        }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Custom Sharing Preferences</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {[
                              { id: 'both', label: 'Share with Both Friends & Groups', desc: 'Allows mutual friends and active groups to view your live location.' },
                              { id: 'off', label: 'Off for Both', desc: 'Completely disables active location broadcasting for both groups and friends.' }
                            ].map(subOpt => (
                              <div
                                key={subOpt.id}
                                onClick={() => handleCustomPrivacyValueChange(subOpt.id)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'flex-start',
                                  gap: '12px',
                                  padding: '12px',
                                  borderRadius: '12px',
                                  background: customPrivacyValue === subOpt.id ? 'rgba(59, 158, 92, 0.06)' : 'transparent',
                                  border: customPrivacyValue === subOpt.id ? '1px solid rgba(59, 158, 92, 0.15)' : '1px solid transparent',
                                  cursor: 'pointer',
                                  transition: 'all 0.25s ease'
                                }}
                              >
                                <input
                                  type="radio"
                                  name="customPrivacy"
                                  checked={customPrivacyValue === subOpt.id}
                                  onChange={() => { }}
                                  style={{
                                    accentColor: 'var(--primary)',
                                    marginTop: '3px',
                                    width: '15px',
                                    height: '15px',
                                    cursor: 'pointer'
                                  }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    color: customPrivacyValue === subOpt.id ? 'var(--text-main)' : 'var(--text-muted)',
                                    transition: 'color 0.2s'
                                  }}>
                                    {subOpt.label}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', opacity: 0.8 }}>
                                    {subOpt.desc}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--text-muted)', opacity: 0.2 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ marginBottom: '4px' }}>Notifications</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Manage push and email alerts</p>
                      </div>
                      <LottieToggle
                        checked={notificationsEnabled}
                        onChange={handleToggleNotificationsEnabled}
                        size="md"
                      />
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--text-muted)', opacity: 0.2 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ marginBottom: '4px' }}>Account details</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Update email and password</p>
                      </div>
                      <button className="btn-small" onClick={() => setShowAccountDetails(true)}>Manage</button>
                    </div>
                    <hr style={{ border: 'none', borderTop: '1px solid var(--text-muted)', opacity: 0.2 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h3 style={{ marginBottom: '4px' }}>Logout</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Sign out of your account</p>
                      </div>
                      <button className="btn-small btn-danger" onClick={handleLogout}>Logout</button>
                    </div>
                  </div>

                  {showAccountDetails && (
                    <AccountDetails
                      user={userData}
                      onClose={() => setShowAccountDetails(false)}
                      onUpdateUser={handleUpdateUser}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {activeTab === 'map' && (
        <div className="home-bubbles-overlay-canvas">
          {showInactivityReminder && (
            <div className="inactivity-reminder-banner">
              <div className="reminder-icon">
                <Bell size={14} />
              </div>
              <div className="reminder-text">
                Drag and drop a floating bubble onto the Location button to turn on location sharing!
              </div>
            </div>
          )}

          {/* 3D Perspective Overlapping Bubble Stack in lower right side */}
          <div
            className={`home-bubbles-carousel-container ${(isCarouselExpanded || homeDragActiveGlobal) ? 'carousel-expanded' : ''}`}
            onMouseEnter={() => {
              setIsCarouselExpanded(true);
            }}
            onMouseLeave={() => {
              setIsCarouselExpanded(false);
              setHomeSelectedBubble(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              const nextExpanded = !isCarouselExpanded;
              setIsCarouselExpanded(nextExpanded);
              if (!nextExpanded) {
                setHomeSelectedBubble(null);
              }
            }}
          >
            <div className="home-bubbles-carousel-track">
              {homeBubbles.map((b) => {
                if (b.isMerged || b.isActiveShare) return null;
                const bobClass = b.isDragging ? '' : b.bobClass;
                const disappearingClass = b.isDisappearing ? 'disappearing-state' : '';
                return (
                  <div
                    key={b.id}
                    id={`home-bubble-${b.id}`}
                    className={`home-floating-bubble-item ${bobClass} ${b.isDragging ? 'is-dragging' : ''} ${disappearingClass}`}
                    style={{
                      left: 'auto',
                      top: 'auto',
                      position: 'relative',
                      '--drag-x': `${b.offsetX}px`,
                      '--drag-y': `${b.offsetY}px`,
                      transform: `translate(${b.offsetX}px, ${b.offsetY}px)`,
                      '--glow-color': b.color,
                      flexShrink: 0
                    }}
                    onMouseDown={(e) => handleHomeStartDrag(b.id, e)}
                    onTouchStart={(e) => handleHomeStartDrag(b.id, e)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCarouselExpanded) {
                        setIsCarouselExpanded(true);
                        setHomeSelectedBubble(b);
                      } else {
                        setHomeSelectedBubble(homeSelectedBubble?.id === b.id ? null : b);
                      }
                    }}
                  >
                    <span className="home-bubble-label">{b.label}</span>
                    <div className="home-bubble-body">
                      {b.overlapsCount === 1 ? (
                        b.isGroup ? (
                          <span className="home-group-avatar-icon">{b.avatar}</span>
                        ) : (
                          <span className="home-bubble-avatar-char">{b.avatar}</span>
                        )
                      ) : b.overlapsCount === 2 ? (
                        <div className="cluster-2">
                          {b.overlaps.map((avatarChar, idx) => (
                            <div key={idx} className="home-cluster-avatar">{avatarChar}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="cluster-3">
                          {b.overlaps.map((avatarChar, idx) => (
                            <div key={idx} className="home-cluster-avatar">{avatarChar}</div>
                          ))}
                        </div>
                      )}
                      <div className="home-bubble-pin-badge">
                        <MapPin />
                      </div>
                    </div>

                    {/* Vertical Pill Capsule: Top D (Directions) & Bottom C (Chat) directly above bubble — ONLY when expanded & selected */}
                    {isCarouselExpanded && homeSelectedBubble?.id === b.id && (
                      <div className="vertical-bubble-actions-pill">
                        <button
                          className="v-action-btn dir-v-btn"
                          title={`Directions to ${b.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHomeSelectedBubble(null);
                            setActiveTab('map');
                            setHomeToastMessage(`🧭 Calculating live route to ${b.name}...`);
                            setTimeout(() => setHomeToastMessage(''), 3000);
                          }}
                        >
                          <Navigation size={18} />
                        </button>
                        <button
                          className="v-action-btn chat-v-btn"
                          title={`Chat with ${b.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setHomeSelectedBubble(null);
                            setActiveTab('messages');
                            setHomeToastMessage(`💬 Opening chat thread with ${b.name}...`);
                            setTimeout(() => setHomeToastMessage(''), 3000);
                          }}
                        >
                          <MessageSquare size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Isolated Active Sharing Bubble rendered outside the carousel container to prevent hover vibration loops */}
          {homeBubbles.map((b) => {
            if (!b.isActiveShare) return null;
            const disappearingClass = b.isDisappearing ? 'disappearing-state' : '';
            return (
              <div
                key={b.id}
                id={`home-bubble-${b.id}`}
                className={`home-floating-bubble-item active-share-state ${disappearingClass}`}
                onMouseDown={(e) => handleHomeStartDrag(b.id, e)}
                onTouchStart={(e) => handleHomeStartDrag(b.id, e)}
                onClick={(e) => {
                  e.stopPropagation();
                  setHomeSelectedBubble(b);
                }}
              >
                <span className="home-bubble-label">{b.label}</span>
                <div className="home-bubble-body" style={{ '--glow-color': b.color }}>
                  {b.isGroup ? (
                    <span className="home-group-avatar-icon">{b.avatar}</span>
                  ) : (
                    <span className="home-bubble-avatar-char">{b.avatar}</span>
                  )}
                  <div className="home-bubble-pin-badge">
                    <MapPin />
                  </div>
                </div>

                {/* Vertical Pill Capsule: Top D (Directions) & Bottom C (Chat) directly above bubble */}
                {homeSelectedBubble?.id === b.id && (
                  <div className="vertical-bubble-actions-pill">
                    <button
                      className="v-action-btn dir-v-btn"
                      title={`Directions to ${b.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHomeSelectedBubble(null);
                        setActiveTab('map');
                        setHomeToastMessage(` Calculating live route to ${b.name}...`);
                        setTimeout(() => setHomeToastMessage(''), 3000);
                      }}
                    >
                      <Navigation size={18} />
                    </button>
                    <button
                      className="v-action-btn chat-v-btn"
                      title={`Chat with ${b.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHomeSelectedBubble(null);
                        setActiveTab('messages');
                        setHomeToastMessage(` Opening chat thread with ${b.name}...`);
                        setTimeout(() => setHomeToastMessage(''), 3000);
                      }}
                    >
                      <MessageSquare size={18} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Drag Success Success Notification Toast */}
      {homeToastMessage && (
        <div className="home-floating-toast">
          <div className="htoast-check">
            <Check size={12} strokeWidth={4} />
          </div>
          <span>{homeToastMessage}</span>
        </div>
      )}

      {/* Compact Location FAB & Sharing Status Pill Container */}
      {activeTab === 'map' && (
        <div className={`location-fab-container ${(homeDragActiveGlobal || isSharingLocation || countdown !== null) ? 'visible' : ''}`}>
          {/* Proximity guideline ring */}
          <div className={`home-guideline-circle ${homeDragActiveGlobal ? 'dragging-active' : ''}`} />

          {/* Active drop ripple expanding rings */}
          <div className="home-ripple-container">
            {homeRipples.map(ripIdx => (
              <div key={ripIdx} className={`home-ripple-ring trig-${ripIdx}`} />
            ))}
          </div>

          {/* Micro status pill indicating live status with glowing dots */}
          <div className={`micro-status-pill ${isSharingLocation ? 'sharing-on' : countdown !== null ? 'timer-on' : 'sharing-off'}`}>
            <span className="pill-dot" />
            <span className="pill-text">
              {isSharingLocation ? (homeActiveEntityName ? 'LIVE' : 'LIVE') : countdown !== null ? `${countdown}s` : 'OFF'}
            </span>

            {/* Micro shared-with colored dots */}
            {isSharingLocation && (
              <div className="pill-privacy-dots">
                {(privacyLevel === 'friends' || privacyLevel === 'custom') && (
                  <span className="privacy-dot dot-friends" title="Sharing with Friends" />
                )}
                {(privacyLevel === 'groups_community' || privacyLevel === 'custom') && (
                  <>
                    <span className="privacy-dot dot-groups" title="Sharing with Groups" />
                  </>
                )}
              </div>
            )}
          </div>

          <button
            className={`location-fab 
              ${isSharingLocation ? 'active' : ''} 
              ${homeDragActiveGlobal ? 'dragging-active' : ''} 
              ${nearHomeTargetId ? 'near-target' : ''}
            `}
            onClick={handleLocationFabClick}
            title={isSharingLocation ? 'Stop Sharing Location' : 'Drag bubble here to share'}
          >
            <div className="fab-icon-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
              {countdown !== null ? (
                <span style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: 'var(--primary)',
                  animation: 'statPop 0.4s infinite alternate',
                  fontFamily: "'Outfit', sans-serif"
                }}>
                  {countdown}
                </span>
              ) : isSharingLocation && homeActiveEntityName ? (
                <Radio size={24} style={{ animation: 'spin 6s linear infinite' }} />
              ) : (
                <Navigation size={24} />
              )}
            </div>
          </button>

        </div>
      )}
      {showBubbleDemo && (
        <LocationBubbleConcept onClose={() => setShowBubbleDemo(false)} />
      )}
    </div>
  );
};

export default Dashboard;



