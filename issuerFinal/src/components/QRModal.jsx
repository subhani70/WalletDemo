// src/components/QRModal.jsx
import { QRCodeSVG } from 'qrcode.react';
import './QRModal.css';

function QRModal({ student, issuerInfo, onClose, onMarkAsIssued }) {
  if (!student) return null;

  const credentialOffer = {
    type: 'CREDENTIAL_OFFER',
    issuer: issuerInfo?.did || 'VoltusWave University',
    credentialType: 'University Degree Certificate',
    credentialData: {
      credentialType: 'University Degree Certificate',
      studentName: student.name,
      studentId: student.studentId,
      email: student.email,
      program: student.program,
      graduationYear: student.graduationYear,
      gpa: student.gpa,
      issueDate: new Date().toISOString().split('T')[0],
      university: 'VoltusWave University',
      degreeType: student.program.includes('Master') ? 'Master\'s Degree' : 'Bachelor\'s Degree'
    }
  };

  const qrData = JSON.stringify(credentialOffer);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Issue Credential to Student</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          {/* Student Card */}
          <div className="student-card">
            <div className="student-card-header">
              <div className="large-avatar">{student.name[0]}</div>
              <div>
                <h3 className="student-card-name">{student.name}</h3>
                <p className="student-card-program">{student.program}</p>
              </div>
            </div>
            <div className="credential-details">
              <div className="detail-row">
                <span className="detail-label">Student ID:</span>
                <span className="detail-value">{student.studentId}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Graduation Year:</span>
                <span className="detail-value">{student.graduationYear}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">GPA:</span>
                <span className="detail-value">{student.gpa}</span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="qr-instructions">
            <h4 className="instruction-title">📱 Instructions for Student</h4>
            <ol className="instruction-list">
              <li>Open your SSI Wallet app</li>
              <li>Go to "Scan" tab</li>
              <li>Point camera at this QR code</li>
              <li>Credential will be automatically added to wallet</li>
            </ol>
          </div>

          {/* QR Code */}
          <div className="qr-container">
            <QRCodeSVG
              value={qrData}
              size={300}
              level="H"
              includeMargin={true}
            />
          </div>

          {/* Footer */}
          <div className="qr-footer">
            <p className="qr-note">
              ⚠️ This QR code contains the credential offer for {student.name}
            </p>
            <button className="confirm-button" onClick={onMarkAsIssued}>
              ✓ Mark as Issued
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRModal;