// verifier-frontend/src/App.jsx
// COMPLETE FILE - Enhanced with History Details

import { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import QRModal from './components/QRModal';
import {
  fetchVerifierInfo,
  createVerificationRequest,
  getSessionStatus,
  verifyPresentation,
  checkHealth
} from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('verify');
  const [verifierInfo, setVerifierInfo] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Verify tab states
  const [vpJwt, setVpJwt] = useState('');
  const [challenge, setChallenge] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Request tab states
  const [verificationSession, setVerificationSession] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // History tab states
  const [verificationHistory, setVerificationHistory] = useState([]);

  useEffect(() => {
    loadVerifierInfo();
    checkConnection();
  }, []);

  // Poll for session updates
  useEffect(() => {
    if (verificationSession && isPolling) {
      const interval = setInterval(async () => {
        try {
          const data = await getSessionStatus(verificationSession.id);

          if (data.session && data.session.status === 'verified') {
            setVerificationResult(data.session.verificationResult);
            setIsPolling(false);
            setShowQRModal(false);

            // Extract holder name
            let holderName = 'Unknown';
            try {
              const creds = data.session.verificationResult?.verifiablePresentation?.verifiableCredential;
              if (creds && creds.length > 0) {
                const firstCred = creds[0];
                let credData = null;

                if (typeof firstCred === 'string') {
                  const parts = firstCred.split('.');
                  const payload = JSON.parse(atob(parts[1]));
                  credData = payload.vc?.credentialSubject;
                } else if (typeof firstCred === 'object') {
                  credData = firstCred.credentialSubject || firstCred;
                }

                if (credData) {
                  holderName = credData.studentName || credData.name || credData.fullName || 'Unknown';
                }
              }
            } catch (e) {
              console.error('Failed to extract holder name:', e);
            }

            addToHistory({
              verified: true,
              challenge: data.session.challenge,
              timestamp: new Date().toISOString(),
              credentials: data.session.verificationResult?.verifiablePresentation?.verifiableCredential?.length || 0,
              holderName: holderName,
              holderDID: data.session.verificationResult?.verifiablePresentation?.holder
            });

            setActiveTab('history');
          }
        } catch (error) {
          console.error('Polling error:', error);
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [verificationSession, isPolling]);

  const loadVerifierInfo = async () => {
    try {
      const data = await fetchVerifierInfo();
      setVerifierInfo(data);
      console.log('✅ Verifier info loaded:', data);
    } catch (error) {
      console.error('❌ Failed to fetch verifier info:', error);
    }
  };

  const checkConnection = async () => {
    try {
      await checkHealth();
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
      console.log(error.message)
    }
  };

  const handleGenerateQR = async () => {
    try {
      const data = await createVerificationRequest(
        ['University Degree Certificate'],
        'VoltusWave Verification Service',
        'Credential Verification'
      );

      if (data.success) {
        setVerificationSession(data.session);
        setChallenge(data.session.challenge);
        setShowQRModal(true);
        setIsPolling(true);
        console.log('✅ Verification session created:', data.session.id);
      }
    } catch (error) {
      console.error('❌ Failed to create verification request:', error);
      alert('Failed to generate QR code: ' + error.message);
    }
  };

  const handleVerifyPresentation = async () => {
    if (!vpJwt.trim()) {
      alert('Please paste a VP JWT');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifyPresentation(vpJwt, challenge || undefined);
      setVerificationResult(result);

      // Extract holder name
      let holderName = 'Unknown';
      try {
        const creds = result?.verifiablePresentation?.verifiableCredential;
        if (creds && creds.length > 0) {
          const firstCred = creds[0];
          let credData = null;

          if (typeof firstCred === 'string') {
            const parts = firstCred.split('.');
            const payload = JSON.parse(atob(parts[1]));
            credData = payload.vc?.credentialSubject;
          } else if (typeof firstCred === 'object') {
            credData = firstCred.credentialSubject || firstCred;
          }

          if (credData) {
            holderName = credData.studentName || credData.name || credData.fullName || 'Unknown';
          }
        }
      } catch (e) {
        console.error('Failed to extract holder name:', e);
      }

      addToHistory({
        verified: result.verified,
        challenge: challenge,
        timestamp: new Date().toISOString(),
        credentials: result.verifiablePresentation?.verifiableCredential?.length || 0,
        holderName: holderName,
        holderDID: result.verifiablePresentation?.holder
      });

      if (result.verified) {
        setTimeout(() => {
          setActiveTab('history');
        }, 1500);
      }

    } catch (error) {
      setVerificationResult({
        verified: false,
        error: error.message
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const addToHistory = (entry) => {
    setVerificationHistory([
      { id: Date.now(), ...entry },
      ...verificationHistory.slice(0, 19)
    ]);
  };

  const clearForm = () => {
    setVpJwt('');
    setChallenge('');
    setVerificationResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header verifierInfo={verifierInfo} isConnected={isConnected} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* VERIFY TAB */}
        {activeTab === 'verify' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Verify Presentation
              </h2>
              <p className="text-gray-600">
                Paste a Verifiable Presentation JWT to verify its authenticity
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Two Ways to Verify</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Option 1:</strong> Generate QR in "Request via QR" tab - wallet auto-submits</li>
                <li><strong>Option 2:</strong> Paste VP JWT manually here</li>
              </ul>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verifiable Presentation JWT
              </label>
              <textarea
                value={vpJwt}
                onChange={(e) => setVpJwt(e.target.value)}
                placeholder="Paste VP JWT here..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none font-mono text-sm"
                rows="6"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Challenge (Optional)
              </label>
              <input
                type="text"
                value={challenge}
                onChange={(e) => setChallenge(e.target.value)}
                placeholder="Leave empty if no challenge was used"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Only required if the presentation was created with a challenge
              </p>
            </div>

            {verificationResult && (
              <div className={`rounded-xl p-6 mb-6 ${verificationResult.verified
                  ? 'bg-green-50 border-2 border-green-200'
                  : 'bg-red-50 border-2 border-red-200'
                }`}>
                <div className="flex items-center space-x-4">
                  <div className="text-5xl">
                    {verificationResult.verified ? '✅' : '❌'}
                  </div>
                  <div>
                    <h3 className={`text-2xl font-bold ${verificationResult.verified ? 'text-green-700' : 'text-red-700'
                      }`}>
                      {verificationResult.verified ? 'Verified Successfully!' : 'Verification Failed'}
                    </h3>
                    {verificationResult.verified ? (
                      <p className="text-green-600 mt-1">
                        Redirecting to History to view details...
                      </p>
                    ) : verificationResult.error && (
                      <p className="text-red-600 mt-1">{verificationResult.error}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={handleVerifyPresentation}
                disabled={isVerifying || !vpJwt.trim()}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg disabled:cursor-not-allowed"
              >
                {isVerifying ? '⏳ Verifying...' : '🔍 Verify Presentation'}
              </button>
              <button
                onClick={clearForm}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* REQUEST TAB */}
        {activeTab === 'request' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Request Credentials via QR
              </h2>
              <p className="text-gray-600">
                Generate a QR code for users to scan with their wallet
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3">📱 How it works (No manual copy-paste!)</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Click "Generate QR Code" to create verification request</li>
                <li>User scans QR code with their SSI Wallet</li>
                <li>User selects which credentials to share</li>
                <li>User confirms - VP is automatically submitted to backend</li>
                <li><strong>This page auto-detects and shows results!</strong></li>
              </ol>
            </div>

            {verificationSession && (
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h4 className="font-semibold text-gray-900 mb-4">Current Session</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Session ID:</span>
                    <span className="font-mono text-xs text-gray-900">{verificationSession.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Challenge:</span>
                    <span className="font-mono text-xs text-gray-900">{verificationSession.challenge}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-semibold ${verificationSession.status === 'verified' ? 'text-green-600' :
                        verificationSession.status === 'failed' ? 'text-red-600' :
                          'text-yellow-600'
                      }`}>
                      {verificationSession.status.toUpperCase()}
                    </span>
                  </div>
                  {isPolling && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                      <span className="text-sm font-medium text-green-800">
                        🔄 Waiting for wallet to submit credentials...
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <button
              onClick={handleGenerateQR}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg text-lg"
            >
              📱 Generate QR Code
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Verification History
              </h2>
              <p className="text-gray-600">
                Recent verification attempts with full credential details
              </p>
            </div>

            {verificationHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Verifications Yet
                </h3>
                <p className="text-gray-600">
                  Verification history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {verificationHistory.map((entry, entryIndex) => (
                  <div
                    key={entry.id}
                    className={`rounded-xl border-2 overflow-hidden ${entry.verified
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                      }`}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-5xl">
                            {entry.verified ? '✅' : '❌'}
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${entry.verified ? 'text-green-700' : 'text-red-700'
                              }`}>
                              {entry.verified ? 'Verified' : 'Failed'}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {new Date(entry.timestamp).toLocaleString()}
                            </div>
                            {entry.holderName && (
                              <div className="text-base font-semibold text-gray-900 mt-2">
                                👤 {entry.holderName}
                              </div>
                            )}
                            {entry.credentials > 0 && (
                              <div className="text-sm text-gray-500 mt-1">
                                📜 {entry.credentials} credential(s) verified
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show details for most recent verified entry */}
                    {entry.verified && entryIndex === 0 && verificationResult?.verifiablePresentation && (
                      <div className="border-t-2 border-green-300 bg-white p-6">
                        <h4 className="font-bold text-gray-900 mb-4 text-lg">📋 Credential Details</h4>

                        {verificationResult.verifiablePresentation.holder && (
                          <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                            <div className="text-sm text-gray-600 mb-1">Holder DID:</div>
                            <div className="font-mono text-xs text-gray-900 break-all">
                              {verificationResult.verifiablePresentation.holder}
                            </div>
                          </div>
                        )}

                        {verificationResult.verifiablePresentation.verifiableCredential?.map((cred, idx) => {
                          let credentialData = null;

                          try {
                            if (typeof cred === 'string') {
                              const parts = cred.split('.');
                              if (parts.length === 3) {
                                const payload = JSON.parse(atob(parts[1]));
                                credentialData = payload.vc?.credentialSubject;
                              }
                            } else if (typeof cred === 'object') {
                              credentialData = cred.credentialSubject || cred;
                            }
                          } catch (error) {
                            credentialData = typeof cred === 'object' ? cred : null;
                            console.log(error.message)
                          }

                          return (
                            <div key={idx} className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-200 mb-4">
                              <h5 className="font-semibold text-purple-900 mb-3">
                                Credential #{idx + 1}
                              </h5>

                              {credentialData && (
                                <div className="space-y-2">
                                  {Object.entries(credentialData).map(([key, value]) => {
                                    if (key === 'id' || key === '@context' || key === 'type' ||
                                      key === 'proof' || key === 'issuer' || key === 'issuanceDate') {
                                      return null;
                                    }

                                    if (typeof value === 'object' && value !== null) {
                                      return null;
                                    }

                                    return (
                                      <div key={key} className="grid grid-cols-3 gap-2">
                                        <span className="text-sm font-medium text-gray-600 capitalize">
                                          {key.replace(/([A-Z])/g, ' $1').trim()}:
                                        </span>
                                        <span className="col-span-2 text-sm text-gray-900 font-semibold">
                                          {String(value)}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="flex space-x-3 mt-4">
                          <button
                            onClick={() => {
                              const data = {
                                verified: true,
                                timestamp: entry.timestamp,
                                holderName: entry.holderName,
                                holder: entry.holderDID,
                                credentials: verificationResult.verifiablePresentation.verifiableCredential.map((cred, i) => {
                                  let credData = null;
                                  try {
                                    if (typeof cred === 'string') {
                                      const parts = cred.split('.');
                                      const payload = JSON.parse(atob(parts[1]));
                                      credData = payload.vc?.credentialSubject;
                                    } else if (typeof cred === 'object') {
                                      credData = cred.credentialSubject || cred;
                                    }
                                  } catch (error) {
                                    console.log(error.message)
                                  }

                                  return {
                                    credential: i + 1,
                                    data: credData || cred
                                  };
                                })
                              };
                              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `verification-${entry.holderName || 'unknown'}-${Date.now()}.json`;
                              a.click();
                            }}
                            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            📥 Export JSON
                          </button>
                          <button
                            onClick={() => {
                              let report = `VERIFICATION REPORT\n==================\n\n`;
                              report += `Status: VERIFIED ✓\n`;
                              report += `Date: ${new Date(entry.timestamp).toLocaleString()}\n`;
                              report += `Holder: ${entry.holderName || 'Unknown'}\n`;
                              report += `DID: ${entry.holderDID}\n\n`;

                              verificationResult.verifiablePresentation.verifiableCredential.forEach((cred, i) => {
                                let credData = null;
                                try {
                                  if (typeof cred === 'string') {
                                    const parts = cred.split('.');
                                    const payload = JSON.parse(atob(parts[1]));
                                    credData = payload.vc?.credentialSubject;
                                  } else if (typeof cred === 'object') {
                                    credData = cred.credentialSubject || cred;
                                  }
                                } catch (error) {
                                  console.log(error.message)
                                }

                                report += `Credential ${i + 1}:\n`;
                                if (credData) {
                                  Object.entries(credData).forEach(([key, value]) => {
                                    if (key !== 'id' && key !== '@context' && key !== 'type' &&
                                      key !== 'proof' && key !== 'issuer' && key !== 'issuanceDate') {
                                      report += `  ${key}: ${value}\n`;
                                    }
                                  });
                                }
                                report += `\n`;
                              });

                              const blob = new Blob([report], { type: 'text/plain' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `verification-${entry.holderName || 'unknown'}-${Date.now()}.txt`;
                              a.click();
                            }}
                            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                          >
                            📄 Export TXT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showQRModal && verificationSession && (
        <QRModal
          session={verificationSession}
          onClose={() => {
            setShowQRModal(false);
            setIsPolling(false);
          }}
          isPolling={isPolling}
        />
      )}
    </div>
  );
}

export default App;