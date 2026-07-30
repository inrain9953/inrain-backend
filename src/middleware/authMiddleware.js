const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET
const TOKEN_EXPIRY = '7d'

// Generate access token
function generateToken (userId, userData = {}) {
  const payload = {
    userId,
    ...userData,
    iat: Math.floor(Date.now() / 1000)
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

// Verify token
function verifyToken (token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return { valid: true, decoded }
  } catch (error) {
    return { valid: false, error: error.message }
  }
}

// Middleware to protect routes
function authenticateToken (req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1] // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' })
  }

  const { valid, decoded, error } = verifyToken(token)

  if (!valid) {
    return res.status(403).json({ success: false, error: 'Invalid or expired token', details: error })
  }

  req.user = decoded
  next()
}

module.exports = {
  generateToken,
  verifyToken,
  authenticateToken,
  JWT_SECRET,
  TOKEN_EXPIRY
}
