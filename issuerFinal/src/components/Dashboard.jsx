// src/components/Dashboard.jsx
import './Dashboard.css';

function Dashboard({ stats, issuerInfo }) {
  return (
    <div className="dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.issued}</div>
            <div className="stat-label">Credentials Issued</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <div className="stat-value">2024</div>
            <div className="stat-label">Graduation Year</div>
          </div>
        </div>
      </div>

      {/* Issuer Info Card */}
      {issuerInfo && (
        <div className="issuer-info-card">
          <h3 className="card-title">Issuer Information</h3>
          <div className="issuer-details">
            <div className="issuer-row">
              <span className="issuer-label">Institution:</span>
              <span className="issuer-value">{issuerInfo.name || 'VoltusWave University'}</span>
            </div>
            <div className="issuer-row">
              <span className="issuer-label">DID:</span>
              <span className="issuer-value-mono">{issuerInfo.did}</span>
            </div>
            <div className="issuer-row">
              <span className="issuer-label">Address:</span>
              <span className="issuer-value-mono">{issuerInfo.address}</span>
            </div>
            <div className="issuer-row">
              <span className="issuer-label">Status:</span>
              <span className="status-badge">🟢 Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;