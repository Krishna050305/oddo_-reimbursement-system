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
    
    if (!user) {
      console.error(`Submit expense error: User ${req.user.userId} not found in database`)
      return res.status(404).json({ error: 'User not found. Please log in again.' })
    }
    
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
          stepOrder: 0
        }
      })
    }

    res.status(201).json({ message: 'Expense submitted successfully', expense })
  } catch (err) {
    console.error('Submit expense error:', err)
    res.status(500).json({ error: `Failed to submit expense: ${err.message}` })
  }
})

// GET /my → employee's own expenses with steps included
router.get('/my', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { employeeId: req.user.userId },
      include: {
        approvalSteps: {
          include: {
            approver: { select: { name: true, email: true, role: true } }
          },
          orderBy: { stepOrder: 'asc' }
        }
      },
      orderBy: { date: 'desc' }
    })
    res.json(expenses)
  } catch (err) {
    console.error('Fetch my expenses error:', err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// GET /pending-approvals → approval steps where approverId = logged in user and decision = pending
// Only show steps whose stepOrder matches the expense's currentStep (multi-step awareness)
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
            },
            approvalSteps: {
              include: {
                approver: { select: { name: true, email: true, role: true } }
              },
              orderBy: { stepOrder: 'asc' }
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

    // Filter: only show steps where stepOrder === expense.currentStep
    const activeSteps = steps.filter(s => s.stepOrder === s.expense.currentStep)

    res.json(activeSteps)
  } catch (err) {
    console.error('Fetch pending approvals error:', err)
    res.status(500).json({ error: 'Failed to fetch pending approvals' })
  }
})

// PATCH /decide/:stepId → approve/reject step with multi-step sequential logic
router.patch('/decide/:stepId', async (req, res) => {
  const { stepId } = req.params
  const { decision, comment } = req.body // 'approved' or 'rejected'

  try {
    const step = await prisma.approvalStep.findUnique({
      where: { id: stepId },
      include: {
        expense: {
          include: {
            approvalSteps: {
              orderBy: { stepOrder: 'asc' }
            }
          }
        }
      }
    })

    if (!step) {
      return res.status(404).json({ error: 'Approval step not found' })
    }
    if (step.approverId !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized to decide this step' })
    }
    if (step.decision !== 'pending') {
      return res.status(400).json({ error: 'This step has already been decided' })
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

    // Multi-step sequential logic
    if (decision === 'rejected') {
      // Rejected at any step → expense is immediately rejected
      await prisma.expense.update({
        where: { id: step.expenseId },
        data: { status: 'rejected' }
      })
    } else if (decision === 'approved') {
      // Check if there are more steps with higher stepOrder
      const allSteps = step.expense.approvalSteps
      const nextSteps = allSteps.filter(s => s.stepOrder > step.stepOrder)

      if (nextSteps.length > 0) {
        // More steps remain — advance currentStep, keep status pending
        const nextStep = nextSteps[0] // next in order
        await prisma.expense.update({
          where: { id: step.expenseId },
          data: {
            status: 'pending',
            currentStep: nextStep.stepOrder
          }
        })
      } else {
        // No more steps — expense is fully approved
        await prisma.expense.update({
          where: { id: step.expenseId },
          data: { status: 'approved' }
        })
      }
    }

    res.json({ message: 'Decision recorded', step: updatedStep })
  } catch (err) {
    console.error('Decide error:', err)
    res.status(500).json({ error: 'Failed to record decision' })
  }
})

// POST /assign-approvers → admin assigns an approval chain to an expense
router.post('/assign-approvers', async (req, res) => {
  const { expenseId, approverIds } = req.body

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  if (!expenseId || !approverIds || !Array.isArray(approverIds) || approverIds.length === 0) {
    return res.status(400).json({ error: 'expenseId and approverIds[] are required' })
  }

  try {
    // Verify expense exists and belongs to the same company
    const expense = await prisma.expense.findUnique({ where: { id: expenseId } })
    if (!expense) return res.status(404).json({ error: 'Expense not found' })
    if (expense.companyId !== req.user.companyId) {
      return res.status(403).json({ error: 'Cannot modify expenses outside your company' })
    }

    // Delete existing approval steps for this expense (reset chain)
    await prisma.approvalStep.deleteMany({ where: { expenseId } })

    // Create new steps in order
    const steps = await Promise.all(
      approverIds.map((approverId, index) =>
        prisma.approvalStep.create({
          data: {
            expenseId,
            approverId,
            stepOrder: index
          }
        })
      )
    )

    // Reset expense to pending at step 0
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'pending', currentStep: 0 }
    })

    res.status(201).json({ message: 'Approval chain created', steps })
  } catch (err) {
    console.error('Assign approvers error:', err)
    res.status(500).json({ error: 'Failed to assign approvers' })
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
        approvalSteps: {
          include: {
            approver: { select: { name: true, email: true, role: true } }
          },
          orderBy: { stepOrder: 'asc' }
        }
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
            employee: { select: { name: true, email: true } },
            approvalSteps: {
              include: {
                approver: { select: { name: true, email: true, role: true } }
              },
              orderBy: { stepOrder: 'asc' }
            }
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