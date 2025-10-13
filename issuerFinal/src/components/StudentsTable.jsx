import './StudentsTable.css';

function StudentsTable({ students, onIssueCredential, onAddStudent }) {
  return (
    <div className="students-table-container">
      <div className="table-header">
        <h3 className="table-title">Student Credentials</h3>
        <div className="table-actions">
          <input
            type="text"
            placeholder="Search students..."
            className="search-input"
          />
          <button className="add-student-btn" onClick={onAddStudent}>
            ➕ Add Student
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="students-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Program</th>
              <th>Year</th>
              <th>GPA</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td>{student.studentId}</td>
                <td>
                  <div className="student-name">
                    <div className="avatar">{student.name[0]}</div>
                    <div>
                      <div className="name-text">{student.name}</div>
                      <div className="email-text">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td>{student.program}</td>
                <td>{student.graduationYear}</td>
                <td>{student.gpa}</td>
                <td>
                  <span className={`badge ${student.status === 'issued' ? 'badge-issued' : 'badge-pending'}`}>
                    {student.status === 'issued' ? '✓ Issued' : '⏳ Pending'}
                  </span>
                </td>
                <td>
                  {student.status === 'pending' ? (
                    <button
                      className="issue-button"
                      onClick={() => onIssueCredential(student)}
                    >
                      Issue Credential
                    </button>
                  ) : (
                    <button className="view-button">
                      View Details
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StudentsTable;