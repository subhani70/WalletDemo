import { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000';

// Simple QR Code component using Google API
function QRCode({ value, size = 300 }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  
  return (
    <img 
      src={qrUrl} 
      alt="QR Code" 
      style={{ 
        width: size, 
        height: size,
        border: '8px solid white',
        borderRadius: '12px'
      }} 
    />
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('verify');
  const [vpJwt, setVpJwt] = useState('');
  const [challenge, setChallenge] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSession, setVerificationSession] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  // Generate verification request
  const generateVerificationRequest = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/verifier/create-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedCredentials: ['University Degree Certificate'],
          verifierName: 'VoltusWave Verification Service',
          purpose: 'Credential Verification'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setVerificationSession(data.session);
        setChallenge(data.session.challenge);
        setShowQRModal(true);
        console.log('✅ Verification session created:', data.session.id);
      } else {
        alert('Failed to create verification request');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create verification request: ' + error.message);
    }
  };

  // Verify presentation
  const verifyPresentation = async () => {
    if (!vpJwt.trim()) {
      alert('Please paste a VP JWT');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/verify-vp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vpJwt: vpJwt,
          challenge: challenge || undefined
        })
      });

      const result = await response.json();
      setVerificationResult(result);
      console.log('Verification result:', result);

    } catch (error) {
      setVerificationResult({
        verified: false,
        error: error.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '24px',
        marginBottom: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px'
          }}>
            🔍
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>
              Credential Verifier
            </h1>
            <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>
              Verify Self-Sovereign Identity Credentials
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '8px',
        marginBottom: '20px',
        display: 'flex',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
      }}>
        <button
          onClick={() => setActiveTab('verify')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '12px',
            background: activeTab === 'verify' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'verify' ? 'white' : '#64748b',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          🔍 Verify
        </button>
        <button
          onClick={() => setActiveTab('request')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            borderRadius: '12px',
            background: activeTab === 'request' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
            color: activeTab === 'request' ? 'white' : '#64748b',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          📱 Request QR
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '32px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        minHeight: '500px'
      }}>
        {/* VERIFY TAB */}
        {activeTab === 'verify' && (
          <div>
            <h2 style={{ marginTop: 0, color: '#1e293b' }}>
              Verify Presentation
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Paste a Verifiable Presentation JWT to verify
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                VP JWT
              </label>
              <textarea
                value={vpJwt}
                onChange={(e) => setVpJwt(e.target.value)}
                placeholder="Paste VP JWT here..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                fontWeight: '600',
                color: '#1e293b'
              }}>
                Challenge (Optional)
              </label>
              <input
                type="text"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="Leave empty if no challenge"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {verificationResult && (
              <div style={{
                background: verificationResult.verified ? '#dcfce7' : '#fee2e2',
                border: `2px solid ${verificationResult.verified ? '#86efac' : '#fca5a5'}`,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <div style={{ fontSize: '32px' }}>
                    {verificationResult.verified ? '✅' : '❌'}
                  </div>
                  <div>
                    <h3 style={{
                      margin: 0,
                      color: verificationResult.verified ? '#16a34a' : '#dc2626',
                      fontSize: '20px'
                    }}>
                      {verificationResult.verified ? 'Verified Successfully' : 'Verification Failed'}
                    </h3>
                    {verificationResult.error && (
                      <p style={{ margin: '4px 0 0 0', color: '#dc2626' }}>
                        {verificationResult.error}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={verifyPresentation}
              disabled={isVerifying || !vpJwt.trim()}
              style={{
                width: '100%',
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                opacity: isVerifying || !vpJwt.trim() ? 0.5 : 1
              }}
            >
              {isVerifying ? '⏳ Verifying...' : '🔍 Verify Presentation'}
            </button>
          </div>
        )}

        {/* REQUEST TAB */}
        {activeTab === 'request' && (
          <div>
            <h2 style={{ marginTop: 0, color: '#1e293b' }}>
              Request Credentials via QR
            </h2>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>
              Generate a QR code for users to scan with their wallet
            </p>

            {verificationSession && (
              <div style={{
                background: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>
                  Current Session
                </h4>
                <div style={{ fontSize: '14px', color: '#64748b' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Session ID:</strong> {verificationSession.id}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Challenge:</strong> {verificationSession.challenge}
                  </div>
                  <div>
                    <strong>Status:</strong> {verificationSession.status}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={generateVerificationRequest}
              style={{
                width: '100%',
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontWeight: '600',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              📱 Generate QR Code
            </button>
          </div>
        )}
      </div>

      {/* QR Modal */}
      {showQRModal && verificationSession && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowQRModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, color: '#1e293b', textAlign: 'center' }}>
              Scan to Share Credentials
            </h3>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '24px'
            }}>
              <QRCode
                value={JSON.stringify(verificationSession)}
                size={300}
              />
            </div>

            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: '#1e40af',
              marginBottom: '20px'
            }}>
              <strong>Challenge:</strong> {verificationSession.challenge}
            </div>

            <button
              onClick={() => setShowQRModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                border: 'none',
                borderRadius: '12px',
                background: '#e2e8f0',
                color: '#1e293b',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;