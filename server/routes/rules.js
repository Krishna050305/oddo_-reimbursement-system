const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')
const authMiddleware = require('../middleware/auth')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

router.use(authMiddleware)

// POST /create → create approval rule (admin only)
router.post('/create', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  const { name, ruleType, percentageThreshold, specificApproverId, approverIds } = req.body

  if (!name || !ruleType) {
    return res.status(400).json({ error: 'Rule name and type are required' })
  }

  const validTypes = ['sequential', 'percentage', 'specific', 'hybrid']
  if (!validTypes.includes(ruleType)) {
    return res.status(400).json({ error: `Invalid rule type. Must be one of: ${validTypes.join(', ')}` })
  }

  try {
    const rule = await prisma.approvalRule.create({
      data: {
        companyId: req.user.companyId,
        name,
        ruleType,
        percentageThreshold: percentageThreshold ? parseFloat(percentageThreshold) : null,
        specificApproverId: specificApproverId || null
      }
    })

    res.status(201).json({ message: 'Approval rule created successfully', rule })
  } catch (err) {
    console.error('Create rule error:', err)
    res.status(500).json({ error: 'Failed to create approval rule' })
  }
})

// GET / → list all rules for the company
router.get('/', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    const rules = await prisma.approvalRule.findMany({
      where: { companyId: req.user.companyId },
      orderBy: { name: 'asc' }
    })
    res.json(rules)
  } catch (err) {
    console.error('Fetch rules error:', err)
    res.status(500).json({ error: 'Failed to fetch rules' })
  }
})

// DELETE /:id → delete a rule
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  try {
    await prisma.approvalRule.delete({ where: { id: req.params.id } })
    res.json({ message: 'Rule deleted' })
  } catch (err) {
    console.error('Delete rule error:', err)
    res.status(500).json({ error: 'Failed to delete rule' })
  }
})

module.exports = router
