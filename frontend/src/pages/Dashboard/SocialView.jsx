import React, { useState } from 'react';
import { Users, Trophy, Undo2 } from 'lucide-react';
import FriendsView from './FriendsView';
import LeaderboardView from './LeaderboardView';

const SocialView = ({ onOpenMessage, onClose, isSharingLocation, setIsSharingLocation }) => {
  const [socialTab, setSocialTab] = useState('friends'); // 'friends' | 'leaderboard'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* Social Sub-Tabs Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)'
      }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.04)',
              border: 'none',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#475569'
            }}
            title="Back to Map"
          >
            <Undo2 size={18} />
          </button>
        )}

        <div style={{
          flex: 1,
          display: 'flex',
          gap: 4,
          background: 'rgba(0, 0, 0, 0.04)',
          padding: 3,
          borderRadius: 14
        }}>
          {[
            { id: 'friends', label: 'Friends', icon: <Users size={14} /> },
            { id: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSocialTab(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '7px 10px',
                borderRadius: 11,
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: socialTab === tab.id ? '#1A73E8' : 'transparent',
                color: socialTab === tab.id ? '#ffffff' : '#64748b',
                transition: 'all 0.2s',
                fontFamily: "'Outfit', sans-serif"
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Body Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {socialTab === 'friends' ? (
          <FriendsView
            onOpenMessage={onOpenMessage}
            isSharingLocation={isSharingLocation}
            setIsSharingLocation={setIsSharingLocation}
          />
        ) : (
          <LeaderboardView />
        )}
      </div>
    </div>
  );
};

export default SocialView;
