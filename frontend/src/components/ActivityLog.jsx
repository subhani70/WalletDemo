import React from 'react'

export default function ActivityLog({ logs }) {
  return (
    <section className="card activity-log">
      <h2>📋 Activity Log</h2>
      <div className="log-container">
        {logs.length === 0 ? (
          <p className="empty-state">No activity yet</p>
        ) : (
          logs.map((log, index) => (
            <div key={index} className={`log-entry ${log.type}`}>
              <span className="log-time">{log.timestamp}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}