//verifier-frontend/src/components/QRModal.jsx

import { useEffect, useState } from 'react';

function QRModal({ session, onClose, isPolling }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (!session?.expiresAt) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, session.expiresAt - now);
      setTimeRemaining(Math.floor(remaining / 1000));

      if (remaining === 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(JSON.stringify(session))}`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            🔐 Verification Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <span className="text-3xl">🛡️</span>
              <div>
                <h4 className="font-semibold text-blue-900 mb-1">
                  Secure Challenge-Response Protocol
                </h4>
                <p className="text-sm text-blue-800">
                  This session expires in <strong>{timeRemaining ? formatTime(timeRemaining) : '10:00'}</strong> and includes a unique challenge to prevent replay attacks.
                </p>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Session Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Session ID:</span>
                <span className="font-mono text-gray-900 text-xs">{session.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Challenge:</span>
                <span className="font-mono text-gray-900 text-xs">{session.challenge}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  session.status === 'verified' ? 'text-green-600' : 
                  session.status === 'failed' ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {session.status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-gray-100 rounded-xl p-8 flex justify-center mb-6">
            <img 
              src={qrUrl} 
              alt="Verification QR Code"
              className="w-72 h-72 rounded-lg shadow-lg"
            />
          </div>

          {/* Polling Indicator */}
          {isPolling && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                <span className="text-sm font-medium text-green-800">
                  Monitoring for wallet submissions...
                </span>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">📱 Instructions</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Open your SSI Wallet mobile app</li>
              <li>Navigate to the "Verify" tab</li>
              <li>Tap "Scan Verification Request"</li>
              <li>Point camera at this QR code</li>
              <li>Select credentials to share</li>
              <li>Confirm - credentials will be auto-submitted</li>
              <li>Results appear here automatically!</li>
            </ol>
          </div>

          {/* Security Features */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <h4 className="font-semibold text-purple-900 mb-2">🔒 Security Features</h4>
            <ul className="space-y-1 text-sm text-purple-800">
              <li>✓ One-time challenge (prevents replay attacks)</li>
              <li>✓ Time-limited session (10 minutes)</li>
              <li>✓ Cryptographic verification</li>
              <li>✓ DID blockchain validation</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default QRModal;