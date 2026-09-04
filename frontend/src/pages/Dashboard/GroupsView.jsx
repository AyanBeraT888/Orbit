import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus, X, Send, Crown, Shield, Users, MapPin,
  ChevronRight, BarChart2, Smile, Navigation, Settings, Check,
  Star, LogOut, Trash2, AlertTriangle, Link, UserPlus, QrCode, Edit3,
  User, ArrowLeft, Undo2,
  Award, Calendar, Sparkles, MoreVertical, Compass, Clock, ThumbsUp, Heart, Flame, Pin, PinOff, ChevronDown, ChevronUp
} from 'lucide-react';
import './GroupsView.css';
import ProfileView from './ProfileView';
import LottieToggle from '../../components/LottieToggle';

/* ─── Mock Data ─────────────────────────────────── */
const ALL_FRIENDS = [
  { id: 'u1', name: 'Alice Smith', avatar: 'A' },
  { id: 'u2', name: 'Bob Jones', avatar: 'B' },
  { id: 'u3', name: 'Charlie Day', avatar: 'C' },
  { id: 'u4', name: 'David Lee', avatar: 'D' },
  { id: 'u5', name: 'Eva Green', avatar: 'E' },
];

const ME = { id: 'me', name: 'You', avatar: 'Y' };

// Predefined Mock Communities list to link groups to
const MOCK_COMMUNITIES = [
  { id: 'c1', name: 'Tech Enthusiasts' },
  { id: 'c2', name: 'Orb Official Support' },
  { id: 'c3', name: 'Secret Designers Club' }
];

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MEET_TIMES = ['4pm onwards', '6pm onwards', '8pm onwards'];

const POLL_SHORTCUTS = [
  {
    id: 'trip', icon: 'trip', label: 'Plan a Trip', color: '#3B9E5C',
    build: () => ({
      question: 'Which day works for the trip?', options: WEEKDAYS,
      votes: Object.fromEntries(WEEKDAYS.map(d => [d, 0])), voted: null
    })
  },
  {
    id: 'meet', icon: 'meet', label: 'Time to Meet', color: '#6366f1',
    build: () => ({
      question: 'What time works to meet?', options: MEET_TIMES,
      votes: Object.fromEntries(MEET_TIMES.map(t => [t, 0])), voted: null
    })
  },
];

const REACTIONS = ['like', 'love', 'haha', 'wow', 'fire'];

const renderGroupIcon = (iconKey, size = 18) => {
  if (iconKey === 'users' || iconKey === 'group') return <Users size={size} />;
  if (iconKey === 'palette' || iconKey === 'design') return <Compass size={size} />;
  if (iconKey === 'rocket' || iconKey === 'support') return <Sparkles size={size} />;
  return <Users size={size} />;
};

const renderReactionIcon = (reactionKey, size = 12) => {
  if (reactionKey === 'like') return <ThumbsUp size={size} />;
  if (reactionKey === 'love') return <Heart size={size} style={{ fill: 'var(--danger)', color: 'var(--danger)' }} />;
  if (reactionKey === 'haha') return <Smile size={size} />;
  if (reactionKey === 'wow') return <AlertTriangle size={size} />;
  if (reactionKey === 'fire') return <Flame size={size} style={{ fill: 'var(--accent)', color: 'var(--accent)' }} />;
  return null;
};

/* ─── Helpers ───────────────────────────────────── */
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Multi-Option Poll ── */
const PollCard = ({ poll, onVote }) => {
  const total = Object.values(poll.votes).reduce((a, b) => a + b, 0);
  return (
    <div className="grp-poll-card">
      <div className="grp-poll-header"><BarChart2 size={13} /><span>Poll</span></div>
      <p className="grp-poll-q">{poll.question}</p>
      <div className="grp-poll-opts">
        {poll.options.map(opt => {
          const cnt = poll.votes[opt] || 0;
          const pct = total === 0 ? 0 : Math.round((cnt / total) * 100);
          const mine = poll.voted === opt;
          return (
            <button key={opt}
              className={`grp-poll-opt ${poll.voted ? 'voted' : ''} ${mine ? 'mine' : ''}`}
              onClick={() => !poll.voted && onVote(opt)} disabled={!!poll.voted}>
              <div className="grp-poll-fill" style={{ width: poll.voted ? `${pct}%` : '0%' }} />
              <span className="grp-poll-label">{mine && <Check size={11} />} {opt}</span>
              {poll.voted && <span className="grp-poll-pct">{pct}%</span>}
            </button>
          );
        })}
      </div>
      {poll.voted && <p className="grp-poll-total">{total} vote{total !== 1 ? 's' : ''}</p>}
    </div>
  );
};

/* ─── Message Bubble ────────────────────────────── */
const GrpBubble = ({ msg, onReact, onVote, onDelete, members, liveGroup, onMemberAvatarClick, onPin, isAdmin, isPinned, onLongPress, onTouchStart, onTouchEnd, onTouchMove }) => {
  const [hover, setHover] = useState(false);
  const isMe = msg.from === 'me';
  const sender = members.find(m => m.id === msg.from) || ME;
  return (
    <div className={`grp-msg-row ${isMe ? 'me' : 'them'} ${isPinned ? 'msg-is-pinned' : ''}`}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {!isMe && (
        <div
          className="grp-bubble-avatar avatar-clickable"
          title={sender.name}
          onClick={() => onMemberAvatarClick && onMemberAvatarClick(sender)}
          style={{ cursor: 'pointer' }}
        >
          {sender.avatar}
        </div>
      )}
      {hover && (
        <div className="grp-msg-actions">
          {isAdmin && onPin && (
            <button className={`grp-pin-btn ${isPinned ? 'pinned' : ''}`} onClick={() => onPin(msg.id)} title={isPinned ? 'Unpin message' : 'Pin message'}>
              {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
          )}
          {isMe && (msg.type === 'live-location' && liveGroup?.liveShare ? (
            <button className="grp-delete-btn disabled" disabled title="Stop location sharing to delete">
              <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />
            </button>
          ) : (
            <button className="grp-delete-btn" onClick={() => onDelete(msg.id)} title="Delete message">
              <Trash2 size={12} />
            </button>
          ))}
        </div>
      )}
      <div
        className={`grp-bubble ${isMe ? 'grp-bubble-me' : 'grp-bubble-them'}`}
        onContextMenu={(e) => { e.preventDefault(); onLongPress(msg); }}
        onTouchStart={(e) => onTouchStart(e, msg)}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onMouseDown={(e) => onTouchStart(e, msg)}
        onMouseUp={onTouchEnd}
        onMouseMove={onTouchMove}
        style={{ cursor: 'pointer' }}
      >
        {isPinned && <Pin size={11} style={{ position: 'absolute', top: 6, right: 6, opacity: 0.6, transform: 'rotate(45deg)' }} />}
        {!isMe && <span className="grp-sender-name">{sender.name}</span>}
        {msg.type === 'poll' ? (
          <PollCard poll={msg.poll} onVote={v => onVote(msg.id, v)} />
        ) : msg.type === 'live-location' ? (
          <div className="live-location-bubble-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
              <MapPin size={16} />
              <span>{msg.text}</span>
            </div>
            {liveGroup?.liveShare && msg.text.includes('Sharing') ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#10b981' }}>
                <span className="live-pulse" style={{ width: 6, height: 6 }} /> Active Live Location
              </div>
            ) : (
              <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Sharing ended</span>
            )}
          </div>
        ) : (
          <p style={{ paddingRight: isPinned ? 12 : 0 }}>{msg.text}</p>
        )}
        {!msg.deleted && hover && (
          <div className={`grp-reaction-picker ${isMe ? 'pick-left' : 'pick-right'}`}>
            {REACTIONS.map(e => (
              <button key={e} className="grp-reaction-opt" onClick={() => onReact(msg.id, e)}>{renderReactionIcon(e, 14)}</button>
            ))}
          </div>
        )}
        {!msg.deleted && Object.keys(msg.reactions).length > 0 && (
          <div className="grp-msg-reactions">
            {Object.entries(msg.reactions).map(([e, c]) => (
              <span key={e} className="grp-reaction-badge" onClick={() => onReact(msg.id, e)}>{renderReactionIcon(e, 10)} {c}</span>
            ))}
          </div>
        )}
        <span className="grp-msg-time">{msg.time}{msg.edited && ' · edited'}</span>
      </div>
    </div>
  );
};

/* ─── Create Group Modal ────────────────────────── */
const CreateGroupModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('group');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCreate = () => {
    if (!name.trim() || selected.length < 1) return;
    const members = ALL_FRIENDS.filter(f => selected.includes(f.id));
    onCreate({ name: name.trim(), icon: icon.trim(), description: description.trim(), members });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-group-modal glass-morphism" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Group</h3>
          <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="group-form-row">
          <label className="grp-modal-label">Group Name</label>
          <input className="grp-name-input" placeholder="Group name…"
            value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="group-form-row">
          <label className="grp-modal-label">Group Icon Key</label>
          <div className="icon-input-row">
            <span className="icon-preview">{renderGroupIcon(icon)}</span>
            <input className="grp-name-input icon-input" placeholder="e.g. general, design, support..."
              value={icon} onChange={e => setIcon(e.target.value)} />
          </div>
        </div>

        <div className="group-form-row">
          <label className="grp-modal-label">Group Description</label>
          <textarea
            className="grp-desc-input"
            placeholder="What is this group for?..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        <p className="grp-modal-label">Add friends</p>
        <div className="grp-friend-picker">
          {ALL_FRIENDS.map(f => (
            <button key={f.id}
              className={`grp-friend-chip ${selected.includes(f.id) ? 'selected' : ''}`}
              onClick={() => toggle(f.id)}>
              <span className="chip-avatar">{f.avatar}</span>
              <span>{f.name.split(' ')[0]}</span>
              {selected.includes(f.id) && <Check size={13} />}
            </button>
          ))}
        </div>
        <button className="grp-create-btn" onClick={handleCreate}
          disabled={!name.trim() || selected.length < 1}>
          Create Group <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

/* ─── Main Unified Info & Actions Modal ─── */
const GroupOverviewModal = ({
  group,
  onClose,
  onUpdateGroup,
  onAddMember,
  onRemoveMember,
  onExitGroup,
  onDeleteGroup,
  onPromote,
  onDemote,
  canEdit,
  isCreator,
  onOpenMessage
}) => {
  const [desc, setDesc] = useState(group.description || '');
  const [name, setName] = useState(group.name || '');
  const [icon, setIcon] = useState(group.icon || '👥');
  const [showQR, setShowQR] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showLinkHub, setShowLinkHub] = useState(false);
  const [showModalDropdown, setShowModalDropdown] = useState(false);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editingTagUserId, setEditingTagUserId] = useState(null);
  const [editTagText, setEditTagText] = useState('');

  const [isSavedInfo, setIsSavedInfo] = useState(false);
  const [isSavedDesc, setIsSavedDesc] = useState(false);

  const saveInfoDetails = () => {
    onUpdateGroup({
      name: name.trim()
    });
    setIsSavedInfo(true);
    setIsEditingInfo(false);
    setTimeout(() => setIsSavedInfo(false), 2000);
  };

  const saveDescDetails = () => {
    onUpdateGroup({
      description: desc.trim()
    });
    setIsSavedDesc(true);
    setIsEditingDesc(false);
    setTimeout(() => setIsSavedDesc(false), 2000);
  };

  const handleToggleFavourite = () => {
    onUpdateGroup({ isFavourite: !group.isFavourite });
  };

  const handleLinkCommunity = (commId) => {
    onUpdateGroup({ communityId: commId || null });
  };

  const handleReport = () => {
    alert(`Report submitted: Group "${group.name}" has been flagged for review.`);
  };

  const startEditTag = (userId, currentTag) => {
    if (!canEdit) return;
    setEditingTagUserId(userId);
    setEditTagText(currentTag || '');
  };

  const saveMemberTag = (userId) => {
    const nextTags = { ...(group.memberTags || {}) };
    if (editTagText.trim()) {
      nextTags[userId] = editTagText.trim();
    } else {
      delete nextTags[userId];
    }
    onUpdateGroup({ memberTags: nextTags });
    setEditingTagUserId(null);
  };

  // Find friends who are NOT in the group yet
  const groupUserIds = [ME.id, ...group.members.map(m => m.id)];
  const nonGroupFriends = ALL_FRIENDS.filter(f => !groupUserIds.includes(f.id));


  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="grp-overview-modal glass-morphism animate-fade-in" onClick={e => e.stopPropagation()}>

        {/* Modal Header with relative positioning for the dropdown */}
        <div className="modal-header" style={{ position: 'relative' }}>
          <h3>Group Details</h3>
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
                      <span>Edit Group Name</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setIsEditingDesc(true); setShowModalDropdown(false); }}>
                      <Edit3 size={14} />
                      <span>Edit Description</span>
                    </button>
                    <button className={`dropdown-item ${group.isFavourite ? 'fav-active' : ''}`} onClick={() => { handleToggleFavourite(); setShowModalDropdown(false); }}>
                      <Star size={14} fill={group.isFavourite ? 'var(--primary)' : 'none'} />
                      <span>{group.isFavourite ? 'Unfavorite Group' : 'Favorite Group'}</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowQR(true); setShowAddMembers(false); setShowLinkHub(false); setShowModalDropdown(false); }}>
                      <QrCode size={14} />
                      <span>Invite QR Code</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowAddMembers(true); setShowQR(false); setShowLinkHub(false); setShowModalDropdown(false); }}>
                      <UserPlus size={14} />
                      <span>Add Member</span>
                    </button>
                    <button className="dropdown-item" onClick={() => { setShowLinkHub(true); setShowQR(false); setShowAddMembers(false); setShowModalDropdown(false); }}>
                      <Link size={14} />
                      <span>Link Community Hub</span>
                    </button>
                    <button className="dropdown-item warning" onClick={() => { handleReport(); setShowModalDropdown(false); }}>
                      <AlertTriangle size={14} />
                      <span>Report Group</span>
                    </button>
                    <div className="dropdown-divider"></div>
                    <button className="dropdown-item danger" onClick={() => { onExitGroup(); setShowModalDropdown(false); }}>
                      <LogOut size={14} />
                      <span>Exit Group</span>
                    </button>
                    {isCreator && (
                      <button className="dropdown-item danger delete" onClick={() => { onDeleteGroup(); setShowModalDropdown(false); }}>
                        <Trash2 size={14} />
                        <span>Delete Group</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Muted Section Label */}
        <span className="overview-section-label">General Info</span>

        {/* Redesigned Header Section: All inside one Card */}
        <div className="grp-overview-header-card glass-morphism">
          <div className="grp-overview-header-top">
            {/* Group avatar: large, rounded square with icon */}
            <div className="grp-overview-avatar-wrapper">
              <span className="icon-preview-large rounded-sq">{icon}</span>
            </div>

            <div className="grp-overview-title-wrapper">
              <div className="grp-overview-name-row">
                {canEdit && isEditingInfo ? (
                  <div className="grp-name-editor-container">
                    <input
                      className="grp-name-input title-editor"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Group Name"
                    />
                    <Edit3 size={14} className="inline-edit-pencil" />
                  </div>
                ) : (
                  <h3 className="static-title">{name}</h3>
                )}
              </div>
              {/* Member count pill badge */}
              <div className="grp-overview-meta-row">
                <span className="member-count-pill">
                  <Users size={11} style={{ marginRight: 4 }} />
                  {group.members.length + 1} members
                </span>
              </div>
            </div>
          </div>

          {canEdit && isEditingInfo && (
            <div className="grp-overview-save-row" style={{ marginTop: '8px' }}>
              {isSavedInfo && <span className="grp-saved-toast">Name Saved!</span>}
              <button className="btn-primary-small grp-save-changes-btn" onClick={saveInfoDetails}>
                Save Name
              </button>
            </div>
          )}

          {/* Group description in a clean textarea */}
          <div className="grp-overview-description-block" style={{ marginTop: '12px', borderTop: '1px solid rgba(var(--primary-rgb), 0.08)', paddingTop: '12px' }}>
            <span className="field-label-small">Group Description</span>
            {canEdit && isEditingDesc ? (
              <textarea
                className="grp-desc-input-redesigned"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Give a description for this group..."
              />
            ) : (
              <p className="static-description-box-redesigned">{desc || 'No group description set.'}</p>
            )}

            {canEdit && isEditingDesc && (
              <div className="grp-overview-save-row" style={{ marginTop: '8px' }}>
                {isSavedDesc && <span className="grp-saved-toast">Description Saved!</span>}
                <button className="btn-primary-small grp-save-changes-btn" onClick={saveDescDetails}>
                  Save Description
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drawers inside modal if opened */}
        {showQR && (
          <div className="overview-qr-drawer animate-slide-up">
            <div className="qr-header">
              <span>Scan QR Code to Join Group</span>
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
              <span className="qr-link-text">orb.chat/invite/g_{group.id}</span>
            </div>
          </div>
        )}

        {showAddMembers && (
          <div className="overview-members-drawer animate-slide-up">
            <div className="qr-header">
              <span>Add Friends to Group</span>
              <button className="icon-btn-small" onClick={() => setShowAddMembers(false)}><X size={14} /></button>
            </div>
            <div className="friend-selector-mini-list">
              {nonGroupFriends.map(f => (
                <div key={f.id} className="friend-mini-row">
                  <div className="friend-mini-avatar">{f.avatar}</div>
                  <span className="friend-mini-name">{f.name}</span>
                  <button className="friend-add-btn" onClick={() => onAddMember(f)}>
                    Add
                  </button>
                </div>
              ))}
              {nonGroupFriends.length === 0 && (
                <p className="no-friends-hint">All your friends are already in this group.</p>
              )}
            </div>
          </div>
        )}

        {showLinkHub && (
          <div className="overview-link-hub-drawer animate-slide-up">
            <div className="qr-header">
              <span>Link Community Hub</span>
              <button className="icon-btn-small" onClick={() => setShowLinkHub(false)}><X size={14} /></button>
            </div>
            <div className="linked-community-card-redesigned glass-morphism" style={{ border: 'none', background: 'transparent', padding: '10px 0', boxShadow: 'none' }}>
              <div className="linked-community-hdr" style={{ marginBottom: '8px' }}>
                <Link size={14} className="linked-community-icon" />
                <span className="linked-community-label">Select community hub to link</span>
              </div>
              <select
                value={group.communityId || ''}
                onChange={(e) => handleLinkCommunity(e.target.value)}
                className="comm-select-dropdown"
              >
                <option value="">Standalone Group (No Community)</option>
                {MOCK_COMMUNITIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Exit button at bottom only for regular members */}
        {!canEdit && (
          <div className="overview-danger-actions-vertical" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>
            <button className="danger-action-btn-full exit" onClick={onExitGroup}>
              <LogOut size={16} />
              <span>Exit Group</span>
            </button>
          </div>
        )}

        {/* Admin Settings: Admin-Only Messaging */}
        {canEdit && (
          <div className="admin-toggle-section">
            <span className="overview-section-label">Group Settings</span>
            <div className="admin-toggle-row glass-morphism">
              <div className="admin-toggle-info">
                <Shield size={15} className="admin-toggle-icon" />
                <div>
                  <span className="admin-toggle-title">Admin-only messaging</span>
                  <span className="admin-toggle-desc">Only admins can send messages</span>
                </div>
              </div>
              <LottieToggle
                checked={group.adminOnlyMessaging}
                onChange={() => onUpdateGroup({ adminOnlyMessaging: !group.adminOnlyMessaging })}
                size="sm"
              />
            </div>
          </div>
        )}

        {/* Members Section */}
        <div className="modal-members-section-redesigned">
          <span className="overview-section-label">Group members &amp; roles</span>
          <div className="overview-members-list-redesigned">
            {[ME, ...group.members].map(m => {
              const isAdmin = m.id === 'me';
              const isCoAdmin = group.coadmins?.includes(m.id);
              const roleClass = isAdmin ? 'admin' : isCoAdmin ? 'coadmin' : 'member';
              const displayRole = isAdmin ? 'Admin' : isCoAdmin ? 'Co-admin' : 'Member';
              const customTag = group.memberTags?.[m.id];
              const displayTag = customTag || displayRole;

              return (
                <div key={m.id} className="overview-member-card-redesigned glass-morphism">
                  <div className={`overview-member-avatar-circle-redesigned ${roleClass}`} onClick={(e) => { if (onOpenMessage) { e.stopPropagation(); onOpenMessage(m); onClose(); } }} style={{ cursor: 'pointer' }}>
                    {m.avatar}
                  </div>

                  <div className="overview-member-details-col-redesigned">
                    <div className="overview-member-name-row-redesigned">
                      <span className="overview-member-name-text">{m.name}</span>
                      {editingTagUserId === m.id ? (
                        <div className="tag-inline-editor">
                          <input className="tag-editor-input" value={editTagText} onChange={e => setEditTagText(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveMemberTag(m.id)} autoFocus />
                          <button className="tag-save-btn" onClick={() => saveMemberTag(m.id)}><Check size={10} /></button>
                        </div>
                      ) : (
                        <span className={`member-role-badge-pill ${roleClass} ${customTag ? 'has-custom-tag' : ''}`} onClick={() => startEditTag(m.id, displayTag)} title={canEdit ? "Click to edit role tag" : "Role tag"} style={{ cursor: canEdit ? 'pointer' : 'default' }}>
                          {isAdmin ? <Crown size={9} style={{ marginRight: 2 }} /> : isCoAdmin ? <Shield size={9} style={{ marginRight: 2 }} /> : null}
                          {displayTag}
                          {canEdit && <Edit3 size={8} className="edit-tag-indicator" />}
                        </span>
                      )}
                    </div>
                  </div>

                  {m.id !== 'me' && (
                    <div className="overview-member-actions-row-redesigned">
                      {!isCoAdmin && isCreator && (
                        <button className="member-row-action promote" onClick={() => onPromote(m.id)} title="Promote to Co-admin"><Shield size={11} /></button>
                      )}
                      {isCoAdmin && isCreator && (
                        <button className="member-row-action demote" onClick={() => onDemote(m.id)} title="Demote Co-admin"><Shield size={11} style={{ fill: 'currentColor' }} /></button>
                      )}
                      {canEdit && (
                        <button className="member-row-action remove" onClick={() => onRemoveMember(m.id)} title="Remove Member"><X size={11} /></button>
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

/* ─── Main GroupsView ───────────────────────────── */
const GroupsView = ({ onOpenMessage, onClose, isSharingLocation, setIsSharingLocation, groupId, embedded = false, additionalGroups = [] }) => {
  const [groups, setGroups] = useState([
    {
      id: 'g1', name: 'Weekend Crew', coadmins: ['u2'], icon: 'group',
      description: 'Planning weekend meetups, road trips, and pizzas.',
      members: [ALL_FRIENDS[0], ALL_FRIENDS[1], ALL_FRIENDS[2]],
      messages: [
        { id: 1, from: 'u1', text: 'Hey everyone!', time: '10:00 AM', reactions: {} },
        { id: 2, from: 'me', text: 'What\'s the plan this weekend?', time: '10:01 AM', reactions: { love: 2 } },
      ],
      liveShare: false, isFavourite: false, communityId: null, memberTags: {},
      pinnedMessages: [], adminOnlyMessaging: false
    },
    {
      id: 'g2', name: 'Design Lab', coadmins: [], icon: 'design',
      description: 'Discussing neumorphic design systems and UI animations.',
      members: [ALL_FRIENDS[2], ALL_FRIENDS[3]],
      messages: [],
      liveShare: false, isFavourite: false, communityId: null, memberTags: {},
      pinnedMessages: [], adminOnlyMessaging: false
    },
    {
      id: 'g3', name: 'Orb Support', coadmins: ['u4'], icon: 'support',
      description: 'Official group for Orb questions and answers.',
      members: [ALL_FRIENDS[0], ALL_FRIENDS[4]],
      messages: [],
      liveShare: false, isFavourite: false, communityId: null, memberTags: {},
      pinnedMessages: [], adminOnlyMessaging: false
    }
  ]);

  /* ── Merge externally-created groups (from MessagesView kebab) ── */
  useEffect(() => {
    if (additionalGroups && additionalGroups.length > 0) {
      setGroups(prev => {
        const existingIds = new Set(prev.map(g => g.id));
        const newOnes = additionalGroups.filter(g => !existingIds.has(g.id));
        return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
      });
    }
  }, [additionalGroups]);

  const [activeGroup, setActiveGroup] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [inputText, setInputText] = useState('');
  const [actionMenuMsg, setActionMenuMsg] = useState(null);
  const [editingMsg, setEditingMsg] = useState(null);
  const [editInputValue, setEditInputValue] = useState('');
  const longPressTimeout = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const [showEmoji, setShowEmoji] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (embedded && groupId) {
      const match = groups.find(g => g.id === groupId);
      if (match) {
        setActiveGroup(match);
      }
    }
  }, [groupId, embedded, groups]);

  // Overlay / Popups States for profile card pops
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [selectedUserIsFriend, setSelectedUserIsFriend] = useState(false);
  const [isFriendRequestSent, setIsFriendRequestSent] = useState({});
  const [toastMessage, setToastMessage] = useState('');

  const handleAvatarClick = (member) => {
    if (!member) return;

    const isMe = member.id === 'me' || member.uuid === 'self';
    const isFriend = isMe || ALL_FRIENDS.some(f => f.id === member.id || f.name === member.name);

    let fullProfile;
    if (isMe) {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      fullProfile = {
        uuid: 'self',
        name: userData.name || 'You',
        username: userData.username || 'me',
        joinDate: userData.createdAt || '2026-01-01T00:00:00.000Z',
        stampsCount: 0,
        friendsCount: ALL_FRIENDS.length,
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

    // Dynamically seed custom Bio / Chapters count in localStorage for the full ProfileView component!
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



  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [activeGroup, groups]);


  /* ── Actions ── */
  const createGroup = ({ name, icon, description, members }) => {
    const g = {
      id: `g${Date.now()}`,
      name,
      icon,
      description,
      members,
      coadmins: [],
      messages: [],
      liveShare: false,
      isFavourite: false,
      communityId: null,
      memberTags: {}
    };
    setGroups(p => [...p, g]);
    setActiveGroup(g);

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: `👥 Created group: "${name}".`,
        actionType: 'create_group',
        payload: { groupId: g.id }
      }
    }));
  };

  const updateGroup = (id, patch) => {
    setGroups(p => p.map(g => g.id === id ? { ...g, ...patch } : g));
    if (activeGroup?.id === id) setActiveGroup(p => ({ ...p, ...patch }));

    if (patch.isFavourite !== undefined) {
      const gName = liveGroup ? liveGroup.name : activeGroup?.name || 'Group';
      window.dispatchEvent(new CustomEvent('orb_user_action', {
        detail: {
          text: patch.isFavourite ? ` Favorited group: "${gName}".` : ` Unfavorited group: "${gName}".`,
          actionType: 'favourite_group',
          payload: { groupId: id, isFavourite: patch.isFavourite }
        }
      }));
    }
  };

  const sendMsg = () => {
    if (!inputText.trim() || !activeGroup) return;
    const msg = { id: Date.now(), from: 'me', text: inputText.trim(), time: now(), reactions: {} };
    updateGroup(activeGroup.id, { messages: [...activeGroup.messages, msg] });
    setInputText(''); setShowEmoji(false);
  };

  const sendPoll = (pollData) => {
    if (!activeGroup) return;
    const msg = { id: Date.now(), from: 'me', type: 'poll', poll: pollData, time: now(), reactions: {} };
    updateGroup(activeGroup.id, { messages: [...activeGroup.messages, msg] });
    setShowPoll(false);
  };

  const handleReact = (msgId, emoji) => {
    const msgs = activeGroup.messages.map(m => {
      if (m.id !== msgId) return m;
      return { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] || 0) + 1 } };
    });
    updateGroup(activeGroup.id, { messages: msgs });
  };

  const handleVote = (msgId, opt) => {
    const msgs = activeGroup.messages.map(m => {
      if (m.id !== msgId || m.type !== 'poll') return m;
      return { ...m, poll: { ...m.poll, voted: opt, votes: { ...m.poll.votes, [opt]: (m.poll.votes[opt] || 0) + 1 } } };
    });
    updateGroup(activeGroup.id, { messages: msgs });
  };

  const toggleLiveShare = () => {
    if (!liveGroup) return;
    const next = !liveGroup.liveShare;

    let updatedMsgs = [...(liveGroup.messages || [])];
    if (next) {
      const liveMsg = {
        id: 'live-location-msg-' + liveGroup.id,
        from: 'me',
        type: 'live-location',
        text: ' Sharing live location...',
        time: now(),
        reactions: {}
      };
      updatedMsgs.push(liveMsg);
    } else {
      updatedMsgs = updatedMsgs.map(m => {
        if (m.id === 'live-location-msg-' + liveGroup.id) {
          return { ...m, text: ' Live location ended' };
        }
        return m;
      });
    }

    updateGroup(liveGroup.id, { liveShare: next, messages: updatedMsgs });

    // Sync parent state
    const anySharing = next || groups.some(g => g.id !== liveGroup.id && g.liveShare);
    setIsSharingLocation(anySharing);

    window.dispatchEvent(new CustomEvent('live_share_notification', {
      detail: { type: 'group', name: liveGroup.name, active: next }
    }));

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: next ? ` Shared location in group: "${liveGroup.name}".` : ` Stopped sharing location in group: "${liveGroup.name}".`,
        actionType: 'group_live_share',
        payload: { groupId: liveGroup.id, active: next }
      }
    }));
  };

  const handleDeleteGroupMsg = (msgId) => {
    if (!liveGroup) return;
    const msgs = liveGroup.messages.filter(m => m.id !== msgId);
    const pinned = (liveGroup.pinnedMessages || []).filter(id => id !== msgId);
    updateGroup(liveGroup.id, { messages: msgs, pinnedMessages: pinned });
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

  const handleDeleteGroupMsgForEveryone = (msgId) => {
    if (!liveGroup) return;
    const msgs = liveGroup.messages.map(m => m.id === msgId ? { ...m, text: 'This message was deleted', deleted: true } : m);
    updateGroup(liveGroup.id, { messages: msgs });
  };

  const handleDeleteGroupMsgForMe = (msgId) => {
    if (!liveGroup) return;
    const msgs = liveGroup.messages.map(m => m.id === msgId ? { ...m, deletedForMe: true } : m);
    updateGroup(liveGroup.id, { messages: msgs });
  };

  const handleSaveEditGroupMsg = () => {
    if (!liveGroup || !editingMsg) return;
    if (!editInputValue.trim()) return;
    const msgs = liveGroup.messages.map(m => m.id === editingMsg.id ? { ...m, text: editInputValue.trim(), edited: true } : m);
    updateGroup(liveGroup.id, { messages: msgs });
    setEditingMsg(null);
    setEditInputValue('');
  };

  const handlePinMsg = (msgId) => {
    if (!liveGroup) return;
    const pinned = liveGroup.pinnedMessages || [];
    const next = pinned.includes(msgId) ? pinned.filter(id => id !== msgId) : [...pinned, msgId];
    updateGroup(liveGroup.id, { pinnedMessages: next });
  };

  const promoteCoAdmin = (id) => {
    if (!liveGroup) return;
    updateGroup(liveGroup.id, { coadmins: [...(liveGroup.coadmins || []), id] });
  };

  const demoteCoAdmin = (id) => {
    if (!liveGroup) return;
    updateGroup(liveGroup.id, { coadmins: (liveGroup.coadmins || []).filter(x => x !== id) });
  };

  const removeMember = (userId) => {
    if (!liveGroup) return;
    const nextMembers = liveGroup.members.filter(m => m.id !== userId);
    updateGroup(liveGroup.id, { members: nextMembers });
  };

  const addMember = (friend) => {
    if (!liveGroup) return;
    const nextMembers = [...liveGroup.members, friend];
    updateGroup(liveGroup.id, { members: nextMembers });
  };

  const exitGroup = () => {
    setGroups(p => p.filter(g => g.id !== activeGroup.id));
    setActiveGroup(null);
    setShowOverview(false);

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: ` Exited group: "${activeGroup.name}".`,
        actionType: 'exit_group',
        payload: { group: activeGroup }
      }
    }));
  };

  const deleteGroup = () => {
    setGroups(p => p.filter(g => g.id !== activeGroup.id));
    setActiveGroup(null);
    setShowOverview(false);

    window.dispatchEvent(new CustomEvent('orb_user_action', {
      detail: {
        text: ` Deleted group: "${activeGroup.name}".`,
        actionType: 'delete_group',
        payload: { group: activeGroup }
      }
    }));
  };

  useEffect(() => {
    const handleUndo = (e) => {
      const { actionType, payload } = e.detail;
      if (actionType === 'create_group') {
        const { groupId } = payload;
        setGroups(prev => prev.filter(g => g.id !== groupId));
        setActiveGroup(null);
      } else if (actionType === 'exit_group' || actionType === 'delete_group') {
        const { group } = payload;
        setGroups(prev => [...prev, group]);
        setActiveGroup(group);
      } else if (actionType === 'favourite_group') {
        const { groupId, isFavourite } = payload;
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, isFavourite: !isFavourite } : g));
      } else if (actionType === 'group_live_share') {
        const { groupId, active } = payload;
        const target = groups.find(g => g.id === groupId);
        if (target) {
          let updatedMsgs = [...(target.messages || [])];
          if (!active) {
            const liveMsg = {
              id: 'live-location-msg-' + groupId,
              from: 'me',
              type: 'live-location',
              text: ' Sharing live location...',
              time: now(),
              reactions: {}
            };
            updatedMsgs.push(liveMsg);
          } else {
            updatedMsgs = updatedMsgs.map(m => {
              if (m.id === 'live-location-msg-' + groupId) {
                return { ...m, text: ' Live location ended' };
              }
              return m;
            });
          }
          setGroups(prev => prev.map(g => g.id === groupId ? { ...g, liveShare: !active, messages: updatedMsgs } : g));
          if (activeGroup?.id === groupId) setActiveGroup(prev => ({ ...prev, liveShare: !active, messages: updatedMsgs }));
        }
      }
    };

    window.addEventListener('orb_undo_action', handleUndo);
    return () => window.removeEventListener('orb_undo_action', handleUndo);
  }, [groups, activeGroup]);

  useEffect(() => {
    const handleExternalGroupLiveShare = (e) => {
      const { groupId, active } = e.detail;
      const target = groups.find(g => g.id === groupId);
      if (target) {
        let updatedMsgs = [...(target.messages || [])];
        if (active) {
          if (!updatedMsgs.some(m => m.id === 'live-location-msg-' + groupId)) {
            const liveMsg = {
              id: 'live-location-msg-' + groupId,
              from: 'me',
              type: 'live-location',
              text: ' Sharing live location...',
              time: now(),
              reactions: {}
            };
            updatedMsgs.push(liveMsg);
          }
        } else {
          updatedMsgs = updatedMsgs.map(m => {
            if (m.id === 'live-location-msg-' + groupId) {
              return { ...m, text: ' Live location ended' };
            }
            return m;
          });
        }

        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, liveShare: active, messages: updatedMsgs } : g));
        if (activeGroup?.id === groupId) setActiveGroup(prev => ({ ...prev, liveShare: active, messages: updatedMsgs }));
      }
    };

    window.addEventListener('orb_group_live_share_trigger', handleExternalGroupLiveShare);
    return () => window.removeEventListener('orb_group_live_share_trigger', handleExternalGroupLiveShare);
  }, [groups, activeGroup]);

  /* ── Active group synced ── */
  const liveGroup = groups.find(g => g.id === activeGroup?.id) || null;
  const isCreator = true; // in mock model, 'me' created it
  const isCoAdmin = liveGroup?.coadmins?.includes('me');
  const canEditDetails = isCreator || isCoAdmin;

  return (
    <div className={`groups-layout animate-fade-in ${liveGroup ? 'has-active-chat' : 'no-active-chat'} ${embedded ? 'embedded-mode' : ''}`}>

      {/* ── Group Sidebar ── */}
      {!embedded && (
        <div className="groups-sidebar glass-morphism">
          <div className="groups-sidebar-header">
            <div className="groups-sidebar-title-row" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {onClose && (
                <button className="grp-close-btn" onClick={onClose} title="Back to Map">
                  <Undo2 size={20} />
                </button>
              )}
              <h3>Groups</h3>
            </div>
            <button className="grp-new-btn" onClick={() => setShowCreate(true)} title="New Group">
              <Plus size={18} />
            </button>
          </div>

          <div className="groups-list">
            {/* Favorited Groups first, then others */}
            {[...groups].sort((a, b) => (b.isFavourite ? 1 : 0) - (a.isFavourite ? 1 : 0)).map(g => (
              <button key={g.id}
                className={`group-item ${liveGroup?.id === g.id ? 'active' : ''}`}
                onClick={() => setActiveGroup(g)}>
                <div className="group-item-icon">
                  {renderGroupIcon(g.icon, 18)}
                  {g.liveShare && <span className="live-dot" title="Live location active" />}
                </div>
                <div className="group-item-info">
                  <div className="grp-name-row" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="group-item-name">{g.name}</span>
                    {g.isFavourite && <Star size={12} fill="var(--primary)" style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                    {g.communityId && (
                      <span className="subgroup-link-badge" title="Sub-group in community">
                        <Link size={9} />
                      </span>
                    )}
                  </div>
                  {g.description && <span className="group-item-desc">{g.description}</span>}
                  <span className="group-item-meta">{g.members.length + 1} member{g.members.length !== 0 ? 's' : ''}</span>
                </div>
              </button>
            ))}
            {groups.length === 0 && (
              <div className="groups-empty-hint">
                <Users size={28} style={{ opacity: 0.3 }} />
                <p>No groups yet. Create one!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Chat Panel ── */}
      {liveGroup ? (
        <div className="grp-chat-panel">
          {/* Header */}
          <div className="grp-chat-header glass-morphism">
            <div className="grp-chat-header-info clickable-header" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="grp-chat-back-btn" onClick={() => embedded ? onClose() : setActiveGroup(null)} title="Back to Groups">
                <Undo2 size={20} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setShowOverview(true)} title="Click to view Group Info & Actions">
                <div className="grp-avatar-icon">{renderGroupIcon(liveGroup.icon, 18)}</div>
                <div>
                  <div className="grp-title-badge-row" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <h4>{liveGroup.name}</h4>
                    {liveGroup.isFavourite && <Star size={13} fill="var(--primary)" style={{ color: 'var(--primary)' }} />}
                    {liveGroup.adminOnlyMessaging && <span className="admin-only-badge"><Shield size={10} /> Admin only</span>}
                  </div>
                  <span className="grp-member-count">{liveGroup.members.length + 1} members · Click for details & settings</span>
                </div>
              </div>
            </div>
            <div className="grp-chat-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {canEditDetails && (
                <button
                  className={`admin-only-toggle-header-btn ${liveGroup.adminOnlyMessaging ? 'on' : 'off'}`}
                  onClick={() => updateGroup(liveGroup.id, { adminOnlyMessaging: !liveGroup.adminOnlyMessaging })}
                  title={liveGroup.adminOnlyMessaging ? 'Disable Admin-only messaging' : 'Enable Admin-only messaging'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: liveGroup.adminOnlyMessaging ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    border: 'none',
                    color: liveGroup.adminOnlyMessaging ? '#ef4444' : '#6366f1',
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
              <button className={`live-share-btn ${liveGroup.liveShare ? 'live-active' : ''}`} onClick={toggleLiveShare} title={liveGroup.liveShare ? 'Stop Live Location' : 'Share Live Location'}>
                <Navigation size={16} />
                <span>{liveGroup.liveShare ? 'Live' : 'Share Location'}</span>
                {liveGroup.liveShare && <span className="live-pulse" />}
              </button>
            </div>
          </div>

          {/* Pinned Messages Banner */}
          {(liveGroup.pinnedMessages || []).length > 0 && (
            <div className="pinned-banner">
              <div className="pinned-banner-top" onClick={() => setPinnedExpanded(p => !p)}>
                <Pin size={13} className="pinned-banner-icon" />
                <span className="pinned-banner-text">
                  {(liveGroup.pinnedMessages || []).length === 1
                    ? (() => { const msg = liveGroup.messages.find(m => m.id === liveGroup.pinnedMessages[0]); return msg ? (msg.text || '[media]').slice(0, 60) : 'Pinned message'; })()
                    : `${(liveGroup.pinnedMessages || []).length} pinned messages`
                  }
                </span>
                {(liveGroup.pinnedMessages || []).length > 1 && (pinnedExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
              </div>
              {pinnedExpanded && (
                <div className="pinned-list-drawer">
                  {(liveGroup.pinnedMessages || []).map(msgId => {
                    const msg = liveGroup.messages.find(m => m.id === msgId);
                    if (!msg) return null;
                    return (
                      <div key={msgId} className="pinned-msg-row">
                        <Pin size={11} className="pinned-row-icon" />
                        <span className="pinned-row-text">{(msg.text || '[media]').slice(0, 70)}</span>
                        {canEditDetails && (
                          <button className="unpin-btn" onClick={() => handlePinMsg(msgId)} title="Unpin"><PinOff size={11} /></button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Group description banner */}
          {liveGroup.description && (
            <div className="grp-description-banner"><p>{liveGroup.description}</p></div>
          )}

          {/* Members strip */}
          <div className="grp-members-strip">
            {[ME, ...liveGroup.members].map(m => {
              const role = m.id === 'me' ? 'admin' : liveGroup.coadmins?.includes(m.id) ? 'coadmin' : 'member';
              const customTag = liveGroup.memberTags?.[m.id];
              return (
                <div
                  key={m.id}
                  className="strip-member avatar-clickable"
                  title={`${m.name} (${customTag || role})`}
                  onClick={() => handleAvatarClick(m)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className={`strip-avatar ${role}`}>{m.avatar}</div>
                  {role === 'admin' && <Crown size={9} className="strip-crown" />}
                  {role === 'coadmin' && <Shield size={9} className="strip-shield" />}
                </div>
              );
            })}
          </div>

          {/* Messages */}
          <div className="grp-chat-messages">
            {(liveGroup.messages || []).filter(m => !m.deletedForMe).map(msg => (
              <GrpBubble key={msg.id} msg={msg}
                members={liveGroup.members}
                onReact={handleReact} onVote={handleVote}
                onDelete={handleDeleteGroupMsg}
                liveGroup={liveGroup}
                onMemberAvatarClick={handleAvatarClick}
                onPin={canEditDetails ? handlePinMsg : null}
                isAdmin={canEditDetails}
                isPinned={(liveGroup.pinnedMessages || []).includes(msg.id)}
                onLongPress={setActionMenuMsg}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchMove={handleTouchMove}
              />
            ))}
            {liveGroup.liveShare && (
              <div className="live-location-banner">
                <MapPin size={14} /> You are sharing your live location with this group
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Poll shortcuts tray */}
          {showPoll && (
            <div className="grp-poll-tray glass-morphism">
              <div className="grp-poll-tray-header">
                <span>Quick Polls</span>
                <button className="icon-btn-small" onClick={() => setShowPoll(false)}><X size={15} /></button>
              </div>
              <div className="grp-shortcut-row">
                {POLL_SHORTCUTS.map(s => (
                  <button key={s.id} className="grp-shortcut-card"
                    style={{ '--sc': s.color }} onClick={() => sendPoll(s.build())}>
                    <span className="grp-sc-emoji">{s.icon}</span>
                    <span className="grp-sc-label">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input — disabled for non-admins when adminOnlyMessaging is on */}
          {liveGroup.adminOnlyMessaging && !canEditDetails ? (
            <div className="admin-only-note">
              <Shield size={14} />
              <span>Only admins can send messages in this group</span>
            </div>
          ) : (
            <div className="grp-input-bar glass-morphism">
              <button className={`icon-btn-small ${showPoll ? 'active-icon' : ''}`} onClick={() => { setShowPoll(!showPoll); }}>
                <BarChart2 size={20} />
              </button>
              <input className="grp-chat-input" placeholder="Message group…"
                value={inputText} onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMsg()} />
              <button className={`send-btn ${inputText.trim() ? 'ready' : ''}`} onClick={sendMsg} disabled={!inputText.trim()}>
                <Send size={18} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="chat-empty">
          <div className="chat-empty-inner">
            <div className="chat-empty-icon">👥</div>
            <h3>Your Groups</h3>
            <p>Select a group or create a new one to get started.</p>
            <button className="grp-create-btn" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> New Group
            </button>
          </div>
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreate={createGroup} />}

      {showOverview && liveGroup && (
        <GroupOverviewModal
          group={liveGroup}
          onClose={() => setShowOverview(false)}
          onUpdateGroup={(patch) => updateGroup(liveGroup.id, patch)}
          onAddMember={addMember}
          onRemoveMember={removeMember}
          onExitGroup={exitGroup}
          onDeleteGroup={deleteGroup}
          onPromote={promoteCoAdmin}
          onDemote={demoteCoAdmin}
          canEdit={canEditDetails}
          isCreator={isCreator}
          onOpenMessage={handleAvatarClick}
        />
      )}




      {/* ================= PROFILE CARD MODAL (Friend or Non-Friend) ================= */}
      {selectedProfileUser && createPortal(
        <div className="profile-centered-modal-overlay" onClick={() => setSelectedProfileUser(null)}>
          {selectedUserIsFriend ? (
            <div
              className="non-friend-modal-card glass-morphism animate-scale-up"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '500px', width: '92vw', maxHeight: '85vh', overflowY: 'auto' }}
            >
              <button className="modal-close-btn" onClick={() => setSelectedProfileUser(null)} title="Close">
                <X size={18} />
              </button>
              <ProfileView
                user={selectedProfileUser}
                isFriend={true}
                isSelf={selectedProfileUser.uuid === 'self'}
              />
            </div>
          ) : (
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
                {selectedProfileUser.uuid !== 'self' && (
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
                )}
              </div>
            </div>
          )}
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
              {/* Option 2: Pin in Chat (Not location event) */}
              {actionMenuMsg.type !== 'live-location' && (
                <button className="msg-action-item" onClick={() => { handlePinMsg(actionMenuMsg.id); setActionMenuMsg(null); }}>
                  <Pin size={15} />
                  <span>{(liveGroup?.pinnedMessages || []).includes(actionMenuMsg.id) ? 'Unpin from Chat' : 'Pin in Chat'}</span>
                </button>
              )}
              {/* Option 3: Delete for Everyone (Self only, not deleted) */}
              {actionMenuMsg.from === 'me' && !actionMenuMsg.deleted && (
                <button className="msg-action-item danger" onClick={() => { handleDeleteGroupMsgForEveryone(actionMenuMsg.id); setActionMenuMsg(null); }}>
                  <Trash2 size={15} />
                  <span>Delete for Everyone</span>
                </button>
              )}
              {/* Option 4: Delete for Me */}
              <button className="msg-action-item danger" onClick={() => { handleDeleteGroupMsgForMe(actionMenuMsg.id); setActionMenuMsg(null); }}>
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
                onKeyDown={e => e.key === 'Enter' && handleSaveEditGroupMsg()}
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
              <button className="creation-submit-btn" style={{ padding: '6px 12px', margin: 0 }} onClick={handleSaveEditGroupMsg}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsView;
