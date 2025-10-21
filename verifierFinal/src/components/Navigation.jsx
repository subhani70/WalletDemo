// verifier-frontend/src/components/Navigation.jsx

function Navigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'verify', label: 'Verify Credentials', icon: '🔍' },
    { id: 'request', label: 'Request via QR', icon: '📱' },
    { id: 'history', label: 'History', icon: '📋' },
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                px-6 py-4 text-sm font-semibold transition-all duration-200
                border-b-2 flex items-center space-x-2
                ${activeTab === tab.id
                  ? 'border-purple-600 text-purple-600 bg-purple-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

export default Navigation;