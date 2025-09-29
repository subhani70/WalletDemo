import React, { useState } from 'react'
import { vcAPI, vpAPI } from '../services/api'

export default function VerifySection({ addLog }) {
  const [vcJwt, setVcJwt] = useState('')
  const [vcResult, setVcResult] = useState(null)
  const [vpJwt, setVpJwt] = useState('')
  const [vpChallenge, setVpChallenge] = useState('challenge-12345')
  const [vpResult, setVpResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleVerifyVC = async () => {
    if (!vcJwt) return
    setLoading(true)
    try {
      const { data } = await vcAPI.verify(vcJwt)
      setVcResult(data)
      addLog('Credential verified successfully', 'success')
    } catch (error) {
      addLog(`VC verification failed: ${error.message}`, 'error')
    }
    setLoading(false)
  }

  const handleVerifyVP = async () => {
    if (!vpJwt) return
    setLoading(true)
    try {
      const { data } = await vpAPI.verify(vpJwt, vpChallenge)
      setVpResult(data)
      addLog('Presentation verified successfully', 'success')
    } catch (error) {
      addLog(`VP verification failed: ${error.message}`, 'error')
    }
    setLoading(false)
  }

  return (
    <section className="card">
      <h2>🔍 Verify Credentials</h2>
      
      <div className="subsection">
        <h3>Verify Credential (VC)</h3>
        <div className="form-group">
          <label>VC JWT Token</label>
          <textarea
            className="input textarea"
            placeholder="Paste VC JWT here..."
            value={vcJwt}
            onChange={(e) => setVcJwt(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleVerifyVC}
          disabled={loading || !vcJwt}
        >
          Verify Credential
        </button>
        
        {vcResult && (
          <div className="result-box">
            <h4>Verification Result</h4>
            <p className={`status ${vcResult.verified ? 'success' : 'error'}`}>
              Status: {vcResult.verified ? '✅ Valid' : '❌ Invalid'}
            </p>
            <details>
              <summary>Full Result</summary>
              <pre>{JSON.stringify(vcResult, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
      
      <div className="subsection">
        <h3>Verify Presentation (VP)</h3>
        <div className="form-group">
          <label>VP JWT Token</label>
          <textarea
            className="input textarea"
            placeholder="Paste VP JWT here..."
            value={vpJwt}
            onChange={(e) => setVpJwt(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>Challenge</label>
          <input
            type="text"
            className="input"
            value={vpChallenge}
            onChange={(e) => setVpChallenge(e.target.value)}
          />
        </div>
        <button 
          className="btn btn-primary"
          onClick={handleVerifyVP}
          disabled={loading || !vpJwt}
        >
          Verify Presentation
        </button>
        
        {vpResult && (
          <div className="result-box">
            <h4>Verification Result</h4>
            <p className={`status ${vpResult.verified ? 'success' : 'error'}`}>
              Status: {vpResult.verified ? '✅ Valid' : '❌ Invalid'}
            </p>
            <details>
              <summary>Full Result</summary>
              <pre>{JSON.stringify(vpResult, null, 2)}</pre>
            </details>
          </div>
        )}
      </div>
    </section>
  )
}