import React, { useEffect } from 'react'
import { vcAPI } from '../services/api'

export default function WalletSection({ 
  addLog, 
  credentials, 
  setCredentials, 
  selectedCredentials, 
  setSelectedCredentials 
}) {
  const fetchCredentials = async () => {
    try {
      const { data } = await vcAPI.list()
      setCredentials(data)
      addLog(`Loaded ${data.length} credential(s)`, 'info')
    } catch (error) {
      addLog(`Failed to load credentials: ${error.message}`, 'error')
    }
  }

  useEffect(() => {
    fetchCredentials()
  }, [])

  const toggleSelection = (credId) => {
    setSelectedCredentials(prev => 
      prev.includes(credId) 
        ? prev.filter(id => id !== credId)
        : [...prev, credId]
    )
  }

  const copyJWT = (credential) => {
    if (credential.jwt) {
      navigator.clipboard.writeText(credential.jwt)
      addLog(`Copied JWT for credential ${credential.id}`, 'info')
    } else {
      addLog('JWT not found for this credential', 'error')
    }
  }

  const verifyCredential = async (credential) => {
    if (!credential.jwt) {
      addLog('No JWT found for verification', 'error')
      return
    }
    
    try {
      const { data } = await vcAPI.verify(credential.jwt)
      if (data.verified) {
        addLog(`✅ Credential ${credential.id} is VALID`, 'success')
      } else {
        addLog(`❌ Credential ${credential.id} is INVALID`, 'error')
      }
    } catch (error) {
      addLog(`Failed to verify: ${error.message}`, 'error')
    }
  }

  return (
    <section className="card">
      <h2>👛 Credential Wallet</h2>
      
      <button className="btn btn-secondary" onClick={fetchCredentials}>
        Refresh Credentials
      </button>
      
      <div className="credentials-list">
        {credentials.length === 0 ? (
          <p className="empty-state">No credentials stored yet</p>
        ) : (
          credentials.map(cred => (
            <div key={cred.id} className="credential-item">
              <input
                type="checkbox"
                id={`cred-${cred.id}`}
                checked={selectedCredentials.includes(cred.id)}
                onChange={() => toggleSelection(cred.id)}
              />
              <label htmlFor={`cred-${cred.id}`}>
                <div className="cred-header">
                  <span className="cred-id">{cred.id}</span>
                  <span className="cred-date">
                    {new Date(cred.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="cred-details">
                  <p><strong>Subject:</strong> {cred.data.name}</p>
                  <p><strong>Degree:</strong> {cred.data.degree}</p>
                  <p><strong>University:</strong> {cred.data.university}</p>
                </div>
              </label>
              <div className="cred-actions" style={{ marginLeft: '10px' }}>
                <button 
                  className="btn btn-sm"
                  onClick={() => copyJWT(cred)}
                  title="Copy JWT to clipboard"
                >
                  📋 Copy JWT
                </button>
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={() => verifyCredential(cred)}
                  title="Quick verify this credential"
                  style={{ marginLeft: '5px' }}
                >
                  ✓ Verify
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {selectedCredentials.length > 0 && (
        <p className="selection-count">
          {selectedCredentials.length} credential(s) selected for presentation
        </p>
      )}
    </section>
  )
}