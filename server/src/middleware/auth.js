import jwt from 'jsonwebtoken'

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or invalid token.' })
  }

  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    return next()
  } catch {
    return res.status(401).json({ message: 'Token expired or invalid.' })
  }
}

export function requireStaff(req, res, next) {
  if (req.user?.role !== 'staff') {
    return res.status(403).json({ message: 'Staff access required.' })
  }
  return next()
}
