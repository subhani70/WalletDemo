import React, { useState } from 'react'
import { vcAPI } from '../services/api'

export default function IssueVCSection({ addLog, onIssued }) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    issuerDID: 'did:ethr:development:0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
    subjectDID: 'did:ethr:development:0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
    credentialData: {
      name: 'Alice Johnson',
      degree: 'Bachelor of Science in Computer Science',
      university: 'MIT',
      graduationDate: '2024-05-15',
      gpa: '3.8'
    }
  })
  const [issuedVC, setIssuedVC] = useState(null)

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleIssueVC = async () => {
    setLoading(true)
    try {
      const { data } = await vcAPI.issue(formData)
      console.log('Issued VC Response:', data) // Debug log
      setIssuedVC(data)
      addLog(`VC issued with ID: ${data.id}`, 'success')
      if (onIssued) onIssued()
    } catch (error) {
      console.error('Error issuing VC:', error) // Debug log
      addLog(`Failed to issue VC: ${error.message}`, 'error')
    }
    setLoading(false)
  }

  const copyJWT = () => {
    if (issuedVC?.jwt) {
      navigator.clipboard.writeText(issuedVC.jwt)
      addLog('JWT copied to clipboard', 'info')
    }
  }

  return (
    <section className="card">
      <h2>📜 Issue Verifiable Credential</h2>
      
      <div className="form-grid">
        <div className="form-group">
          <label>Issuer DID</label>
          <input
            type="text"
            className="input"
            value={formData.issuerDID}
            onChange={(e) => handleInputChange('issuerDID', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Subject DID</label>
          <input
            type="text"
            className="input"
            value={formData.subjectDID}
            onChange={(e) => handleInputChange('subjectDID', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            className="input"
            value={formData.credentialData.name}
            onChange={(e) => handleInputChange('credentialData.name', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Degree</label>
          <input
            type="text"
            className="input"
            value={formData.credentialData.degree}
            onChange={(e) => handleInputChange('credentialData.degree', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>University</label>
          <input
            type="text"
            className="input"
            value={formData.credentialData.university}
            onChange={(e) => handleInputChange('credentialData.university', e.target.value)}
          />
        </div>
        
        <div className="form-group">
          <label>Graduation Date</label>
          <input
            type="date"
            className="input"
            value={formData.credentialData.graduationDate}
            onChange={(e) => handleInputChange('credentialData.graduationDate', e.target.value)}
          />
        </div>
      </div>
      
      <button 
        className="btn btn-primary"
        onClick={handleIssueVC}
        disabled={loading}
      >
        {loading ? 'Issuing...' : 'Issue Credential'}
      </button>
      
      {issuedVC && (
        <div className="result-box" style={{ marginTop: '20px' }}>
          <h3>✅ Credential Issued Successfully!</h3>
          
          <div style={{ marginBottom: '15px' }}>
            <p><strong>Credential ID:</strong> {issuedVC.id}</p>
            <p><strong>Issuer:</strong> {issuedVC.issuer}</p>
            <p><strong>Subject:</strong> {issuedVC.subject}</p>
            <p><strong>Issued At:</strong> {new Date(issuedVC.createdAt).toLocaleString()}</p>
          </div>

          <div className="jwt-container">
            <label><strong>JWT Token:</strong></label>
            <textarea 
              className="input textarea" 
              value={issuedVC.jwt || 'JWT not found in response'} 
              readOnly
              style={{ 
                marginTop: '10px',
                minHeight: '150px',
                fontFamily: 'monospace',
                fontSize: '12px',
                wordBreak: 'break-all'
              }}
            />
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={copyJWT}
              style={{ marginTop: '10px' }}
            >
              📋 Copy JWT
            </button>
          </div>

          {/* Debug info */}
          <details style={{ marginTop: '20px' }}>
            <summary>Debug: Full Response</summary>
            <pre style={{ 
              background: '#f0f0f0', 
              padding: '10px', 
              borderRadius: '5px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(issuedVC, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </section>
  )
}