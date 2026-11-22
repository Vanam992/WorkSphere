import { useState, useEffect } from 'react'
import './App.css'
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
function App() {
    const apiFetch = (url, options = {}) => {
    const token = localStorage.getItem('worksphere_token')
url = url.replace('http://localhost:5000', API_BASE_URL)
    return fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
  }
    const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const [activePage, setActivePage] = useState('Dashboard')
  const [searchTerm, setSearchTerm] = useState('')
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveFormData, setLeaveFormData] = useState({
  employee_id: '',
  leave_type: 'Casual Leave',
  start_date: '',
  end_date: '',
  reason: '',
})
  const [employees, setEmployees] = useState([
    {
      name: 'Priya Kapoor',
      department: 'Engineering',
      role: 'Frontend Developer',
    },
    {
      name: 'Arjun Verma',
      department: 'Marketing',
      role: 'Marketing Executive',
    },
    {
      name: 'Neha Sharma',
      department: 'Human Resources',
      role: 'HR Associate',
    },
  ])
  useEffect(() => {
  if (!user) return

  apiFetch('http://localhost:5000/api/employees')
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        setEmployees(data)
      }
    })
    .catch(error => console.error('Error loading employees:', error))
}, [user])
useEffect(() => {
  if (!user) return

  apiFetch('http://localhost:5000/api/attendance')
    .then(response => response.json())
    .then(data => {
      setAttendanceRecords(data)
    })
    .catch(error => console.error('Error loading attendance:', error))
}, [user])
useEffect(() => {
  if (!user) return

  apiFetch('http://localhost:5000/api/leave-requests')
    .then(response => response.json())
    .then(data => {
      setLeaveRequests(data)
    })
    .catch(error => console.error('Error loading leave requests:', error))
}, [user])

useEffect(() => {
  if (!user) return

  apiFetch('http://localhost:5000/api/projects')
    .then(response => response.json())
    .then(data => {
      setProjects(data)
    })
    .catch(error => console.error('Error loading projects:', error))
}, [user])
const [attendance, setAttendance] = useState({})
const [attendanceRecords, setAttendanceRecords] = useState([])
useEffect(() => {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const todayAttendance = {}

  attendanceRecords.forEach(record => {
    if (record.date === today) {
      const employee = employees.find(
        item => Number(item.id) === Number(record.employee_id)
      )

      if (employee) {
        todayAttendance[employee.name] = record.status
      }
    }
  })

  setAttendance(todayAttendance)
}, [attendanceRecords, employees])
const [leaveRequests, setLeaveRequests] = useState([])
const [projects, setProjects] = useState([])
const [showProjectForm, setShowProjectForm] = useState(false)
const [editProjectId, setEditProjectId] = useState(null)
const [projectFormData, setProjectFormData] = useState({
  name: '',
  department: '',
  deadline: '',
  status: 'Not Started',
})
  const [formData, setFormData] = useState({
    name: '',
    department: '',
    role: '',
    email: '',
  })
  async function handleAddProject(e) {
  e.preventDefault()

  try {
    const isEditing = editProjectId !== null

    const response = await apiFetch(
      isEditing
        ? `http://localhost:5000/api/projects/${editProjectId}`
        : 'http://localhost:5000/api/projects',
      {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectFormData),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to save project')
    }

    const savedProject = await response.json()

    if (isEditing) {
      setProjects(previous =>
        previous.map(project =>
          project.id === savedProject.id ? savedProject : project
        )
      )
    } else {
      setProjects(previous => [savedProject, ...previous])
    }

    setProjectFormData({
      name: '',
      department: '',
      deadline: '',
      status: 'Not Started',
    })

    setEditProjectId(null)
    setShowProjectForm(false)

    alert(
      isEditing
        ? 'Project updated successfully!'
        : 'Project added successfully!'
    )
  } catch (error) {
    console.error('Error saving project:', error)
    alert('Unable to save project')
  }
}

function handleEditProject(index) {
  const project = projects[index]

  setProjectFormData({
    name: project.name,
    department: project.department || '',
    deadline: project.deadline || '',
    status: project.status,
  })

  setEditProjectId(project.id)
  setShowProjectForm(true)
}

async function handleDeleteProject(id) {
  const confirmDelete = window.confirm(
    'Are you sure you want to delete this project?'
  )

  if (!confirmDelete) {
    return
  }

  try {
    const response = await apiFetch(
      `http://localhost:5000/api/projects/${id}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete project')
    }

    setProjects(previous =>
      previous.filter(project => project.id !== id)
    )

    alert('Project deleted successfully!')
  } catch (error) {
    console.error('Error deleting project:', error)
    alert('Unable to delete project')
  }
}
async function handleAddEmployee(e) {
  e.preventDefault()

  try {
    if (editIndex !== null) {
      const employee = employees[editIndex]

      const response = await apiFetch(
        `http://localhost:5000/api/employees/${employee.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
  const errorMessage = await response.text()
  throw new Error(`Update failed (${response.status}): ${errorMessage}`)
}

      const updatedEmployee = await response.json()

      const updatedEmployees = [...employees]
      updatedEmployees[editIndex] = updatedEmployee
      setEmployees(updatedEmployees)

    } else {
      const response = await apiFetch('http://localhost:5000/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to add employee')
      }

      const newEmployee = await response.json()
      setEmployees([...employees, newEmployee])
    }

    setFormData({
      name: '',
      department: '',
      role: '',
      email: '',
    })

    setEditIndex(null)
    setShowForm(false)

  } catch (error) {
  console.error('Error:', error)
  alert(error.message)
}
}

function handleEditEmployee(index) {
  setEditIndex(index)
  setFormData(employees[index])
  setShowForm(true)
}

  

async function handleDeleteEmployee(index) {
  const confirmDelete = window.confirm(
    'Are you sure you want to delete this employee?'
  )

  if (!confirmDelete) return

  try {
    const employee = employees[index]

    const response = await apiFetch(
      `http://localhost:5000/api/employees/${employee.id}`,
      {
        method: 'DELETE',
      }
    )

    if (!response.ok) {
      throw new Error('Failed to delete employee')
    }

    const updatedEmployees = employees.filter(
      (_, i) => i !== index
    )

    setEmployees(updatedEmployees)

    alert('Employee deleted successfully!')
    } catch (error) {
    console.error('Delete error:', error)
    alert(error.message)
  }
}
async function handleMarkAttendance(employee, status) {
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const existingRecord = attendanceRecords.find(
    record =>
      Number(record.employee_id) === Number(employee.id) &&
      record.date === today
  )

  try {
    let savedRecord

    if (existingRecord) {
      const response = await apiFetch(
        `http://localhost:5000/api/attendance/${existingRecord.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to update attendance')
      }

      savedRecord = { ...existingRecord, status }
    } else {
      const response = await apiFetch('http://localhost:5000/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: employee.id,
          date: today,
          status,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save attendance')
      }

      savedRecord = await response.json()
    }

    setAttendanceRecords(previous =>
      existingRecord
        ? previous.map(record =>
            record.id === existingRecord.id ? savedRecord : record
          )
        : [...previous, savedRecord]
    )

    setAttendance(previous => ({
      ...previous,
      [employee.name]: status,
    }))

    alert('Attendance saved successfully!')
  } catch (error) {
    console.error('Attendance error:', error)
    alert(error.message)
  }
}
const handleExportReports = () => {
  const rows = [
    ['WORKSPHERE REPORTS'],
    [],
    ['EMPLOYEE ATTENDANCE REPORT'],
    ['Employee Name', 'Department', 'Attendance Status'],
    ...employees.map(employee => [
      employee.name,
      employee.department,
      attendance[employee.name] || 'Not Marked',
    ]),
    [],
    ['PROJECT REPORT'],
    ['Project Name', 'Department', 'Deadline', 'Status'],
    ...projects.map(project => [
      project.name,
      project.department,
      project.deadline,
      project.status,
    ]),
    [],
    ['LEAVE REPORT'],
    ['Employee Name', 'Leave Type', 'Start Date', 'End Date', 'Status'],
    ...leaveRequests.map(leave => [
      leave.employee_name || leave.name || 'Employee',
      leave.leave_type || leave.type,
      leave.start_date,
      leave.end_date,
      leave.status,
    ]),
  ]

  const csvContent = rows
    .map(row => row.map(value =>
      `"${String(value ?? '').replace(/"/g, '""')}"`
    ).join(','))
    .join('\n')

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'WorkSphere_Complete_Reports.csv'
  link.click()

  URL.revokeObjectURL(url)
}
const handleAuthSubmit = async (e) => {
  e.preventDefault()
  setAuthError('')
  setAuthLoading(true)

  try {
    if (authMode === 'register') {
      const registerResponse = await fetch(
        `${API_BASE_URL}/api/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: authName,
            email: authEmail,
            password: authPassword,
          }),
        }
      )

      const registerData = await registerResponse.json()

      if (!registerResponse.ok) {
        throw new Error(registerData.error || 'Registration failed')
      }
    }

    const loginResponse = await fetch(
      `${API_BASE_URL}/api/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      }
    )

    const loginData = await loginResponse.json()

    if (!loginResponse.ok) {
      throw new Error(loginData.error || 'Login failed')
    }

    localStorage.setItem('worksphere_token', loginData.token)
    setUser(loginData.user)
  } catch (error) {
    setAuthError(error.message)
  } finally {
    setAuthLoading(false)
  }
}
const handleLogout = () => {
  localStorage.removeItem('worksphere_token')
  setUser(null)
  setAuthEmail('')
  setAuthPassword('')
  setAuthError('')
  setAuthMode('login')
}
if (!user) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#f3f5fa',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        padding: '35px',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
      }}>
        <h1 style={{ textAlign: 'center' }}>WorkSphere</h1>

        <p style={{ textAlign: 'center' }}>
          {authMode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
        </p>

        <form onSubmit={handleAuthSubmit}>
          {authMode === 'register' && (
            <>
              <label>Full Name</label>
              <input
                type="text"
                value={authName}
                onChange={e => setAuthName(e.target.value)}
                required
              />
            </>
          )}

          <label>Email Address</label>
          <input
            type="email"
            value={authEmail}
            onChange={e => setAuthEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={authPassword}
            onChange={e => setAuthPassword(e.target.value)}
            required
          />

          {authError && (
            <p style={{ color: 'red' }}>{authError}</p>
          )}

          <button
            type="submit"
            disabled={authLoading}
            style={{ width: '100%', marginTop: '20px' }}
          >
            {authLoading
              ? 'Please wait...'
              : authMode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px' }}>
          {authMode === 'login'
            ? "Don't have an account?"
            : 'Already have an account?'}

          <button
            type="button"
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login')
              setAuthError('')
            }}
          >
            {authMode === 'login' ? ' Register' : ' Login'}
          </button>
        </p>
      </div>
    </div>
  )
}
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">W</div>
          <span>WorkSphere</span>
        </div>

        <p className="menu-label">MENU</p>

        <nav>
          <a
  className={`nav-item ${activePage === 'Dashboard' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Dashboard')
  }}
>
  ▦ Dashboard
</a>
          <a
  className={`nav-item ${activePage === 'Employees' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Employees')
  }}
>
  ♙ Employees
</a>
        <a
  className={`nav-item ${activePage === 'Attendance' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Attendance')
  }}
>
  ◷ Attendance
</a>
    <a
  className={`nav-item ${activePage === 'Leave Requests' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Leave Requests')
  }}
>
  ✉ Leave Requests
</a>
          <a
  className={`nav-item ${activePage === 'Projects & Tasks' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Projects & Tasks')
  }}
>
  ▤ Projects & Tasks
</a>
          <a
  className={`nav-item ${activePage === 'Reports' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Reports')
  }}
>
  ▧ Reports
</a>
        </nav>

        <div className="sidebar-bottom">
          <a
  className={`nav-item ${activePage === 'Settings' ? 'active' : ''}`}
  href="#"
  onClick={(e) => {
    e.preventDefault()
    setActivePage('Settings')
  }}
>
  ⚙ Settings
</a>
          <div className="profile">
            <div className="avatar">AS</div>
            <div>
              <strong>Admin User</strong>
              <small>Administrator</small>
            </div>
          </div>
          <button
  className="delete-btn"
  onClick={handleLogout}
  style={{ width: '100%', marginTop: '12px' }}
>
  Logout
</button>
        </div>
           </aside>

      <main className="main">
        {showForm && (
  <div className="modal-overlay">
    <div className="employee-modal">
      <div className="modal-header">
       <h2>{editIndex !== null ? 'Edit Employee' : 'Add New Employee'}</h2>

        <button
          className="close-btn"
          onClick={() => setShowForm(false)}
        >
          ✕
        </button>
      </div>

      <p className="modal-description">
        Enter the employee details below.
      </p>

      <form onSubmit={handleAddEmployee}>
        <label>Full Name</label>
        <input
          type="text"
          placeholder="Enter employee name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
        />

        <label>Email Address</label>
        <input
          type="email"
          placeholder="Enter email address"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          required
        />

        <label>Department</label>
        <select
          value={formData.department}
          onChange={(e) =>
            setFormData({ ...formData, department: e.target.value })
          }
          required
        >
          <option value="">Select Department</option>
          <option value="Engineering">Engineering</option>
          <option value="Human Resources">Human Resources</option>
          <option value="Marketing">Marketing</option>
          <option value="Finance">Finance</option>
          <option value="Sales">Sales</option>
          <option value="IT">IT</option>
        </select>

        <label>Job Role</label>
        <input
          type="text"
          placeholder="Enter job role"
          value={formData.role}
          onChange={(e) =>
            setFormData({ ...formData, role: e.target.value })
          }
          required
        />

        <div className="form-buttons">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>

          <button type="submit" className="primary-btn">
            {editIndex !== null ? 'Update Employee' : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
        {activePage === 'Dashboard' && (
<>
<header className="topbar">
                  <div>
            <h2>Dashboard</h2>
            <p>Welcome back! Here's what's happening today.</p>
          </div>
          <div className="top-actions">
            <button className="notification">♧</button>
            <div className="avatar">AS</div>
          </div>
        </header>

        <section className="welcome">
          <div>
            <h1>Good morning, Admin! 👋</h1>
            <p>Here's your workforce overview for today.</p>
          </div>
          <button
  className="primary-btn"
  onClick={() => setShowForm(true)}
>
  + Add Employee
</button>
        </section>

        <section className="stats">
          <div className="stat-card">
            <div className="stat-icon blue">♙</div>
            <p>Total Employees</p>
           <h2>{employees.length}</h2>
            <span className="positive">↑ 12% this month</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon green">◷</div>
            <p>Present Today</p>
            <h2>{employees.filter(e => attendance[e.name] === 'Present').length}</h2>
<span className="positive">
  {employees.length > 0
    ? ((employees.filter(e => attendance[e.name] === 'Present').length / employees.length) * 100).toFixed(1)
    : 0}% attendance
</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange">✉</div>
            <p>Leave Requests</p>
            <h2>{leaveRequests.filter(r => r.status === 'Pending').length}</h2>
            <span className="warning">Pending approval</span>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple">▤</div>
            <p>Active Projects</p>
           <h2>{projects.filter(p => p.status !== 'Completed').length}</h2>
            <span className="neutral">Across all departments</span>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel attendance-panel">
            <div className="panel-header">
              <div>
                <h3>Today's Attendance</h3>
                <p>Employee attendance overview</p>
              </div>
              <button className="secondary-btn">View Report</button>
            </div>

            <div className="attendance-summary">
              <div className="attendance-number">
                <h1>
  {employees.length > 0
    ? ((employees.filter(e => attendance[e.name] === 'Present').length / employees.length) * 100).toFixed(1)
    : 0}%
</h1>
                <p>Attendance rate</p>
              </div>
              <div className="attendance-details">
<div><span className="dot green-dot"></span> Present <strong>{employees.filter(e => attendance[e.name] === 'Present').length}</strong></div>
<div><span className="dot orange-dot"></span> Late <strong>{employees.filter(e => attendance[e.name] === 'Late').length}</strong></div>
<div><span className="dot red-dot"></span> Absent <strong>{employees.filter(e => attendance[e.name] === 'Absent').length}</strong></div>
              </div>
            </div>
<div className="progress-bar">
  <div
    className="progress-present"
    style={{ width: `${employees.length ? (employees.filter(e => attendance[e.name] === 'Present').length / employees.length) * 100 : 0}%` }}
  ></div>
  <div
    className="progress-late"
    style={{ width: `${employees.length ? (employees.filter(e => attendance[e.name] === 'Late').length / employees.length) * 100 : 0}%` }}
  ></div>
  <div
    className="progress-absent"
    style={{ width: `${employees.length ? (employees.filter(e => attendance[e.name] === 'Absent').length / employees.length) * 100 : 0}%` }}
  ></div>
</div>
          </div>

          <div className="panel requests-panel">
            <div className="panel-header">
              <div>
                <h3>Leave Requests</h3>
                <p>Awaiting your approval</p>
              </div>
              <span className="request-count">
  {leaveRequests.filter(r => r.status === 'Pending').length}
</span>
            </div>

            
{leaveRequests
  .filter(request => request.status === 'Pending')
  .slice(0, 3)
  .map((request, index) => (
    <div className="request" key={request.id || index}>
      <div className="avatar pink">
        {request.name
          .split(' ')
          .map(word => word[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()}
      </div>

      <div className="request-info">
        <strong>{request.name}</strong>
        <small>{request.leave_type} · {request.start_date} to {request.end_date}</small>
      </div>

      <span className="status pending">{request.status}</span>
    </div>
  ))}
            <button className="view-all">View all requests →</button>
          </div>
        </section>

<div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
  <div style={{ flex: '1', minWidth: '150px', padding: '20px', background: '#e8f5e9', borderRadius: '10px' }}>
    <h3>Present</h3>
    <h1>{employees.filter(e => attendance[e.name] === 'Present').length}</h1>
  </div>

  <div style={{ flex: '1', minWidth: '150px', padding: '20px', background: '#ffebee', borderRadius: '10px' }}>
    <h3>Absent</h3>
    <h1>{employees.filter(e => attendance[e.name] === 'Absent').length}</h1>
  </div>

  <div style={{ flex: '1', minWidth: '150px', padding: '20px', background: '#fff3e0', borderRadius: '10px' }}>
    <h3>Not Marked</h3>
    <h1>{employees.filter(e => !attendance[e.name]).length}</h1>
  </div>
</div>

        <section className="panel employees-panel">
          <div className="panel-header">
            <div>
              <h3>Recent Employees</h3>
              <p>Recently added team members</p>
            </div>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
           />
            <button className="secondary-btn">View All</button>
          </div>

          
<div className="table-wrapper">
  <table>
    <thead>
      <tr>
        <th>EMPLOYEE</th>
        <th>DEPARTMENT</th>
        <th>ROLE</th>
        <th>STATUS</th>
        <th>ACTIONS</th>
        <th>ACTIONS</th>
      </tr>
    </thead>

    <tbody>
  {employees
    .filter((employee) =>
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.role.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .map((employee, index) => (
      <tr key={index}>
        <td>
          <div className="employee">
            <div className="avatar">
              {employee.name
                .split(' ')
                .map(word => word[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <strong>{employee.name}</strong>
          </div>
        </td>

        <td>{employee.department}</td>
        <td>{employee.role}</td>
        <td>
          <span className="status working">Active</span>
        </td>

        <td>
          <button
            className="edit-btn"
            onClick={() => handleEditEmployee(index)}
          >
            Edit
          </button>

          <button
            className="delete-btn"
            onClick={() => handleDeleteEmployee(index)}
          >
            Delete
          </button>
        </td>
      </tr>
    ))}
</tbody>
  </table>
  </div>
    </section>

<footer>© 2026 WorkSphere · Smart Workforce Management</footer>
      </>
)}

{activePage === 'Employees' && (
  <>
    <header className="topbar">
      <div>
        <h2>Employees</h2>
        <p>Manage your workforce and employee details.</p>
      </div>
    

    </header>

    <section className="welcome">
      <div>
        <h1>Employee Management</h1>
        <p>View and manage all your employees.</p>
      </div>

      <button
        className="primary-btn"
        onClick={() => setShowForm(true)}
      >
        + Add Employee
      </button>
    </section>
    <section className="panel employees-panel">
  <div className="panel-header">
    <div>
  <h3>All Employees</h3>
  <p>Manage your team members</p>
</div>

<input
  type="text"
  placeholder="Search employees..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>
  </div>

  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>EMPLOYEE</th>
          <th>DEPARTMENT</th>
          <th>ROLE</th>
          <th>STATUS</th>
          <th>ACTIONS</th>
        </tr>
      </thead>

      <tbody>
        {employees
  .filter((employee) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.role.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .map((employee) => {
    const index = employees.indexOf(employee)
     return (
          <tr key={index}>
            <td>{employee.name}</td>
            <td>{employee.department}</td>
            <td>{employee.role}</td>
            <td>
              <span className="status working">Active</span>
            </td>
            <td>
              <button
                className="edit-btn"
                onClick={() => handleEditEmployee(index)}
              >
                Edit
              </button>

              <button
                className="delete-btn"
                onClick={() => handleDeleteEmployee(index)}
              >
                Delete
              </button>
            </td>
          </tr>
            )
  })}
      </tbody>
    </table>
  </div>
</section>
  </>
)}

{activePage === 'Attendance' && (
  <>
    <header className="topbar">
      <div>
        <h2>Attendance</h2>
        <p>Track and manage employee attendance.</p>
      </div>
    </header>

    <section className="welcome">
      <div>
        <h1>Attendance Management</h1>
        <p>Mark and monitor daily employee attendance.</p>
      </div>
    </section>
<div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
  <div style={{ flex: '1', minWidth: '150px', padding: '20px', background: '#e8f5e9', borderRadius: '10px' }}>
    <h3>Present</h3>
    <h1>{employees.filter(e => attendance[e.name] === 'Present').length}</h1>
  </div>

  <div style={{ flex: '1', minWidth: '150px', padding: '20px', background: '#ffebee', borderRadius: '10px' }}>
    <h3>Absent</h3>
    <h1>{employees.filter(e => attendance[e.name] === 'Absent').length}</h1>
  </div>

  <div style={{ flex: '1', minWidth: '150px', padding: '20px', background: '#fff3e0', borderRadius: '10px' }}>
    <h3>Not Marked</h3>
    <h1>{employees.filter(e => !attendance[e.name]).length}</h1>
  </div>
</div>
    <section className="panel employees-panel">
      <div className="panel-header">
        <div>
          <h3>Employee Attendance</h3>
          <p>Update attendance status for your team</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>DEPARTMENT</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee, index) => (
              <tr key={index}>
                <td>{employee.name}</td>
                <td>{employee.department}</td>
                <td>
                  {attendance[employee.name] || 'Not Marked'}
                </td>
                <td>
                  <button
                    className="edit-btn"
                   onClick={() => handleMarkAttendance(employee, 'Present')}
                  >
                    Present
                  </button>

                  <button
                    className="delete-btn"
                    onClick={() => handleMarkAttendance(employee, 'Absent')}
                  >
                    Absent
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>
)}

{activePage === 'Leave Requests' && (
  <>
    <header className="topbar">
      <div>
        <h2>Leave Requests</h2>
        <p>Review and manage employee leave applications.</p>
      </div>
    </header>

    <section className="welcome">
      <div>
        <h1>Leave Management</h1>
        <p>Approve or reject employee leave requests.</p>
      </div>
    </section>

    <section className="panel employees-panel">
      <div className="panel-header">
        <div>
          <h3>All Leave Requests</h3>
          <button
  className="add-btn"
  onClick={() => setShowLeaveForm(true)}
>
  + Apply for Leave
</button>
          <p>Review employee applications</p>
        </div>
      </div>
{showLeaveForm && (
  <form
    onSubmit={async (e) => {
      e.preventDefault()

      try {
        const response = await apiFetch(
          'http://localhost:5000/api/leave-requests',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(leaveFormData),
          }
        )

        if (!response.ok) {
          throw new Error('Failed to submit leave request')
        }

        const refreshResponse = await apiFetch(
          'http://localhost:5000/api/leave-requests'
        )

        const updatedRequests = await refreshResponse.json()
        setLeaveRequests(updatedRequests)

        setLeaveFormData({
          employee_id: '',
          leave_type: 'Casual Leave',
          start_date: '',
          end_date: '',
          reason: '',
        })

        setShowLeaveForm(false)
        alert('Leave request submitted successfully!')
      } catch (error) {
        console.error('Leave request error:', error)
        alert(error.message)
      }
    }}
  >
    <h3>Apply for Leave</h3>

    <label>Employee</label>
    <select
      value={leaveFormData.employee_id}
      onChange={(e) =>
        setLeaveFormData({
          ...leaveFormData,
          employee_id: e.target.value,
        })
      }
      required
    >
      <option value="">Select Employee</option>
      {employees.map(employee => (
        <option key={employee.id} value={employee.id}>
          {employee.name}
        </option>
      ))}
    </select>

    <label>Leave Type</label>
    <select
      value={leaveFormData.leave_type}
      onChange={(e) =>
        setLeaveFormData({
          ...leaveFormData,
          leave_type: e.target.value,
        })
      }
    >
      <option value="Casual Leave">Casual Leave</option>
      <option value="Sick Leave">Sick Leave</option>
      <option value="Personal Leave">Personal Leave</option>
    </select>

    <label>Start Date</label>
    <input
      type="date"
      value={leaveFormData.start_date}
      onChange={(e) =>
        setLeaveFormData({
          ...leaveFormData,
          start_date: e.target.value,
        })
      }
      required
    />

    <label>End Date</label>
    <input
      type="date"
      value={leaveFormData.end_date}
      min={leaveFormData.start_date}
      onChange={(e) =>
        setLeaveFormData({
          ...leaveFormData,
          end_date: e.target.value,
        })
      }
      required
    />

    <label>Reason</label>
    <textarea
      value={leaveFormData.reason}
      onChange={(e) =>
        setLeaveFormData({
          ...leaveFormData,
          reason: e.target.value,
        })
      }
      placeholder="Enter reason for leave"
    />

    <button type="submit" className="add-btn">
      Submit Request
    </button>

    <button
      type="button"
      className="delete-btn"
      onClick={() => setShowLeaveForm(false)}
    >
      Cancel
    </button>
  </form>
)}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>EMPLOYEE</th>
              <th>LEAVE TYPE</th>
              <th>DURATION</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {leaveRequests.map((request, index) => (
              <tr key={index}>
                <td>{request.name}</td>
<td>{request.leave_type}</td>
<td>{request.start_date} to {request.end_date}</td>
                <td>{request.status}</td>
                <td>
                  <button
  className="edit-btn"
  onClick={async () => {
    try {
      const response = await apiFetch(
        `http://localhost:5000/api/leave-requests/${request.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'Approved' }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to approve leave')
      }

      const updatedRequest = await response.json()

      setLeaveRequests(previous =>
        previous.map(item =>
          item.id === request.id ? updatedRequest : item
        )
      )
    } catch (error) {
      console.error('Approve error:', error)
      alert(error.message)
    }
  }}
>
  Approve
</button>

         <button
  className="delete-btn"
  onClick={async () => {
    try {
      const response = await apiFetch(
        `http://localhost:5000/api/leave-requests/${request.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'Rejected' }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to reject leave')
      }

      const updatedRequest = await response.json()

      setLeaveRequests(previous =>
        previous.map(item =>
          item.id === request.id ? updatedRequest : item
        )
      )
    } catch (error) {
      console.error('Reject error:', error)
      alert(error.message)
    }
  }}
>
  Reject
</button>         
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  </>
)}
{activePage === 'Projects & Tasks' && (
  <>
    <header className="topbar">
      <div>
        <h2>Projects & Tasks</h2>
        <p>Track and manage your team's projects.</p>
      </div>
    </header>

    <section className="welcome">
      <div>
        <h1>Project Management</h1>
        <p>Monitor project progress and deadlines.</p>
      </div>
    </section>

    <section className="panel employees-panel">
      <div className="panel-header">
  <div>
    <h3>All Projects</h3>
    <p>Overview of team projects</p>
  </div>

  <button onClick={() => setShowProjectForm(true)}>
    + Add New Project
  </button>
</div>
{showProjectForm && (
  <form
    className="employee-form"
    onSubmit={handleAddProject}
  >
    <h3>{editProjectId !== null ? 'Edit Project' : 'Add New Project'}</h3>

    <input
      type="text"
      placeholder="Project Name"
      value={projectFormData.name}
      onChange={e =>
        setProjectFormData({
          ...projectFormData,
          name: e.target.value,
        })
      }
      required
    />

    <input
      type="text"
      placeholder="Department"
      value={projectFormData.department}
      onChange={e =>
        setProjectFormData({
          ...projectFormData,
          department: e.target.value,
        })
      }
    />

    <input
      type="date"
      value={projectFormData.deadline}
      onChange={e =>
        setProjectFormData({
          ...projectFormData,
          deadline: e.target.value,
        })
      }
    />

    <select
      value={projectFormData.status}
      onChange={e =>
        setProjectFormData({
          ...projectFormData,
          status: e.target.value,
        })
      }
    >
      <option value="Not Started">Not Started</option>
      <option value="In Progress">In Progress</option>
      <option value="Completed">Completed</option>
    </select>

    <button type="submit">Save Project</button>

    <button
      type="button"
      onClick={() => setShowProjectForm(false)}
    >
      Cancel
    </button>
  </form>
)}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>PROJECT NAME</th>
              <th>DEPARTMENT</th>
              <th>DEADLINE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
  {projects.map((project, index) => (
    <tr key={project.id || index}>
      <td>{project.name}</td>
      <td>{project.department}</td>
      <td>{project.deadline}</td>
      <td>{project.status}</td>
      <td>
        <button
          type="button"
          onClick={() => handleEditProject(index)}
        >
          Edit
        </button>

        <button
          type="button"
          onClick={() => handleDeleteProject(project.id)}
        >
          Delete
        </button>
      </td>
    </tr>
  ))}
</tbody>
        </table>
      </div>
    </section>
  </>
)}
{activePage === 'Reports' && (
  <>
   <header className="topbar">
  <div>
    <h2>Reports</h2>
    <p>View your employee and project reports.</p>
  </div>

  <button onClick={handleExportReports}>
    Export Reports
  </button>
</header>

    <section className="welcome">
      <div>
        <h1>Reports & Analytics</h1>
        <p>Get an overview of your organization's activity.</p>
      </div>
    </section>

    <div style={{
      display: 'flex',
      gap: '16px',
      marginBottom: '24px',
      flexWrap: 'wrap'
    }}>
      <div style={{
        flex: '1',
        minWidth: '150px',
        padding: '20px',
        background: '#e3f2fd',
        borderRadius: '10px'
      }}>
        <h3>Total Employees</h3>
        <h1>{employees.length}</h1>
      </div>

      <div style={{
        flex: '1',
        minWidth: '150px',
        padding: '20px',
        background: '#e8f5e9',
        borderRadius: '10px'
      }}>
        <h3>Present Today</h3>
        <h1>{employees.filter(e => attendance[e.name] === 'Present').length}</h1>
      </div>

      <div style={{
        flex: '1',
        minWidth: '150px',
        padding: '20px',
        background: '#fff3e0',
        borderRadius: '10px'
      }}>
        <h3>Pending Leaves</h3>
        <h1>{leaveRequests.filter(r => r.status === 'Pending').length}</h1>
      </div>

      <div style={{
        flex: '1',
        minWidth: '150px',
        padding: '20px',
        background: '#f3e5f5',
        borderRadius: '10px'
      }}>
        <h3>Active Projects</h3>
        <h1>{projects.filter(p => p.status !== 'Completed').length}</h1>
      </div>
    </div>

    <section className="panel employees-panel">
      <div className="panel-header">
        <div>
              <section className="panel employees-panel">
      <div className="panel-header">
        <div>
          <h3>Attendance Overview</h3>
          <p>Today's employee attendance statistics</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        {[
          {
            label: 'Present',
            count: employees.filter(e => attendance[e.name] === 'Present').length,
          },
          {
            label: 'Absent',
            count: employees.filter(e => attendance[e.name] === 'Absent').length,
          },
          {
            label: 'Not Marked',
            count: employees.filter(e => !attendance[e.name]).length,
          },
        ].map(item => (
          <div key={item.label} style={{ marginBottom: '20px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px'
            }}>
              <strong>{item.label}</strong>
              <span>{item.count} employees</span>
            </div>

            <div style={{
              width: '100%',
              height: '12px',
              background: '#eeeeee',
              borderRadius: '10px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${employees.length ? (item.count / employees.length) * 100 : 0}%`,
                height: '100%',
                background: item.label === 'Present'
                  ? '#4caf50'
                  : item.label === 'Absent'
                    ? '#f44336'
                    : '#ff9800',
                borderRadius: '10px'
              }} />
            </div>
          </div>
        ))}
      </div>
    </section>
    <section className="panel employees-panel">
  <div className="panel-header">
    <div>
      <h3>Project Status Overview</h3>
      <p>Current status of all projects</p>
    </div>
  </div>

  <div style={{ padding: '20px' }}>
    {[
      {
        label: 'Not Started',
        count: projects.filter(p => p.status === 'Not Started').length,
        color: '#9e9e9e',
      },
      {
        label: 'In Progress',
        count: projects.filter(p => p.status === 'In Progress').length,
        color: '#2196f3',
      },
      {
        label: 'Completed',
        count: projects.filter(p => p.status === 'Completed').length,
        color: '#4caf50',
      },
    ].map(item => (
      <div key={item.label} style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <strong>{item.label}</strong>
          <span>{item.count} projects</span>
        </div>

        <div style={{
          width: '100%',
          height: '12px',
          background: '#eeeeee',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${projects.length ? (item.count / projects.length) * 100 : 0}%`,
            height: '100%',
            background: item.color,
            borderRadius: '10px'
          }} />
        </div>
      </div>
    ))}
  </div>
</section>
<section className="panel employees-panel">
  <div className="panel-header">
    <div>
      <h3>Leave Status Overview</h3>
      <p>Current status of all leave requests</p>
    </div>
  </div>

  <div style={{ padding: '20px' }}>
    {[
      {
        label: 'Pending',
        count: leaveRequests.filter(r => r.status === 'Pending').length,
        color: '#ff9800',
      },
      {
        label: 'Approved',
        count: leaveRequests.filter(r => r.status === 'Approved').length,
        color: '#4caf50',
      },
      {
        label: 'Rejected',
        count: leaveRequests.filter(r => r.status === 'Rejected').length,
        color: '#f44336',
      },
    ].map(item => (
      <div key={item.label} style={{ marginBottom: '20px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <strong>{item.label}</strong>
          <span>{item.count} requests</span>
        </div>

        <div style={{
          width: '100%',
          height: '12px',
          background: '#eeeeee',
          borderRadius: '10px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${leaveRequests.length ? (item.count / leaveRequests.length) * 100 : 0}%`,
            height: '100%',
            background: item.color,
            borderRadius: '10px'
          }} />
        </div>
      </div>
    ))}
  </div>
</section>
          <h3>Project Report</h3>
          <p>Current project status overview</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
  <tr>
    <th>PROJECT</th>
    <th>DEPARTMENT</th>
    <th>DEADLINE</th>
    <th>STATUS</th>
  </tr>
</thead>
          <tbody>
            {projects.map((project, index) => (
  <tr key={index}>
    <td>{project.name}</td>
    <td>{project.department}</td>
    <td>{project.deadline}</td>
    <td>{project.status}</td>
  </tr>
))}
          </tbody>
        </table>
      </div>
    </section>
    <section className="panel employees-panel">
  <div className="panel-header">
    <div>
      <h3>Employee Attendance Report</h3>
      <p>Today's employee attendance overview</p>
    </div>
  </div>

  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>EMPLOYEE NAME</th>
          <th>DEPARTMENT</th>
          <th>ATTENDANCE STATUS</th>
        </tr>
      </thead>
      <tbody>
        {employees.map(employee => (
          <tr key={employee.id}>
            <td>{employee.name}</td>
            <td>{employee.department}</td>
            <td>{attendance[employee.name] || 'Not Marked'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
<section className="panel employees-panel">
  <div className="panel-header">
    <div>
      <h3>Leave Report</h3>
      <p>Overview of employee leave requests</p>
    </div>
  </div>

  <div className="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>EMPLOYEE NAME</th>
          <th>LEAVE TYPE</th>
          <th>START DATE</th>
          <th>END DATE</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        {leaveRequests.map((leave, index) => (
          <tr key={leave.id || index}>
            <td>{leave.employee_name || leave.name || 'Employee'}</td>
            <td>{leave.leave_type || leave.type}</td>
            <td>{leave.start_date}</td>
            <td>{leave.end_date}</td>
            <td>{leave.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>
  </>
)}
{activePage === 'Settings' && (
  <>
    <header className="topbar">
      <div>
        <h2>Settings</h2>
        <p>Manage your workspace settings.</p>
      </div>
    </header>

    <section className="welcome">
      <div>
        <h1>General Settings</h1>
        <p>View your account and application information.</p>
      </div>
    </section>

    <section className="panel employees-panel">
      <div className="panel-header">
        <div>
          <h3>Profile Information</h3>
          <p>Your account details</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p><strong>Name:</strong> Asritha</p>
        <p><strong>Role:</strong> Administrator</p>
        <p><strong>Application:</strong> WorkSphere</p>
      </div>
    </section>

    <section className="panel employees-panel">
      <div className="panel-header">
        <div>
          <h3>Workspace Information</h3>
          <p>Application details</p>
        </div>
      </div>

      <div style={{ padding: '20px' }}>
        <p><strong>Workspace:</strong> WorkSphere Employee Management</p>
        <p><strong>Version:</strong> 1.0.0</p>
        <p><strong>Status:</strong> Active</p>
      </div>
    </section>
  </>
)}
</main>
    </div>
  )
}
export default App