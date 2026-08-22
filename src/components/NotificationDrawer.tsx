import React, { useState } from 'react';
import { NotificationRecord } from '../types';
import { X, Mail, CheckCircle2, Copy } from 'lucide-react';

interface NotificationDrawerProps {
  notifications: NotificationRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  isOpen,
  onClose
}) => {
  const [selectedId, setSelectedId] = useState<string>(notifications[0]?.id || '');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentNotif = notifications.find(n => n.id === selectedId) || notifications[0];

  const handleCopy = () => {
    if (currentNotif) {
      navigator.clipboard.writeText(`Subject: ${currentNotif.subject}\n\n${currentNotif.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card" style={{ maxWidth: '780px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(201,190,176,0.3)', paddingBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Mail size={20} color="#8A7A68" />
            <h3 style={{ fontSize: '1.4rem', margin: 0 }}>Automated Notification Dispatch Viewer</h3>
          </div>
          <button onClick={onClose} style={{ padding: '0.4rem', color: 'var(--ink-light)' }} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--ink-light)', padding: '2rem 0' }}>
            No notifications logged yet. Complete a booking or trigger one from the Admin portal.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '1.5rem' }}>
            {/* List */}
            <div style={{ borderRight: '1px solid rgba(201,190,176,0.3)', paddingRight: '1rem', maxHeight: '420px', overflowY: 'auto' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--taupe)', marginBottom: '0.8rem', fontWeight: 600 }}>
                Dispatched Queue
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: (currentNotif?.id === n.id) ? 'var(--taupe-wash)' : 'var(--mist)',
                      border: `1px solid ${(currentNotif?.id === n.id) ? 'var(--taupe)' : 'transparent'}`,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                      <span className="badge badge-taupe" style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem' }}>
                        {n.recipient.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                        {n.locale.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {n.subject}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ink-light)', marginTop: '4px' }}>
                      {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Box */}
            {currentNotif && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ backgroundColor: 'var(--mist)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div><strong>To:</strong> {currentNotif.recipientEmail} ({currentNotif.recipient})</div>
                  <div><strong>Subject:</strong> {currentNotif.subject}</div>
                  <div><strong>Locale:</strong> {currentNotif.locale.toUpperCase()}</div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--white)',
                    border: '1px solid rgba(201,190,176,0.4)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1.2rem',
                    fontFamily: 'monospace',
                    fontSize: '0.84rem',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    color: 'var(--ink)',
                    flex: 1,
                    maxHeight: '260px',
                    overflowY: 'auto'
                  }}
                >
                  {currentNotif.body}
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                  <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.78rem' }} onClick={handleCopy}>
                    {copied ? <CheckCircle2 size={14} color="#557A55" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy Email Body'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
