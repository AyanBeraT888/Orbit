import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Star, ShieldCheck, MapPin, Sparkles, Zap, Award } from 'lucide-react';
import api from '../../services/api';

export default function LeaderboardView() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get('/stamps/leaderboard');
      setLeaderboard(res.data);
      
      // Find current user's entry in leaderboard
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      const userUid = localUser.firebaseUid || localUser.uid;
      const userEntryIndex = res.data.findIndex(entry => entry.uid === userUid);
      
      if (userEntryIndex !== -1) {
        setCurrentUser({
          ...res.data[userEntryIndex],
          rank: userEntryIndex + 1
        });
      }
      setLoading(false);
    } catch (err) {
      console.error("Failed to load leaderboard:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span style={{ fontSize: 18 }}>🥇</span>;
    if (rank === 2) return <span style={{ fontSize: 18 }}>🥈</span>;
    if (rank === 3) return <span style={{ fontSize: 18 }}>🥉</span>;
    return <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)' }}>#{rank}</span>;
  };

  // Calculate progress to next badge level
  const getProgressDetails = (points) => {
    if (points >= 1500) {
      return { label: 'Max Level reached!', percent: 100, nextLevel: 'N/A', remaining: 0 };
    }
    if (points >= 500) {
      const nextThreshold = 1500;
      const progress = points - 500;
      const range = nextThreshold - 500;
      const percent = Math.min(100, Math.floor((progress / range) * 100));
      return {
        label: 'Progress to Master Cartographer',
        percent,
        nextLevel: 'Master Cartographer 🗺️',
        remaining: nextThreshold - points
      };
    }
    // Explorer
    const nextThreshold = 500;
    const percent = Math.min(100, Math.floor((points / nextThreshold) * 100));
    return {
      label: 'Progress to Trailblazer',
      percent,
      nextLevel: 'Trailblazer 🧗',
      remaining: nextThreshold - points
    };
  };

  const progress = currentUser ? getProgressDetails(currentUser.points) : null;

  return (
    <div style={{ padding: '24px 20px', fontFamily: "'Outfit', sans-serif", display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '12px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
          <Trophy size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' }}>Competitive Mappers</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Drop stamps and earn badges as an Orb explorer!</span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          <Sparkles className="dot-pulse-green" size={20} style={{ marginRight: 8 }} /> Loading leaderboard...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: 16 }}>
          
          {/* User Score Card */}
          {currentUser && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 158, 92, 0.15) 0%, rgba(59, 158, 92, 0.05) 100%)',
              border: '1px solid rgba(59, 158, 92, 0.25)',
              borderRadius: '20px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
              animation: 'fadeInSlide 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>@{currentUser.username}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>{currentUser.badge}</div>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifySelf: 'flex-end', gap: 4 }}>
                    <Zap size={16} fill="var(--primary)" style={{ color: 'var(--primary)' }} /> {currentUser.points} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>XP</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Global Rank: #{currentUser.rank}</div>
                </div>
              </div>

              {/* Progress Indicator */}
              {progress && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{progress.label}</span>
                    {progress.remaining > 0 ? (
                      <span style={{ color: 'var(--primary)' }}>{progress.remaining} XP remaining</span>
                    ) : (
                      <span style={{ color: 'var(--primary)' }}>Max Level</span>
                    )}
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.4)', borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--neu-shadow-inner)' }}>
                    <div style={{ width: `${progress.percent}%`, height: '100%', background: 'var(--primary)', borderRadius: '10px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ranking Table List */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              <span>Rank / Username</span>
              <span style={{ display: 'flex', gap: 40, marginRight: 8 }}>
                <span>Stamps</span>
                <span>XP Score</span>
              </span>
            </div>

            {leaderboard.map((user, idx) => {
              const rank = idx + 1;
              return (
                <div 
                  key={user.uid}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '16px',
                    background: 'var(--bg-card)',
                    border: rank === currentUser?.rank ? '1.5px solid var(--primary)' : '1px solid rgba(0,0,0,0.04)',
                    boxShadow: 'var(--neu-shadow-outer)',
                    transition: 'transform 0.2s',
                    animation: 'fadeInSlide 0.25s ease'
                  }}
                  className="leaderboard-row"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 28, display: 'flex', justifyContent: 'center' }}>
                      {getRankBadge(rank)}
                    </div>
                    
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: rank === 1 ? '#FEF3C7' : rank === 2 ? '#E2E8F0' : rank === 3 ? '#FFEDD5' : 'rgba(59, 158, 92, 0.1)', color: rank === 1 ? '#D97706' : 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{user.username}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>{user.badge}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', width: 24, textAlign: 'center' }}>{user.stampCount}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 4, width: 60, justifyContent: 'flex-end' }}>
                      <Zap size={12} fill="rgba(217,119,6,0.2)" style={{ color: '#d97706' }} /> {user.points}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
