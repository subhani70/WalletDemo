import React, { useState } from 'react'
import { didAPI } from '../services/api'

export default function DIDSection({ addLog }) {
  const [loading, setLoading] = useState(false)
  const [createdDID, setCreatedDID] = useState(null)
  const [resolveInput, setResolveInput] = useState('')
  const [resolvedDID, setResolvedDID] = useState(null)

  const handleCreateDID = async () => {
    setLoading(true)
    try {
      const { data } = await didAPI.create()
      setCreatedDID(data.did)
      addLog(`DID created: ${data.did.did}`, 'success')
    } catch (error) {
      addLog(`Failed to create DID: ${error.message}`, 'error')
    }
    setLoading(false)
  }

  const handleResolveDID = async () => {
    if (!resolveInput) return
    setLoading(true)
    try {
      const { data } = await didAPI.resolve(resolveInput)
      setResolvedDID(data)
      addLog(`DID resolved: ${resolveInput}`, 'success')
    } catch (error) {
      addLog(`Failed to resolve DID: ${error.message}`, 'error')
    }
    setLoading(false)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    addLog('Copied to clipboard', 'info')
  }

  return (
    <section className="card">
      <h2>🆔 DID Management</h2>
      
      <div className="subsection">
        <h3>Create DID</h3>
        <button 
          className="btn btn-primary" 
          onClick={handleCreateDID}
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create New DID'}
        </button>
        
        {createdDID && (
          <div className="result-box">
            <p><strong>DID:</strong> {createdDID.did}</p>
            <p><strong>Address:</strong> {createdDID.address}</p>
            <p><strong>TX Hash:</strong> {createdDID.txHash}</p>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(createdDID.did)}
            >
              Copy DID
            </button>
          </div>
        )}
      </div>

      <div className="subsection">
        <h3>Resolve DID</h3>
        <div className="input-group">
          <input
            type="text"
            className="input"
            placeholder="did:ethr:development:0x..."
            value={resolveInput}
            onChange={(e) => setResolveInput(e.target.value)}
          />
          <button 
            className="btn btn-primary"
            onClick={handleResolveDID}
            disabled={loading || !resolveInput}
          >
            Resolve
          </button>
        </div>
        
        {resolvedDID && (
          <div className="result-box">
            <pre>{JSON.stringify(resolvedDID, null, 2)}</pre>
          </div>
        )}
      </div>
    </section>
  )
}