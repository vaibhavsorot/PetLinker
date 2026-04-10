import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        s.shelterid AS id,
        s.name,
        s.location,
        s.capacity,
        COUNT(a.animalid)::int AS occupancy
      FROM shelter s
      LEFT JOIN animal a ON a.shelterid = s.shelterid
      GROUP BY s.shelterid
      ORDER BY s.shelterid ASC`,
    )

    res.json({ shelters: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shelters.', error: error.message })
  }
})

export default router

