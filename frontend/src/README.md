# WorkSphere – Smart Workforce Management System

## Project Overview
WorkSphere is a web-based workforce management application designed to help administrators manage employees, attendance, leave requests, projects, and reports through a centralized dashboard.

## Technologies Used

**Frontend**
- React.js
- Vite
- HTML, CSS, JavaScript

**Backend**
- Node.js
- Express.js
- REST APIs

**Database & Security**
- SQLite
- JWT Authentication
- bcryptjs Password Hashing

## Key Features

1. **User Authentication**
   - User registration and login
   - Secure logout
   - JWT-based authentication

2. **Employee Management**
   - Add, edit, and delete employees
   - Search employees

3. **Attendance Management**
   - Mark employees Present or Absent
   - View attendance records

4. **Leave Management**
   - Submit leave requests
   - Approve or reject requests
   - Track leave status

5. **Project Management**
   - Add, edit, and delete projects
   - Track project status and deadlines

6. **Reports & Analytics**
   - Employee, attendance, leave, and project reports
   - Export reports as CSV

7. **Settings**
   - View profile and workspace information

## How to Run the Project

### Step 1: Start the Backend

Open a terminal in the main WorkSphere folder and run:

```powershell
cd backend
$env:JWT_SECRET = (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
node server.js
```

Backend URL: `http://localhost:5000`

### Step 2: Start the Frontend

Open a second terminal in the main WorkSphere folder and run:

```powershell
cd frontend
npm run dev
```

Frontend URL: `http://localhost:5173`

Keep both terminals running while using the application.

## Conclusion

WorkSphere provides a centralized platform for managing workforce activities, including employee records, attendance, leave requests, projects, and reports.

**Project Name:** WorkSphere – Smart Workforce Management System  
**Project Type:** Full Stack Web Application