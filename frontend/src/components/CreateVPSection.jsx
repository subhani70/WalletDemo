import React, { useState } from 'react'
import { vpAPI } from '../services/api'

export default function CreateVPSection({ addLog, selectedCredentials, credentials }) {
  const [loading, setLoading] = useState(false)
  const [holderDID, setHolderDID] = useState('did:ethr:development:0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0')
  const [challenge, setChallenge] = useState('challenge-12345')
  const [createdVP, setCreatedVP] = useState(null)

  const handleCreateVP = async () => {
    if (selectedCredentials.length === 0) {
      addLog('Please select at least one credential', 'error')
      return
    }

    setLoading(true)
    try {
      const { data } = await vpAPI.create({
        holderDID,
        credentialIds: selectedCredentials,
        challenge
      })
      setCreatedVP(data)
      addLog('Verifiable Presentation created', 'success')
    } catch (error) {
      addLog(`Failed to create VP: ${error.message}`, 'error')
    }
    setLoading(false)
  }

  const copyVP = () => {
    if (createdVP?.vpJwt) {
      navigator.clipboard.writeText(createdVP.vpJwt)
      addLog('VP JWT copied to clipboard', 'info')
    }
  }

  return (
    <section className="card">
      <h2>🎭 Create Verifiable Presentation</h2>
      
      <div className="form-group">
        <label>Holder DID</label>
        <input
          type="text"
          className="input"
          value={holderDID}
          onChange={(e) => setHolderDID(e.target.value)}
        />
      </div>
      
      <div className="form-group">
        <label>Challenge (Nonce)</label>
        <input
          type="text"
          className="input"
          value={challenge}
          onChange={(e) => setChallenge(e.target.value)}
          placeholder="Enter verifier's challenge"
        />
      </div>
      
      <div className="selected-creds">
        <h4>Selected Credentials:</h4>
        {selectedCredentials.length === 0 ? (
          <p className="empty-state">No credentials selected</p>
        ) : (
          <ul>
            {selectedCredentials.map(id => {
              const cred = credentials.find(c => c.id === id)
              return cred ? (
                <li key={id}>
                  {cred.data.name} - {cred.data.degree}
                </li>
              ) : null
            })}
          </ul>
        )}
      </div>
      
      <button 
        className="btn btn-primary"
        onClick={handleCreateVP}
        disabled={loading || selectedCredentials.length === 0}
      >
        {loading ? 'Creating...' : 'Create Presentation'}
      </button>
      
      {createdVP && (
        <div className="result-box">
          <h3>Created Presentation</h3>
          <div className="jwt-container">
            <label>VP JWT:</label>
            <textarea 
              className="input textarea" 
              value={createdVP.vpJwt} 
              readOnly
            />
            <button className="btn btn-secondary btn-sm" onClick={copyVP}>
              Copy VP JWT
            </button>
          </div>
        </div>
      )}
    </section>
  )
}