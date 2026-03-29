const router = require('express').Router()

router.get('/', (req, res) => {
  res.json({ message: 'Expenses route working' })
})

module.exports = router