import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        d.donorname AS donor,
        d.amount::numeric(10,2) AS amount,
        TO_CHAR(d.date::timestamp, 'YYYY-MM-DD') AS date,
        COALESCE(s.name, 'Unassigned') AS shelter
      FROM donation d
      LEFT JOIN shelter s ON s.shelterid = d.shelterid
      ORDER BY d.donationid ASC`,
    )

    res.json({ donations: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch donations.', error: error.message })
  }
})

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        d.donorname AS donor,
        d.amount::numeric(10,2) AS amount,
        TO_CHAR(d.date::timestamp, 'YYYY-MM-DD') AS date,
        COALESCE(s.name, 'Unassigned') AS shelter
      FROM donation d
      LEFT JOIN shelter s ON s.shelterid = d.shelterid
      WHERE LOWER(d.donorname) = LOWER($1)
      ORDER BY d.donationid ASC`,
      [req.user.name],
    )

    res.json({ donations: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user donations.', error: error.message })
  }
})

router.post('/', verifyToken, async (req, res) => {
  const { amount, shelterId } = req.body
  const numericAmount = Number(amount)
  const numericShelterId = Number(shelterId)

  if (!numericAmount || numericAmount <= 0) {
    return res.status(400).json({ message: 'Amount must be greater than 0.' })
  }
  if (!numericShelterId) {
    return res.status(400).json({ message: 'Please select a shelter.' })
  }

  try {
    await pool.query(
      `INSERT INTO donation (donorname, amount, date, shelterid)
       VALUES ($1, $2, CURRENT_DATE, $3)`,
      [req.user.name, numericAmount, numericShelterId],
    )

    return res.status(201).json({ message: 'Donation submitted successfully.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit donation.', error: error.message })
  }
})

export default router

