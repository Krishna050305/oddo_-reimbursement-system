# Oddo Reimbursement System
A smart expense reimbursement platform with multi-level approval workflows, conditional rules, OCR receipt scanning, and multi-currency support — built for teams that move fast.

---

## 🚀 Quick Start Guide

This project is split into two parts: a **Node/Express Backend** and a **Vite/React Frontend**.

### 1. Start the Backend Server
The backend is located in the root directory. It runs on `http://localhost:5000` by default.

Open a terminal and run:
```bash
# In the root project directory (oddo_-reimbursement-system)
npm install
npm run dev
```

### 2. Start the Frontend Client
The frontend is a Vite React application located in the `client` folder. It normally runs on `http://localhost:5173`.

Open a **new** terminal and run:
```bash
# Navigate to the client folder
cd client
npm install
npm run dev
```

### 3. Usage
- Go to `http://localhost:5173` in your browser.
- **Sign Up** to create a new workspace (this automatically creates an Admin account).
- You can then use the Admin dashboard to add team members (Employees and Managers) and explore the approval workflows.
