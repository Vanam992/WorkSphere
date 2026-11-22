require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const app = express()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
})

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is missing')
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing')
}

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL
].filter(Boolean)

app.use(cors({
  origin: allowedOrigins
}))
app.use(express.json())

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      department TEXT,
      role TEXT
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id BIGSERIAL PRIMARY KEY,
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      date DATE NOT NULL,
      status TEXT NOT NULL
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id BIGSERIAL PRIMARY KEY,
      employee_id BIGINT NOT NULL REFERENCES employees(id),
      leave_type TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'Pending'
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      department TEXT,
      deadline DATE,
      status TEXT DEFAULT 'Not Started'
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Employee',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  console.log('PostgreSQL database tables are ready')
}
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

  const hashedPassword = await bcrypt.hash(password, 12)

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [cleanName, cleanEmail, hashedPassword]
    )

    res.status(201).json({
      message: 'User registered successfully',
      id: result.rows[0].id,
      name: cleanName,
      email: cleanEmail,
      role: 'Employee'
    })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Email is already registered'
      })
    }
    throw error
  }
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

  const result = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [cleanEmail]
  )

  const user = result.rows[0]

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
app.get('/api/employees', authenticateToken, async (req, res) => {
const result = await pool.query('SELECT * FROM employees ORDER BY id')
  res.json(result.rows)
})
app.get('/api/leave-requests', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT
      leave_requests.*,
      employees.name,
      employees.department
    FROM leave_requests
    JOIN employees ON leave_requests.employee_id = employees.id
    ORDER BY leave_requests.id DESC
  `)

  res.json(result.rows)
})
app.post('/api/leave-requests', authenticateToken, async (req, res) => {
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

  const employeeResult = await pool.query(
    'SELECT id FROM employees WHERE id = $1',
    [Number(employee_id)]
  )

  if (employeeResult.rows.length === 0) {
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

  const result = await pool.query(`
    INSERT INTO leave_requests
    (employee_id, leave_type, start_date, end_date, reason)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    Number(employee_id),
    cleanLeaveType,
    start_date,
    end_date,
    cleanReason
  ])

  res.status(201).json({
    id: result.rows[0].id,
    employee_id: Number(employee_id),
    leave_type: cleanLeaveType,
    start_date,
    end_date,
    reason: cleanReason,
    status: 'Pending'
  })
})
app.put('/api/leave-requests/:id', authenticateToken, async (req, res) => {
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

  const result = await pool.query(`
    UPDATE leave_requests
    SET status = $1
    WHERE id = $2
  `, [status, Number(id)])

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Leave request not found'
    })
  }

  const updatedResult = await pool.query(`
    SELECT leave_requests.*, employees.name, employees.department
    FROM leave_requests
    JOIN employees ON leave_requests.employee_id = employees.id
    WHERE leave_requests.id = $1
  `, [Number(id)])

  res.json(updatedResult.rows[0])
})
app.delete('/api/leave-requests/:id', authenticateToken, async (req, res) => {
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid leave request ID'
    })
  }

  const result = await pool.query(
    'DELETE FROM leave_requests WHERE id = $1',
    [Number(id)]
  )

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Leave request not found'
    })
  }

  res.json({ message: 'Leave request deleted successfully' })
})
 


app.post('/api/employees', authenticateToken, async (req, res) => {
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

  const result = await pool.query(`
    INSERT INTO employees (name, email, department, role)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [cleanName, cleanEmail, cleanDepartment, cleanRole])

  res.status(201).json({
    id: result.rows[0].id,
    name: cleanName,
    email: cleanEmail,
    department: cleanDepartment,
    role: cleanRole
  })
})
app.get('/api/attendance', authenticateToken, async (req, res) => {
  const result = await pool.query(`
    SELECT * FROM attendance
    ORDER BY date DESC
  `)

  res.json(result.rows)
})

app.post('/api/attendance', authenticateToken, async (req, res) => {
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

  const employeeResult = await pool.query(
    'SELECT id FROM employees WHERE id = $1',
    [Number(employee_id)]
  )

  if (employeeResult.rows.length === 0) {
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

  const result = await pool.query(`
    INSERT INTO attendance (employee_id, date, status)
    VALUES ($1, $2, $3)
    RETURNING id
  `, [Number(employee_id), date, status])

  res.status(201).json({
    id: result.rows[0].id,
    employee_id: Number(employee_id),
    date,
    status
  })
})
app.put('/api/employees/:id', authenticateToken, async (req, res) => {
  const { name, email, department, role } = req.body || {}
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid employee ID'
    })
  }

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

  const result = await pool.query(`
    UPDATE employees
    SET name = $1, email = $2, department = $3, role = $4
    WHERE id = $5
  `, [cleanName, cleanEmail, cleanDepartment, cleanRole, Number(id)])

  if (result.rowCount === 0) {
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
app.put('/api/attendance/:id', authenticateToken, async (req, res) => {
  const { employee_id, date, status } = req.body || {}
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid attendance ID'
    })
  }

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

  const employeeResult = await pool.query(
    'SELECT id FROM employees WHERE id = $1',
    [Number(employee_id)]
  )

  if (employeeResult.rows.length === 0) {
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

  const result = await pool.query(`
    UPDATE attendance
    SET employee_id = $1, date = $2, status = $3
    WHERE id = $4
  `, [Number(employee_id), date, status, Number(id)])

  if (result.rowCount === 0) {
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
app.delete('/api/attendance/:id', authenticateToken, async (req, res) => {
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid attendance ID'
    })
  }

  const result = await pool.query(
    'DELETE FROM attendance WHERE id = $1',
    [Number(id)]
  )

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Attendance record not found'
    })
  }

  res.json({ message: 'Attendance deleted successfully' })
})
app.delete('/api/employees/:id', authenticateToken, async (req, res) => {
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid employee ID'
    })
  }

  const result = await pool.query(
    'DELETE FROM employees WHERE id = $1',
    [Number(id)]
  )

  if (result.rowCount === 0) {
    return res.status(404).json({
      error: 'Employee not found'
    })
  }

  res.json({ message: 'Employee deleted successfully' })
})
app.get('/api/projects', authenticateToken, async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM projects ORDER BY id DESC'
  )

  res.json(result.rows)
})
app.post('/api/projects', authenticateToken, async (req, res) => {
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
  const cleanDeadline = deadline || null

  const result = await pool.query(`
    INSERT INTO projects (name, department, deadline, status)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [cleanName, cleanDepartment, cleanDeadline, cleanStatus])

  res.status(201).json({
    id: result.rows[0].id,
    name: cleanName,
    department: cleanDepartment,
    deadline: cleanDeadline,
    status: cleanStatus
  })
})
app.put('/api/projects/:id', authenticateToken, async (req, res) => {
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
  const cleanDeadline = deadline || null

  const result = await pool.query(`
    UPDATE projects
    SET name = $1, department = $2, deadline = $3, status = $4
    WHERE id = $5
  `, [cleanName, cleanDepartment, cleanDeadline, cleanStatus, Number(id)])

  if (result.rowCount === 0) {
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
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  const id = req.params.id

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    return res.status(400).json({
      error: 'Invalid project ID'
    })
  }

  const result = await pool.query(
    'DELETE FROM projects WHERE id = $1',
    [Number(id)]
  )

  if (result.rowCount === 0) {
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

const PORT = process.env.PORT || 5000

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`WorkSphere backend running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to initialize PostgreSQL database:', error)
    process.exit(1)
  })
