// src/components/Header.jsx
import './Header.css';

function Header({ issuerInfo }) {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon">🎓</div>
          <div>
            <div className="logo-text">VoltusWave University</div>
            <div className="logo-subtext">Credential Issuer Platform</div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="blockchain-status">
            <div className="green-dot"></div>
            <span className="status-text">
              {issuerInfo ? 'Blockchain Connected' : 'Connecting...'}
            </span>
          </div>
          
          <div className="user-menu">
            <div className="user-avatar">A</div>
            <span className="user-name">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;