const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const authMiddleware = require('../middleware/auth')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Apply auth middleware to all routes
router.use(authMiddleware)

// POST /submit → create expense, auto-create first approval step if employee has manager with isManagerApprover=true
router.post('/submit', async (req, res) => {
  const { amount, currency, category, description, date, convertedAmount } = req.body
  const numericAmount = parseFloat(amount)
  const numericConverted = convertedAmount ? parseFloat(convertedAmount) : null
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { manager: true }
    })
    
    // Create the expense
    const expense = await prisma.expense.create({
      data: {
        employeeId: req.user.userId,
        companyId: req.user.companyId,
        amount: numericAmount,
        currency,
        convertedAmount: numericConverted,
        category,
        description,
        date: new Date(date || Date.now())
      }
    })

    // If manager exists and is approver, auto-create approval step
    if (user.manager && user.manager.isManagerApprover) {
      await prisma.approvalStep.create({
        data: {
          expenseId: expense.id,
          approverId: user.managerId,
          stepOrder: 1
        }
      })
    } else {
      // If no manager or manager is not approver, we could auto-approve or leave pending for admin.
      // Assuming pending status for simplicity or fallback.
      if (req.user.role === 'admin') {
         // Auto approve if an admin submits their own? We can just leave it as pending to test workflows.
      }
    }

    res.status(201).json({ message: 'Expense submitted successfully', expense })
  } catch (err) {
    console.error('Submit expense error:', err)
    res.status(500).json({ error: 'Failed to submit expense' })
  }
})

// GET /my → employee's own expenses with steps included
router.get('/my', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { employeeId: req.user.userId },
      include: { approvalSteps: true },
      orderBy: { date: 'desc' }
    })
    res.json(expenses)
  } catch (err) {
    console.error('Fetch my expenses error:', err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// GET /pending-approvals → approval steps where approverId = logged in user and decision = pending
router.get('/pending-approvals', async (req, res) => {
  try {
    const steps = await prisma.approvalStep.findMany({
      where: {
        approverId: req.user.userId,
        decision: 'pending'
      },
      include: {
        expense: {
          include: {
            employee: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: {
        expense: {
          date: 'desc'
        }
      }
    })
    res.json(steps)
  } catch (err) {
    console.error('Fetch pending approvals error:', err)
    res.status(500).json({ error: 'Failed to fetch pending approvals' })
  }
})

// PATCH /decide/:stepId → approve/reject step, update expense status
router.patch('/decide/:stepId', async (req, res) => {
  const { stepId } = req.params
  const { decision, comment } = req.body // 'approved' or 'rejected'

  try {
    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId }
    })

    if (!step) {
      return res.status(404).json({ error: 'Approval step not found' })
    }
    if (step.approverId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to decide this step' })
    }

    // Update the step
    const updatedStep = await prisma.approvalStep.update({
      where: { id: stepId },
      data: {
        decision,
        comment,
        decidedAt: new Date()
      }
    })

    // Update the parent expense based on decision
    // In a multi-step workflow we would check if next step exists. Here we simplify.
    let expenseStatus = 'pending'
    if (decision === 'approved') {
       expenseStatus = 'approved'
    } else if (decision === 'rejected') {
       expenseStatus = 'rejected'
    }

    await prisma.expense.update({
      where: { id: step.expenseId },
      data: { status: expenseStatus }
    })

    res.json({ message: 'Decision recorded', step: updatedStep })
  } catch (err) {
    console.error('Decide error:', err)
    res.status(500).json({ error: 'Failed to record decision' })
  }
})

// GET /all → all company expenses (admin)
router.get('/all', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        companyId: req.user.companyId
      },
      include: {
        employee: { select: { name: true, email: true } },
        approvalSteps: true
      },
      orderBy: { date: 'desc' }
    })
    res.json(expenses)
  } catch (err) {
    console.error('Fetch all expenses error:', err)
    res.status(500).json({ error: 'Failed to fetch all expenses' })
  }
})

// GET /decisions → past approvals/rejections by the logged in manager
router.get('/decisions', async (req, res) => {
  try {
    const steps = await prisma.approvalStep.findMany({
      where: {
        approverId: req.user.userId,
        decision: { not: 'pending' }
      },
      include: {
        expense: {
          include: {
            employee: { select: { name: true, email: true } }
          }
        }
      },
      orderBy: { decidedAt: 'desc' }
    })
    res.json(steps)
  } catch (err) {
    console.error('Fetch past decisions error:', err)
    res.status(500).json({ error: 'Failed to fetch decisions' })
  }
})

module.exports = router