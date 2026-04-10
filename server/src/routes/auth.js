import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required.' })
  }
  if (!['user', 'staff'].includes(role)) {
    return res.status(400).json({ message: 'Role must be user or staff.' })
  }

  try {
    const existing = await pool.query('SELECT id FROM app_user WHERE email = $1', [email])
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: 'Email already exists.' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    await pool.query(
      'INSERT INTO app_user (name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      [name, email, passwordHash, role],
    )

    return res.status(201).json({ message: 'Signup successful. Please login.' })
  } catch (error) {
    return res.status(500).json({ message: 'Signup failed.', error: error.message })
  }
})

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required.' })
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, password_hash, role FROM app_user WHERE email = $1 AND role = $2',
      [email, role],
    )
    if (result.rowCount === 0) {
      return res.status(401).json({ message: 'Invalid credentials or role.' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials or role.' })
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1d' },
    )

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  } catch (error) {
    return res.status(500).json({ message: 'Login failed.', error: error.message })
  }
})

router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, email, role FROM app_user WHERE id = $1', [req.user.id])
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found.' })
    }
    return res.json({ user: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Could not fetch user.', error: error.message })
  }
})

export default router

