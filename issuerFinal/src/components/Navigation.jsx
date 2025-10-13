// src/components/Navigation.jsx
import './Navigation.css';

function Navigation({ activeTab, onTabChange }) {
  return (
    <nav className="nav">
      <button
        className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onTabChange('dashboard')}
      >
        <span className="nav-icon">📊</span>
        Dashboard
      </button>
      
      <button
        className={`nav-button ${activeTab === 'students' ? 'active' : ''}`}
        onClick={() => onTabChange('students')}
      >
        <span className="nav-icon">👥</span>
        Students
      </button>
      
      <button
        className="nav-button"
        onClick={() => onTabChange('settings')}
      >
        <span className="nav-icon">⚙️</span>
        Settings
      </button>
    </nav>
  );
}

export default Navigation;