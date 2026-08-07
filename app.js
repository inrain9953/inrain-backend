const express = require('express')
const bcrypt = require('bcrypt')
const { getUsers, getUserById } = require('./src/models/user')
const {
  generateToken,
  authenticateToken,
  verifyToken
} = require('./src/middleware/authMiddleware')
const { routeProtectedAPI } = require('./src/middleware/protectedAPI')
const {
  updateExpenseByID,
  createExpenseByUserID,
  getExpensesByUserID,
  getExpenseByID
} = require('./src/models/expense')
const {
  createConveyanceByUserID,
  updateConveyanceByID,
  getConveyancesByUserID
} = require('./src/models/conveyance')
const { saveTravel, getTravelByUserID } = require('./src/models/map')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3031

// Basic - allow all origins (fine for dev/testing)
app.use(cors({ origin: '*' }))

// Middleware
app.use(express.json())

// Root URL Route
app.get('/', (req, res) => {
  res.send('Hello World!')
})

// Login Route - Generate JWT token
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, error: 'Email and password required' })
    }

    // Fetch user from Supabase
    const users = await getUsers()
    const user = users.find(u => u.email === email)

    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: 'Invalid email or password' })
    }

    // Verify password (compare with stored hash)
    // const passwordMatch = await bcrypt.compare(password, user.password)
    const passwordMatch = password === user.password

    if (!passwordMatch) {
      return res
        .status(401)
        .json({ success: false, error: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = generateToken(user.id, { email: user.email, name: user.name })

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ success: false, error: 'Login failed' })
  }
})

// Refresh Token Route - Generate new token for authenticated user
app.post('/auth/refresh', authenticateToken, (req, res) => {
  try {
    const { userId, email, name } = req.user

    // Generate new token
    const newToken = generateToken(userId, { email, name })

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({ success: false, error: 'Token refresh failed' })
  }
})

// Verify Token Route - Check if token is valid
app.post('/auth/verify', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Token is valid',
    user: req.user
  })
})

// Protected Route Example
app.get('/protected', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'This is a protected route',
    user: req.user
  })
})

// Add Expense Route
app.post('/api/expenses', async (req, res) => {
  try {
    const {
      userId,
      id,
      site,
      category,
      amount,
      notes,
      type,
      entryDate,
      creditAmount,
      credittedby
    } = req.body

    if (!site || !entryDate || !userId) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields' })
    }

    const payload = {
      id: id,
      created_at: new Date().toISOString(),
      User_ID: userId,
      category: category,
      notes: notes,
      site: site,
      type: type,
      amount: amount,
      entryDate: entryDate,
      credit_by: credittedby,
      credit_amount: creditAmount,
      updated_at: new Date().toISOString()
    }

    const updated = await createExpenseByUserID(payload)
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update expense error:', error)
    res
      .status(500)
      .json({ success: false, error: 'Failed to update expense entry' })
  }
})

// Edit Expense Route
app.put('/api/expenses/update', async (req, res) => {
  try {
    const {
      userId,
      id,
      site,
      category,
      amount,
      notes,
      type,
      entryDate,
      credittedby,
      creditAmount
    } = req.body

    if (!site || !category || !amount) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields' })
    }
    const payload = {
      category: category,
      notes: notes,
      site: site,
      type: type,
      amount: amount,
      entryDate: entryDate,
      credit_by: credittedby,
      credit_amount: creditAmount,
      updated_at: new Date().toISOString()
    }

    const updated = await updateExpenseByID(id, userId, payload)
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update expense error:', error)
    res
      .status(500)
      .json({ success: false, error: 'Failed to update expense entry' })
  }
})

// Get Expenses Route by User ID
app.get('/api/expenses', async (req, res) => {
  try {
    const { userId } = req.query

    // Compute current month's start and end dates
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0] // e.g. '2026-08-01'
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0] // e.g. '2026-08-31'

    const expenses = await getExpensesByUserID(userId, startDate, endDate)
    res.json({
      success: true,
      data: expenses
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to get expenses'
    })
  }
})

// Get Expense by Expense ID Route
app.get('/api/expense', async (req, res) => {
  try {
    const { expenseId } = req.query
    const expenses = await getExpenseByID(expenseId)
    res.json({
      success: true,
      data: expenses
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to get expenses'
    })
  }
})

// Add Conveyance Route
app.post('/api/conveyance', async (req, res) => {
  try {
    const { userId, id, from, to, type, amount, site } = req.body

    if (!type || !id || !userId || !from || !to || !amount || !site) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields' })
    }
    const payload = {
      id: id,
      created_at: new Date().toISOString(),
      User_ID: userId,
      From: from,
      To: to,
      type: type,
      amount: amount,
      site: site,
      updated_at: new Date().toISOString()
    }

    const updated = await createConveyanceByUserID(payload)
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update conveyance error:', error)
    res
      .status(500)
      .json({ success: false, error: 'Failed to update expense entry' })
  }
})

// Edit Conveyance Route
app.put('/api/conveyance/update', async (req, res) => {
  try {
    const { userId, id, from, to, type, amount, site } = req.body

    if (!from || !to || !type || !amount || !site || !id || !userId) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields' })
    }
    const payload = {
      From: from,
      To: to,
      type: type,
      amount: amount,
      site: site,
      updated_at: new Date().toISOString()
    }

    const updated = await updateConveyanceByID(id, userId, payload)
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error('Update conveyance error:', error)
    res
      .status(500)
      .json({ success: false, error: 'Failed to update expense entry' })
  }
})

// Get Conveyance Route by User ID
app.get('/api/conveyance', async (req, res) => {
  try {
    const { userId } = req.query

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // 1-indexed
    const pad = n => String(n).padStart(2, '0')

    const startDate = `${year}-${pad(month)}-01T00:00:00.000Z`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59.999Z`

    const expenses = await getConveyancesByUserID(userId, startDate, endDate)
    res.json({
      success: true,
      data: expenses
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to get expenses'
    })
  }
})

// Add Map Location Route
app.post('/api/map', async (req, res) => {
  try {
    const data = req.body

    const trip = data?.trip
    const points = trip?.points

    if (
      !trip?.id ||
      !trip?.startedAt ||
      !trip?.endedAt ||
      trip?.distanceKm == null
    ) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing required fields' })
    }

    if (!Array.isArray(points) || points.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: 'Missing trip points' })
    }

    const payload = {
      id: trip.id,
      User_ID: data?.userId,
      started_at: trip.startedAt,
      ended_at: trip.endedAt,
      KM: trip.distanceKm,
      created_at: new Date(trip?.startedAt).toISOString(),
      updated_at: new Date().toISOString()
    }

    const saved = await saveTravel(payload, points)
    res.json({ success: true, data: saved })
  } catch (error) {
    console.error('Save travel error:', error)
    res
      .status(500)
      .json({ success: false, error: 'Failed to save travel entry' })
  }
})

// Get Map Location by User ID
app.get('/api/map', async (req, res) => {
  try {
    const { userId } = req.query

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // 1-indexed
    const pad = n => String(n).padStart(2, '0')

    const startDate = `${year}-${pad(month)}-01T00:00:00.000Z`
    const lastDay = new Date(year, month, 0).getDate()
    const endDate = `${year}-${pad(month)}-${pad(lastDay)}T23:59:59.999Z`

    const expenses = await getTravelByUserID(userId, startDate, endDate)
    res.json({
      success: true,
      data: expenses
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      success: false,
      error: 'Failed to get location'
    })
  }
})

// Start the server
app.listen(PORT, '192.168.31.247', () => {
  console.log(`Server is running on port ${PORT}`)
})
