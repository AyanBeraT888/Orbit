import React, { useState } from 'react';
import { Mail, Phone, User, Edit2, Check, X, ShieldAlert, Smartphone } from 'lucide-react';
import { authAPI } from '../../services/api';
import './AccountDetails.css';

const AccountDetails = ({ user, onClose, onUpdateUser }) => {
  const [editingField, setEditingField] = useState(null); // 'email', 'phone', 'username'
  const [formData, setFormData] = useState({
    email: user.email || '',
    phone: user.phoneNumber || '',
    username: user.username || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const attemptsUsed = user.usernameChangeCount || 0;
  const attemptsLeft = Math.max(0, 3 - attemptsUsed);

  const handleUpdate = async (field) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      let endpoint = '';
      let payload = {};

      if (field === 'username') {
        if (attemptsLeft <= 0) {
          setError('No free username changes left. Upgrade required.');
          setLoading(false);
          return;
        }
        endpoint = '/users/username';
        payload = { newUsername: formData.username };
      } else if (field === 'email') {
        endpoint = '/users/email';
        payload = { newEmail: formData.email };
      } else if (field === 'phone') {
        endpoint = '/users/phone';
        payload = { newPhone: formData.phone };
      }

      const response = await fetch(`http://localhost:5000/api${endpoint}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update');
      }

      setSuccess(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
      
      // Update local user state
      const updatedUser = { ...user };
      if (field === 'username') {
        updatedUser.username = data.newUsername;
        updatedUser.usernameChangeCount = (updatedUser.usernameChangeCount || 0) + 1;
      } else if (field === 'email') {
        updatedUser.email = data.email;
      } else if (field === 'phone') {
        updatedUser.phoneNumber = data.phoneNumber;
      }
      
      onUpdateUser(updatedUser);
      setEditingField(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const hasPhoneLogin = user.phoneNumber || user.access_tier === 'full';

  return (
    <div className="account-details-overlay">
      <div className="account-details-modal glass-morphism animate-fade-in">
        <div className="modal-header">
          <h2>Account Details</h2>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>
        
        {error && <div className="alert error">{error}</div>}
        {success && <div className="alert success">{success}</div>}

        <div className="details-list">
          {/* Email */}
          <div className="detail-item">
            <div className="detail-icon"><Mail size={18} /></div>
            <div className="detail-content">
              <label>Email Address</label>
              {editingField === 'email' ? (
                <input 
                  type="email" 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  className="edit-input"
                  autoFocus
                />
              ) : (
                <p>{user.email || 'No email set'}</p>
              )}
            </div>
            <div className="detail-actions">
              {editingField === 'email' ? (
                <>
                  <button className="icon-btn success" onClick={() => handleUpdate('email')} disabled={loading}><Check size={18} /></button>
                  <button className="icon-btn cancel" onClick={() => setEditingField(null)}><X size={18} /></button>
                </>
              ) : (
                <button className="icon-btn" onClick={() => setEditingField('email')}><Edit2 size={16} /></button>
              )}
            </div>
          </div>

          {/* Phone */}
          <div className="detail-item">
            <div className="detail-icon"><Phone size={18} /></div>
            <div className="detail-content">
              <label>Phone Number</label>
              {editingField === 'phone' ? (
                <input 
                  type="tel" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  className="edit-input"
                  autoFocus
                />
              ) : (
                <p>{user.phoneNumber || 'No phone number set'}</p>
              )}
            </div>
            <div className="detail-actions">
              {editingField === 'phone' ? (
                <>
                  <button className="icon-btn success" onClick={() => handleUpdate('phone')} disabled={loading}><Check size={18} /></button>
                  <button className="icon-btn cancel" onClick={() => setEditingField(null)}><X size={18} /></button>
                </>
              ) : (
                <button className="icon-btn" onClick={() => setEditingField('phone')}><Edit2 size={16} /></button>
              )}
            </div>
          </div>

          {/* Username */}
          <div className="detail-item">
            <div className="detail-icon"><User size={18} /></div>
            <div className="detail-content">
              <label>Username <span className="badge-small">{attemptsLeft} free changes left</span></label>
              {editingField === 'username' ? (
                <input 
                  type="text" 
                  value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value})} 
                  className="edit-input"
                  autoFocus
                />
              ) : (
                <p>@{user.username || 'unknown'}</p>
              )}
            </div>
            <div className="detail-actions">
              {editingField === 'username' ? (
                <>
                  <button className="icon-btn success" onClick={() => handleUpdate('username')} disabled={loading || attemptsLeft <= 0}><Check size={18} /></button>
                  <button className="icon-btn cancel" onClick={() => setEditingField(null)}><X size={18} /></button>
                </>
              ) : (
                <button className="icon-btn" onClick={() => setEditingField('username')}><Edit2 size={16} /></button>
              )}
            </div>
          </div>
        </div>

        {/* Login with Phone - Only show if they don't have it already */}
        {!hasPhoneLogin && (
          <div className="phone-login-promo glass-morphism">
            <div className="promo-icon"><Smartphone size={24} /></div>
            <div className="promo-text">
              <h4>Login with Phone Number</h4>
              <p>Add a phone number to your account for faster, more secure logins.</p>
            </div>
            <button className="btn-primary-small" onClick={() => setEditingField('phone')}>Add Phone</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDetails;
