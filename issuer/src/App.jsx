import { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

const API_BASE = 'http://localhost:5000';

// ===== Dashboard Component =====
function Dashboard() {
  const [issuers, setIssuers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadIssuers();
  }, []);

  const loadIssuers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/issuer/issuers`);
      setIssuers(response.data.issuers);
    } catch (error) {
      console.error('Failed to load issuers:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="header">
        <h1>🏛️ Issuer Portal</h1>
        <p>Manage credential issuers and issue verifiable credentials</p>
      </div>

      <div className="actions">
        <button onClick={() => navigate('/create-issuer')} className="btn-primary">
          ➕ Create New Issuer
        </button>
      </div>

      <div className="issuers-grid">
        {issuers.length === 0 ? (
          <div className="empty-state">
            <p>No issuers yet. Create your first issuer organization!</p>
          </div>
        ) : (
          issuers.map(issuer => (
            <div key={issuer.id} className="issuer-card">
              <div className="issuer-icon">
                {issuer.type === 'university' && '🎓'}
                {issuer.type === 'employer' && '🏢'}
                {issuer.type === 'government' && '🏛️'}
                {issuer.type === 'certification' && '📜'}
              </div>
              <h3>{issuer.name}</h3>
              <p className="issuer-type">{issuer.type}</p>
              <p className="issuer-stats">{issuer.credentialsIssued} credentials issued</p>
              <p className="issuer-did" title={issuer.did}>
                {issuer.did.substring(0, 30)}...
              </p>
              <button 
                onClick={() => navigate(`/issuer/${issuer.id}`)}
                className="btn-secondary"
              >
                View Details →
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===== Create Issuer Component =====
function CreateIssuer() {
  const [name, setName] = useState('');
  const [type, setType] = useState('university');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/issuer/create-issuer`, {
        name,
        type,
        description
      });

      alert(`✅ Issuer created!\nDID: ${response.data.issuer.did}`);
      navigate('/');
    } catch (error) {
      alert('❌ Failed to create issuer: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Create New Issuer</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Organization Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., MIT, Google, US Government"
            required
          />
        </div>

        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="university">🎓 University</option>
            <option value="employer">🏢 Employer</option>
            <option value="government">🏛️ Government</option>
            <option value="certification">📜 Certification Body</option>
          </select>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the organization"
            rows="3"
          />
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating...' : 'Create Issuer'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== Issuer Details Component =====
function IssuerDetails() {
  const [issuer, setIssuer] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const navigate = useNavigate();
  const issuerId = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadIssuerData();
  }, []);

  const loadIssuerData = async () => {
    try {
      const issuerRes = await axios.get(`${API_BASE}/issuer/issuers/${issuerId}`);
      setIssuer(issuerRes.data);

      const credsRes = await axios.get(`${API_BASE}/issuer/issuers/${issuerId}/credentials`);
      setCredentials(credsRes.data.credentials);
    } catch (error) {
      console.error('Failed to load issuer:', error);
    }
  };

  if (!issuer) return <div>Loading...</div>;

  return (
    <div className="issuer-details">
      <button onClick={() => navigate('/')} className="btn-back">← Back</button>
      
      <div className="issuer-header">
        <h1>{issuer.name}</h1>
        <span className="badge">{issuer.type}</span>
      </div>

      <div className="issuer-info">
        <div className="info-row">
          <strong>DID:</strong>
          <code>{issuer.did}</code>
        </div>
        <div className="info-row">
          <strong>Address:</strong>
          <code>{issuer.address}</code>
        </div>
        <div className="info-row">
          <strong>Credentials Issued:</strong>
          <span>{issuer.credentialsIssued}</span>
        </div>
      </div>

      <div className="actions">
        <button 
          onClick={() => navigate(`/issue-credential/${issuerId}`)}
          className="btn-primary"
        >
          📜 Issue New Credential
        </button>
      </div>

      <h2>Issued Credentials</h2>
      <div className="credentials-list">
        {credentials.length === 0 ? (
          <p>No credentials issued yet.</p>
        ) : (
          credentials.map(cred => (
            <div key={cred.id} className="credential-item">
              <div>
                <strong>{cred.type}</strong>
                <p>To: {cred.subject}</p>
                <small>{new Date(cred.issuedAt).toLocaleString()}</small>
              </div>
              <span className={`status ${cred.status}`}>{cred.status}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ===== Issue Credential Component =====
function IssueCredential() {
  const [subjectDID, setSubjectDID] = useState('');
  const [credentialType, setCredentialType] = useState('UniversityDegreeCredential');
  const [claims, setClaims] = useState([{ key: '', value: '' }]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const issuerId = window.location.pathname.split('/').pop();

  const addClaim = () => {
    setClaims([...claims, { key: '', value: '' }]);
  };

  const updateClaim = (index, field, value) => {
    const newClaims = [...claims];
    newClaims[index][field] = value;
    setClaims(newClaims);
  };

  const removeClaim = (index) => {
    setClaims(claims.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const claimsObj = {};
      claims.forEach(claim => {
        if (claim.key && claim.value) {
          claimsObj[claim.key] = claim.value;
        }
      });

      const response = await axios.post(`${API_BASE}/issuer/issue-credential`, {
        issuerId,
        subjectDID,
        credentialType,
        claims: claimsObj
      });

      alert(`✅ Credential issued successfully!\n\nJWT: ${response.data.credential.jwt.substring(0, 50)}...`);
      navigate(`/issuer/${issuerId}`);
    } catch (error) {
      alert('❌ Failed to issue credential: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <button onClick={() => navigate(`/issuer/${issuerId}`)} className="btn-back">← Back</button>
      
      <h2>Issue New Credential</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Recipient DID</label>
          <input
            type="text"
            value={subjectDID}
            onChange={(e) => setSubjectDID(e.target.value)}
            placeholder="did:ethr:VoltusWave:0x..."
            required
          />
        </div>

        <div className="form-group">
          <label>Credential Type</label>
          <select value={credentialType} onChange={(e) => setCredentialType(e.target.value)}>
            <option value="UniversityDegreeCredential">🎓 University Degree</option>
            <option value="EmploymentCredential">🏢 Employment</option>
            <option value="GovernmentIDCredential">🏛️ Government ID</option>
            <option value="CertificationCredential">📜 Certification</option>
          </select>
        </div>

        <div className="form-group">
          <label>Claims</label>
          {claims.map((claim, index) => (
            <div key={index} className="claim-row">
              <input
                type="text"
                placeholder="Key (e.g., degree)"
                value={claim.key}
                onChange={(e) => updateClaim(index, 'key', e.target.value)}
              />
              <input
                type="text"
                placeholder="Value (e.g., Bachelor of Science)"
                value={claim.value}
                onChange={(e) => updateClaim(index, 'value', e.target.value)}
              />
              <button type="button" onClick={() => removeClaim(index)}>✕</button>
            </div>
          ))}
          <button type="button" onClick={addClaim} className="btn-secondary">
            + Add Claim
          </button>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Issuing...' : '📜 Issue Credential'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ===== Main App Component =====
function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/create-issuer" element={<CreateIssuer />} />
        <Route path="/issuer/:id" element={<IssuerDetails />} />
        <Route path="/issue-credential/:id" element={<IssueCredential />} />
      </Routes>
    </div>
  );
}

export default App;