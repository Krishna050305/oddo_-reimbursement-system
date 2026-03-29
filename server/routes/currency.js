const router = require('express').Router()

// GET /api/currency/convert?from=USD&to=INR&amount=100
router.get('/convert', async (req, res) => {
  const { from, to, amount } = req.query

  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing required query params: from, to, amount' })
  }

  const numericAmount = parseFloat(amount)
  if (isNaN(numericAmount)) {
    return res.status(400).json({ error: 'Amount must be a valid number' })
  }

  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${from.toUpperCase()}`)

    if (!response.ok) {
      throw new Error(`Exchange rate API returned ${response.status}`)
    }

    const data = await response.json()
    const rate = data.rates[to.toUpperCase()]

    if (!rate) {
      throw new Error(`No rate found for ${to}`)
    }

    const convertedAmount = Math.round(numericAmount * rate * 100) / 100

    res.json({
      convertedAmount,
      rate,
      from: from.toUpperCase(),
      to: to.toUpperCase()
    })
  } catch (err) {
    console.error('Currency conversion error:', err.message)
    // Fallback: return original amount so the form can still submit
    res.json({
      convertedAmount: numericAmount,
      rate: 1,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      fallback: true
    })
  }
})

module.exports = router
