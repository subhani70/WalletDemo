import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import './QRModal.css';

function SecureQRModal({ student, issuerInfo, onClose, onMarkAsIssued }) {
  const [claimToken, setClaimToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [claimStatus, setClaimStatus] = useState('pending');
  const [isGenerating, setIsGenerating] = useState(false);
  const [storageStatus, setStorageStatus] = useState(null);

  // ⚠️ UPDATE THIS TO YOUR BACKEND IP
  const API_BASE_URL = 'http://172.16.10.117:5000';

  useEffect(() => {
    generateAndStoreClaimToken();
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

  const generateAndStoreClaimToken = async () => {
    setIsGenerating(true);
    setStorageStatus('Generating token...');

    try {
      // Generate secure token
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
        expiresAt: Date.now() + (5 * 60 * 1000), // 5 minutes
        nonce: Date.now(),
        singleUse: true
      };

      console.log('📝 Generated token:', {
        id: token.id,
        student: token.studentName,
        expiresAt: new Date(token.expiresAt).toLocaleString()
      });

      setStorageStatus('Storing token on backend...');

      // Store token on backend
      const response = await fetch(`${API_BASE_URL}/store-claim-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimToken: token }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log('✅ Token stored on backend successfully');
        console.log('   Token ID:', result.tokenId);
        setStorageStatus('✅ Token ready for claiming');
        setClaimToken(token);
        setExpiresAt(token.expiresAt);
      } else {
        throw new Error(result.error || 'Failed to store token');
      }

    } catch (error) {
      console.error('❌ Error with claim token:', error);
      setStorageStatus(`❌ Error: ${error.message}`);
      alert(`Failed to generate claim token: ${error.message}\n\nPlease check:\n1. Backend is running\n2. API_BASE_URL is correct\n3. Network connection`);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateSecureId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `claim_${timestamp}_${random}`;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRegenerateClaim = () => {
    setClaimStatus('pending');
    generateAndStoreClaimToken();
  };

  const handleVerifyTokenStatus = async () => {
    if (!claimToken) return;

    try {
      const response = await fetch(`${API_BASE_URL}/claim-status/${claimToken.id}`);
      const status = await response.json();

      console.log('Token status:', status);
      alert(JSON.stringify(status, null, 2));
    } catch (error) {
      console.error('Failed to check token status:', error);
      alert('Failed to verify token status');
    }
  };

  if (!student) return null;

  if (isGenerating || !claimToken) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Generating Claim Token...</h2>
            <button className="close-button" onClick={onClose}>✕</button>
          </div>
          <div className="modal-content">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
              <p style={{ color: '#666', fontSize: '16px' }}>{storageStatus}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const qrData = JSON.stringify(claimToken);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">🔐 Secure Credential Issuance</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          {/* Storage Status */}
          <div style={{
            backgroundColor: '#dcfce7',
            border: '1px solid #86efac',
            borderRadius: '12px',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '14px',
            color: '#16a34a',
            fontWeight: '600'
          }}>
            {storageStatus}
          </div>

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
              color: '#16a34a',
              fontWeight: '600',
              marginBottom: '24px'
            }}>
              ✅ Credential claimed successfully
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
                  <li>Credential issued only if DID matches</li>
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
              </div>

              {/* Debug Button */}
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button
                  onClick={handleVerifyTokenStatus}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f1f5f9',
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  🔍 Verify Token Status
                </button>
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
                  <li>✅ Backend validation (not just client-side)</li>
                </ul>
              </div>
            </>
          )}

          {/* Footer */}
          <div className="qr-footer">
            <p className="qr-note">
              ⚠️ This token can only be claimed by <strong>{student.name}</strong>
              {student.did && <> with DID: <code>{student.did.slice(0, 20)}...</code></>}
            </p>
            {claimStatus === 'pending' && (
              <button className="confirm-button" onClick={onMarkAsIssued}>
                ✓ Mark as Issued (After Student Claims)
              </button>
            )}
            {claimStatus === 'expired' && (
              <button 
                className="confirm-button" 
                disabled 
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                Token Expired - Regenerate Above
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SecureQRModal;