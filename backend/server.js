
const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const app = express()
const db = new Database('worksphere.db')
const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing')
}
app.use(cors())
app.use(express.json())

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    department TEXT,
    role TEXT
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS leave_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    leave_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    FOREIGN KEY (employee_id) REFERENCES employees(id)
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department TEXT,
    deadline TEXT,
    status TEXT DEFAULT 'Not Started'
  )
`)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Employee',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)
app.get('/', (req, res) => {
  
  res.send('WorkSphere Backend is running!')
})
// Register a new user
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {}

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string'
  ) {
    return res.status(400).json({
      error: 'Name, email and password are required'
    })
  }

  const cleanName = name.trim()
  const cleanEmail = email.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({
      error: 'Please enter a valid email address'
    })
  }

  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters and no more than 72 bytes'
    })
  }

  const existingUser = db.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).get(cleanEmail)

  if (existingUser) {
    return res.status(409).json({
      error: 'Email is already registered'
    })
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  const result = db.prepare(`
    INSERT INTO users (name, email, password)
    VALUES (?, ?, ?)
  `).run(cleanName, cleanEmail, hashedPassword)

  res.status(201).json({
    message: 'User registered successfully',
    id: result.lastInsertRowid,
    name: cleanName,
    email: cleanEmail,
    role: 'Employee'
  })
})
// Login an existing user
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {}

  if (
    typeof email !== 'string' ||
    !email.trim() ||
    typeof password !== 'string' ||
    !password
  ) {
    return res.status(400).json({
      error: 'Email and password are required'
    })
  }

  const cleanEmail = email.trim().toLowerCase()

  const user = db.prepare(
    'SELECT * FROM users WHERE email = ?'
  ).get(cleanEmail)

  if (!user) {
    return res.status(401).json({
      error: 'Invalid email or password'
    })
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password
  )

  if (!isPasswordValid) {
    return res.status(401).json({
      error: 'Invalid email or password'
    })
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  )

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  })
})
// Verify JWT authentication token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']

  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({
      error: 'Access denied. Please login first.'
    })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: 'Invalid or expired token'
      })
    }

    req.user = user
    next()
  })
}
// Check user role authorization
const authorizeRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.'
      })
    }

    next()
  }
}
// Protected user profile route
app.get('/api/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'You are authenticated successfully',
    user: req.user
  })
})
// Employee-only test route
app.get(
  '/api/employee-dashboard',
  authenticateToken,
  authorizeRole('Employee'),
  (req, res) => {
    res.json({
      message: 'Welcome to the Employee Dashboard',
      user: req.user
    })
  }
)
// Admin-only test route
app.get('/api/admin', authenticateToken, authorizeRole('Admin'), (req, res) => {
  res.json({
    message: 'Welcome Admin! You have permission to access this route.'
  })
})
app.get('/api/employees', (req, res) => {
  const employees = db.prepare('SELECT * FROM employees').all()
  res.json(employees)
})
app.get('/api/leave-requests', (req, res) => {
  const leaveRequests = db.prepare(`
    SELECT
      leave_requests.*,
      employees.name,
      employees.department
    FROM leave_requests
    JOIN employees ON leave_requests.employee_id = employees.id
    ORDER BY leave_requests.id DESC
  `).all()

  res.json(leaveRequests)
})
app.post('/api/leave-requests', (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body || {}

  if (!employee_id || !leave_type || !start_date || !end_date) {
    return res.status(400).json({
      error: 'Employee, leave type, start date and end date are required'
    })
  }

  if (!Number.isInteger(Number(employee_id)) || Number(employee_id) <= 0) {
    return res.status(400).json({
      error: 'Invalid employee ID'
    })
  }

  const employee = db.prepare(
    'SELECT id FROM employees WHERE id = ?'
  ).get(Number(employee_id))

  if (!employee) {
    return res.status(404).json({
      error: 'Employee does not exist'
    })
  }

  if (typeof leave_type !== 'string' || !leave_type.trim()) {
    return res.status(400).json({
      error: 'Please enter a valid leave type'
    })
  }

  const isValidDate = (date) =>
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return res.status(400).json({
      error: 'Please enter valid dates in YYYY-MM-DD format'
    })
  }

  if (end_date < start_date) {
    return res.status(400).json({
      error: 'End date cannot be before start date'
    })
  }

  const cleanLeaveType = leave_type.trim()
  const cleanReason = typeof reason === 'string' ? reason.trim() : ''

  const result = db.prepare(`
    INSERT INTO leave_requests
    (employee_id, leave_type, start_date, end_date, reason)
    VALUES (?, ?, ?, ?, ?)
  `).run(Number(employee_id), cleanLeaveType, start_date, end_date, cleanReason)

  res.status(201).json({
    id: result.lastInsertRowid,
    employee_id: Number(employee_id),
    leave_type: cleanLeaveType,
    start_date,
    end_date,
    reason: cleanReason,
    status: 'Pending'
  })
})
app.put('/api/leave-requests/:id', (req, res) => {
  const { status } = req.body || {}
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid leave request ID'
    })
  }

  if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
    return res.status(400).json({
      error: 'Invalid leave status'
    })
  }

  const result = db.prepare(`
    UPDATE leave_requests
    SET status = ?
    WHERE id = ?
  `).run(status, Number(id))

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Leave request not found'
    })
  }

  const updatedRequest = db.prepare(`
    SELECT leave_requests.*, employees.name, employees.department
    FROM leave_requests
    JOIN employees ON leave_requests.employee_id = employees.id
    WHERE leave_requests.id = ?
  `).get(Number(id))

  res.json(updatedRequest)
})

app.delete('/api/leave-requests/:id', (req, res) => {
  const id = req.params.id

  const result = db.prepare(
    'DELETE FROM leave_requests WHERE id = ?'
  ).run(id)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Leave request not found' })
  }

  res.json({ message: 'Leave request deleted successfully' })
})


app.post('/api/employees', (req, res) => {
  const { name, email, department, role } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'A valid employee name is required'
    })
  }

  if (email && (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )) {
    return res.status(400).json({
      error: 'Please enter a valid email address'
    })
  }

  const cleanName = name.trim()
  const cleanEmail = email ? email.trim() : ''
  const cleanDepartment = typeof department === 'string' ? department.trim() : ''
  const cleanRole = typeof role === 'string' ? role.trim() : ''

  const result = db.prepare(`
    INSERT INTO employees (name, email, department, role)
    VALUES (?, ?, ?, ?)
  `).run(cleanName, cleanEmail, cleanDepartment, cleanRole)

  res.status(201).json({
    id: result.lastInsertRowid,
    name: cleanName,
    email: cleanEmail,
    department: cleanDepartment,
    role: cleanRole
  })
})

app.get('/api/attendance', (req, res) => {
  const attendance = db.prepare(`
    SELECT * FROM attendance
    ORDER BY date DESC
  `).all()

  res.json(attendance)
})

app.post('/api/attendance', (req, res) => {
  const { employee_id, date, status } = req.body || {}

  if (!employee_id || !date || !status) {
    return res.status(400).json({
      error: 'Employee ID, date and status are required'
    })
  }

  if (!Number.isInteger(Number(employee_id)) || Number(employee_id) <= 0) {
    return res.status(400).json({
      error: 'Invalid employee ID'
    })
  }

  const employee = db.prepare(
    'SELECT id FROM employees WHERE id = ?'
  ).get(Number(employee_id))

  if (!employee) {
    return res.status(404).json({
      error: 'Employee does not exist'
    })
  }

  if (!['Present', 'Absent'].includes(status)) {
    return res.status(400).json({
      error: 'Status must be Present or Absent'
    })
  }

  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    return res.status(400).json({
      error: 'Please enter a valid date in YYYY-MM-DD format'
    })
  }

  const result = db.prepare(`
    INSERT INTO attendance (employee_id, date, status)
    VALUES (?, ?, ?)
  `).run(Number(employee_id), date, status)

  res.status(201).json({
    id: result.lastInsertRowid,
    employee_id: Number(employee_id),
    date,
    status
  })
})
app.put('/api/employees/:id', (req, res) => {
  const { name, email, department, role } = req.body || {}
  const id = req.params.id

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'A valid employee name is required'
    })
  }

  if (email && (
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  )) {
    return res.status(400).json({
      error: 'Please enter a valid email address'
    })
  }

  const cleanName = name.trim()
  const cleanEmail = email ? email.trim() : ''
  const cleanDepartment = typeof department === 'string' ? department.trim() : ''
  const cleanRole = typeof role === 'string' ? role.trim() : ''

  const result = db.prepare(`
    UPDATE employees
    SET name = ?, email = ?, department = ?, role = ?
    WHERE id = ?
  `).run(cleanName, cleanEmail, cleanDepartment, cleanRole, id)

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Employee not found'
    })
  }

  res.json({
    id: Number(id),
    name: cleanName,
    email: cleanEmail,
    department: cleanDepartment,
    role: cleanRole
  })
})
app.put('/api/attendance/:id', (req, res) => {
  const { employee_id, date, status } = req.body || {}
  const id = req.params.id

  if (!employee_id || !date || !status) {
    return res.status(400).json({
      error: 'Employee ID, date and status are required'
    })
  }

  if (!Number.isInteger(Number(employee_id)) || Number(employee_id) <= 0) {
    return res.status(400).json({
      error: 'Invalid employee ID'
    })
  }

  const employee = db.prepare(
    'SELECT id FROM employees WHERE id = ?'
  ).get(Number(employee_id))

  if (!employee) {
    return res.status(404).json({
      error: 'Employee does not exist'
    })
  }

  if (!['Present', 'Absent'].includes(status)) {
    return res.status(400).json({
      error: 'Status must be Present or Absent'
    })
  }

  if (
    typeof date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date
  ) {
    return res.status(400).json({
      error: 'Please enter a valid date in YYYY-MM-DD format'
    })
  }

  const result = db.prepare(`
    UPDATE attendance
    SET employee_id = ?, date = ?, status = ?
    WHERE id = ?
  `).run(Number(employee_id), date, status, id)

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Attendance record not found'
    })
  }

  res.json({
    message: 'Attendance updated successfully',
    id: Number(id),
    employee_id: Number(employee_id),
    date,
    status
  })
})
app.delete('/api/attendance/:id', (req, res) => {
  const id = req.params.id

  const result = db.prepare(
    'DELETE FROM attendance WHERE id = ?'
  ).run(id)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Attendance record not found' })
  }

  res.json({ message: 'Attendance deleted successfully' })
})
app.delete('/api/employees/:id', (req, res) => {
  const id = req.params.id

  const result = db.prepare(
    'DELETE FROM employees WHERE id = ?'
  ).run(id)

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Employee not found' })
  }

  res.json({ message: 'Employee deleted successfully' })
})
app.get('/api/projects', (req, res) => {
  const projects = db.prepare(
    'SELECT * FROM projects ORDER BY id DESC'
  ).all()

  res.json(projects)
})
app.post('/api/projects', (req, res) => {
  const { name, department, deadline, status } = req.body || {}

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'Project name is required'
    })
  }

  if (department !== undefined && typeof department !== 'string') {
    return res.status(400).json({
      error: 'Invalid department'
    })
  }

  const validStatuses = ['Not Started', 'In Progress', 'Completed']
  const cleanStatus = status || 'Not Started'

  if (!validStatuses.includes(cleanStatus)) {
    return res.status(400).json({
      error: 'Invalid project status'
    })
  }

  const isValidDate = (date) =>
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date

  if (deadline && !isValidDate(deadline)) {
    return res.status(400).json({
      error: 'Please enter a valid deadline in YYYY-MM-DD format'
    })
  }

  const cleanName = name.trim()
  const cleanDepartment = typeof department === 'string' ? department.trim() : ''
  const cleanDeadline = deadline || ''

  const result = db.prepare(`
    INSERT INTO projects (name, department, deadline, status)
    VALUES (?, ?, ?, ?)
  `).run(cleanName, cleanDepartment, cleanDeadline, cleanStatus)

  res.status(201).json({
    id: result.lastInsertRowid,
    name: cleanName,
    department: cleanDepartment,
    deadline: cleanDeadline,
    status: cleanStatus
  })
})
app.put('/api/projects/:id', (req, res) => {
  const { name, department, deadline, status } = req.body || {}
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid project ID'
    })
  }

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      error: 'Project name is required'
    })
  }

  if (department !== undefined && typeof department !== 'string') {
    return res.status(400).json({
      error: 'Invalid department'
    })
  }

  const validStatuses = ['Not Started', 'In Progress', 'Completed']
  const cleanStatus = status || 'Not Started'

  if (!validStatuses.includes(cleanStatus)) {
    return res.status(400).json({
      error: 'Invalid project status'
    })
  }

  const isValidDate = (date) =>
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date

  if (deadline && !isValidDate(deadline)) {
    return res.status(400).json({
      error: 'Please enter a valid deadline in YYYY-MM-DD format'
    })
  }

  const cleanName = name.trim()
  const cleanDepartment = typeof department === 'string' ? department.trim() : ''
  const cleanDeadline = deadline || ''

  const result = db.prepare(`
    UPDATE projects
    SET name = ?, department = ?, deadline = ?, status = ?
    WHERE id = ?
  `).run(cleanName, cleanDepartment, cleanDeadline, cleanStatus, Number(id))

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Project not found'
    })
  }

  res.json({
    id: Number(id),
    name: cleanName,
    department: cleanDepartment,
    deadline: cleanDeadline,
    status: cleanStatus
  })
})
app.delete('/api/projects/:id', (req, res) => {
  const id = req.params.id

  const result = db.prepare(
    'DELETE FROM projects WHERE id = ?'
  ).run(id)

  if (result.changes === 0) {
    return res.status(404).json({
      error: 'Project not found'
    })
  }

  res.json({
    message: 'Project deleted successfully'
  })
})
// Handle routes that do not exist
app.use((req, res) => {
  res.status(404).json({
    error: 'API route not found'
  })
})

// Handle unexpected server errors
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message)

  res.status(500).json({
    error: 'Internal server error. Please try again later.'
  })
})

const PORT = 5000

app.listen(PORT, () => {
  console.log(`WorkSphere backend running on http://localhost:${PORT}`)
})
