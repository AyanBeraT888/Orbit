import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Users, UserPlus, UserX, MoreHorizontal, Check, X, MessageSquare, Eye, Wifi, Navigation, Award, Calendar, MapPin, Sparkles, Undo2 } from 'lucide-react';
import './FriendsView.css';
import ProfileView from './ProfileView';

import LottieToggle from '../../components/LottieToggle';

const FriendMenu = ({ friend, onOpenMessage, onBlock, onClose, rect }) => {
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const style = rect ? {
    position: 'fixed',
    top: rect.bottom + 8,
    right: window.innerWidth - rect.right,
    zIndex: 9999,
  } : {};

  const menu = (
    <div className="friend-menu glass-morphism" ref={menuRef} style={style}>
      {/* Privacy Toggles */}
      <div className="menu-section-label">Visibility to them</div>

      <div className="menu-toggle-row">
        <div className="menu-toggle-info">
          <Eye size={15} />
          <span>Last Seen</span>
        </div>
        <LottieToggle
          checked={showLastSeen}
          onChange={(val) => setShowLastSeen(val)}
          size="sm"
        />
      </div>

      <div className="menu-toggle-row">
        <div className="menu-toggle-info">
          <Wifi size={15} />
          <span>Online Status</span>
        </div>
        <LottieToggle
          checked={showOnline}
          onChange={(val) => setShowOnline(val)}
          size="sm"
        />
      </div>

      <div className="menu-divider" />

      {/* Message shortcut */}
      <button className="menu-action-btn" onClick={() => { onOpenMessage(friend); onClose(); }}>
        <MessageSquare size={15} />
        <span>Message</span>
      </button>

      <div className="menu-divider" />

      {/* Block Option */}
      <button
        className="menu-action-btn btn-danger-text"
        onClick={() => { onBlock(friend); onClose(); }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 12px', fontSize: '0.85rem' }}
      >
        <UserX size={15} style={{ color: 'var(--danger)' }} />
        <span style={{ color: 'var(--danger)', fontWeight: '500' }}>Block</span>
      </button>
    </div>
  );

  return createPortal(menu, document.body);
};

const MOCK_USER_STAMPS = {};

const FriendsView = ({ onOpenMessage, isSharingLocation, setIsSharingLocation }) => {
  const [activeSubTab, setActiveSubTab] = useState('friends');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuRect, setMenuRect] = useState(null);
  const [sharingFriends, setSharingFriends] = useState({});

  // Overlay / Popups States
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [selectedUserIsFriend, setSelectedUserIsFriend] = useState(false);
  const [isFriendRequestSent, setIsFriendRequestSent] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const [friendsList, setFriendsList] = useState([]);
  const [requestList, setRequestList] = useState([]);
  const [blockedList, setBlockedList] = useState([]);


  const handleAcceptRequest = (req) => {
    setRequestList(prev => prev.filter(r => r.id !== req.id));
    setFriendsList(prev => [...prev, { ...req, online: false, lastSeen: '10m ago' }]);

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: ` Accepted friend request from ${req.name}.`,
        actionType: 'accept_request',
        payload: { req }
      }
    }));
  };

  const handleDeclineRequest = (req) => {
    setRequestList(prev => prev.filter(r => r.id !== req.id));

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: `Declined friend request from ${req.name}.`,
        actionType: 'decline_request',
        payload: { req }
      }
    }));
  };

  const handleUnblockUser = (user) => {
    setBlockedList(prev => prev.filter(b => b.id !== user.id));

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: ` Unblocked user ${user.name}.`,
        actionType: 'unblock_user',
        payload: { user }
      }
    }));
  };

  const handleBlockUser = (friend) => {
    setFriendsList(prev => prev.filter(f => f.id !== friend.id));
    setBlockedList(prev => [...prev, { ...friend, stampsCount: 0, friendsCount: 0 }]);

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: ` Blocked user ${friend.name}.`,
        actionType: 'block_user',
        payload: { friend }
      }
    }));
  };

  useEffect(() => {
    const handleUndo = (e) => {
      const { actionType, payload } = e.detail;
      if (actionType === 'accept_request') {
        const { req } = payload;
        setFriendsList(prev => prev.filter(f => f.id !== req.id));
        setRequestList(prev => [...prev, req]);
      } else if (actionType === 'decline_request') {
        const { req } = payload;
        setRequestList(prev => [...prev, req]);
      } else if (actionType === 'unblock_user') {
        const { user } = payload;
        setBlockedList(prev => [...prev, user]);
      } else if (actionType === 'block_user') {
        const { friend } = payload;
        setBlockedList(prev => prev.filter(b => b.id !== friend.id));
        setFriendsList(prev => [...prev, friend]);
      } else if (actionType === 'share_location') {
        const { friendId, active } = payload;
        setSharingFriends(prev => ({ ...prev, [friendId]: !active }));
        const anySharing = !active || Object.entries(sharingFriends).some(([fId, act]) => fId !== String(friendId) && act);
        setIsSharingLocation(anySharing);
      } else if (actionType === 'send_request') {
        const { userId } = payload;
        setIsFriendRequestSent(prev => ({ ...prev, [userId]: false }));
      }
    };

    window.addEventListener('orb_undo_action', handleUndo);
    return () => window.removeEventListener('orb_undo_action', handleUndo);
  }, [sharingFriends]);

  const handleAvatarClick = (user, isFriend) => {
    setSelectedProfileUser(user);
    setSelectedUserIsFriend(isFriend);

    // Seed localStorage details if a friend is clicked
    if (isFriend && user.uuid) {
      if (!localStorage.getItem(`user_bio_${user.uuid}`)) {
        localStorage.setItem(`user_bio_${user.uuid}`, user.bio || '');
      }
      if (!localStorage.getItem(`user_stamps_${user.uuid}`) && MOCK_USER_STAMPS[user.uuid]) {
        localStorage.setItem(`user_stamps_${user.uuid}`, JSON.stringify(MOCK_USER_STAMPS[user.uuid]));
      }
    }
  };


  const handleAddFriendClick = (userId) => {
    setIsFriendRequestSent(prev => ({
      ...prev,
      [userId]: true
    }));
    setToastMessage('Friend request sent successfully!');
    setTimeout(() => setToastMessage(''), 3000);

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: `Sent friend request to ${selectedProfileUser?.name || 'user'}.`,
        actionType: 'send_request',
        payload: { userId }
      }
    }));
  };

  const toggleShareLocation = (friendId, friendName) => {
    const isSharing = !sharingFriends[friendId];
    setSharingFriends(prev => ({
      ...prev,
      [friendId]: isSharing
    }));

    // Dynamic parent global sharing state sync
    const anySharing = isSharing || Object.entries(sharingFriends).some(([fId, active]) => fId !== String(friendId) && active);
    setIsSharingLocation(anySharing);

    window.dispatchEvent(new CustomEvent('live_share_notification', {
      detail: {
        type: 'friend',
        name: friendName,
        active: isSharing
      }
    }));

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: isSharing ? `Sharing location with friend ${friendName}.` : `Stopped sharing location with friend ${friendName}.`,
        actionType: 'share_location',
        payload: { friendId, friendName, active: isSharing }
      }
    }));
  };

  if (selectedProfileUser && selectedUserIsFriend) {
    return (
      <div className="friend-profile-panel-view animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 158, 92, 0.08)' }}>
          <button
            className="panel-close-btn"
            onClick={() => setSelectedProfileUser(null)}
            title="Back to Friends"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', boxShadow: 'var(--neu-shadow-outer)', color: 'var(--text-muted)' }}
          >
            <Undo2 size={16} />
          </button>
          <span style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>Friend's Profile</span>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <ProfileView
            user={selectedProfileUser}
            isFriend={true}
            isSelf={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="friends-view-container animate-fade-in">
      <div className="friends-tabs-header glass-morphism">
        <button
          className={`friend-tab-btn ${activeSubTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('friends')}
        >
          <Users size={18} /> Friends
        </button>
        <button
          className={`friend-tab-btn ${activeSubTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('requests')}
        >
          <UserPlus size={18} /> Requests
          {requestList.length > 0 && <span className="badge-count">{requestList.length}</span>}
        </button>
        <button
          className={`friend-tab-btn ${activeSubTab === 'blocked' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('blocked')}
        >
          <UserX size={18} /> Blocked
        </button>
      </div>

      <div className="friends-content-area">
        {activeSubTab === 'friends' && (
          <div className="friends-grid">
            {friendsList.length === 0 && <p className="empty-state">No friends found.</p>}
            {friendsList.map(friend => (
              <div key={friend.id} className="friend-card glass-morphism">
                <div
                  className="avatar large avatar-container avatar-clickable"
                  onClick={() => handleAvatarClick(friend, true)}
                  title={`View ${friend.name}'s Profile`}
                >
                  {friend.name.charAt(0)}
                  {friend.online && <span className="online-dot"></span>}
                </div>
                <div className="info">
                  <h3 className="avatar-clickable" onClick={() => handleAvatarClick(friend, true)} title={`View ${friend.name}'s Profile`}>
                    {friend.name}
                  </h3>
                  <p className="status-text">
                    {friend.online ? 'Online' : `Last seen: ${friend.lastSeen}`}
                  </p>
                </div>

                {/* Action buttons: Share location toggle + 3-dot */}
                <div className="card-actions">
                  <button
                    className={`icon-btn-small ${sharingFriends[friend.id] ? 'sharing-active' : ''}`}
                    title={sharingFriends[friend.id] ? "Stop sharing location" : "Share location with friend"}
                    onClick={() => toggleShareLocation(friend.id, friend.name)}
                    style={{
                      background: sharingFriends[friend.id] ? 'var(--primary)' : 'transparent',
                      color: sharingFriends[friend.id] ? '#ffffff' : 'var(--text-muted)',
                      transition: 'all 0.3s ease',
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Navigation size={22} />
                  </button>
                  <div className="menu-wrapper" style={{ position: 'relative' }}>
                    <button
                      className={`icon-btn-small ${openMenuId === friend.id ? 'menu-open' : ''}`}
                      ref={el => { if (el) el._friendId = friend.id; }}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setOpenMenuId(openMenuId === friend.id ? null : friend.id);
                        setMenuRect(openMenuId === friend.id ? null : rect);
                      }}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {openMenuId === friend.id && (
                      <FriendMenu
                        friend={friend}
                        onOpenMessage={onOpenMessage}
                        onBlock={handleBlockUser}
                        onClose={() => { setOpenMenuId(null); setMenuRect(null); }}
                        rect={menuRect}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'requests' && (
          <div className="friends-list-vertical">
            {requestList.length === 0 && <p className="empty-state">No pending requests.</p>}
            {requestList.map(req => (
              <div key={req.id} className="friend-list-item glass-morphism">
                <div
                  className="avatar avatar-clickable"
                  onClick={() => handleAvatarClick(req, false)}
                  title={`View ${req.name}'s Public Profile`}
                >
                  {req.name.charAt(0)}
                </div>
                <div className="info">
                  <h3 className="avatar-clickable" onClick={() => handleAvatarClick(req, false)} title={`View ${req.name}'s Public Profile`}>
                    {req.name}
                  </h3>
                  <p>@{req.username}</p>
                </div>
                <div className="action-buttons">
                  <button className="btn-primary-small icon-left" onClick={() => handleAcceptRequest(req)}><Check size={16} /> Accept</button>
                  <button className="btn-secondary-small icon-left" onClick={() => handleDeclineRequest(req)}><X size={16} /> Decline</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'blocked' && (
          <div className="friends-list-vertical">
            {blockedList.length === 0 && <p className="empty-state">No blocked users.</p>}
            {blockedList.map(user => (
              <div key={user.id} className="friend-list-item glass-morphism">
                <div
                  className="avatar avatar-clickable"
                  onClick={() => handleAvatarClick(user, false)}
                  title={`View ${user.name}'s Public Profile`}
                >
                  {user.name.charAt(0)}
                </div>
                <div className="info">
                  <h3 className="avatar-clickable" onClick={() => handleAvatarClick(user, false)} title={`View ${user.name}'s Public Profile`}>
                    {user.name}
                  </h3>
                  <p>@{user.username}</p>
                </div>
                <button className="btn-secondary-small" onClick={() => handleUnblockUser(user)}>Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= NON-FRIEND CENTERED CARD MODAL ================= */}
      {selectedProfileUser && !selectedUserIsFriend && createPortal(
        <div className="profile-centered-modal-overlay" onClick={() => setSelectedProfileUser(null)}>
          <div className="non-friend-modal-card glass-morphism animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedProfileUser(null)} title="Close">
              <X size={18} />
            </button>

            {/* Premium Sage Card Banner Mesh */}
            <div className="non-friend-banner"></div>

            {/* Avatar Circle Container */}
            <div className="non-friend-avatar-wrapper">
              <div className="non-friend-avatar-ring"></div>
              <div className="non-friend-avatar">
                {selectedProfileUser.name.charAt(0)}
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="non-friend-details">
              <h2 className="non-friend-name">{selectedProfileUser.name}</h2>
              <span className="non-friend-username">@{selectedProfileUser.username}</span>
              <span className="non-friend-id">ID: {selectedProfileUser.uuid || '------'}</span>

              {selectedProfileUser.bio && (
                <p className="non-friend-bio">"{selectedProfileUser.bio}"</p>
              )}

              {/* Stats: Stamps, Friends, Join Date */}
              <div className="non-friend-stats-grid">
                <div className="non-friend-stat-item">
                  <span className="stat-value">{selectedProfileUser.stampsCount}</span>
                  <span className="stat-label">Stamps</span>
                </div>
                <div className="non-friend-stat-item">
                  <span className="stat-value">{selectedProfileUser.friendsCount}</span>
                  <span className="stat-label">Friends</span>
                </div>
                <div className="non-friend-stat-item">
                  <span className="stat-value" style={{ fontSize: '0.85rem' }}>
                    {selectedProfileUser.joinDate ? new Date(selectedProfileUser.joinDate).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : 'Jan 26'}
                  </span>
                  <span className="stat-label">Joined</span>
                </div>
              </div>

              {/* Rank Badge */}
              <div className="non-friend-rank-badge">
                <Award size={14} />
                <span>{selectedProfileUser.rank || 'Wanderer Initiate'}</span>
              </div>

              {/* Add Friend Button */}
              <button
                className={`btn-primary non-friend-action-btn ${isFriendRequestSent[selectedProfileUser.id] ? 'sent' : ''}`}
                onClick={() => handleAddFriendClick(selectedProfileUser.id)}
                disabled={isFriendRequestSent[selectedProfileUser.id]}
              >
                {isFriendRequestSent[selectedProfileUser.id] ? (
                  <>
                    <Check size={16} />
                    <span>Request Sent</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Add Friend</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Premium Toast Notification Feed */}
      {toastMessage && (
        <div className="premium-toast-floating animate-fade-in-slide">
          <Sparkles size={14} style={{ color: 'var(--primary)' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FriendsView;
