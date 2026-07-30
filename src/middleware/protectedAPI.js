const { verifyToken } = require('./authMiddleware')
const { getUsers, getUserById } = require('../models/user')

// Map endpoints to their handler functions
const endpointHandlers = {
  'users:GET': getUsers,
  'users:POST': async (data) => {
    // Handle POST to create user
    return { message: 'User created', data }
  },
  'users:PUT': async (data) => {
    // Handle PUT to update user
    return { message: 'User updated', data }
  },
  'users:DELETE': async (data) => {
    // Handle DELETE to remove user
    return { message: 'User deleted', data }
  }
}

// Execute API based on endpoint and method
async function executeAPICall (endpoint, method, payload) {
  const key = `${endpoint}:${method}`

  if (!endpointHandlers[key]) {
    throw new Error(`Endpoint not found: ${endpoint} [${method}]`)
  }

  const handler = endpointHandlers[key]
  return await handler(payload)
}

// Verify token and make authenticated API call with full method support
async function callProtectedAPI (token, endpoint, method = 'GET', data = null) {
  const { valid, decoded, error } = verifyToken(token)

  if (!valid) {
    return {
      success: false,
      error: 'Invalid or expired token',
      details: error
    }
  }

  try {
    // Log the API call
    console.log(`[Protected API Call] User: ${decoded.userId}, Endpoint: ${endpoint}, Method: ${method}`)

    // Execute the API call
    const result = await executeAPICall(endpoint, method, data)

    return {
      success: true,
      user: decoded,
      endpoint,
      method,
      data: result,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      success: false,
      error: 'API call failed',
      details: error.message
    }
  }
}

// Generic API router that handles different HTTP methods
async function routeProtectedAPI (req, res) {
  try {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access token required' })
    }

    const { endpoint, method = 'GET', payload = {}, setCookie = false } = req.body

    if (!endpoint) {
      return res.status(400).json({ success: false, error: 'Endpoint name required' })
    }

    // Validate HTTP method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    if (!validMethods.includes(method.toUpperCase())) {
      return res.status(400).json({ success: false, error: `Invalid method. Allowed: ${validMethods.join(', ')}` })
    }

    const result = await callProtectedAPI(token, endpoint, method.toUpperCase(), payload)

    if (!result.success) {
      return res.status(403).json(result)
    }

    // Optionally set cookie with token
    if (setCookie) {
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      })
    }

    res.json(result)
  } catch (error) {
    console.error('Protected API route error:', error)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

module.exports = {
  callProtectedAPI,
  routeProtectedAPI,
  endpointHandlers
}
