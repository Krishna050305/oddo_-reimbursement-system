require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/auth', require('./routes/auth'))
app.use('/api/expenses', require('./routes/expenses'))
app.use('/api/users', require('./routes/users'))

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`)
})