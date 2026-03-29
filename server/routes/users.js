const router = require('express').Router()
const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const authMiddleware = require('../middleware/auth')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Apply auth middleware to all routes
router.use(authMiddleware)

// GET /team → all users in same company
router.get('/team', async (req, res) => {
  try {
    const team = await prisma.user.findMany({
      where: { companyId: req.user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isManagerApprover: true,
        managerId: true,
        manager: {
          select: { name: true }
        }
      }
    })
    res.json(team)
  } catch (err) {
    console.error('Fetch team error:', err)
    res.status(500).json({ error: 'Failed to fetch team' })
  }
})

// POST /create → create new user (admin only), hash password with bcryptjs
router.post('/create', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { name, email, password, role, isManagerApprover, managerId } = req.body

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(400).json({ error: 'Email already exists' })

    const hashed = await bcrypt.hash(password, 10)
    
    // Convert managerId from empty string to null if necessary
    const targetManagerId = managerId ? managerId : null

    const newUser = await prisma.user.create({
      data: {
        companyId: req.user.companyId,
        name,
        email,
        password: hashed,
        role: role || 'employee', // User might just be an employee by default
        isManagerApprover: Boolean(isManagerApprover),
        managerId: targetManagerId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isManagerApprover: true
      }
    })

    res.status(201).json({ message: 'User created successfully', user: newUser })
  } catch (err) {
    console.error('Create user error:', err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// PATCH /update-role/:id → update role, managerId, isManagerApprover
router.patch('/update-role/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { id } = req.params
  const { role, managerId, isManagerApprover } = req.body

  try {
    // ensure the user being modified is in the same company
    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return res.status(404).json({ error: 'User not found' })
    if (targetUser.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Cannot modify a user outside of your company' })
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        managerId: managerId ? managerId : null,
        isManagerApprover: isManagerApprover !== undefined ? Boolean(isManagerApprover) : undefined
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isManagerApprover: true,
        managerId: true
      }
    })

    res.json({ message: 'User updated successfully', user: updatedUser })
  } catch (err) {
    console.error('Update user role error:', err)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})

module.exports = router