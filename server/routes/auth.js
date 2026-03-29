const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })
// Signup — auto creates company + admin
router.post('/signup', async (req, res) => {
  const { name, email, password, companyName, country, currency } = req.body

  try {
    const hashed = await bcrypt.hash(password, 10)

    // Create company first
    const company = await prisma.company.create({
      data: { name: companyName, currency, country }
    })

    // Create admin user
    const user = await prisma.user.create({
      data: {
        name, email,
        password: hashed,
        role: 'admin',
        isManagerApprover: true,
        companyId: company.id
      }
    })

    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: company.id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { ...user, password: undefined } })
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(400).json({ error: 'User with this email already exists' })
    }
    res.status(400).json({ error: err.message })
  }
})

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { email }, include: { company: true } })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: 'Invalid password' })

    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: user.companyId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({ token, user: { ...user, password: undefined } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router