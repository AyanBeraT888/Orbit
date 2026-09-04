import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Send, Smile, BarChart2, X, Check, ChevronRight,
  Search, MapPin, Calendar, Clock, Zap, ArrowLeft, Undo2,
  UsersRound, Globe, MessageSquare, Image, Sparkles, ThumbsUp, Heart, Flame,
  MoreVertical, MessageCircle, Users, Plus, Pin, PinOff, Shield, ChevronUp, ChevronDown, Phone, PhoneOff, PhoneCall, Trash2, Edit3, Award, UserPlus, CheckCheck, Eye, EyeOff
} from 'lucide-react';
import GroupsView from './GroupsView';
import CommunitiesView from './CommunitiesView';
import './MessagesView.css';

/* ─── Friends list ───────────── */
const ALL_FRIENDS = [];

/* ─── Icon options for groups/communities ─────────────────────── */
const GROUP_ICONS    = ['group','design','support','general','rocket','planet'];
const COMM_ICONS     = ['globe','sparkles','image','cpu','target','palette'];

/* ─── Messages Data ──────────────────────────────────────────── */
const MOCK_MESSAGES = {};

const REACTIONS_AVAILABLE = ['like', 'love', 'haha', 'wow', 'fire'];

const renderConvoReactionIcon = (reactionKey, size = 12) => {
  if (reactionKey === 'like') return <ThumbsUp size={size} />;
  if (reactionKey === 'love') return <Heart size={size} style={{ fill: 'var(--danger)', color: 'var(--danger)' }} />;
  if (reactionKey === 'haha') return <Smile size={size} />;
  if (reactionKey === 'wow') return <ArrowLeft size={size} />;
  if (reactionKey === 'fire') return <Flame size={size} style={{ fill: 'var(--accent)', color: 'var(--accent)' }} />;
  return null;
};

/* ─── Poll Shortcut Templates ────────────────────────────────── */
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const MEETING_TIMES = ['4pm onwards', '6pm onwards', '8pm onwards'];

const POLL_SHORTCUTS = [
  {
    id: 'trip', icon: 'trip', label: 'Plan a Trip', description: 'Best day to travel?', color: '#3B9E5C',
    buildPoll: () => ({ question: 'Planning a trip — which day works best?', options: WEEKDAYS, votes: Object.fromEntries(WEEKDAYS.map(d => [d, 0])), voted: null, multiOption: true }),
  },
  {
    id: 'meet', icon: 'meet', label: 'Time to Meet', description: 'Pick a meeting time', color: '#6366f1',
    buildPoll: () => ({ question: 'What time works to meet up?', options: MEETING_TIMES, votes: Object.fromEntries(MEETING_TIMES.map(t => [t, 0])), voted: null, multiOption: false }),
  },
];

/* ─── Poll Message ───────────────────────────────────────────── */
const PollMessage = ({ poll, onVote }) => {
  const totalVotes = Object.values(poll.votes).reduce((a, b) => a + b, 0);
  const maxVotes = Math.max(...Object.values(poll.votes), 1);
  return (
    <div className="poll-card-v2">
      <div className="poll-header-v2"><BarChart2 size={14} /><span>Quick Poll</span></div>
      <p className="poll-question-v2">{poll.question}</p>
      <div className="poll-options-list">
        {poll.options.map(opt => {
          const count = poll.votes[opt] || 0;
          const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
          const isWinner = count === maxVotes && totalVotes > 0;
          const didVote = poll.voted === opt;
          return (
            <button key={opt} className={`poll-option-btn ${poll.voted ? 'voted' : ''} ${didVote ? 'my-vote' : ''} ${isWinner && poll.voted ? 'winner' : ''}`} onClick={() => !poll.voted && onVote(opt)} disabled={!!poll.voted}>
              <div className="poll-option-fill" style={{ width: poll.voted ? `${pct}%` : '0%' }} />
              <span className="poll-option-label">{opt}{didVote && <Check size={12} style={{ marginLeft: 4 }} />}</span>
              {poll.voted && <span className="poll-option-pct">{pct}%</span>}
            </button>
          );
        })}
      </div>
      {poll.voted && <p className="poll-total-v2">{totalVotes} vote{totalVotes !== 1 ? 's' : ''} · You voted {poll.voted}</p>}
    </div>
  );
};

/* ─── Message Bubble ──────────────────────────────────────────── */
const MessageBubble = ({ msg, onReact, onVote, onJoinLocation, onLongPress, onTouchStart, onTouchEnd, onTouchMove, readReceiptsEnabled = true }) => {
  const [showReactions, setShowReactions] = useState(false);
  const isMe = msg.from === 'me';

  if (msg.type === 'location_event') {
    const isActive = msg.status === 'active';
    return (
      <div className="location-event-wrapper animate-fade-in">
        <div className={`location-event-card ${isActive ? 'active' : 'ended'}`}>
          <div className="location-event-header">
            <MapPin size={18} className={`location-icon ${isActive ? 'active' : 'ended'}`} />
            <span className="location-event-text">
              {isActive ? `${msg.senderName} is sharing live location` : `Location sharing ended · ${msg.durationText}`}
            </span>
          </div>
          {isActive && <button className="location-event-btn" onClick={() => onJoinLocation(msg)}>Tap to join session</button>}
        </div>
      </div>
    );
  }

  return (
    <div className={`msg-row ${isMe ? 'me' : 'them'} ${msg.pinned ? 'msg-is-pinned' : ''}`}>
      <div
        className={`bubble ${isMe ? 'bubble-me' : 'bubble-them'}`}
        onMouseEnter={() => setShowReactions(true)}
        onMouseLeave={() => setShowReactions(false)}
        onContextMenu={(e) => { e.preventDefault(); onLongPress(msg); }}
        onTouchStart={(e) => onTouchStart(e, msg)}
        onTouchEnd={onTouchEnd}
        onTouchMove={onTouchMove}
        onMouseDown={(e) => onTouchStart(e, msg)}
        onMouseUp={onTouchEnd}
        onMouseMove={onTouchMove}
        style={{ cursor: 'pointer' }}
      >
        {msg.pinned && <Pin size={11} style={{ position: 'absolute', top: 6, right: 6, opacity: 0.6, transform: 'rotate(45deg)' }} />}
        {msg.type === 'poll' ? <PollMessage poll={msg.poll} onVote={(v) => onVote(msg.id, v)} /> : <p style={{ paddingRight: msg.pinned ? 12 : 0 }}>{msg.text}</p>}
        {!msg.deleted && showReactions && (
          <div className={`reaction-picker ${isMe ? 'picker-left' : 'picker-right'}`}>
            {REACTIONS_AVAILABLE.map(rKey => (
              <button key={rKey} className="reaction-option" onClick={() => onReact(msg.id, rKey)}>{renderConvoReactionIcon(rKey, 16)}</button>
            ))}
          </div>
        )}
        {!msg.deleted && Object.keys(msg.reactions).length > 0 && (
          <div className="msg-reactions">
            {Object.entries(msg.reactions).map(([reactionKey, count]) => (
              <span key={reactionKey} className="reaction-badge" onClick={() => onReact(msg.id, reactionKey)}>
                {renderConvoReactionIcon(reactionKey, 12)} <span style={{ marginLeft: 3 }}>{count}</span>
              </span>
            ))}
          </div>
        )}
        <div className="msg-meta">
          <span className="msg-time">{msg.time}{msg.edited && ' · edited'}</span>
          {isMe && (
            <span className={`msg-status-ticks ${readReceiptsEnabled ? 'read' : 'sent'}`} title={readReceiptsEnabled ? "Read Receipts On (Read)" : "Read Receipts Off (Sent)"}>
              <Check size={14} className="tick tick-first" />
              {readReceiptsEnabled && <Check size={14} className="tick tick-second" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Poll Shortcut Panel ────────────────────────────────────── */
const PollShortcutPanel = ({ onSend, onClose }) => {
  const [step, setStep] = useState('shortcuts');
  const [customQuestion, setCustomQuestion] = useState('');
  const [customOptions, setCustomOptions] = useState(['', '']);
  const renderShortcutIcon = (iconKey) => {
    if (iconKey === 'trip') return <Globe size={24} style={{ color: 'var(--primary)' }} />;
    if (iconKey === 'meet') return <Clock size={24} style={{ color: 'var(--primary)' }} />;
    return <Zap size={24} style={{ color: 'var(--primary)' }} />;
  };
  const addCustomOption = () => setCustomOptions(prev => [...prev, '']);
  const updateCustomOption = (i, val) => setCustomOptions(prev => prev.map((o, idx) => idx === i ? val : o));
  const removeCustomOption = (i) => setCustomOptions(prev => prev.filter((_, idx) => idx !== i));
  const handleSendCustom = () => {
    const validOptions = customOptions.filter(o => o.trim());
    if (!customQuestion.trim() || validOptions.length < 2) return;
    const votes = Object.fromEntries(validOptions.map(o => [o.trim(), 0]));
    onSend({ question: customQuestion.trim(), options: validOptions.map(o => o.trim()), votes, voted: null, multiOption: false });
  };
  return (
    <div className="poll-shortcut-panel glass-morphism">
      <div className="poll-shortcut-header">
        <div className="poll-shortcut-title"><Zap size={16} /><span>Quick Polls</span></div>
        <button className="icon-btn-small" onClick={onClose}><X size={16} /></button>
      </div>
      {step === 'shortcuts' ? (
        <>
          <div className="shortcut-cards-row">
            {POLL_SHORTCUTS.map(s => (
              <button key={s.id} className="shortcut-card" onClick={() => onSend(s.buildPoll())} style={{ '--shortcut-color': s.color }}>
                <div className="shortcut-icon-wrapper" style={{ marginBottom: 6 }}>{renderShortcutIcon(s.icon)}</div>
                <span className="shortcut-name">{s.label}</span>
                <span className="shortcut-desc">{s.description}</span>
              </button>
            ))}
          </div>
          <button className="custom-poll-link" onClick={() => setStep('custom')}>+ Create custom poll</button>
        </>
      ) : (
        <div className="custom-poll-form">
          <button className="back-link" onClick={() => setStep('shortcuts')}>← Back</button>
          <input className="poll-input" placeholder="Ask a question…" value={customQuestion} onChange={e => setCustomQuestion(e.target.value)} />
          <div className="custom-options-list">
            {customOptions.map((opt, i) => (
              <div key={i} className="custom-option-row">
                <input className="poll-input" placeholder={`Option ${i + 1}`} value={opt} onChange={e => updateCustomOption(i, e.target.value)} />
                {customOptions.length > 2 && <button className="icon-btn-small" onClick={() => removeCustomOption(i)}><X size={14} /></button>}
              </div>
            ))}
          </div>
          {customOptions.length < 6 && <button className="custom-poll-link" onClick={addCustomOption}>+ Add option</button>}
          <button className="btn-primary-small poll-send-btn" onClick={handleSendCustom}>Send Poll <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
};

/* ─── New Chat Modal ─────────────────────────────────────────── */
const NewChatModal = ({ onClose, onOpen, existingChats }) => {
  const [query, setQuery] = useState('');
  const filtered = ALL_FRIENDS.filter(f =>
    f.name.toLowerCase().includes(query.toLowerCase()) &&
    !existingChats.some(c => c.type === 'chat' && c.name === f.name)
  );
  return (
    <div className="creation-modal-overlay" onClick={onClose}>
      <div className="creation-modal glass-morphism animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="creation-modal-header">
          <h3>New Chat</h3>
          <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="creation-modal-subtitle">Select a friend to start a 1:1 conversation</p>
        <div className="creation-search-wrap">
          <Search size={14} className="creation-search-icon" />
          <input className="creation-search-input" placeholder="Search friends…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />
        </div>
        <div className="friend-picker-list">
          {filtered.map(f => (
            <button key={f.id} className="friend-picker-row" onClick={() => onOpen(f)}>
              <div className="fp-avatar" style={{ position: 'relative' }}>
                {f.avatar.toUpperCase()}
                {f.online && <span className="fp-online-dot" />}
              </div>
              <span className="fp-name">{f.name}</span>
              <MessageCircle size={16} className="fp-action-icon" />
            </button>
          ))}
          {filtered.length === 0 && <p className="creation-empty-hint">No friends found or all friends already have threads.</p>}
        </div>
      </div>
    </div>
  );
};

/* ─── New Group Modal ────────────────────────────────────────── */
const NewGroupModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('group');
  const [desc, setDesc] = useState('');
  const [selected, setSelected] = useState([]);
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const handleCreate = () => {
    if (!name.trim() || selected.length < 1) return;
    const members = ALL_FRIENDS.filter(f => selected.includes(f.id));
    onCreate({ name: name.trim(), icon, description: desc.trim(), members });
    onClose();
  };
  return (
    <div className="creation-modal-overlay" onClick={onClose}>
      <div className="creation-modal creation-modal-lg glass-morphism animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="creation-modal-header">
          <h3>New Group</h3>
          <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="creation-modal-subtitle">Create a location-sharing group chat</p>

        <div className="creation-form-row">
          <label className="creation-label">Group Name</label>
          <input className="creation-input" placeholder="Group name…" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>

        <div className="creation-form-row">
          <label className="creation-label">Icon</label>
          <div className="icon-picker-row">
            {GROUP_ICONS.map(ic => (
              <button key={ic} className={`icon-chip ${icon === ic ? 'selected' : ''}`} onClick={() => setIcon(ic)} title={ic}>
                {ic === 'group' ? <Users size={16} /> : ic === 'design' ? <Sparkles size={16} /> : ic === 'support' ? <MessageSquare size={16} /> : ic === 'globe' ? <Globe size={16} /> : ic === 'rocket' ? <Zap size={16} /> : <Pin size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div className="creation-form-row">
          <label className="creation-label">Description <span className="optional-label">(optional)</span></label>
          <textarea className="creation-textarea" placeholder="What is this group for?" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
        </div>

        <div className="creation-form-row">
          <label className="creation-label">Add Members <span className="creation-count-hint">({selected.length} selected, min 1)</span></label>
          <div className="friend-chip-grid">
            {ALL_FRIENDS.map(f => (
              <button key={f.id} className={`friend-chip ${selected.includes(f.id) ? 'selected' : ''}`} onClick={() => toggle(f.id)}>
                <span className="chip-avatar">{f.avatar.toUpperCase()}</span>
                <span>{f.name}</span>
                {selected.includes(f.id) && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>

        <button className="creation-submit-btn" onClick={handleCreate} disabled={!name.trim() || selected.length < 1}>
          <Users size={16} /> Create Group <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

/* ─── New Community Modal ────────────────────────────────────── */
const NewCommunityModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('globe');
  const [desc, setDesc] = useState('');
  const [selected, setSelected] = useState([]);
  const toggle = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const handleCreate = () => {
    if (!name.trim()) return;
    const members = ALL_FRIENDS.filter(f => selected.includes(f.id));
    onCreate({ name: name.trim(), icon, description: desc.trim(), members });
    onClose();
  };
  return (
    <div className="creation-modal-overlay" onClick={onClose}>
      <div className="creation-modal creation-modal-lg glass-morphism animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="creation-modal-header">
          <h3>New Community</h3>
          <button className="icon-btn-small" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="creation-modal-subtitle">Create a persistent community hub</p>

        <div className="creation-form-row">
          <label className="creation-label">Community Name</label>
          <input className="creation-input" placeholder="Community name…" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>

        <div className="creation-form-row">
          <label className="creation-label">Icon</label>
          <div className="icon-picker-row">
            {COMM_ICONS.map(ic => (
              <button key={ic} className={`icon-chip ${icon === ic ? 'selected' : ''}`} onClick={() => setIcon(ic)} title={ic}>
                {ic === 'globe' ? <Globe size={16} /> : ic === 'sparkles' ? <Sparkles size={16} /> : ic === 'image' ? <Image size={16} /> : ic === 'cpu' ? <MessageSquare size={16} /> : ic === 'target' ? <Zap size={16} /> : <Pin size={16} />}
              </button>
            ))}
          </div>
        </div>

        <div className="creation-form-row">
          <label className="creation-label">Description <span className="optional-label">(optional)</span></label>
          <textarea className="creation-textarea" placeholder="What is this community about?" value={desc} onChange={e => setDesc(e.target.value)} rows={2} />
        </div>

        <div className="creation-form-row">
          <label className="creation-label">Invite Members <span className="optional-label">(optional)</span></label>
          <div className="friend-chip-grid">
            {ALL_FRIENDS.map(f => (
              <button key={f.id} className={`friend-chip ${selected.includes(f.id) ? 'selected' : ''}`} onClick={() => toggle(f.id)}>
                <span className="chip-avatar">{f.avatar.toUpperCase()}</span>
                <span>{f.name}</span>
                {selected.includes(f.id) && <Check size={12} />}
              </button>
            ))}
          </div>
        </div>

        <button className="creation-submit-btn" onClick={handleCreate} disabled={!name.trim()}>
          <Globe size={16} /> Create Community <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

/* ─── Main Component ─────────────────────────────────────────── */
const MessagesView = ({ initialPartner, onClearInitialPartner, onClose, isSharingLocation, setIsSharingLocation }) => {
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages]       = useState(MOCK_MESSAGES);
  const [inputText, setInputText]     = useState('');
  const [showEmoji, setShowEmoji]     = useState(false);
  const [showPollPanel, setShowPollPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bottomRef = useRef(null);

  /* ── Kebab / overflow menu & Read Receipts state ── */
  const [showKebab, setShowKebab]         = useState(false);
  const [showChatKebab, setShowChatKebab]     = useState(false);
  const [readReceiptsEnabled, setReadReceiptsEnabled] = useState(true);
  const [receiptToast, setReceiptToast]       = useState(null);
  const [showNewChat, setShowNewChat]     = useState(false);
  const [showNewGroup, setShowNewGroup]   = useState(false);
  const [showNewComm, setShowNewComm]     = useState(false);
  const kebabRef = useRef(null);
  const chatKebabRef = useRef(null);

  const toggleReadReceipts = () => {
    setReadReceiptsEnabled(prev => {
      const next = !prev;
      setReceiptToast(`Read receipts turned ${next ? 'ON' : 'OFF'}`);
      setTimeout(() => setReceiptToast(null), 2500);
      return next;
    });
  };

  /* ── Newly created groups/communities (injected into embedded views) ── */
  const [localGroups, setLocalGroups]           = useState([]);
  const [localCommunities, setLocalCommunities] = useState([]);

  /* ── Message actions and context menu states ── */
  const [actionMenuMsg, setActionMenuMsg] = useState(null);
  const [editingMsg, setEditingMsg]       = useState(null);
  const [editInputValue, setEditInputValue] = useState('');
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const [activeCall, setActiveCall] = useState(null); // stores user info if in a call
  const [selectedProfileUser, setSelectedProfileUser] = useState(null); // profile card modal
  const [friendRequestSent, setFriendRequestSent] = useState({});
  const longPressTimeout = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const MOCK_PROFILES = {};

  const handleOpenProfile = (convo) => {
    if (!convo || convo.type !== 'chat') return;
    const profile = MOCK_PROFILES[convo.name] || {
      uuid: `usr-${convo.id}`,
      name: convo.name,
      username: convo.name,
      joinDate: '2025-01-01T00:00:00.000Z',
      stampsCount: 1,
      friendsCount: 4,
      rank: 'Wanderer Initiate',
      bio: 'Adventures are better together. 🗺️'
    };
    setSelectedProfileUser(profile);
  };

  /* ── Close kebab menus when clicking outside ── */
  useEffect(() => {
    const handler = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) setShowKebab(false);
      if (chatKebabRef.current && !chatKebabRef.current.contains(e.target)) setShowChatKebab(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [unifiedItems, setUnifiedItems] = useState([]);

  /* ── Creation handlers ── */
  const handleOpenChat = (friend) => {
    const existing = unifiedItems.find(c => c.type === 'chat' && c.name === friend.name);
    if (existing) { setActiveConvo(existing); }
    else {
      const newId = `chat-${Date.now()}`;
      const newItem = { id: newId, type: 'chat', name: friend.name, lastMsg: 'No messages yet', time: 'now', timestamp: Date.now(), unread: 0, online: friend.online, avatar: friend.avatar };
      setUnifiedItems(prev => [newItem, ...prev]);
      setActiveConvo(newItem);
    }
    setShowNewChat(false);
  };

  const handleCreateGroup = ({ name, icon, description, members }) => {
    const gId = `g${Date.now()}`;
    const listId = `group-${gId}`;
    const initials = ['Y', ...members.slice(0, 2).map(m => m.avatar.toUpperCase())];
    const newItem = { id: listId, type: 'group', name, lastMsg: 'Group created', time: 'now', timestamp: Date.now(), unread: 0, avatarList: initials };
    setUnifiedItems(prev => [newItem, ...prev]);
    const newGroup = { id: gId, name, icon, description, members, coadmins: [], messages: [], liveShare: false, isFavourite: false, communityId: null, memberTags: {}, pinnedMessages: [], adminOnlyMessaging: false };
    setLocalGroups(prev => [...prev, newGroup]);
    setActiveConvo(newItem);
  };

  const handleCreateCommunity = ({ name, icon, description, members }) => {
    const cId = `c${Date.now()}`;
    const listId = `community-${cId}`;
    const newItem = { id: listId, type: 'community', name, lastMsg: 'Community created', time: 'now', timestamp: Date.now(), unread: 0, icon };
    setUnifiedItems(prev => [newItem, ...prev]);
    const newComm = { id: cId, name, description, icon, iconType: 'orb', isVerified: false, isGlobal: false, type: 'open', memberCount: members.length + 1, members: ['me', ...members.map(m => m.id)], coadmins: [], pendingRequests: [], creator: 'me', liveShare: false, isFavourite: false, memberTags: {}, groups: [], pinnedMessages: [], adminOnlyMessaging: false };
    setLocalCommunities(prev => [...prev, newComm]);
    setActiveConvo(newItem);
  };

  const handleJoinLocationSession = (msg) => {
    setIsSharingLocation(true);
    if (activeConvo) {
      if (activeConvo.type === 'chat') window.dispatchEvent(new CustomEvent('map-focus-person', { detail: { name: activeConvo.name } }));
      else if (activeConvo.type === 'group') window.dispatchEvent(new CustomEvent('map-focus-group', { detail: { groupId: activeConvo.id.replace('group-', '') } }));
    }
    if (onClose) onClose();
  };

  useEffect(() => {
    if (initialPartner) {
      const convo = unifiedItems.find(c => c.type === 'chat' && (c.name.toLowerCase().includes(initialPartner.name.toLowerCase()) || c.name.toLowerCase().includes((initialPartner.username || '').toLowerCase())));
      setActiveConvo(convo || unifiedItems[0]);
      if (onClearInitialPartner) onClearInitialPartner();
    }
  }, [initialPartner]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeConvo]);

  const sendMessage = () => {
    if (!inputText.trim() || !activeConvo) return;
    const newMsg = { id: Date.now(), from: 'me', text: inputText.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), reactions: {} };
    setMessages(prev => ({ ...prev, [activeConvo.id]: [...(prev[activeConvo.id] || []), newMsg] }));
    setInputText(''); setShowEmoji(false);
  };

  const sendPoll = (pollData) => {
    if (!activeConvo) return;
    const newMsg = { id: Date.now(), from: 'me', type: 'poll', poll: pollData, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), reactions: {} };
    setMessages(prev => ({ ...prev, [activeConvo.id]: [...(prev[activeConvo.id] || []), newMsg] }));
    setShowPollPanel(false);
  };

  const handleReact = (msgId, emoji) => {
    setMessages(prev => {
      const updated = (prev[activeConvo.id] || []).map(m => {
        if (m.id !== msgId) return m;
        const reactions = { ...m.reactions };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      });
      return { ...prev, [activeConvo.id]: updated };
    });
  };

  const handleVote = (msgId, option) => {
    setMessages(prev => {
      const updated = (prev[activeConvo.id] || []).map(m => {
        if (m.id !== msgId || m.type !== 'poll') return m;
        const poll = { ...m.poll, voted: option, votes: { ...m.poll.votes, [option]: (m.poll.votes[option] || 0) + 1 } };
        return { ...m, poll };
      });
      return { ...prev, [activeConvo.id]: updated };
    });
  };

  /* ── Message long press and contextual actions handlers ── */
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

  const handleTogglePinMessage = (msgId) => {
    if (!activeConvo) return;
    setMessages(prev => {
      const list = prev[activeConvo.id] || [];
      const updated = list.map(m => m.id === msgId ? { ...m, pinned: !m.pinned } : m);
      return { ...prev, [activeConvo.id]: updated };
    });
  };

  const handleDeleteForEveryone = (msgId) => {
    if (!activeConvo) return;
    setMessages(prev => {
      const list = prev[activeConvo.id] || [];
      const updated = list.map(m => m.id === msgId ? { ...m, text: 'This message was deleted', deleted: true } : m);
      return { ...prev, [activeConvo.id]: updated };
    });
  };

  const handleDeleteForMe = (msgId) => {
    if (!activeConvo) return;
    setMessages(prev => {
      const list = prev[activeConvo.id] || [];
      const updated = list.map(m => m.id === msgId ? { ...m, deletedForMe: true } : m);
      return { ...prev, [activeConvo.id]: updated };
    });
  };

  const handleSaveEdit = () => {
    if (!activeConvo || !editingMsg) return;
    if (!editInputValue.trim()) return;
    setMessages(prev => {
      const list = prev[activeConvo.id] || [];
      const updated = list.map(m => m.id === editingMsg.id ? { ...m, text: editInputValue.trim(), edited: true } : m);
      return { ...prev, [activeConvo.id]: updated };
    });
    setEditingMsg(null);
    setEditInputValue('');
  };

  const handleHeaderBack = () => {
    if (activeConvo) setActiveConvo(null);
    else if (onClose) onClose();
  };

  const renderUnifiedAvatar = (item) => {
    if (item.type === 'chat') {
      return (
        <div className="convo-avatar-wrap">
          <div className="convo-avatar circular">{item.avatar || item.name.charAt(0)}</div>
          {item.online && <span className="online-dot small-dot" />}
        </div>
      );
    } else if (item.type === 'group') {
      const initials = item.avatarList || ['Y', 'A', 'B'];
      return (
        <div className="convo-avatar-wrap">
          <div className="convo-avatar group-collage circular">
            <div className="collage-member first">{initials[0]}</div>
            <div className="collage-member second">{initials[1]}</div>
            {initials[2] && <div className="collage-member third">{initials[2]}</div>}
          </div>
        </div>
      );
    } else if (item.type === 'community') {
      const getCommIcon = (itemId) => {
        if (itemId === 'community-c1') return <Globe size={18} />;
        if (itemId === 'community-c2') return <Sparkles size={18} />;
        if (itemId === 'community-c3') return <Image size={18} />;
        return <Globe size={18} />;
      };
      return (
        <div className="convo-avatar-wrap">
          <div className="convo-avatar community-square squared">{getCommIcon(item.id)}</div>
        </div>
      );
    }
    return null;
  };

  const sortedUnifiedItems = [...unifiedItems]
    .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.timestamp - a.timestamp);

  const activeConvoId = activeConvo ? String(activeConvo.id).replace('chat-', '') : '';

  return (
    <div className={`messages-layout animate-fade-in ${activeConvo ? 'has-active-chat' : 'no-active-chat'}`}>

      {/* ── Conversation List Sidebar ── */}
      <div className="convo-sidebar glass-morphism">
        <div className="convo-sidebar-header">
          <div className="convo-sidebar-title-row">
            <button className="chat-close-btn" onClick={handleHeaderBack} title={activeConvo ? 'Back to Chats List' : 'Back to Map'}>
              <Undo2 size={20} />
            </button>
            <h3>Messages</h3>
            {/* ── 3-dot Kebab Menu ── */}
            <div className="kebab-container" ref={kebabRef}>
              <button className={`kebab-btn ${showKebab ? 'active' : ''}`} onClick={() => setShowKebab(p => !p)} title="Message options">
                <MoreVertical size={18} />
              </button>
              {showKebab && (
                <div className="kebab-dropdown glass-morphism animate-scale-up">
                  <button className="kebab-item" onClick={() => { setShowNewChat(true); setShowKebab(false); }}>
                    <MessageCircle size={15} />
                    <span>New Chat</span>
                  </button>
                  <button className="kebab-item" onClick={() => { setShowNewGroup(true); setShowKebab(false); }}>
                    <Users size={15} />
                    <span>New Group</span>
                  </button>
                  <button className="kebab-item" onClick={() => { setShowNewComm(true); setShowKebab(false); }}>
                    <Globe size={15} />
                    <span>New Community</span>
                  </button>
                  <div className="kebab-divider" />
                  <button className={`kebab-item ${readReceiptsEnabled ? 'active-toggle' : ''}`} onClick={() => { toggleReadReceipts(); setShowKebab(false); }}>
                    {readReceiptsEnabled ? <CheckCheck size={15} style={{ color: '#6366f1' }} /> : <EyeOff size={15} />}
                    <span>Read Receipts: <strong>{readReceiptsEnabled ? 'ON' : 'OFF'}</strong></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="convo-search-wrap">
          <Search size={15} className="convo-search-icon" />
          <input className="convo-search" placeholder="Search messages…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <div className="convo-list">
          {sortedUnifiedItems.map(item => {
            const isActive = activeConvo?.id === item.id;
            return (
              <button key={item.id} className={`convo-item ${isActive ? 'active' : ''}`} onClick={() => setActiveConvo(item)}>
                {renderUnifiedAvatar(item)}
                <div className="convo-info">
                  <div className="convo-name-row">
                    <span className="convo-name">{item.name}</span>
                    <span className="convo-time">{item.time}</span>
                  </div>
                  <span className="convo-last">{item.lastMsg}</span>
                </div>
                {item.unread > 0 && <span className="unread-badge">{item.unread}</span>}
              </button>
            );
          })}
          {sortedUnifiedItems.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>No conversations found.</div>
          )}
        </div>
      </div>

      {/* ── Toast Notification Pill for Read Receipts ── */}
      {receiptToast && (
        <div className="receipt-toast-pill glass-morphism animate-scale-up">
          {readReceiptsEnabled ? <CheckCheck size={14} style={{ color: '#6366f1' }} /> : <EyeOff size={14} />}
          <span>{receiptToast}</span>
        </div>
      )}

      {/* ── Main Panel ── */}
      {activeConvo ? (
        activeConvo.type === 'chat' ? (
          (() => {
            const pinnedMessagesList = (messages[activeConvoId] || []).filter(m => m.pinned);
            const visibleMessages = (messages[activeConvoId] || []).filter(m => !m.deletedForMe);
            return (
              <div className="chat-panel">
                <div className="chat-header glass-morphism">
                  <div className="chat-header-info">
                    <button className="chat-back-btn" onClick={() => setActiveConvo(null)} title="Back to List"><Undo2 size={20} /></button>
                    <div
                      className="chat-header-avatar-clickable"
                      onClick={() => handleOpenProfile(activeConvo)}
                      title={`View ${activeConvo.name}'s profile`}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                    >
                      <div className="avatar">{activeConvo.name.charAt(0)}</div>
                      <div>
                        <h4>{activeConvo.name}</h4>
                        <span className={`online-label ${activeConvo.online ? 'on' : 'off'}`}>{activeConvo.online ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="chat-header-actions">
                    <button className="icon-btn" onClick={() => { setActiveCall(activeConvo); }} title="Voice Call"
                      style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px', borderRadius: '50%', boxShadow: 'var(--neu-shadow-outer)', marginRight: '4px' }}>
                      <Phone size={18} />
                    </button>
                    <button className="icon-btn" onClick={() => { window.dispatchEvent(new CustomEvent('map-focus-person', { detail: { name: activeConvo.name } })); if (onClose) onClose(); }} title="Focus on Map"
                      style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px', borderRadius: '50%', boxShadow: 'var(--neu-shadow-outer)' }}>
                      <MapPin size={18} />
                    </button>
                    <div className="kebab-container" ref={chatKebabRef}>
                      <button className={`icon-btn ${showChatKebab ? 'active' : ''}`} onClick={() => setShowChatKebab(p => !p)} title="Chat Options"
                        style={{ display: 'flex', alignItems: 'center', justifycontent: 'center', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px', borderRadius: '50%', boxShadow: 'var(--neu-shadow-outer)', marginLeft: '4px' }}>
                        <MoreVertical size={18} />
                      </button>
                      {showChatKebab && (
                        <div className="kebab-dropdown glass-morphism animate-scale-up" style={{ top: 'calc(100% + 8px)', right: 0 }}>
                          <button className={`kebab-item ${readReceiptsEnabled ? 'active-toggle' : ''}`} onClick={() => { toggleReadReceipts(); setShowChatKebab(false); }}>
                            {readReceiptsEnabled ? <CheckCheck size={15} style={{ color: '#6366f1' }} /> : <EyeOff size={15} />}
                            <span>Read Receipts: <strong>{readReceiptsEnabled ? 'ON' : 'OFF'}</strong></span>
                          </button>
                          <button className="kebab-item" onClick={() => { handleOpenProfile(activeConvo); setShowChatKebab(false); }}>
                            <UserPlus size={15} />
                            <span>View Profile</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Chat Pinned Messages Banner */}
                {pinnedMessagesList.length > 0 && (
                  <div className="pinned-banner">
                    <div className="pinned-banner-top" onClick={() => setPinnedExpanded(p => !p)}>
                      <Pin size={13} className="pinned-banner-icon" />
                      <span className="pinned-banner-text">
                        {pinnedMessagesList.length === 1
                          ? (pinnedMessagesList[0].text || '[media]').slice(0, 60)
                          : `${pinnedMessagesList.length} pinned messages`
                        }
                      </span>
                      {pinnedMessagesList.length > 1 && (pinnedExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </div>
                    {pinnedExpanded && (
                      <div className="pinned-list-drawer">
                        {pinnedMessagesList.map(msg => (
                          <div key={msg.id} className="pinned-msg-row">
                            <Pin size={11} className="pinned-row-icon" />
                            <span className="pinned-row-text">{(msg.text || '[media]').slice(0, 70)}</span>
                            <button className="unpin-btn" onClick={() => handleTogglePinMessage(msg.id)} title="Unpin"><PinOff size={11} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="chat-messages">
                  {visibleMessages.map(msg => (
                    <MessageBubble 
                      key={msg.id} 
                      msg={msg} 
                      onReact={handleReact} 
                      onVote={handleVote} 
                      onJoinLocation={handleJoinLocationSession} 
                      onLongPress={setActionMenuMsg}
                      onTouchStart={handleTouchStart}
                      onTouchEnd={handleTouchEnd}
                      onTouchMove={handleTouchMove}
                      readReceiptsEnabled={readReceiptsEnabled}
                    />
                  ))}
                  <div ref={bottomRef} />
                </div>
                {showPollPanel && <PollShortcutPanel onSend={sendPoll} onClose={() => setShowPollPanel(false)} />}
                <div className="chat-footer glass-morphism">
                  <button className={`icon-btn ${showPollPanel ? 'active' : ''}`} onClick={() => setShowPollPanel(prev => !prev)} title="Create Poll"><BarChart2 size={18} /></button>
                  <input type="text" className="chat-input" placeholder="Type a message…" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                  <button className="send-btn" onClick={sendMessage} title="Send"><Send size={16} /></button>
                </div>
              </div>
            );
          })()
        ) : activeConvo.type === 'group' ? (
          <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
            <GroupsView
              groupId={activeConvo.id.replace('group-', '')}
              embedded={true}
              onClose={() => setActiveConvo(null)}
              isSharingLocation={isSharingLocation}
              setIsSharingLocation={setIsSharingLocation}
              additionalGroups={localGroups}
            />
          </div>
        ) : (
          <div style={{ flex: 1, width: '100%', height: '100%', overflow: 'hidden' }}>
            <CommunitiesView
              communityId={activeConvo.id.replace('community-', '')}
              embedded={true}
              onClose={() => setActiveConvo(null)}
              isSharingLocation={isSharingLocation}
              setIsSharingLocation={setIsSharingLocation}
              additionalCommunities={localCommunities}
            />
          </div>
        )
      ) : (
        <div className="chat-empty">
          <div className="chat-empty-inner">
            <div className="chat-empty-icon"><MessageSquare size={48} style={{ opacity: 0.3, color: 'var(--primary)' }} /></div>
            <h3>Your Messages</h3>
            <p>Select a DM thread, group share session, or community hub to begin.</p>
            <div className="chat-empty-actions">
              <button className="chat-empty-action-btn" onClick={() => setShowNewChat(true)}><MessageCircle size={15} /> New Chat</button>
              <button className="chat-empty-action-btn" onClick={() => setShowNewGroup(true)}><Users size={15} /> New Group</button>
              <button className="chat-empty-action-btn" onClick={() => setShowNewComm(true)}><Globe size={15} /> New Community</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Creation Modals ── */}
      {showNewChat  && <NewChatModal      onClose={() => setShowNewChat(false)}  onOpen={handleOpenChat}       existingChats={unifiedItems} />}
      {showNewGroup && <NewGroupModal     onClose={() => setShowNewGroup(false)} onCreate={handleCreateGroup}  />}
      {showNewComm  && <NewCommunityModal onClose={() => setShowNewComm(false)}  onCreate={handleCreateCommunity} />}

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
              {actionMenuMsg.from === 'me' && !actionMenuMsg.deleted && actionMenuMsg.type !== 'poll' && actionMenuMsg.type !== 'location_event' && (
                <button className="msg-action-item" onClick={() => { setEditingMsg(actionMenuMsg); setEditInputValue(actionMenuMsg.text); setActionMenuMsg(null); }}>
                  <Edit3 size={15} />
                  <span>Edit Message</span>
                </button>
              )}
              {/* Option 2: Pin in Chat (Not location event) */}
              {actionMenuMsg.type !== 'location_event' && (
                <button className="msg-action-item" onClick={() => { handleTogglePinMessage(actionMenuMsg.id); setActionMenuMsg(null); }}>
                  <Pin size={15} />
                  <span>{actionMenuMsg.pinned ? 'Unpin from Chat' : 'Pin in Chat'}</span>
                </button>
              )}
              {/* Option 3: Delete for Everyone (Self only, not deleted) */}
              {actionMenuMsg.from === 'me' && !actionMenuMsg.deleted && (
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
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
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
              <button className="creation-submit-btn" style={{ padding: '6px 12px', margin: 0 }} onClick={handleSaveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Voice Call Overlay */}
      {activeCall && (
        <div className="msg-action-modal-overlay" style={{ zIndex: 9999 }}>
          <div className="glass-morphism animate-scale-up" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 3rem', borderRadius: '24px', gap: '1rem', background: 'rgba(255,255,255,0.2)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)' }}>
              {activeCall.avatar}
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)' }}>{activeCall.name}</h3>
              <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: '0.9rem' }}>Calling...</p>
            </div>
            <div style={{ display: 'flex', gap: '20px', marginTop: '1rem' }}>
              <button 
                onClick={() => setActiveCall(null)}
                style={{ width: 50, height: 50, borderRadius: '50%', background: '#ef4444', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)' }}
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile Card Modal ── */}
      {selectedProfileUser && createPortal(
        <div className="profile-centered-modal-overlay" onClick={() => setSelectedProfileUser(null)}>
          <div className="non-friend-modal-card glass-morphism animate-scale-up" onClick={e => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setSelectedProfileUser(null)} title="Close">
              <X size={18} />
            </button>

            <div className="non-friend-banner"></div>

            <div className="non-friend-avatar-wrapper">
              <div className="non-friend-avatar-ring"></div>
              <div className="non-friend-avatar">{selectedProfileUser.name.charAt(0)}</div>
            </div>

            <div className="non-friend-details">
              <h2 className="non-friend-name">{selectedProfileUser.name}</h2>
              <span className="non-friend-username">@{selectedProfileUser.username}</span>
              <span className="non-friend-id">ID: {selectedProfileUser.uuid || '------'}</span>

              {selectedProfileUser.bio && (
                <p className="non-friend-bio">"{selectedProfileUser.bio}"</p>
              )}

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

              <div className="non-friend-rank-badge">
                <Award size={14} />
                <span>{selectedProfileUser.rank || 'Wanderer Initiate'}</span>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MessagesView;
