import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken, requireStaff } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, requireStaff, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        l.licenseid AS id,
        l.ownername,
        COALESCE(a.name, 'Unknown') AS animal,
        CASE
          WHEN l.expirydate < CURRENT_DATE THEN 'Expired'
          ELSE l.status
        END AS status,
        TO_CHAR(l.issuedate::timestamp, 'YYYY-MM-DD') AS "issueDate",
        TO_CHAR(l.expirydate::timestamp, 'YYYY-MM-DD') AS "expiryDate"
      FROM license l
      LEFT JOIN animal a ON a.animalid = l.animalid
      ORDER BY l.licenseid ASC`,
    )

    res.json({ licenses: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch licenses.', error: error.message })
  }
})

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        l.licenseid AS id,
        l.ownername,
        COALESCE(a.name, 'Unknown') AS animal,
        CASE
          WHEN l.expirydate < CURRENT_DATE THEN 'Expired'
          ELSE l.status
        END AS status,
        TO_CHAR(l.issuedate::timestamp, 'YYYY-MM-DD') AS "issueDate",
        TO_CHAR(l.expirydate::timestamp, 'YYYY-MM-DD') AS "expiryDate"
      FROM license l
      LEFT JOIN animal a ON a.animalid = l.animalid
      WHERE LOWER(l.ownername) = LOWER($1)
      ORDER BY l.licenseid ASC`,
      [req.user.name],
    )

    res.json({ licenses: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user licenses.', error: error.message })
  }
})

export default router

