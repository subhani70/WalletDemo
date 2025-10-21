// verifier-frontend/src/components/Header.jsx

function Header({ verifierInfo, isConnected }) {
  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-3xl shadow-lg">
              🔍
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {verifierInfo?.verifier?.name || 'Credential Verifier'}
              </h1>
              <p className="text-sm text-gray-600">
                Verify Self-Sovereign Identity Credentials
              </p>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm font-medium text-gray-700">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2 bg-purple-50 px-4 py-2 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                V
              </div>
              <span className="text-sm font-semibold text-gray-800">Verifier</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;