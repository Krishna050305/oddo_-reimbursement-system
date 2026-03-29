const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const bcrypt = require('bcryptjs')
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...\n')

  // Clean existing data in order (respect foreign keys)
  console.log('🧹 Cleaning existing data...')
  await prisma.approvalStep.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.approvalRule.deleteMany()
  await prisma.user.deleteMany()
  await prisma.company.deleteMany()
  console.log('   ✓ Cleaned\n')

  // 1. Create company
  console.log('🏢 Creating company...')
  const company = await prisma.company.create({
    data: {
      name: 'Acme Corp',
      currency: 'INR',
      country: 'India'
    }
  })
  console.log(`   ✓ ${company.name} (${company.id})\n`)

  // 2. Create users
  console.log('👥 Creating users...')
  const hashedPassword = await bcrypt.hash('password123', 10)

  const admin = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Admin User',
      email: 'admin@acme.com',
      password: hashedPassword,
      role: 'admin',
      isManagerApprover: true
    }
  })
  console.log(`   ✓ Admin:    ${admin.email}`)

  const manager = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Manager User',
      email: 'manager@acme.com',
      password: hashedPassword,
      role: 'manager',
      isManagerApprover: true
    }
  })
  console.log(`   ✓ Manager:  ${manager.email}`)

  const finance = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Finance Head',
      email: 'finance@acme.com',
      password: hashedPassword,
      role: 'manager',
      isManagerApprover: true
    }
  })
  console.log(`   ✓ Finance:  ${finance.email}`)

  const employee = await prisma.user.create({
    data: {
      companyId: company.id,
      name: 'Raj Patel',
      email: 'employee@acme.com',
      password: hashedPassword,
      role: 'employee',
      isManagerApprover: false,
      managerId: manager.id
    }
  })
  console.log(`   ✓ Employee: ${employee.email} (manager: ${manager.email})`)
  console.log()

  // 3. Create expenses
  console.log('💰 Creating expenses...')

  // Expense 1: Approved — Food
  const expense1 = await prisma.expense.create({
    data: {
      employeeId: employee.id,
      companyId: company.id,
      amount: 850,
      currency: 'INR',
      category: 'Food',
      description: 'Team lunch at Mainland China',
      status: 'approved',
      currentStep: 0,
      date: new Date('2026-03-25')
    }
  })
  await prisma.approvalStep.create({
    data: {
      expenseId: expense1.id,
      approverId: manager.id,
      stepOrder: 0,
      decision: 'approved',
      comment: 'Looks good, approved!',
      decidedAt: new Date('2026-03-26')
    }
  })
  console.log(`   ✓ Approved:  ₹850  — Team lunch at Mainland China`)

  // Expense 2: Pending — Travel (multi-step: manager then finance)
  const expense2 = await prisma.expense.create({
    data: {
      employeeId: employee.id,
      companyId: company.id,
      amount: 2400,
      currency: 'INR',
      category: 'Travel',
      description: 'Cab to airport - BOM',
      status: 'pending',
      currentStep: 0,
      date: new Date('2026-03-27')
    }
  })
  // Step 0: Manager (pending — this is the active step)
  await prisma.approvalStep.create({
    data: {
      expenseId: expense2.id,
      approverId: manager.id,
      stepOrder: 0,
      decision: 'pending'
    }
  })
  // Step 1: Finance (pending — will become active after manager approves)
  await prisma.approvalStep.create({
    data: {
      expenseId: expense2.id,
      approverId: finance.id,
      stepOrder: 1,
      decision: 'pending'
    }
  })
  console.log(`   ✓ Pending:   ₹2400 — Cab to airport - BOM (2-step: Manager → Finance)`)

  // Expense 3: Rejected — Accommodation
  const expense3 = await prisma.expense.create({
    data: {
      employeeId: employee.id,
      companyId: company.id,
      amount: 8500,
      currency: 'INR',
      category: 'Accommodation',
      description: 'Hotel stay Mumbai',
      status: 'rejected',
      currentStep: 0,
      date: new Date('2026-03-26')
    }
  })
  await prisma.approvalStep.create({
    data: {
      expenseId: expense3.id,
      approverId: manager.id,
      stepOrder: 0,
      decision: 'rejected',
      comment: 'Exceeds policy limit',
      decidedAt: new Date('2026-03-27')
    }
  })
  console.log(`   ✓ Rejected:  ₹8500 — Hotel stay Mumbai`)
  console.log()

  // Summary
  console.log('═══════════════════════════════════════════')
  console.log('  ✅ Seed complete! Login credentials:')
  console.log('═══════════════════════════════════════════')
  console.log('  admin@acme.com    / password123  (Admin)')
  console.log('  manager@acme.com  / password123  (Manager)')
  console.log('  finance@acme.com  / password123  (Finance)')
  console.log('  employee@acme.com / password123  (Employee)')
  console.log('═══════════════════════════════════════════')
}

main()
  .catch(err => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
