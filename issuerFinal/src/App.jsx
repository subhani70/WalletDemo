// src/App.jsx
import { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import StudentsTable from './components/StudentsTable';
import SecureQRModal from './components/SecureQRModal';
import AddStudentForm from './components/AddStudentForm';
import { fetchIssuerInfo } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [issuerInfo, setIssuerInfo] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadIssuerInfo();
  }, []);

  const loadIssuerInfo = async () => {
    try {
      const data = await fetchIssuerInfo();
      setIssuerInfo(data);
      console.log('✅ Issuer Info:', data);
    } catch (error) {
      console.error('❌ Failed to fetch issuer info:', error);
      showNotification('Failed to connect to backend', 'error');
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddStudent = (newStudent) => {
    setStudents([...students, newStudent]);
    setShowAddStudentForm(false);
    showNotification(`✅ ${newStudent.name} added successfully!`);
  };

  const handleIssueCredential = (student) => {
    setSelectedStudent(student);
    setShowQRModal(true);
  };

  const handleCloseModal = () => {
    setShowQRModal(false);
    setSelectedStudent(null);
  };

  const handleCloseAddForm = () => {
    setShowAddStudentForm(false);
  };

  const handleMarkAsIssued = () => {
    if (!selectedStudent) return;

    setStudents(students.map(s => 
      s.id === selectedStudent.id ? { ...s, status: 'issued' } : s
    ));
    
    showNotification('✅ Credential issued successfully!');
    handleCloseModal();
  };

  const stats = {
    total: students.length,
    issued: students.filter(s => s.status === 'issued').length,
    pending: students.filter(s => s.status === 'pending').length,
  };

  return (
    <div className="app">
      {/* Notification Toast */}
      {notification && (
        <div className={`notification ${notification.type === 'error' ? 'notification-error' : 'notification-success'}`}>
          <span>{notification.type === 'error' ? '❌' : '✅'}</span>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <Header issuerInfo={issuerInfo} />

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="main-content">
        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} issuerInfo={issuerInfo} />
        )}
        
        {activeTab === 'students' && (
          <StudentsTable 
            students={students} 
            onIssueCredential={handleIssueCredential}
            onAddStudent={() => setShowAddStudentForm(true)}
          />
        )}
      </main>

      {/* Secure QR Code Modal */}
      {showQRModal && (
        <SecureQRModal
          student={selectedStudent}
          issuerInfo={issuerInfo}
          onClose={handleCloseModal}
          onMarkAsIssued={handleMarkAsIssued}
        />
      )}

      {/* Add Student Form */}
      {showAddStudentForm && (
        <AddStudentForm
          onClose={handleCloseAddForm}
          onAddStudent={handleAddStudent}
        />
      )}
    </div>
  );
}

export default App;