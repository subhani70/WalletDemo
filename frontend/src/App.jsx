import React, { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import DIDSection from './components/DIDSection'
import IssueVCSection from './components/IssueVCSection'
import WalletSection from './components/WalletSection'
import CreateVPSection from './components/CreateVPSection'
import VerifySection from './components/VerifySection'
import ActivityLog from './components/ActivityLog'
import { healthAPI } from './services/api'

function App() {
  const [logs, setLogs] = useState([])
  const [credentials, setCredentials] = useState([])
  const [selectedCredentials, setSelectedCredentials] = useState([])
  const [isConnected, setIsConnected] = useState(false)

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [{timestamp, message, type}, ...prev].slice(0, 50))
    
    // Show toast notification
    if (type === 'error') {
      toast.error(message)
    } else if (type === 'success') {
      toast.success(message)
    } else {
      toast.info(message)
    }
  }

  const checkHealth = async () => {
    try {
      await healthAPI.check()
      setIsConnected(true)
      addLog('Connected to backend', 'success')
    } catch (error) {
      setIsConnected(false)
      addLog('Backend connection failed', 'error')
    }
  }

  useEffect(() => {
    checkHealth()
    const interval = setInterval(checkHealth, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1> Decentralized Identity Wallet</h1>
        <p className="subtitle">W3C Verifiable Credentials on Private Blockchain</p>
        <div className="connection-status">
         <span>Voltus Wave</span>
        </div>
      </header>

      <main className="app-main">
        <div className="sections-grid">
          <DIDSection addLog={addLog} />
          <IssueVCSection addLog={addLog} />
          <WalletSection 
            addLog={addLog} 
            credentials={credentials}
            setCredentials={setCredentials}
            selectedCredentials={selectedCredentials}
            setSelectedCredentials={setSelectedCredentials}
          />
          <CreateVPSection 
            addLog={addLog} 
            selectedCredentials={selectedCredentials}
            credentials={credentials}
          />
          <VerifySection addLog={addLog} />
        </div>
        
        <ActivityLog logs={logs} />
      </main>

      <ToastContainer
        position="bottom-right"
        theme="dark"
        autoClose={3000}
      />
    </div>
  )
}

export default App