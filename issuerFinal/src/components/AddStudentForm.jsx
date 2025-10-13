import { useState } from 'react';
import './AddStudentForm.css';

function AddStudentForm({ onClose, onAddStudent }) {
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    program: '',
    graduationYear: new Date().getFullYear().toString(),
    gpa: ''
  });

  const [errors, setErrors] = useState({});

  const programs = [
    'Bachelor of Computer Science',
    'Bachelor of Engineering',
    'Bachelor of Information Technology',
    'Bachelor of Business Administration',
    'Master of Computer Science',
    'Master of Data Science',
    'Master of Business Administration',
    'Master of Engineering',
    'PhD in Computer Science',
    'PhD in Engineering'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.program) {
      newErrors.program = 'Program is required';
    }

    if (!formData.graduationYear) {
      newErrors.graduationYear = 'Graduation year is required';
    }

    if (!formData.gpa) {
      newErrors.gpa = 'GPA is required';
    } else if (isNaN(formData.gpa) || formData.gpa < 0 || formData.gpa > 4) {
      newErrors.gpa = 'GPA must be between 0 and 4';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const newStudent = {
        id: Date.now().toString(),
        ...formData,
        status: 'pending'
      };
      onAddStudent(newStudent);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-student-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New Student</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="student-form">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                Student ID <span className="required">*</span>
              </label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="e.g., STU001"
                className={`form-input ${errors.studentId ? 'error' : ''}`}
              />
              {errors.studentId && <span className="error-text">{errors.studentId}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., John Doe"
                className={`form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Email Address <span className="required">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g., john.doe@university.edu"
                className={`form-input ${errors.email ? 'error' : ''}`}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Program <span className="required">*</span>
              </label>
              <select
                name="program"
                value={formData.program}
                onChange={handleChange}
                className={`form-input ${errors.program ? 'error' : ''}`}
              >
                <option value="">Select Program</option>
                {programs.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
              {errors.program && <span className="error-text">{errors.program}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                Graduation Year <span className="required">*</span>
              </label>
              <input
                type="number"
                name="graduationYear"
                value={formData.graduationYear}
                onChange={handleChange}
                placeholder="e.g., 2024"
                min="2020"
                max="2030"
                className={`form-input ${errors.graduationYear ? 'error' : ''}`}
              />
              {errors.graduationYear && <span className="error-text">{errors.graduationYear}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">
                GPA <span className="required">*</span>
              </label>
              <input
                type="number"
                name="gpa"
                value={formData.gpa}
                onChange={handleChange}
                placeholder="e.g., 3.85"
                step="0.01"
                min="0"
                max="4"
                className={`form-input ${errors.gpa ? 'error' : ''}`}
              />
              {errors.gpa && <span className="error-text">{errors.gpa}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Add Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddStudentForm;