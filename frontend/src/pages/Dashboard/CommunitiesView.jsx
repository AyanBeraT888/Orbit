import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Globe, Search, Plus, CheckCircle, ShieldCheck, X, Check,
  Send, Smile, ChevronRight, UserPlus, Lock, Unlock, Users, Settings,
  Crown, Shield, BarChart2, Trash2, Info, MoreVertical, Eye, Image, Pin, PinOff,
  Star, LogOut, AlertTriangle, QrCode, Edit3, Megaphone, ChevronDown, ChevronUp, Link, ArrowLeft, Undo2,
  Award, Calendar, Sparkles, Cpu, Laptop, Bug, Lightbulb, Palette, Target, ThumbsUp, Heart, Flame
} from 'lucide-react';
import './CommunitiesView.css';
import ProfileView from './ProfileView';
import LottieToggle from '../../components/LottieToggle';
import { compressImage } from '../../utils/imageCompressor';

/* ─── Predefined Orb Avatars ──────────────────────────────── */
const ORB_AVATARS = [
  { name: 'Cosmic Orb', value: '🪐' },
  { name: 'Satellite Hub', value: '🛰️' },
  { name: 'Alien Pod', value: '🛸' },
  { name: 'Spark Sparkle', value: '✨' },
  { name: 'Fire Engine', value: '🔥' },
  { name: 'Golden Shield', value: '🛡️' }
];

const MOCK_USERS = {
  u1: { name: 'Alice Smith', avatar: 'A' },
  u2: { name: 'Bob Jones', avatar: 'B' },
  u3: { name: 'Charlie Day', avatar: 'C' },
  u4: { name: 'David Lee', avatar: 'D' },
  u5: { name: 'Eva Green', avatar: 'E' },
  me: { name: 'You', avatar: 'Y' }
};

/* ─── Mock Communities with Nested Groups (WhatsApp Style) ─── */
const INITIAL_COMMUNITIES = [
  {
    id: 'c1',
    name: 'Tech Enthusiasts',
    description: 'A global hub for everything tech, web dev, AI, and gadgets.',
    isVerified: true,
    isDeveloperBadge: true,
    badgeLabel: 'Developer Approved',
    isGlobal: true,
    type: 'open',
    icon: 'globe',
    iconType: 'orb',
    memberCount: 1450,
    members: ['me', 'u1', 'u2', 'u3', 'u4', 'u5'],
    coadmins: ['u1'],
    pendingRequests: [],
    creator: 'u2',
    liveShare: false,
    isFavourite: false,
    memberTags: {},
    pinnedMessages: [],
    adminOnlyMessaging: false,
    groups: [
      {
        id: 'c1-announcements',
        name: 'Announcements',
        isAnnouncements: true,
        icon: 'announcements',
        description: 'Official announcements and updates for Tech Enthusiasts.',
        members: ['me', 'u1', 'u2', 'u3', 'u4', 'u5'],
        messages: [
          {
            id: 1,
            from: 'u1',
            senderName: 'Alice Smith',
            text: 'Welcome to the Tech Enthusiasts community announcements channel! Only admins can post here.',
            time: '10:15 AM',
            reactions: { fire: 2 },
            reactionsDetail: { fire: ['u2', 'u3'] },
            views: ['me', 'u1', 'u2', 'u3', 'u4'],
            deleted: false,
            deletedFor: []
          },
          {
            id: 2,
            from: 'u2',
            senderName: 'Bob Jones',
            text: 'Check out the general discussion groups in the community home to talk about coding, design, and hardware!',
            time: '10:18 AM',
            reactions: { like: 1 },
            reactionsDetail: { like: ['u3'] },
            views: ['me', 'u1', 'u2', 'u3'],
            deleted: false,
            deletedFor: []
          }
        ]
      },
      {
        id: 'c1-g1',
        name: 'AI & Gadgets',
        icon: 'ai',
        description: 'Discuss the latest trends in AI, LLMs, robotics, and hardware gadgets.',
        members: ['me', 'u1', 'u2', 'u3'],
        messages: [
          {
            id: 10,
            from: 'u1',
            senderName: 'Alice Smith',
            text: 'Hey guys, did you see the new AI announcement?',
            time: '10:30 AM',
            reactions: { fire: 2 },
            reactionsDetail: { fire: ['u2', 'u3'] },
            views: ['me', 'u1', 'u2', 'u3'],
            deleted: false,
            deletedFor: []
          },
          {
            id: 11,
            from: 'u2',
            senderName: 'Bob Jones',
            text: 'Yeah, it looks super promising! Neumorphic UIs are making a comeback too.',
            time: '10:32 AM',
            reactions: { fire: 2, like: 1 },
            reactionsDetail: { fire: ['u1', 'me'], like: ['u3'] },
            views: ['me', 'u1', 'u2', 'u3'],
            deleted: false,
            deletedFor: []
          },
          {
            id: 12,
            from: 'me',
            senderName: 'You',
            text: 'I am building a web app using it right now!',
            time: '10:35 AM',
            reactions: {},
            reactionsDetail: {},
            views: ['u1', 'u2', 'u3'],
            deleted: false,
            deletedFor: []
          }
        ]
      },
      {
        id: 'c1-g2',
        name: 'Web Dev & Design',
        icon: 'coding',
        description: 'Web development, frontend frameworks, CSS tricks, and Neumorphism sandboxing.',
        members: ['u1', 'u4', 'u5'],
        messages: [
          {
            id: 20,
            from: 'u4',
            senderName: 'David Lee',
            text: 'Welcome to the Web Dev subgroup! Post your projects and codepens here.',
            time: 'Yesterday',
            reactions: {},
            reactionsDetail: {},
            views: ['u1', 'u4', 'u5'],
            deleted: false,
            deletedFor: []
          }
        ]
      }
    ]
  },
  {
    id: 'c2',
    name: 'Orb Official Support',
    description: 'The official global community for Orb updates, bug reports, and suggestions.',
    isVerified: true,
    isDeveloperBadge: true,
    badgeLabel: 'Official Hub',
    isGlobal: true,
    type: 'open',
    icon: 'support',
    iconType: 'emoji',
    memberCount: 5200,
    members: ['u1', 'u4', 'me'],
    coadmins: ['me'],
    pendingRequests: [],
    creator: 'u4',
    liveShare: false,
    isFavourite: false,
    memberTags: {},
    pinnedMessages: [],
    adminOnlyMessaging: false,
    groups: [
      {
        id: 'c2-announcements',
        name: 'Announcements',
        isAnnouncements: true,
        icon: 'announcements',
        description: 'Official announcements and updates from the Orb Team.',
        members: ['u1', 'u4', 'me'],
        messages: [
          {
            id: 1,
            from: 'u4',
            senderName: 'David Lee',
            text: 'Welcome to the official Orb support channel! We will post releases and patches here.',
            time: 'Yesterday',
            reactions: { like: 2 },
            reactionsDetail: { like: ['u1', 'me'] },
            views: ['me', 'u1', 'u4'],
            deleted: false,
            deletedFor: []
          }
        ]
      },
      {
        id: 'c2-g1',
        name: 'Bug Reports & Support',
        icon: 'bugs',
        description: 'Submit issues and bugs encountered in the Orb app.',
        members: ['me', 'u1', 'u4'],
        messages: []
      },
      {
        id: 'c2-g2',
        name: 'Feature Suggestions',
        icon: 'features',
        description: 'Request features and suggest visual improvements.',
        members: ['u1', 'u4'],
        messages: []
      }
    ]
  },
  {
    id: 'c3',
    name: 'Secret Designers Club',
    description: 'A semi-private sandbox for neumorphic UI and advanced glassmorphism design layouts.',
    isVerified: false,
    isDeveloperBadge: false,
    isGlobal: true,
    type: 'request',
    icon: 'design',
    iconType: 'emoji',
    memberCount: 84,
    members: ['u2', 'u3'],
    coadmins: [],
    pendingRequests: [
      { id: 'me', name: 'You', avatar: 'Y' }
    ],
    creator: 'u2',
    liveShare: false,
    isFavourite: false,
    memberTags: {},
    pinnedMessages: [],
    adminOnlyMessaging: false,
    groups: [
      {
        id: 'c3-announcements',
        name: 'Announcements',
        isAnnouncements: true,
        icon: 'announcements',
        description: 'Official announcements for Secret Designers Club.',
        members: ['u2', 'u3'],
        messages: []
      },
      {
        id: 'c3-g1',
        name: 'Design Sandbox',
        icon: 'sandbox',
        description: 'Showcase glassmorphism code snippets and premium layouts.',
        members: ['u2', 'u3'],
        messages: []
      }
    ]
  }
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MEET_TIMES = ['4pm onwards', '6pm onwards', '8pm onwards'];

const POLL_SHORTCUTS = [
  {
    id: 'trip',
    icon: 'trip',
    label: 'Plan a Trip',
    color: '#3B9E5C',
    build: () => ({
      question: 'Which day works for the trip?',
      options: WEEKDAYS,
      votes: Object.fromEntries(WEEKDAYS.map(d => [d, 0])),
      votesDetail: Object.fromEntries(WEEKDAYS.map(d => [d, []])),
      voted: null
    })
  },
  {
    id: 'meet',
    icon: 'meet',
    label: 'Time to Meet',
    color: '#6366f1',
    build: () => ({
      question: 'What time works to meet?',
      options: MEET_TIMES,
      votes: Object.fromEntries(MEET_TIMES.map(t => [t, 0])),
      votesDetail: Object.fromEntries(MEET_TIMES.map(t => [t, []])),
      voted: null
    })
  },
];

const REACTIONS = ['like', 'love', 'haha', 'wow', 'fire'];

/* ─── Poll Component for Messages ────────────────────────── */
const CommPollCard = ({ poll, onVote }) => {
  const total = Object.values(poll.votes || {}).reduce((a, b) => a + b, 0);
  return (
    <div className="grp-poll-card">
      <div className="grp-poll-header">
        <BarChart2 size={13} />
        <span>Poll</span>
      </div>
      <p className="grp-poll-q">{poll.question}</p>
      <div className="grp-poll-opts">
        {poll.options.map(opt => {
          const cnt = poll.votes?.[opt] || 0;
          const pct = total === 0 ? 0 : Math.round((cnt / total) * 100);
          const mine = poll.voted === opt;
          const hasVoted = !!poll.voted;
          return (
            <button
              key={opt}
              className={`grp-poll-opt ${hasVoted ? 'voted' : ''} ${mine ? 'mine' : ''}`}
              onClick={() => !hasVoted && onVote(opt)}
              disabled={hasVoted}
            >
              <div className="grp-poll-fill" style={{ width: hasVoted ? `${pct}%` : '0%' }} />
              <span className="grp-poll-label">
                {mine && <Check size={11} style={{ marginRight: 4 }} />}
                {opt}
              </span>
              {hasVoted && <span className="grp-poll-pct">{pct}%</span>}
            </button>
          );
        })}
      </div>
      {total > 0 && <p className="grp-poll-total">{total} vote{total !== 1 ? 's' : ''}</p>}
    </div>
  );
};

/* ─── Community Overview Modal ─── */
const CommunityOverviewModal = ({
  community,
  onClose,
  onUpdateCommunity,
  onAddMember,
  onRemoveMember,
  onExitCommunity,
  onDeleteCommunity,
  onPromote,
  onDemote,
  canEdit,
  onOpenMessage
}) => {
  const [desc, setDesc] = useState(community.description || '');
  const [name, setName] = useState(community.name || '');
  const [icon, setIcon] = useState(community.icon || '🌐');
  const [showQR, setShowQR] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showModalDropdown, setShowModalDropdown] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editingTagUserId, setEditingTagUserId] = useState(null);
  const [editTagText, setEditTagText] = useState('');

  const [isSavedInfo, setIsSavedInfo] = useState(false);
  const [isSavedDesc, setIsSavedDesc] = useState(false);

  const isCreator = community.creator === 'me';

  const saveInfoDetails = () => {
    onUpdateCommunity({
      name: name.trim()
    });
    setIsSavedInfo(true);
    setIsEditingInfo(false);
    setTimeout(() => setIsSavedInfo(false), 2000);
  };

  const saveDescDetails = () => {
    onUpdateCommunity({
      description: desc.trim()
    });
    setIsSavedDesc(true);
    setIsEditingDesc(false);
    setTimeout(() => setIsSavedDesc(false), 2000);
  };

  const handleToggleFavourite = () => {
    onUpdateCommunity({ isFavourite: !community.isFavourite });
  };

  const handleReport = () => {
    alert(`Report submitted: Community "${community.name}" has been flagged for review.`);
  };

  const startEditTag = (userId, currentTag) => {
    if (userId !== 'me') return;
    setEditingTagUserId(userId);
    setEditTagText(currentTag || '');
  };

  const saveMemberTag = (userId) => {
    const nextTags = { ...(community.memberTags || {}) };
    if (editTagText.trim()) {
      nextTags[userId] = editTagText.trim();
    } else {
      delete nextTags[userId];
    }
    onUpdateCommunity({ memberTags: nextTags });
    setEditingTagUserId(null);
  };

  const communityUserIds = community.members || [];
  const nonCommunityFriends = Object.entries(MOCK_USERS)
    .filter(([id]) => !communityUserIds.includes(id))
    .map(([id, info]) => ({ id, ...info }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="grp-overview-modal glass-morphism animate-fade-in" onClick={e => e.stopPropagation()}>

        {/* Modal Header */}
        <div className="modal-header" style={{ position: 'relative' }}>
          <h3>Community Details</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {canEdit && (
              <div className="modal-menu-container" style={{ position: 'relative' }}>
                <button
                  className={`icon-btn-small ${showModalDropdown ? 'active-icon' : ''}`}
                  onClick={() => setShowModalDropdown(!showModalDropdown)}
                  title="More options"
                >
                  <MoreVertical size={18} />
                </button>
                {showModalDropdown && (
                  <div className="modal-dropdown-menu glass-morphism animate-scale-up">
                    <button className="dropdown-item" onClick={() => { setIsEditingInfo(true); setShowModalDropdown(false); }}>
                      <Edit3 size={14} />
                      <span>Edit Community Name</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setIsEditingDesc(true); setShowModalDropdown(false); }}>
                      <Edit3 size={14} />
                      <span>Edit Description</span>
                    </button>
                    <button className={`dropdown-item ${community.isFavourite ? 'fav-active' : ''}`} onClick={() => { handleToggleFavourite(); setShowModalDropdown(false); }}>
                      <Star size={14} fill={community.isFavourite ? 'var(--primary)' : 'none'} />
                      <span>{community.isFavourite ? 'Unfavorite Hub' : 'Favorite Hub'}</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowQR(true); setShowAddMembers(false); setShowModalDropdown(false); }}>
                      <QrCode size={14} />
                      <span>Invite QR Code</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowAddMembers(true); setShowQR(false); setShowModalDropdown(false); }}>
                      <UserPlus size={14} />
                      <span>Add Member</span>
                    </button>
                    <button className="dropdown-item warning" onClick={() => { handleReport(); setShowModalDropdown(false); }}>
                      <AlertTriangle size={14} />
                      <span>Report Hub</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item danger" onClick={() => { onExitCommunity(); setShowModalDropdown(false); }}>
                      <LogOut size={14} />
                      <span>Leave Community</span>
                    </button>
                    {isCreator && (
                      <button className="dropdown-item danger delete" onClick={() => { onDeleteCommunity(); setShowModalDropdown(false); }}>
                        <Trash2 size={14} />
                        <span>Delete Community</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Basic Editable Fields */}
        <div className="overview-details-section">
          <div className="overview-header-inputs">
            <div className="form-group-row">
              <span className="icon-preview-large rounded-sq-preview">{icon}</span>
              <div className="info-title-col">
                {canEdit && isEditingInfo ? (
                  <input
                    className="grp-name-input title-editor"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Community Name"
                  />
                ) : (
                  <h3 className="static-title">{name}</h3>
                )}
                <span className="subtitle-meta">{community.members.length} active members</span>
              </div>
            </div>
          </div>

          {canEdit && isEditingInfo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
              {isSavedInfo && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Name Saved!</span>}
              <button
                className="action-pill-btn"
                style={{ width: 'auto', padding: '0.5rem 1.25rem', display: 'inline-flex' }}
                onClick={saveInfoDetails}
              >
                Save Name
              </button>
            </div>
          )}

          <div className="form-group" style={{ marginTop: '0.75rem', borderTop: '1px solid rgba(var(--primary-rgb), 0.08)', paddingTop: '0.75rem' }}>
            <span className="field-label">Community Description</span>
            {canEdit && isEditingDesc ? (
              <textarea
                className="grp-desc-input"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Give a description for this community..."
              />
            ) : (
              <p className="static-description-box">{desc || 'No community description set.'}</p>
            )}

            {canEdit && isEditingDesc && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                {isSavedDesc && <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>Description Saved!</span>}
                <button
                  className="action-pill-btn"
                  style={{ width: 'auto', padding: '0.5rem 1.25rem', display: 'inline-flex' }}
                  onClick={saveDescDetails}
                >
                  Save Description
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Invite QR Subsection */}
        {showQR && (
          <div className="overview-qr-drawer animate-slide-up">
            <div className="qr-header">
              <span>Scan QR Code to Join Community</span>
              <button className="icon-btn-small" onClick={() => setShowQR(false)}><X size={14} /></button>
            </div>
            <div className="qr-container">
              <div className="mock-qr-code">
                <div className="qr-squares-grid">
                  <div className="square corner-sq" />
                  <div className="square" />
                  <div className="square corner-sq" />
                  <div className="square" />
                  <div className="square inner-dot" />
                  <div className="square" />
                  <div className="square corner-sq" />
                  <div className="square" />
                  <div className="square corner-sq" />
                </div>
              </div>
              <span className="qr-link-text">orb.chat/join/c_{community.id}</span>
            </div>
          </div>
        )}

        {/* Add Members Drawer */}
        {showAddMembers && (
          <div className="overview-members-drawer animate-slide-up">
            <div className="qr-header">
              <span>Add Users to Community</span>
              <button className="icon-btn-small" onClick={() => setShowAddMembers(false)}><X size={14} /></button>
            </div>
            <div className="friend-selector-mini-list">
              {nonCommunityFriends.map(f => (
                <div key={f.id} className="friend-mini-row">
                  <div className="friend-mini-avatar">{f.avatar}</div>
                  <span className="friend-mini-name">{f.name}</span>
                  <button className="friend-add-btn" onClick={() => onAddMember(f.id)}>
                    Add
                  </button>
                </div>
              ))}
              {nonCommunityFriends.length === 0 && (
                <p className="no-friends-hint">All users are already members of this community.</p>
              )}
            </div>
          </div>
        )}

        {/* Leave button at bottom only for regular members */}
        {!canEdit && (
          <div className="overview-danger-actions-vertical" style={{ marginTop: '1rem', marginBottom: '0.5rem', width: '100%' }}>
            <button className="danger-action-btn-full exit" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={onExitCommunity}>
              <LogOut size={16} />
              <span>Leave Community</span>
            </button>
          </div>
        )}

        {/* Admin Settings: Admin-Only Messaging */}
        {canEdit && (
          <div className="admin-toggle-section">
            <span className="overview-section-label">Community Settings</span>
            <div className="admin-toggle-row glass-morphism">
              <div className="admin-toggle-info">
                <Shield size={15} className="admin-toggle-icon" />
                <div>
                  <span className="admin-toggle-title">Admin-only messaging</span>
                  <span className="admin-toggle-desc">Only admins can send messages</span>
                </div>
              </div>
              <LottieToggle 
                checked={community.adminOnlyMessaging} 
                onChange={() => onUpdateCommunity({ adminOnlyMessaging: !community.adminOnlyMessaging })}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Members Management & Custom Tag Editing */}
        <div className="modal-members-section">
          <p className="grp-modal-label">Community Members & Role Tags</p>
          <div className="overview-members-list">
            {community.members.map(mId => {
              const u = MOCK_USERS[mId] || { name: 'Unknown', avatar: '?' };
              const isMemberCreator = mId === community.creator;
              const isCoAdmin = community.coadmins?.includes(mId);
              const isCurrentUserCreator = community.creator === 'me';
              const defaultRole = isMemberCreator ? 'Admin' : isCoAdmin ? 'Co-admin' : 'Member';

              const customTag = community.memberTags?.[mId];
              const displayTag = customTag || defaultRole;

              return (
                <div key={mId} className="overview-member-row">
                  <div
                    className="grp-member-avatar"
                    onClick={(e) => {
                      if (onOpenMessage) {
                        e.stopPropagation();
                        onOpenMessage({ id: mId, name: u.name, username: mId });
                        onClose();
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    {u.avatar}
                  </div>
                  <div
                    className="overview-member-info"
                    onClick={(e) => {
                      if (onOpenMessage && editingTagUserId !== mId) {
                        e.stopPropagation();
                        onOpenMessage({ id: mId, name: u.name, username: mId });
                        onClose();
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <span className="grp-member-name">{u.name}</span>

                    {/* Tag Editor Inline */}
                    {editingTagUserId === mId ? (
                      <div className="tag-inline-editor">
                        <input
                          className="tag-editor-input"
                          value={editTagText}
                          onChange={e => setEditTagText(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveMemberTag(mId)}
                          autoFocus
                        />
                        <button className="tag-save-btn" onClick={() => saveMemberTag(mId)}><Check size={11} /></button>
                      </div>
                    ) : (
                      <span
                        className={`role-badge ${isMemberCreator ? 'admin' : isCoAdmin ? 'coadmin' : 'member'} ${customTag ? 'has-custom-tag' : ''}`}
                        onClick={() => mId === 'me' && startEditTag(mId, displayTag)}
                        title={mId === 'me' ? "Click to edit your role tag" : "Role tag"}
                        style={{ cursor: mId === 'me' ? 'pointer' : 'default' }}
                      >
                        {isMemberCreator ? <Crown size={10} style={{ marginRight: 2 }} /> : isCoAdmin ? <Shield size={10} style={{ marginRight: 2 }} /> : null}
                        {displayTag}
                        {mId === 'me' && <Edit3 size={8} className="edit-tag-indicator" />}
                      </span>
                    )}
                  </div>

                  {/* Creator actions */}
                  {mId !== 'me' && (
                    <div className="grp-member-actions">
                      {!isCoAdmin && !isMemberCreator && isCurrentUserCreator && (
                        <button className="member-action-btn promote" onClick={() => onPromote(mId)} title="Promote to Co-admin">
                          <Shield size={12} />
                        </button>
                      )}
                      {isCoAdmin && isCurrentUserCreator && (
                        <button className="member-action-btn demote" onClick={() => onDemote(mId)} title="Demote Co-admin">
                          <X size={12} />
                        </button>
                      )}
                      {canEdit && !isMemberCreator && (
                        <button className="member-action-btn remove" onClick={() => onRemoveMember(mId)} title="Remove Member">
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

/* ─── Communities Component ───────────────────────────────── */
const CommunitiesView = ({ onOpenMessage, onClose, isSharingLocation, setIsSharingLocation, communityId, embedded = false, additionalCommunities = [] }) => {
  const [communities, setCommunities] = useState(INITIAL_COMMUNITIES);

  /* Merge externally-created communities from MessagesView kebab menu */
  useEffect(() => {
    if (additionalCommunities && additionalCommunities.length > 0) {
      setCommunities(prev => {
        const existingIds = new Set(prev.map(c => c.id));
        const newOnes = additionalCommunities.filter(c => !existingIds.has(c.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
  }, [additionalCommunities]);

  // Overlay / Popups States for profile card pops
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [selectedUserIsFriend, setSelectedUserIsFriend] = useState(false);
  const [isFriendRequestSent, setIsFriendRequestSent] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const handleAvatarClick = (member) => {
    if (!member) return;

    const isMe = member.id === 'me' || member.uuid === 'self';
    const friendsList = ['u1', 'u2', 'u3', 'u4', 'u5'];
    const isFriend = isMe || friendsList.includes(member.id);

    let fullProfile;
    if (isMe) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      fullProfile = {
        uuid: 'self',
        name: userData.name || 'You',
        username: userData.username || 'me',
        joinDate: userData.createdAt || '2026-01-01T00:00:00.000Z',
        stampsCount: 0,
        friendsCount: friendsList.length,
        rank: 'Elite Cartographer',
        bio: localStorage.getItem('user_bio_self') || 'Exploring the world one stamp at a time! 📍'
      };
    } else {
      // Seed mock details for the ProfileView component to look professional:
      const mockProfiles = {
        u1: { uuid: 'usr-alice-998877', name: 'Alice Smith', username: 'alice99', joinDate: '2024-04-12T08:00:00.000Z', stampsCount: 3, friendsCount: 14, rank: 'Urban Pioneer', bio: 'Chasing sunsets and new coordinate pins! 🌅✈' },
        u2: { uuid: 'usr-bob-554433', name: 'Bob Jones', username: 'bob_j', joinDate: '2023-11-05T08:00:00.000Z', stampsCount: 2, friendsCount: 9, rank: 'Regional Trekker', bio: 'Coffee, code, and campsites. ☕⛺' },
        u3: { uuid: 'usr-charlie-221100', name: 'Charlie Day', username: 'charlieD', joinDate: '2025-01-15T08:00:00.000Z', stampsCount: 3, friendsCount: 5, rank: 'Local Scout', bio: 'Just a city slicker exploring green spaces.' },
        u4: { uuid: 'usr-david-334455', name: 'David Lee', username: 'd_lee', joinDate: '2024-08-20T08:00:00.000Z', stampsCount: 3, friendsCount: 12, rank: 'Urban Pioneer', bio: 'Wandering where the WiFi is weak.' },
        u5: { uuid: 'usr-eve-889900', name: 'Eva Green', username: 'eva_g', joinDate: '2025-05-01T08:00:00.000Z', stampsCount: 1, friendsCount: 3, rank: 'Wanderer Initiate', bio: 'Beginner mapmaker and stamp collector!' }
      };

      fullProfile = mockProfiles[member.id] || {
        uuid: `usr-${member.id}-112233`,
        name: member.name || 'Group Member',
        username: member.username || member.name?.toLowerCase().replace(' ', '_') || 'member',
        joinDate: '2025-02-10T08:00:00.000Z',
        stampsCount: 2,
        friendsCount: 6,
        rank: 'Local Scout',
        bio: 'Adventures are better together. 🗺️👥'
      };
    }

    setSelectedProfileUser(fullProfile);
    setSelectedUserIsFriend(isFriend);

    // Dynamically seed localStorage for profile view matching MOCK_USER_CHAPTERS
    if (isFriend && fullProfile.uuid) {
      if (!localStorage.getItem(`user_bio_${fullProfile.uuid}`)) {
        localStorage.setItem(`user_bio_${fullProfile.uuid}`, fullProfile.bio || '');
      }
      const customChapters = {
        'usr-alice-998877': [
          { id: 'stamp-alice-paris', placeName: 'Eiffel Tower', city: 'Paris', lat: 48.8584, lng: 2.2945, photos: [{ id: 'paris-1', url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop', caption: 'Eiffel Tower glittering under sunset skies.', location: 'Eiffel Tower, Paris', likes: 34 }] },
          { id: 'stamp-alice-kiyomizu', placeName: 'Kiyomizu-dera', city: 'Kyoto', lat: 34.9948, lng: 135.7850, photos: [{ id: 'kyoto-1', url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop', caption: 'Beautiful red maple leaves at Kiyomizu-dera.', location: 'Kiyomizu-dera, Kyoto', likes: 22 }] },
          { id: 'stamp-alice-centralpark', placeName: 'Central Park', city: 'New York', lat: 40.7851, lng: -73.9683, photos: [{ id: 'ny-1', url: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=600&auto=format&fit=crop', caption: 'Snowy morning walks in Central Park.', location: 'Central Park, NY', likes: 18 }] }
        ],
        'usr-bob-554433': [
          { id: 'stamp-bob-lauterbrunnen', placeName: 'Lauterbrunnen Valley', city: 'Lauterbrunnen', lat: 46.5930, lng: 7.9088, photos: [{ id: 'swiss-1', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=600&auto=format&fit=crop', caption: 'Waking up to the serene view of Lauterbrunnen valley.', location: 'Lauterbrunnen, Switzerland', likes: 41 }] },
          { id: 'stamp-bob-colosseum', placeName: 'Colosseum', city: 'Rome', lat: 41.8902, lng: 12.4922, photos: [{ id: 'rome-1', url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop', caption: 'Treading history around the Colosseum.', location: 'Colosseum, Rome', likes: 29 }] }
        ]
      };
      if (!localStorage.getItem(`user_stamps_${fullProfile.uuid}`) && customChapters[fullProfile.uuid]) {
        localStorage.setItem(`user_stamps_${fullProfile.uuid}`, JSON.stringify(customChapters[fullProfile.uuid]));
      }
    }

  };

  const handleAddFriendClick = (userId) => {
    setIsFriendRequestSent(prev => ({
      ...prev,
      [userId]: true
    }));
    setToastMessage('✨ Friend request sent successfully!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const [activeTab, setActiveTab] = useState('my-communities'); // default 'my-communities' (Joined) to match chats list
  const [activeCommId, setActiveCommId] = useState('c1'); // start with tech enthusiasts
  const [activeGroupId, setActiveGroupId] = useState('c1-announcements'); // start with announcements
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (embedded && communityId) {
      setActiveCommId(communityId);
      setActiveGroupId(`${communityId}-announcements`);
    }
  }, [communityId, embedded]);



  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  // Create Sub-group state inside a community
  const [showCreateGroupInline, setShowCreateGroupInline] = useState(false);
  const [newSubGroupName, setNewSubGroupName] = useState('');
  const [newSubGroupIcon, setNewSubGroupIcon] = useState('💬');
  const [newSubGroupDesc, setNewSubGroupDesc] = useState('');

  // Message options dropdown state
  const [activeMenuMsgId, setActiveMenuMsgId] = useState(null);
  const [infoMsg, setInfoMsg] = useState(null); // Message for details view modal

  /* ── Message actions and context menu states ── */
  const [actionMenuMsg, setActionMenuMsg] = useState(null);
  const [editingMsg, setEditingMsg]       = useState(null);
  const [editInputValue, setEditInputValue] = useState('');
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const longPressTimeout = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  // Creation form state for Communities
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState('open'); // open | request

  // Icon selector modes: 'emoji' | 'orb' | 'upload'
  const [iconMode, setIconMode] = useState('emoji');
  const [emojiIcon, setEmojiIcon] = useState('🌐');
  const [orbIcon, setOrbIcon] = useState('🪐');
  const [uploadedIcon, setUploadedIcon] = useState('');

  // Admin edit settings state
  const [editName, setEditName] = useState('');
  const [editIconMode, setEditIconMode] = useState('emoji');
  const [editEmojiIcon, setEditEmojiIcon] = useState('🌐');
  const [editOrbIcon, setEditOrbIcon] = useState('🪐');
  const [editUploadedIcon, setEditUploadedIcon] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCommId, activeGroupId, communities]);

  useEffect(() => {
    setActiveGroupId(null);
    setSearchQuery('');
  }, [activeCommId]);


  // Sync settings inputs when opening settings dashboard
  const activeComm = communities.find(c => c.id === activeCommId) || null;
  const activeGroup = activeComm?.groups.find(g => g.id === activeGroupId) || null;

  useEffect(() => {
    if (activeComm) {
      setEditName(activeComm.name);
      setEditDesc(activeComm.description || '');
      setEditIconMode(activeComm.iconType || 'emoji');
      if (activeComm.iconType === 'orb') {
        setEditOrbIcon(activeComm.icon);
      } else if (activeComm.iconType === 'upload') {
        setEditUploadedIcon(activeComm.icon);
      } else {
        setEditEmojiIcon(activeComm.icon);
      }
    }
  }, [showSettingsModal, activeCommId]);

  // Get community icon preview
  const getCommIcon = (c, size = 18) => {
    const iconKey = c.icon;
    if (iconKey === 'globe') return <Globe size={size} />;
    if (iconKey === 'announcements') return <Megaphone size={size} />;
    if (iconKey === 'ai') return <Cpu size={size} />;
    if (iconKey === 'coding') return <Laptop size={size} />;
    if (iconKey === 'support') return <Sparkles size={size} />;
    if (iconKey === 'bugs') return <Bug size={size} />;
    if (iconKey === 'features') return <Lightbulb size={size} />;
    if (iconKey === 'design') return <Palette size={size} />;
    if (iconKey === 'sandbox') return <Target size={size} />;
    return <Globe size={size} />;
  };

  const renderSubgroupIcon = (iconKey, size = 14) => {
    if (iconKey === 'announcements') return <Megaphone size={size} />;
    if (iconKey === 'ai') return <Cpu size={size} />;
    if (iconKey === 'coding') return <Laptop size={size} />;
    if (iconKey === 'bugs') return <Bug size={size} />;
    if (iconKey === 'features') return <Lightbulb size={size} />;
    if (iconKey === 'sandbox') return <Target size={size} />;
    return <Globe size={size} />;
  };

  const renderCommReactionIcon = (reactionKey, size = 12) => {
    if (reactionKey === 'like') return <ThumbsUp size={size} />;
    if (reactionKey === 'love') return <Heart size={size} style={{ fill: 'var(--danger)', color: 'var(--danger)' }} />;
    if (reactionKey === 'haha') return <Smile size={size} />;
    if (reactionKey === 'wow') return <AlertTriangle size={size} />;
    if (reactionKey === 'fire') return <Flame size={size} style={{ fill: 'var(--accent)', color: 'var(--accent)' }} />;
    return null;
  };



  // Join Community parent shell (adds you to announcements automatically)
  const handleJoinCommunity = (commId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== commId) return c;
      if (c.type === 'open') {
        // Automatically add to members & announcements members list
        const updatedGroups = c.groups.map(g => {
          if (g.isAnnouncements) {
            return { ...g, members: [...(g.members || []), 'me'] };
          }
          return g;
        });
        return {
          ...c,
          members: [...c.members, 'me'],
          memberCount: c.memberCount + 1,
          groups: updatedGroups
        };
      } else {
        // Request-based
        const alreadyRequested = c.pendingRequests.some(r => r.id === 'me');
        if (alreadyRequested) return c;
        return {
          ...c,
          pendingRequests: [...c.pendingRequests, { id: 'me', name: 'You', avatar: 'Y' }]
        };
      }
    }));
  };

  // Join a specific Sub-group inside a community
  const handleJoinSubGroup = (commId, groupId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== commId) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== groupId) return g;
        if (g.members.includes('me')) return g;
        return {
          ...g,
          members: [...g.members, 'me']
        };
      });
      return {
        ...c,
        groups: updatedGroups
      };
    }));
  };

  // Leave Community (removes you from all its groups)
  const handleLeaveCommunity = (commId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== commId) return c;
      // remove from all sub groups
      const updatedGroups = c.groups.map(g => ({
        ...g,
        members: g.members.filter(m => m !== 'me')
      }));
      return {
        ...c,
        members: c.members.filter(m => m !== 'me'),
        memberCount: Math.max(0, c.memberCount - 1),
        groups: updatedGroups
      };
    }));
    if (activeCommId === commId) {
      setActiveGroupId(null);
    }
  };

  // Leave Sub-group
  const handleLeaveSubGroup = (commId, groupId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== commId) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          members: g.members.filter(m => m !== 'me')
        };
      });
      return {
        ...c,
        groups: updatedGroups
      };
    }));
    if (activeGroupId === groupId) {
      setActiveGroupId(null); // return to community dashboard
    }
  };



  // File upload handler
  const handleFileUpload = async (e, target) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, { maxWidth: 800, quality: 0.82 });
      console.log(`⚡ Community Icon compressed: ${compressed.originalSizeFormatted} → ${compressed.compressedSizeFormatted} (${compressed.savingsPercent} space saved)`);
      if (target === 'create') {
        setUploadedIcon(compressed.dataUrl);
      } else {
        setEditUploadedIcon(compressed.dataUrl);
      }
    } catch (err) {
      console.warn('Image compression fallback:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'create') setUploadedIcon(reader.result);
        else setEditUploadedIcon(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Approve pending request
  const handleApprove = (commId, userId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== commId) return c;
      const user = c.pendingRequests.find(r => r.id === userId);
      if (!user) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.isAnnouncements) {
          return { ...g, members: [...(g.members || []), userId] };
        }
        return g;
      });
      return {
        ...c,
        pendingRequests: c.pendingRequests.filter(r => r.id !== userId),
        members: [...c.members, userId],
        memberCount: c.memberCount + 1,
        groups: updatedGroups
      };
    }));
  };

  // Reject pending request
  const handleReject = (commId, userId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id !== commId) return c;
      return {
        ...c,
        pendingRequests: c.pendingRequests.filter(r => r.id !== userId)
      };
    }));
  };

  // Reactions for Message
  const handleReactMessage = (msgId, emoji) => {
    if (!activeComm || !activeGroup) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        const updatedMsgs = g.messages.map(m => {
          if (m.id !== msgId) return m;
          const currentCount = m.reactions[emoji] || 0;
          const usersList = m.reactionsDetail?.[emoji] || [];

          let nextUsers = [...usersList];
          let nextCount = currentCount;

          if (nextUsers.includes('me')) {
            nextUsers = nextUsers.filter(u => u !== 'me');
            nextCount = Math.max(0, nextCount - 1);
          } else {
            nextUsers.push('me');
            nextCount = nextCount + 1;
          }

          const nextReactions = { ...m.reactions };
          if (nextCount > 0) {
            nextReactions[emoji] = nextCount;
          } else {
            delete nextReactions[emoji];
          }

          const nextReactionsDetail = { ...m.reactionsDetail };
          if (nextUsers.length > 0) {
            nextReactionsDetail[emoji] = nextUsers;
          } else {
            delete nextReactionsDetail[emoji];
          }

          return {
            ...m,
            reactions: nextReactions,
            reactionsDetail: nextReactionsDetail
          };
        });
        return { ...g, messages: updatedMsgs };
      });
      return { ...c, groups: updatedGroups };
    }));
  };

  // Poll Vote
  const handlePollVote = (msgId, option) => {
    if (!activeComm || !activeGroup) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        const updatedMsgs = g.messages.map(m => {
          if (m.id !== msgId || m.type !== 'poll') return m;
          if (m.poll.voted) return m;

          const nextVotes = { ...m.poll.votes };
          nextVotes[option] = (nextVotes[option] || 0) + 1;

          const nextVotesDetail = { ...m.poll.votesDetail };
          if (!nextVotesDetail[option]) nextVotesDetail[option] = [];
          nextVotesDetail[option] = [...nextVotesDetail[option], 'me'];

          return {
            ...m,
            poll: {
              ...m.poll,
              voted: option,
              votes: nextVotes,
              votesDetail: nextVotesDetail
            }
          };
        });
        return { ...g, messages: updatedMsgs };
      });
      return { ...c, groups: updatedGroups };
    }));
  };

  // Send message
  const handleSendMessage = () => {
    if (!inputText.trim() || !activeComm || !activeGroup) return;
    const newMsg = {
      id: Date.now(),
      from: 'me',
      senderName: 'You',
      text: inputText.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {},
      reactionsDetail: {},
      views: ['me'],
      deleted: false,
      deletedFor: []
    };

    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        return {
          ...g,
          messages: [...g.messages, newMsg]
        };
      });
      return { ...c, groups: updatedGroups };
    }));
    setInputText('');
    setShowEmoji(false);
  };

  // Send Poll
  const handleSendPoll = (pollData) => {
    if (!activeComm || !activeGroup) return;
    const newMsg = {
      id: Date.now(),
      from: 'me',
      senderName: 'You',
      type: 'poll',
      poll: pollData,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: {},
      reactionsDetail: {},
      views: ['me'],
      deleted: false,
      deletedFor: []
    };

    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        return {
          ...g,
          messages: [...g.messages, newMsg]
        };
      });
      return { ...c, groups: updatedGroups };
    }));
    setShowPoll(false);
  };

  // Context Menu Message Deletes
  const handleDeleteForMe = (msgId) => {
    if (!activeComm || !activeGroup) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        const updated = g.messages.map(m => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            deletedFor: [...(m.deletedFor || []), 'me']
          };
        });
        return { ...g, messages: updated };
      });
      return { ...c, groups: updatedGroups };
    }));
    setActiveMenuMsgId(null);
  };

  const handleDeleteForEveryone = (msgId) => {
    if (!activeComm || !activeGroup) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        const updated = g.messages.map(m => {
          if (m.id !== msgId) return m;
          return {
            ...m,
            deleted: true,
            text: 'This message was deleted.',
            reactions: {},
            reactionsDetail: {},
            type: 'text'
          };
        });
        return { ...g, messages: updated };
      });
      return { ...c, groups: updatedGroups };
    }));
    setActiveMenuMsgId(null);
  };

  /* ── Message long press / contextual action handlers ── */
  const handleTouchStart = (e, msg) => {
    const touch = e.touches ? e.touches[0] : e;
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimeout.current = setTimeout(() => {
      setActionMenuMsg(msg);
    }, 600);
  };

  const handleTouchMove = (e) => {
    if (!longPressTimeout.current) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handlePinCommunityMsg = (msgId) => {
    if (!activeComm || !activeGroup) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        const pinned = g.pinnedMessages || [];
        const updatedPinned = pinned.includes(msgId)
          ? pinned.filter(id => id !== msgId)
          : [...pinned, msgId];
        return { ...g, pinnedMessages: updatedPinned };
      });
      return { ...c, groups: updatedGroups };
    }));
  };

  const handleSaveEditCommunityMsg = () => {
    if (!activeComm || !activeGroup || !editingMsg) return;
    if (!editInputValue.trim()) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      const updatedGroups = c.groups.map(g => {
        if (g.id !== activeGroup.id) return g;
        const updatedMsgs = g.messages.map(m => {
          if (m.id !== editingMsg.id) return m;
          return { ...m, text: editInputValue.trim(), edited: true };
        });
        return { ...g, messages: updatedMsgs };
      });
      return { ...c, groups: updatedGroups };
    }));
    setEditingMsg(null);
    setEditInputValue('');
  };

  // Promote / Demote Co-admin
  const handlePromote = (userId) => {
    if (!activeComm) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      return {
        ...c,
        coadmins: [...(c.coadmins || []), userId]
      };
    }));
  };

  const handleDemote = (userId) => {
    if (!activeComm) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      return {
        ...c,
        coadmins: (c.coadmins || []).filter(id => id !== userId)
      };
    }));
  };

  // Remove member
  const handleRemoveMember = (userId) => {
    if (!activeComm) return;
    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      // remove from all sub groups
      const updatedGroups = c.groups.map(g => ({
        ...g,
        members: g.members.filter(m => m !== userId)
      }));
      return {
        ...c,
        members: c.members.filter(m => m !== userId),
        memberCount: Math.max(1, c.memberCount - 1),
        groups: updatedGroups
      };
    }));
  };

  // Update community details (Admin/Co-admin settings dashboard)
  const handleUpdateDetails = () => {
    if (!editName.trim() || !activeComm) return;

    let chosenIcon = editEmojiIcon;
    if (editIconMode === 'orb') chosenIcon = editOrbIcon;
    if (editIconMode === 'upload') chosenIcon = editUploadedIcon || '🌐';

    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      return {
        ...c,
        name: editName.trim(),
        description: editDesc.trim(),
        iconType: editIconMode,
        icon: chosenIcon
      };
    }));
    setShowSettingsModal(false);
  };

  // Create Community (Creates parent community and default Announcements group)
  const handleCreateCommunity = () => {
    if (!newName.trim() || !newDesc.trim()) return;

    let chosenIcon = emojiIcon;
    if (iconMode === 'orb') chosenIcon = orbIcon;
    if (iconMode === 'upload') chosenIcon = uploadedIcon || '🌐';

    const commId = `c${Date.now()}`;
    const newComm = {
      id: commId,
      name: newName.trim(),
      description: newDesc.trim(),
      isVerified: false,
      isDeveloperBadge: false,
      isGlobal: true,
      type: newType,
      icon: chosenIcon,
      iconType: iconMode,
      memberCount: 1,
      members: ['me'],
      coadmins: [],
      pendingRequests: [],
      creator: 'me',
      liveShare: false,
      isFavourite: false,
      memberTags: {},
      groups: [
        {
          id: `${commId}-announcements`,
          name: 'Announcements',
          isAnnouncements: true,
          icon: '📢',
          description: `Official announcements and updates for ${newName.trim()}.`,
          members: ['me'],
          messages: []
        },
        {
          id: `${commId}-general`,
          name: 'General Discussion',
          icon: '💬',
          description: 'A place for everyone to say hello and hang out.',
          members: ['me'],
          messages: []
        }
      ]
    };

    setCommunities(prev => [...prev, newComm]);
    setActiveCommId(commId);
    setActiveGroupId(`${commId}-announcements`);
    setShowCreateModal(false);

    // Clear create inputs
    setNewName('');
    setNewDesc('');
    setEmojiIcon('🌐');
    setOrbIcon('🪐');
    setUploadedIcon('');
    setIconMode('emoji');
    setNewType('open');
  };

  // Create Sub-group inline (from Community Home dashboard)
  const handleCreateSubGroup = () => {
    if (!newSubGroupName.trim() || !activeComm) return;

    const newGroup = {
      id: `${activeComm.id}-sub-${Date.now()}`,
      name: newSubGroupName.trim(),
      icon: newSubGroupIcon.trim() || '💬',
      description: newSubGroupDesc.trim() || 'No description set.',
      members: ['me'],
      messages: []
    };

    setCommunities(prev => prev.map(c => {
      if (c.id !== activeComm.id) return c;
      return {
        ...c,
        groups: [...c.groups, newGroup]
      };
    }));

    setNewSubGroupName('');
    setNewSubGroupIcon('💬');
    setNewSubGroupDesc('');
    setShowCreateGroupInline(false);
  };

  // Filter Communities
  const filteredCommunities = communities.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'explore') {
      return matchesSearch;
    } else {
      return matchesSearch && c.members.includes('me');
    }
  });

  // Sort: Favorites first
  const sortedCommunities = [...filteredCommunities].sort((a, b) => (b.isFavourite ? 1 : 0) - (a.isFavourite ? 1 : 0));

  const isMember = activeComm ? activeComm.members?.includes('me') : false;
  const isRequested = activeComm ? activeComm.pendingRequests?.some(r => r.id === 'me') : false;
  const isAdmin = activeComm ? activeComm.creator === 'me' : false;
  const isCoAdmin = activeComm ? activeComm.coadmins?.includes('me') : false;
  const canEditDetails = isAdmin || isCoAdmin;

  return (
    <div className={`communities-layout animate-fade-in ${activeComm ? 'has-active-chat' : 'no-active-chat'} ${embedded ? 'embedded-mode' : ''}`}>
      {/* ── Sidebar List ── */}
      {!embedded && (
        <div className="comm-sidebar glass-morphism">
          <div className="comm-sidebar-header">
            <div className="header-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {onClose && (
                <button className="comm-close-btn" onClick={onClose} title="Back to Map">
                  <Undo2 size={20} />
                </button>
              )}
              <h3 style={{ flex: 1 }}>Communities</h3>
              <button className="comm-new-btn" onClick={() => setShowCreateModal(true)} title="New Community">
                <Plus size={18} />
              </button>
            </div>

            <div className="comm-tabs">
              <button
                className={`comm-tab-btn ${activeTab === 'my-communities' ? 'active' : ''}`}
                onClick={() => { setActiveTab('my-communities'); }}
              >
                Joined
              </button>
              <button
                className={`comm-tab-btn ${activeTab === 'explore' ? 'active' : ''}`}
                onClick={() => { setActiveTab('explore'); }}
              >
                Explore
              </button>
            </div>

            <div className="comm-search-wrap">
              <Search size={15} className="comm-search-icon" />
              <input
                className="comm-search"
                placeholder="Search communities…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Nested Community list (WhatsApp Style) */}
          <div className="comm-list">
            {sortedCommunities.map(c => {
              const joined = c.members.includes('me');

              // Sub-groups inside community that user has joined (or all if user is admin)
              const joinedSubgroups = c.groups.filter(g => g.isAnnouncements || g.members.includes('me') || isAdmin);

              return (
                <div key={c.id} className={`comm-group-wrapper ${activeCommId === c.id ? 'active-comm-wrap' : ''}`}>

                  {/* Parent Community Row */}
                  <div
                    className={`comm-parent-item ${activeCommId === c.id && activeGroupId === null ? 'active-parent' : ''}`}
                    onClick={() => {
                      setActiveCommId(c.id);
                      setActiveGroupId(null); // click parent selects community overview
                    }}
                  >
                    <div className="comm-square-icon-wrap">
                      {c.iconType === 'upload' ? (
                        <img src={c.icon} alt={c.name} className="comm-uploaded-icon-thumb rounded-square" />
                      ) : (
                        <span className="comm-emoji-large">{getCommIcon(c)}</span>
                      )}
                    </div>

                    <div className="comm-parent-info">
                      <div className="comm-parent-name-row">
                        <span className="comm-name">{c.name}</span>
                        {c.isFavourite && <Star size={11} fill="var(--primary)" style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                        {c.isDeveloperBadge && (
                          <span className="premium-verified-badge-mini" title="Verified Community">
                            <CheckCircle size={10} style={{ fill: '#3b82f6', color: '#fff' }} />
                          </span>
                        )}
                      </div>
                      <span className="comm-sub-hint">
                        {c.groups.length} groups · {c.memberCount} members
                      </span>
                    </div>

                    <div className="comm-parent-actions">
                      {!joined && c.type === 'open' && (
                        <button
                          className="join-comm-inline-btn"
                          onClick={(e) => { e.stopPropagation(); handleJoinCommunity(c.id); }}
                        >
                          Join
                        </button>
                      )}
                      {!joined && c.type === 'request' && (
                        <span className="request-comm-inline-badge">Request</span>
                      )}
                    </div>
                  </div>

                  {/* Sub-groups (Announcements & Discussions) */}
                  {joined && (
                    <div className="comm-subgroups-list animate-slide-down">
                      {joinedSubgroups.map(g => {
                        const isSelected = activeCommId === c.id && activeGroupId === g.id;
                        return (
                          <button
                            key={g.id}
                            className={`comm-subgroup-item ${isSelected ? 'active-subgroup' : ''}`}
                            onClick={() => {
                              setActiveCommId(c.id);
                              setActiveGroupId(g.id);
                            }}
                          >
                            <div className="comm-subgroup-icon">
                              {g.isAnnouncements ? <Megaphone size={14} className="announcement-megaphone-icon" /> : renderSubgroupIcon(g.icon, 14)}
                            </div>
                            <div className="comm-subgroup-text">
                              <span className="comm-subgroup-name">
                                {g.name}
                              </span>
                              {g.isAnnouncements && <span className="announcement-tag">Announcements</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCommunities.length === 0 && (
              <div className="comm-empty-hint">
                <Globe size={28} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No communities found.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Right Panel: Chat Panel OR Community Overview ── */}
      {selectedProfileUser && selectedUserIsFriend ? (
        <div className="friend-profile-panel-view comm-panel animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(59, 158, 92, 0.08)' }}>
            <button
              className="panel-close-btn"
              onClick={() => setSelectedProfileUser(null)}
              title="Back to Community"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', boxShadow: 'var(--neu-shadow-outer)', color: 'var(--text-muted)' }}
            >
              <Undo2 size={16} />
            </button>
            <span style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-main)', fontFamily: "'Outfit', sans-serif" }}>Member's Profile</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <ProfileView
              user={selectedProfileUser}
              isFriend={true}
              isSelf={selectedProfileUser.uuid === 'self'}
            />
          </div>
        </div>
      ) : activeComm ? (
        activeGroupId === null ? (
          /* ── COMMUNITY DETAIL HOME DASHBOARD ── */
          <div className="comm-panel community-home-dashboard animate-fade-in">
            <div className="comm-header glass-morphism">
              <div className="comm-header-info" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="comm-chat-back-btn"
                  onClick={() => embedded ? onClose() : setActiveCommId(null)}
                  title="Back to Communities"
                >
                  <Undo2 size={20} />
                </button>
                <div className="comm-avatar-wrap square-avatar">
                  {activeComm.iconType === 'upload' ? (
                    <img src={activeComm.icon} alt={activeComm.name} className="comm-uploaded-icon-hdr rounded-square" />
                  ) : (
                    getCommIcon(activeComm)
                  )}
                </div>
                <div>
                  <div className="comm-header-title">
                    <h4>{activeComm.name} Community Home</h4>
                    {activeComm.isFavourite && <Star size={13} fill="var(--primary)" style={{ color: 'var(--primary)', marginLeft: 4 }} />}
                    {activeComm.isDeveloperBadge && (
                      <span className="premium-verified-badge" title="Verified Hub">
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.5" className="premium-verified-svg">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="comm-meta">
                    {activeComm.memberCount} members · {activeComm.groups.length} groups
                  </span>
                </div>
              </div>

              <div className="comm-header-actions">
              </div>
            </div>

            <div className="community-home-content scroll-y">
              {/* Cover Info Banner */}
              <div className="community-home-banner glass-morphism">
                <div className="banner-details">
                  <span className="banner-icon-large">{getCommIcon(activeComm)}</span>
                  <h2>Welcome to {activeComm.name}</h2>
                  <p>{activeComm.description || "Welcome to our WhatsApp community hub! Explore the groups below or check announcements."}</p>

                  <div className="banner-badges">
                    <span className="comm-badge-item"><Users size={12} /> {activeComm.memberCount} members</span>
                    <span className="comm-badge-item"><Globe size={12} /> {activeComm.groups.length} sub-channels</span>
                    <span className={`comm-type-badge ${activeComm.type}`}>{activeComm.type}</span>
                  </div>

                  {!isMember ? (
                    isRequested ? (
                      <button className="banner-primary-btn disabled" disabled>Request Pending...</button>
                    ) : (
                      <button className="banner-primary-btn" onClick={() => handleJoinCommunity(activeComm.id)}>
                        Join Community Hub
                      </button>
                    )
                  ) : (
                    <div className="banner-joined-row">
                      <button className="banner-secondary-btn" onClick={() => setActiveGroupId(`${activeComm.id}-announcements`)}>
                        <Megaphone size={14} style={{ marginRight: 6 }} /> Open Announcements
                      </button>
                      <button className="banner-danger-btn" onClick={() => handleLeaveCommunity(activeComm.id)}>
                        Leave Community
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-groups section */}
              <div className="community-dashboard-section">
                <div className="section-header-row">
                  <h3>Sub-groups in this Community</h3>
                  {isMember && canEditDetails && !showCreateGroupInline && (
                    <button className="btn-primary-small add-group-dash-btn" onClick={() => setShowCreateGroupInline(true)}>
                      <Plus size={14} /> Create Sub-group
                    </button>
                  )}
                </div>

                {/* Inline sub-group creation form */}
                {showCreateGroupInline && (
                  <div className="inline-group-form glass-morphism animate-slide-down">
                    <div className="inline-form-header">
                      <h4>New Sub-group</h4>
                      <button className="icon-btn-small" onClick={() => setShowCreateGroupInline(false)}><X size={14} /></button>
                    </div>
                    <div className="inline-form-inputs">
                      <input
                        type="text"
                        placeholder="Sub-group Name (e.g. AI Talk)"
                        value={newSubGroupName}
                        onChange={e => setNewSubGroupName(e.target.value)}
                        className="grp-name-input"
                      />
                      <input
                        type="text"
                        placeholder="Icon/Emoji (e.g. 🤖)"
                        value={newSubGroupIcon}
                        onChange={e => setNewSubGroupIcon(e.target.value)}
                        className="grp-name-input icon-input"
                        style={{ width: '80px', textAlign: 'center' }}
                      />
                      <input
                        type="text"
                        placeholder="Short group description"
                        value={newSubGroupDesc}
                        onChange={e => setNewSubGroupDesc(e.target.value)}
                        className="grp-name-input"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary-small inline-save-btn"
                        disabled={!newSubGroupName.trim()}
                        onClick={handleCreateSubGroup}
                      >
                        Create
                      </button>
                    </div>
                  </div>
                )}

                <div className="groups-dashboard-grid">
                  {activeComm.groups.map(g => {
                    const userJoinedGroup = g.members.includes('me') || g.isAnnouncements;
                    return (
                      <div key={g.id} className="group-dashboard-card glass-morphism">
                        <div className="card-top-row">
                          <span className="card-icon">{g.isAnnouncements ? <Megaphone size={18} /> : g.icon || '💬'}</span>
                          <div className="card-name-info">
                            <h4>{g.name}</h4>
                            {g.isAnnouncements && <span className="announcement-pill">Broadcast Only</span>}
                          </div>
                        </div>
                        <p className="card-desc">{g.description || 'Welcome to this community chat group.'}</p>
                        <div className="card-bottom-row">
                          <span className="members-count-badge"><Users size={10} style={{ marginRight: 4 }} /> {g.members?.length || 0} in group</span>

                          {isMember ? (
                            userJoinedGroup ? (
                              <button
                                className="card-action-btn joined"
                                onClick={() => setActiveGroupId(g.id)}
                              >
                                Chat Now
                              </button>
                            ) : (
                              <button
                                className="card-action-btn join"
                                onClick={() => handleJoinSubGroup(activeComm.id, g.id)}
                              >
                                Join Group
                              </button>
                            )
                          ) : (
                            <button className="card-action-btn join disabled" disabled>Join Hub First</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Members List */}
              <div className="community-dashboard-section">
                <h3>Community Members & Role Tags</h3>
                <div className="dashboard-members-list">
                  {activeComm.members.map(mId => {
                    const u = MOCK_USERS[mId] || { name: 'Unknown User', avatar: '?' };
                    const isCreator = mId === activeComm.creator;
                    const isUserCoAdmin = activeComm.coadmins?.includes(mId);
                    const tag = activeComm.memberTags?.[mId] || (isCreator ? 'Admin' : isUserCoAdmin ? 'Co-admin' : 'Member');

                    return (
                      <div
                        key={mId}
                        className="dash-member-row glass-morphism"
                        onClick={() => {
                          handleAvatarClick({ id: mId, name: u.name, username: mId });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="member-left">
                          <div className="member-avatar">{u.avatar}</div>
                          <span className="member-name">{u.name}</span>
                        </div>
                        <span className={`role-badge ${isCreator ? 'admin' : isUserCoAdmin ? 'coadmin' : 'member'}`}>
                          {isCreator && <Crown size={10} style={{ marginRight: 4 }} />}
                          {isUserCoAdmin && <Shield size={10} style={{ marginRight: 4 }} />}
                          {tag}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : activeGroup ? (
          /* ── COMMUNITY SUB-GROUP CHAT PANEL ── */
          <div className="comm-panel">
            {/* Header */}
            <div className="comm-header glass-morphism">
              <div className="comm-header-info clickable-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  className="comm-chat-back-btn"
                  onClick={() => embedded ? onClose() : setActiveCommId(null)}
                  title="Back to Communities"
                >
                  <Undo2 size={20} />
                </button>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  onClick={() => setShowOverviewModal(true)}
                  title="View Community Details"
                >
                  <div className="comm-avatar-wrap">
                    {activeGroup.isAnnouncements ? (
                      <Megaphone size={20} className="announcement-megaphone-icon" />
                    ) : (
                      <span className="subgroup-emoji-hdr">{activeGroup.icon || '💬'}</span>
                    )}
                  </div>
                  <div>
                    <div className="comm-header-title">
                      <h4>{activeGroup.name}</h4>
                      {activeGroup.isAnnouncements && <span className="announcement-tag-hdr">Announcements</span>}
                    </div>
                    <span className="comm-meta">
                      {activeGroup.members?.length || 0} members · Click to view details
                    </span>
                  </div>
                </div>
              </div>

              <div className="comm-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {canEditDetails && (
                  <button
                    className={`admin-only-toggle-header-btn ${activeComm?.adminOnlyMessaging ? 'on' : 'off'}`}
                    onClick={() => {
                      setCommunities(prev => prev.map(c => c.id === activeComm.id ? { ...c, adminOnlyMessaging: !c.adminOnlyMessaging } : c));
                    }}
                    title={activeComm?.adminOnlyMessaging ? 'Disable Admin-only messaging' : 'Enable Admin-only messaging'}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: activeComm?.adminOnlyMessaging ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                      border: 'none',
                      color: activeComm?.adminOnlyMessaging ? '#ef4444' : '#6366f1',
                      padding: '8px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }}
                  >
                    <Shield size={16} />
                  </button>
                )}
                <button
                  className="btn-secondary-small home-back-btn"
                  onClick={() => setActiveGroupId(null)}
                  title="Back to Community Home"
                >
                  <Globe size={14} style={{ marginRight: 4 }} className="home-back-icon" />
                  <span className="home-back-btn-text"> Community Home</span>
                </button>
              </div>
            </div>

            {/* Community Pinned Messages Banner */}
            {(activeGroup.pinnedMessages || []).length > 0 && (
              <div className="pinned-banner">
                <div className="pinned-banner-top" onClick={() => setPinnedExpanded(p => !p)}>
                  <Pin size={13} className="pinned-banner-icon" />
                  <span className="pinned-banner-text">
                    {(activeGroup.pinnedMessages || []).length === 1
                      ? (() => { const msg = activeGroup.messages.find(m => m.id === activeGroup.pinnedMessages[0]); return msg ? (msg.text || '[media]').slice(0, 60) : 'Pinned message'; })()
                      : `${(activeGroup.pinnedMessages || []).length} pinned messages`
                    }
                  </span>
                  {(activeGroup.pinnedMessages || []).length > 1 && (pinnedExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                </div>
                {pinnedExpanded && (
                  <div className="pinned-list-drawer">
                    {(activeGroup.pinnedMessages || []).map(msgId => {
                      const msg = activeGroup.messages.find(m => m.id === msgId);
                      if (!msg) return null;
                      return (
                        <div key={msgId} className="pinned-msg-row">
                          <Pin size={11} className="pinned-row-icon" />
                          <span className="pinned-row-text">{(msg.text || '[media]').slice(0, 70)}</span>
                          {canEditDetails && (
                            <button className="unpin-btn" onClick={() => handlePinCommunityMsg(msgId)} title="Unpin"><PinOff size={11} /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Description Banner */}
            {activeGroup.description && (
              <div className="comm-description-banner">
                <p>{activeGroup.description}</p>
              </div>
            )}

            {/* Chat messages */}
            <div className="comm-chat-messages">
              {activeGroup.messages?.filter(m => !m.deletedFor?.includes('me')).map(msg => {
                const isMe = msg.from === 'me';
                return (
                  <div key={msg.id} className={`comm-msg-row ${isMe ? 'me' : 'them'}`}>
                    {!isMe && (
                      <div
                        className="comm-bubble-avatar avatar-clickable"
                        onClick={() => {
                          handleAvatarClick({ id: msg.from, name: MOCK_USERS[msg.from]?.name || msg.from, username: msg.from });
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {MOCK_USERS[msg.from]?.avatar || 'U'}
                      </div>
                    )}
                    <div className={`comm-bubble-container`}>
                      {!isMe && (
                        <span
                          className="comm-sender-name avatar-clickable"
                          onClick={() => {
                            handleAvatarClick({ id: msg.from, name: MOCK_USERS[msg.from]?.name || msg.from, username: msg.from });
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {msg.senderName}
                        </span>
                      )}
                      <div className="comm-bubble-content-wrap">
                        <div 
                          className={`comm-bubble ${isMe ? 'comm-bubble-me' : 'comm-bubble-them'} ${(activeGroup.pinnedMessages || []).includes(msg.id) ? 'msg-is-pinned' : ''}`}
                          onContextMenu={(e) => { e.preventDefault(); setActionMenuMsg(msg); }}
                          onTouchStart={(e) => handleTouchStart(e, msg)}
                          onTouchEnd={handleTouchEnd}
                          onTouchMove={handleTouchMove}
                          onMouseDown={(e) => handleTouchStart(e, msg)}
                          onMouseUp={handleTouchEnd}
                          onMouseMove={handleTouchMove}
                          style={{ cursor: 'pointer' }}
                        >
                          {(activeGroup.pinnedMessages || []).includes(msg.id) && <Pin size={11} style={{ position: 'absolute', top: 6, right: 6, opacity: 0.6, transform: 'rotate(45deg)' }} />}
                          {msg.deleted ? (
                            <span className="msg-deleted-text">{msg.text}</span>
                          ) : msg.type === 'poll' ? (
                            <CommPollCard poll={msg.poll} onVote={(opt) => handlePollVote(msg.id, opt)} />
                          ) : msg.type === 'live-location' ? (
                            <div className="live-location-bubble-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                                <MapPin size={16} />
                                <span>{msg.text}</span>
                              </div>
                              {activeComm?.liveShare && msg.text.includes('Sharing') ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                                  <span className="live-pulse" style={{ width: 6, height: 6 }} /> Active Live Location
                                </div>
                              ) : (
                                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Sharing ended</span>
                              )}
                            </div>
                          ) : (
                            <p style={{ paddingRight: (activeGroup.pinnedMessages || []).includes(msg.id) ? 12 : 0 }}>{msg.text}</p>
                          )}
                          <span className="comm-msg-time">{msg.time}{msg.edited && ' · edited'}</span>
                        </div>

                        {/* Telemetry info popup button */}
                        {!msg.deleted && (
                          <button className="comm-msg-telemetry-btn" onClick={() => setInfoMsg(msg)} title="View message read/vote details">
                            <Info size={11} />
                          </button>
                        )}
                      </div>

                      {/* Reactions display */}
                      {!msg.deleted && Object.keys(msg.reactions || {}).length > 0 && (
                        <div className="comm-msg-reactions">
                          {Object.entries(msg.reactions).map(([emoji, count]) => {
                            const active = msg.reactionsDetail?.[emoji]?.includes('me');
                            return (
                              <button
                                key={emoji}
                                className={`comm-reaction-badge ${active ? 'active' : ''}`}
                                onClick={() => handleReactMessage(msg.id, emoji)}
                              >
                                <span>{renderCommReactionIcon(emoji, 10)}</span>
                                <span className="count">{count}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Quick reactions on hover */}
                      {!msg.deleted && isMember && (
                        <div className="comm-quick-react-bar">
                          {REACTIONS.map(emoji => (
                            <button key={emoji} className="quick-emoji" onClick={() => handleReactMessage(msg.id, emoji)}>
                              {renderCommReactionIcon(emoji, 12)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {(activeGroup.messages?.length || 0) === 0 && (
                <div className="comm-chat-empty-state">
                  {activeGroup.isAnnouncements ? (
                    <Megaphone size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                  ) : (
                    <Globe size={32} style={{ opacity: 0.15, marginBottom: '0.5rem' }} />
                  )}
                  <p>Welcome to #{activeGroup.name.toLowerCase().replace(/\s+/g, '-')}</p>
                  <span>{activeGroup.isAnnouncements ? 'Only community admins can send updates.' : 'Be the first one to write a message!'}</span>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Quick Poll build shortcuts */}
            {showPoll && (
              <div className="grp-poll-tray glass-morphism animate-slide-up">
                <div className="grp-poll-tray-header">
                  <span>Quick Polls</span>
                  <button className="icon-btn-small" onClick={() => setShowPoll(false)}><X size={15} /></button>
                </div>
                <div className="grp-shortcut-row">
                  {POLL_SHORTCUTS.map(s => (
                    <button
                      key={s.id}
                      className="grp-shortcut-card"
                      style={{ '--sc': s.color }}
                      onClick={() => handleSendPoll(s.build())}
                    >
                      <span className="grp-sc-emoji">{s.icon}</span>
                      <span className="grp-sc-label">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar or READ-ONLY Admin Notice for Announcements */}
            {isMember ? (
              (activeGroup.isAnnouncements && !canEditDetails) || (activeComm?.adminOnlyMessaging && !canEditDetails) ? (
                /* WhatsApp Announcement Read-only bar */
                <div className="comm-announcement-readonly-bar glass-morphism">
                  <Megaphone size={16} />
                  <span>{activeComm?.adminOnlyMessaging ? 'Only admins can send messages in this community' : 'Only community admins can send announcements to this channel.'}</span>
                </div>
              ) : (
                /* Regular Chat input bar */
                <div className="comm-input-bar glass-morphism">
                  <button
                    className={`icon-btn-small ${showPoll ? 'active-icon' : ''}`}
                    onClick={() => { setShowPoll(!showPoll); }}
                  >
                    <BarChart2 size={20} />
                  </button>
                  <input
                    className="comm-chat-input"
                    placeholder={
                      activeGroup.isAnnouncements
                        ? "Broadcast an announcement..."
                        : `Post to #${activeGroup.name.toLowerCase().replace(/\s+/g, '-')}`
                    }
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  />
                  <button
                    className={`send-btn ${inputText.trim() ? 'ready' : ''}`}
                    onClick={handleSendMessage}
                    disabled={!inputText.trim()}
                  >
                    <Send size={18} />
                  </button>
                </div>
              )
            ) : (
              <div className="comm-announcement-readonly-bar glass-morphism">
                <span>Join this community to participate in the chat.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="chat-empty">
            <div className="chat-empty-inner">
              <div className="chat-empty-icon">⚠️</div>
              <h3>Sub-group not found</h3>
              <p>The selected sub-group could not be found or has been removed.</p>
            </div>
          </div>
        )
      ) : (
        <div className="chat-empty">
          <div className="chat-empty-inner">
            <div className="chat-empty-icon">🌐</div>
            <h3>Explore WhatsApp Communities</h3>
            <p>Join request-based or open communities. Browse announcements and dedicated sub-groups under each hub.</p>
          </div>
        </div>
      )}

      {/* ── Create Community Modal ── */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="create-comm-modal glass-morphism" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Community Hub</h3>
              <button className="icon-btn-small" onClick={() => setShowCreateModal(false)}><X size={18} /></button>
            </div>

            <div className="modal-form-row">
              <label className="grp-modal-label">Community Name</label>
              <input
                className="grp-name-input"
                placeholder="e.g. Design Lab, Tech Enthusiasts..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>

            {/* Premium Icon Select Mode */}
            <div className="modal-form-row">
              <label className="grp-modal-label">Icon Selection</label>
              <div className="icon-selector-tabs">
                <button className={`tab-btn-small ${iconMode === 'emoji' ? 'active' : ''}`} onClick={() => setIconMode('emoji')}>Emoji</button>
                <button className={`tab-btn-small ${iconMode === 'orb' ? 'active' : ''}`} onClick={() => setIconMode('orb')}>Orb Avatar</button>
                <button className={`tab-btn-small ${iconMode === 'upload' ? 'active' : ''}`} onClick={() => setIconMode('upload')}>Upload</button>
              </div>

              {iconMode === 'emoji' && (
                <div className="icon-input-row" style={{ marginTop: '0.5rem' }}>
                  <span className="icon-preview">{emojiIcon}</span>
                  <input
                    className="grp-name-input icon-input"
                    value={emojiIcon}
                    onChange={e => setEmojiIcon(e.target.value)}
                    placeholder="e.g. 🌐"
                  />
                </div>
              )}

              {iconMode === 'orb' && (
                <div className="orb-avatar-grid" style={{ marginTop: '0.5rem' }}>
                  {ORB_AVATARS.map(avatar => (
                    <button
                      key={avatar.name}
                      className={`orb-avatar-item ${orbIcon === avatar.value ? 'selected' : ''}`}
                      onClick={() => setOrbIcon(avatar.value)}
                    >
                      {avatar.value}
                    </button>
                  ))}
                </div>
              )}

              {iconMode === 'upload' && (
                <div className="upload-icon-row" style={{ marginTop: '0.5rem' }}>
                  {uploadedIcon ? (
                    <img src={uploadedIcon} alt="Uploaded Icon" className="upload-preview-thumb" />
                  ) : (
                    <div className="upload-preview-thumb-placeholder">No Image</div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'create')}
                    id="comm-upload-create"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="comm-upload-create" className="btn-upload-label">
                    Upload Icon
                  </label>
                </div>
              )}
            </div>

            <div className="modal-form-row">
              <label className="grp-modal-label">Community Description</label>
              <textarea
                className="grp-desc-input"
                placeholder="Give details about your community..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
              />
            </div>

            <div className="modal-form-row">
              <label className="grp-modal-label">Community Access Type</label>
              <div className="access-options-row">
                <button
                  className={`access-btn ${newType === 'open' ? 'active' : ''}`}
                  onClick={() => setNewType('open')}
                >
                  <Unlock size={14} style={{ marginRight: 4 }} />
                  <span>Open (Auto-Join)</span>
                </button>
                <button
                  className={`access-btn ${newType === 'request' ? 'active' : ''}`}
                  onClick={() => setNewType('request')}
                >
                  <Lock size={14} style={{ marginRight: 4 }} />
                  <span>Request Only</span>
                </button>
              </div>
            </div>

            <button
              className="grp-create-btn"
              onClick={handleCreateCommunity}
              disabled={!newName.trim() || !newDesc.trim()}
            >
              Create Community <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Settings / Request Management Modal ── */}
      {showSettingsModal && activeComm && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="comm-settings-modal glass-morphism" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Community Dashboard</h3>
              <button className="icon-btn-small" onClick={() => setShowSettingsModal(false)}><X size={18} /></button>
            </div>

            {/* Set and edit community details */}
            <div className="settings-edit-section">
              <p className="grp-modal-label">Edit Community Details</p>

              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <span className="field-label">Community Name</span>
                <input
                  className="grp-name-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Community Name"
                />
              </div>

              <div className="form-group">
                <span className="field-label">Icon Selection</span>
                <div className="icon-selector-tabs">
                  <button className={`tab-btn-small ${editIconMode === 'emoji' ? 'active' : ''}`} onClick={() => setEditIconMode('emoji')}>Emoji</button>
                  <button className={`tab-btn-small ${editIconMode === 'orb' ? 'active' : ''}`} onClick={() => setEditIconMode('orb')}>Orb Avatar</button>
                  <button className={`tab-btn-small ${editIconMode === 'upload' ? 'active' : ''}`} onClick={() => setEditIconMode('upload')}>Upload</button>
                </div>

                {editIconMode === 'emoji' && (
                  <div className="icon-input-row" style={{ marginTop: '0.5rem' }}>
                    <span className="icon-preview">{editEmojiIcon}</span>
                    <input
                      className="grp-name-input icon-input"
                      value={editEmojiIcon}
                      onChange={e => setEditEmojiIcon(e.target.value)}
                    />
                  </div>
                )}

                {editIconMode === 'orb' && (
                  <div className="orb-avatar-grid" style={{ marginTop: '0.5rem' }}>
                    {ORB_AVATARS.map(avatar => (
                      <button
                        key={avatar.name}
                        className={`orb-avatar-item ${editOrbIcon === avatar.value ? 'selected' : ''}`}
                        onClick={() => setEditOrbIcon(avatar.value)}
                      >
                        {avatar.value}
                      </button>
                    ))}
                  </div>
                )}

                {editIconMode === 'upload' && (
                  <div className="upload-icon-row" style={{ marginTop: '0.5rem' }}>
                    {editUploadedIcon ? (
                      <img src={editUploadedIcon} alt="Uploaded Icon" className="upload-preview-thumb" />
                    ) : (
                      <div className="upload-preview-thumb-placeholder">No Image</div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'edit')}
                      id="comm-upload-edit"
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="comm-upload-edit" className="btn-upload-label">
                      Change Icon
                    </label>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
                <span className="field-label">Community Description</span>
                <textarea
                  className="comm-desc-input"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  placeholder="Describe community purpose..."
                />
              </div>

              <button className="btn-primary-small save-details-btn" style={{ marginTop: '0.75rem' }} onClick={editName.trim() ? handleUpdateDetails : undefined}>
                Save Community Info
              </button>
            </div>

            <div className="settings-section">
              <p className="grp-modal-label">Pending Join Requests ({activeComm.pendingRequests?.length || 0})</p>
              <div className="requests-list">
                {activeComm.pendingRequests?.map(r => (
                  <div key={r.id} className="request-row">
                    <div className="request-user-info">
                      <div className="request-avatar">{r.avatar}</div>
                      <span>{r.name}</span>
                    </div>
                    <div className="request-actions">
                      <button className="action-btn approve" onClick={() => handleApprove(activeComm.id, r.id)} title="Approve">
                        <Check size={14} />
                      </button>
                      <button className="action-btn reject" onClick={() => handleReject(activeComm.id, r.id)} title="Reject">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {(activeComm.pendingRequests?.length || 0) === 0 && (
                  <p className="empty-requests-text">No pending join requests.</p>
                )}
              </div>
            </div>

            <div className="settings-section">
              <p className="grp-modal-label">Members List</p>
              <div className="comm-members-list">
                {activeComm.members.map(mId => {
                  const user = MOCK_USERS[mId] || { name: 'Unknown User', avatar: '?' };
                  const isUserAdmin = mId === activeComm.creator;
                  const isUserCoAdmin = activeComm.coadmins?.includes(mId);
                  const role = isUserAdmin ? 'admin' : isUserCoAdmin ? 'coadmin' : 'member';

                  return (
                    <div key={mId} className="comm-member-item">
                      <div
                        className="comm-member-avatar avatar-clickable"
                        onClick={() => handleAvatarClick({ id: mId, name: user.name, username: mId })}
                        style={{ cursor: mId !== 'me' ? 'pointer' : 'default' }}
                      >
                        {user.avatar}
                      </div>
                      <div className="comm-member-info-row">
                        <span
                          className="comm-member-name avatar-clickable"
                          onClick={() => handleAvatarClick({ id: mId, name: user.name, username: mId })}
                          style={{ cursor: mId !== 'me' ? 'pointer' : 'default' }}
                        >
                          {user.name}
                        </span>
                        {role === 'admin' && <span className="role-badge admin"><Crown size={10} /> Admin</span>}
                        {role === 'coadmin' && <span className="role-badge coadmin"><Shield size={10} /> Co-admin</span>}
                      </div>
                      {mId !== 'me' && (
                        <div className="grp-member-actions">
                          {isAdmin && role === 'member' && (
                            <button className="member-action-btn promote" onClick={() => handlePromote(mId)} title="Make Co-admin">
                              <Shield size={12} />
                            </button>
                          )}
                          {isAdmin && role === 'coadmin' && (
                            <button className="member-action-btn demote" onClick={() => handleDemote(mId)} title="Remove Co-admin">
                              <X size={12} />
                            </button>
                          )}
                          <button className="member-action-btn remove" onClick={() => handleRemoveMember(mId)} title="Remove from community">
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Unified Community Overview Modal (Clicking Header Name) ── */}
      {showOverviewModal && activeComm && (
        <CommunityOverviewModal
          community={activeComm}
          onClose={() => setShowOverviewModal(false)}
          onUpdateCommunity={(patch) => {
            setCommunities(prev => prev.map(c => c.id === activeComm.id ? { ...c, ...patch } : c));
          }}
          onAddMember={(userId) => {
            setCommunities(prev => prev.map(c => {
              if (c.id !== activeComm.id) return c;
              const updatedGroups = c.groups.map(g => {
                if (g.isAnnouncements) {
                  return { ...g, members: [...(g.members || []), userId] };
                }
                return g;
              });
              return {
                ...c,
                members: [...c.members, userId],
                memberCount: c.memberCount + 1,
                groups: updatedGroups
              };
            }));
          }}
          onRemoveMember={(userId) => {
            setCommunities(prev => prev.map(c => {
              if (c.id !== activeComm.id) return c;
              const updatedGroups = c.groups.map(g => ({
                ...g,
                members: g.members.filter(m => m !== userId)
              }));
              return {
                ...c,
                members: c.members.filter(m => m !== userId),
                memberCount: Math.max(1, c.memberCount - 1),
                groups: updatedGroups
              };
            }));
          }}
          onExitCommunity={() => handleLeaveCommunity(activeComm.id)}
          onDeleteCommunity={() => {
            setCommunities(prev => prev.filter(c => c.id !== activeComm.id));
            setActiveCommId(null);
            setShowOverviewModal(false);
          }}
          onPromote={handlePromote}
          onDemote={handleDemote}
          canEdit={canEditDetails}
          onOpenMessage={handleAvatarClick}
        />
      )}

      {/* ── Detailed Message Info Modal ── */}
      {infoMsg && activeComm && activeGroup && (
        <div className="modal-overlay" onClick={() => setInfoMsg(null)}>
          <div className="comm-info-modal glass-morphism" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Message Details & Activity</h3>
              <button className="icon-btn-small" onClick={() => setInfoMsg(null)}><X size={18} /></button>
            </div>



            {/* Viewed By List */}
            <div className="info-section">
              <h4 className="info-section-title"><Eye size={13} style={{ marginRight: 4 }} /> Viewed By ({infoMsg.views?.length || 0})</h4>
              <div className="info-user-list">
                {infoMsg.views?.map(userId => {
                  const user = MOCK_USERS[userId] || { name: userId, avatar: 'U' };
                  return (
                    <div key={userId} className="info-user-row">
                      <div className="info-user-avatar">{user.avatar}</div>
                      <span>{user.name}</span>
                    </div>
                  );
                })}
                {(!infoMsg.views || infoMsg.views.length === 0) && (
                  <span className="info-empty-hint">Nobody has viewed this message yet.</span>
                )}
              </div>
            </div>

            {/* Reacted By List */}
            <div className="info-section">
              <h4 className="info-section-title"><Smile size={13} style={{ marginRight: 4 }} /> Reacted By</h4>
              <div className="info-user-list">
                {Object.entries(infoMsg.reactionsDetail || {}).flatMap(([emoji, users]) =>
                  users.map(userId => {
                    const user = MOCK_USERS[userId] || { name: userId, avatar: 'U' };
                    return (
                      <div key={userId + emoji} className="info-user-row">
                        <div className="info-user-avatar">{user.avatar}</div>
                        <span>{user.name}</span>
                        <span className="info-reaction-indicator">{emoji}</span>
                      </div>
                    );
                  })
                )}
                {(!infoMsg.reactionsDetail || Object.keys(infoMsg.reactionsDetail).length === 0) && (
                  <span className="info-empty-hint">No reactions on this message.</span>
                )}
              </div>
            </div>

            {/* Polled By List (Only if type is poll) */}
            {infoMsg.type === 'poll' && (
              <div className="info-section">
                <h4 className="info-section-title"><BarChart2 size={13} style={{ marginRight: 4 }} /> Votes</h4>
                <div className="info-user-list">
                  {Object.entries(infoMsg.poll?.votesDetail || {}).flatMap(([opt, users]) =>
                    users.map(userId => {
                      const user = MOCK_USERS[userId] || { name: userId, avatar: 'U' };
                      return (
                        <div key={userId + opt} className="info-user-row">
                          <div className="info-user-avatar">{user.avatar}</div>
                          <span>{user.name}</span>
                          <span className="info-vote-indicator">{opt}</span>
                        </div>
                      );
                    })
                  )}
                  {(!infoMsg.poll?.votesDetail || Object.values(infoMsg.poll.votesDetail).every(arr => arr.length === 0)) && (
                    <span className="info-empty-hint">No votes yet.</span>
                  )}
                </div>
              </div>
            )}

            {/* Viewed but not reacted or polled */}
            <div className="info-section">
              <h4 className="info-section-title"><Eye size={13} style={{ marginRight: 4 }} /> Read but Inactive</h4>
              <div className="info-user-list">
                {(() => {
                  const reactedUsers = Object.values(infoMsg.reactionsDetail || {}).flat();
                  const votedUsers = infoMsg.type === 'poll' ? Object.values(infoMsg.poll?.votesDetail || {}).flat() : [];
                  const inactiveUsers = (infoMsg.views || []).filter(u => !reactedUsers.includes(u) && !votedUsers.includes(u));

                  return inactiveUsers.map(userId => {
                    const user = MOCK_USERS[userId] || { name: userId, avatar: 'U' };
                    return (
                      <div key={userId} className="info-user-row">
                        <div className="info-user-avatar">{user.avatar}</div>
                        <span>{user.name}</span>
                        <span className="info-inactive-tag">Inactive</span>
                      </div>
                    );
                  });
                })()}
                {(() => {
                  const reactedUsers = Object.values(infoMsg.reactionsDetail || {}).flat();
                  const votedUsers = infoMsg.type === 'poll' ? Object.values(infoMsg.poll?.votesDetail || {}).flat() : [];
                  const inactiveUsers = (infoMsg.views || []).filter(u => !reactedUsers.includes(u) && !votedUsers.includes(u));
                  return inactiveUsers.length === 0 ? (
                    <span className="info-empty-hint">No inactive viewers.</span>
                  ) : null;
                })()}
              </div>
            </div>

          </div>
        </div>
      )}



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
                className={`btn-primary non-friend-action-btn ${isFriendRequestSent[selectedProfileUser.uuid] ? 'sent' : ''}`}
                onClick={() => handleAddFriendClick(selectedProfileUser.uuid)}
                disabled={isFriendRequestSent[selectedProfileUser.uuid]}
              >
                {isFriendRequestSent[selectedProfileUser.uuid] ? (
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
      {/* Message Options Modal Overlay */}
      {actionMenuMsg && (
        <div className="msg-action-modal-overlay" onClick={() => setActionMenuMsg(null)}>
          <div className="msg-action-modal glass-morphism animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="msg-action-header">
              <span className="msg-preview-title">Message Options</span>
              <button className="icon-btn-small" onClick={() => setActionMenuMsg(null)}><X size={16} /></button>
            </div>
            <div className="msg-preview-bubble">
              <p>{actionMenuMsg.text || '[Poll / Media]'}</p>
            </div>
            <div className="msg-action-list">
              {/* Option 1: Edit Message (Self only, not deleted, not poll) */}
              {actionMenuMsg.from === 'me' && !actionMenuMsg.deleted && actionMenuMsg.type !== 'poll' && actionMenuMsg.type !== 'live-location' && (
                <button className="msg-action-item" onClick={() => { setEditingMsg(actionMenuMsg); setEditInputValue(actionMenuMsg.text); setActionMenuMsg(null); }}>
                  <Edit3 size={15} />
                  <span>Edit Message</span>
                </button>
              )}
              {/* Option 2: Pin in Chat (Not location event, activeComm admins only) */}
              {actionMenuMsg.type !== 'live-location' && (isAdmin || canEditDetails) && (
                <button className="msg-action-item" onClick={() => { handlePinCommunityMsg(actionMenuMsg.id); setActionMenuMsg(null); }}>
                  <Pin size={15} />
                  <span>{(activeGroup?.pinnedMessages || []).includes(actionMenuMsg.id) ? 'Unpin from Chat' : 'Pin in Chat'}</span>
                </button>
              )}
              {/* Option 3: Delete for Everyone (Self or admin, not deleted) */}
              {(actionMenuMsg.from === 'me' || isAdmin || canEditDetails) && !actionMenuMsg.deleted && (
                <button className="msg-action-item danger" onClick={() => { handleDeleteForEveryone(actionMenuMsg.id); setActionMenuMsg(null); }}>
                  <Trash2 size={15} />
                  <span>Delete for Everyone</span>
                </button>
              )}
              {/* Option 4: Delete for Me */}
              <button className="msg-action-item danger" onClick={() => { handleDeleteForMe(actionMenuMsg.id); setActionMenuMsg(null); }}>
                <Trash2 size={15} />
                <span>Delete for Me</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Message Modal Overlay */}
      {editingMsg && (
        <div className="msg-action-modal-overlay" onClick={() => setEditingMsg(null)}>
          <div className="msg-action-modal glass-morphism animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="msg-action-header">
              <span className="msg-preview-title">Edit Message</span>
              <button className="icon-btn-small" onClick={() => setEditingMsg(null)}><X size={16} /></button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <input
                type="text"
                className="chat-input"
                value={editInputValue}
                onChange={e => setEditInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveEditCommunityMsg()}
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(0,0,0,0.03)',
                  border: '1px solid rgba(0,0,0,0.1)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  color: 'var(--text-main)',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="chat-empty-action-btn" style={{ padding: '6px 12px' }} onClick={() => setEditingMsg(null)}>Cancel</button>
              <button className="creation-submit-btn" style={{ padding: '6px 12px', margin: 0 }} onClick={handleSaveEditCommunityMsg}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitiesView;
