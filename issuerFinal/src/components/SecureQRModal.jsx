// issuer-frontend/src/components/SecureQRModal.jsx
// COMPLETE FILE: Auto-detect when credential is claimed and close modal

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QRModal.css';

function SecureQRModal({ student, issuerInfo, onClose, onMarkAsIssued }) {
  const [claimToken, setClaimToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [claimStatus, setClaimStatus] = useState('pending');
  const [claimedBy, setClaimedBy] = useState(null);

  useEffect(() => {
    checkIfAlreadyIssued();
  }, []);

  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining === 0) {
        setClaimStatus('expired');
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  useEffect(() => {
    if (!claimToken || claimStatus !== 'pending') return;

    const pollInterval = setInterval(async () => {
      try {
        const API_BASE_URL = 'http://localhost:5000';

        const response = await fetch(`${API_BASE_URL}/check-issued/${student.studentId}`);
        const data = await response.json();

        if (data.issued) {
          console.log('✅ Credential has been claimed!');
          setClaimStatus('claimed');
          setClaimedBy(data.claimedBy);

          setTimeout(() => {
            onMarkAsIssued();
            // alert(`✅ Credential claimed by student!\n\nClaimed by: ${data.claimedBy}\n\nClosing...`);
            onClose();
          }, 2000);
        }
      } catch (error) {
        console.error('Error checking claim status:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [claimToken, claimStatus, student.studentId, onMarkAsIssued, onClose]);

  const checkIfAlreadyIssued = async () => {
    try {
      const API_BASE_URL = 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/check-issued/${student.studentId}`);
      const data = await response.json();

      if (data.issued) {
        alert(`⚠️ Credential Already Issued\n\nThis student already claimed their credential.\n\nClaimed by: ${data.claimedBy}\nClaimed at: ${new Date(data.claimedAt).toLocaleString()}`);
        onClose();
        return;
      }

      generateClaimToken();
    } catch (error) {
      console.error('Error checking if already issued:', error);
      generateClaimToken();
    }
  };

  const generateClaimToken = async () => {
    const token = {
      id: generateSecureId(),
      type: 'CREDENTIAL_CLAIM',
      studentId: student.studentId,
      studentName: student.name,
      requiredDID: student.did || null,
      credentialType: 'University Degree Certificate',
      credentialData: {
        credentialType: 'University Degree Certificate',
        studentName: student.name,
        studentId: student.studentId,
        email: student.email,
        program: student.program,
        graduationYear: student.graduationYear,
        gpa: student.gpa,
        issueDate: new Date().toISOString().split('T')[0],
        university: 'VoltusWave University',
        degreeType: student.program.includes('Master') ? 'Master\'s Degree' : 'Bachelor\'s Degree'
      },
      issuer: issuerInfo?.did || 'VoltusWave University',
      expiresAt: Date.now() + (5 * 60 * 1000),
      nonce: Date.now(),
      singleUse: true
    };

    try {
      const API_BASE_URL = 'http://localhost:5000';
      const response = await fetch(`${API_BASE_URL}/store-claim-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimToken: token }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          alert(`⚠️ Credential Already Issued\n\n${result.error}\n\nStudent ID: ${result.studentId}`);
          onClose();
          return;
        }
        throw new Error(result.error || 'Failed to store token');
      }

      console.log('✅ Token stored on backend:', token.id);
      setClaimToken(token);
      setExpiresAt(token.expiresAt);

    } catch (error) {
      console.error('❌ Error storing token:', error);
      alert(`Error: ${error.message}`);
      onClose();
    }
  };

  const generateSecureId = () => {
    return 'claim_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegenerateClaim = () => {
    generateClaimToken();
    setClaimStatus('pending');
  };

  if (!student || !claimToken) return null;

  const qrData = JSON.stringify(claimToken);

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.3;
          }
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }

        .modal {
          background-color: white;
          border-radius: 20px;
          max-width: 600px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 24px;
          border-bottom: 1px solid #e2e8f0;
        }

        .modal-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 28px;
          color: #64748b;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-button:hover {
          background-color: #f1f5f9;
          color: #1e293b;
        }

        .modal-content {
          padding: 24px;
        }

        .student-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 16px;
          padding: 24px;
          color: white;
          margin-bottom: 24px;
        }

        .student-card-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        .large-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          font-weight: bold;
          color: white;
        }

        .student-card-name {
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: white;
        }

        .student-card-program {
          font-size: 14px;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
        }

        .credential-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .detail-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          font-size: 14px;
          font-weight: 500;
          color: white;
        }

        .qr-instructions {
          margin-bottom: 24px;
        }

        .instruction-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .instruction-list {
          margin: 0;
          padding-left: 24px;
          color: #64748b;
          line-height: 1.8;
        }

        .instruction-list li {
          margin-bottom: 8px;
        }

        .qr-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px;
          background-color: #f8fafc;
          border-radius: 16px;
          margin-bottom: 24px;
        }

        .qr-footer {
          text-align: center;
        }

        .qr-note {
          font-size: 14px;
          color: #64748b;
          margin: 0 0 16px 0;
          line-height: 1.6;
        }

        .qr-note code {
          background-color: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: monospace;
          font-size: 12px;
        }

        .confirm-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 14px 28px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }

        .confirm-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
        }

        .confirm-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">🔐 Secure Credential Issuance</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>

          <div className="modal-content">
            {/* Security Notice */}
            <div style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              gap: '12px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '32px' }}>🛡️</div>
              <div>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1e40af',
                  marginBottom: '8px'
                }}>
                  Enterprise Security Enabled
                </h4>
                <p style={{
                  fontSize: '14px',
                  color: '#1e40af',
                  margin: 0
                }}>
                  This claim token is valid for <strong>one use only</strong> and expires in{' '}
                  <strong>{timeRemaining ? formatTime(timeRemaining) : '5:00'}</strong>
                </p>
              </div>
            </div>

            {/* Student Card */}
            <div className="student-card">
              <div className="student-card-header">
                <div className="large-avatar">{student.name[0]}</div>
                <div>
                  <h3 className="student-card-name">{student.name}</h3>
                  <p className="student-card-program">{student.program}</p>
                </div>
              </div>
              <div className="credential-details">
                <div className="detail-row">
                  <span className="detail-label">Student ID:</span>
                  <span className="detail-value">{student.studentId}</span>
                </div>
                {student.did && (
                  <div className="detail-row">
                    <span className="detail-label">Registered DID:</span>
                    <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {student.did.slice(0, 30)}...
                    </span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Claim Token:</span>
                  <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {claimToken.id}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Banners */}
            {claimStatus === 'expired' && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #fde047',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <span style={{ color: '#d97706', fontWeight: '600' }}>⏰ Claim token expired</span>
                <button
                  onClick={handleRegenerateClaim}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Regenerate Token
                </button>
              </div>
            )}

            {claimStatus === 'claimed' && (
              <div style={{
                backgroundColor: '#dcfce7',
                border: '1px solid #86efac',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '24px'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                <div style={{ color: '#16a34a', fontWeight: '600', fontSize: '18px', marginBottom: '8px' }}>
                  Credential Claimed Successfully!
                </div>
                <div style={{ color: '#15803d', fontSize: '14px' }}>
                  Claimed by: {claimedBy ? claimedBy.slice(0, 20) + '...' : 'Student'}
                </div>
                <div style={{ color: '#15803d', fontSize: '12px', marginTop: '8px' }}>
                  Closing automatically...
                </div>
              </div>
            )}

            {/* QR Code Section */}
            {claimStatus === 'pending' && (
              <>
                <div className="qr-instructions">
                  <h4 className="instruction-title">📱 Secure Claiming Process</h4>
                  <ol className="instruction-list">
                    <li>Student opens their SSI Wallet app</li>
                    <li>Student goes to "Scan" tab</li>
                    <li>Student scans this QR code</li>
                    <li><strong>Backend verifies identity match</strong></li>
                    <li>Credential issued only once</li>
                    <li><strong>Modal closes automatically when claimed</strong></li>
                  </ol>
                </div>

                <div className="qr-container">
                  <QRCodeSVG
                    value={qrData}
                    size={300}
                    level="H"
                    includeMargin={true}
                  />
                  {timeRemaining !== null && (
                    <div style={{
                      marginTop: '16px',
                      textAlign: 'center',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: timeRemaining < 60 ? '#ef4444' : '#1e293b'
                    }}>
                      ⏱️ Expires in: <strong>{formatTime(timeRemaining)}</strong>
                    </div>
                  )}

                  {/* Polling Indicator */}
                  <div style={{
                    marginTop: '12px',
                    textAlign: 'center',
                    fontSize: '12px',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#4ade80',
                      animation: 'pulse 2s infinite'
                    }}></div>
                    Monitoring for claims...
                  </div>
                </div>

                {/* Security Features */}
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '20px',
                  marginTop: '24px'
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '12px'
                  }}>
                    🔒 Security Features
                  </h4>
                  <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    fontSize: '14px',
                    color: '#64748b'
                  }}>
                    <li style={{ marginBottom: '8px' }}>✅ One-time use token (cannot be reused)</li>
                    <li style={{ marginBottom: '8px' }}>✅ 5-minute expiration (prevents old QR attacks)</li>
                    <li style={{ marginBottom: '8px' }}>✅ Unique nonce (prevents replay attacks)</li>
                    <li style={{ marginBottom: '8px' }}>✅ DID verification (only intended recipient can claim)</li>
                    <li style={{ marginBottom: '8px' }}>✅ Backend validation (not just client-side)</li>
                    <li>✅ <strong>Auto-detection of claims (prevents duplicates)</strong></li>
                  </ul>
                </div>
              </>
            )}

            {/* Footer */}
            <div className="qr-footer">
              <p className="qr-note">
                ⚠️ This token can only be claimed <strong>ONCE</strong> by <strong>{student.name}</strong>
                {student.did && <> with DID: <code>{student.did.slice(0, 20)}...</code></>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SecureQRModal;