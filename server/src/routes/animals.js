import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, async (req, res) => {
  const shelterId = req.query.shelterId ? Number(req.query.shelterId) : null

  try {
    const baseQuery = `SELECT
      a.animalid AS id,
      COALESCE(a.name, 'Unknown') AS name,
      a.species,
      COALESCE(s.name, 'Unassigned') AS shelter,
      a.status
    FROM animal a
    LEFT JOIN shelter s ON s.shelterid = a.shelterid`

    const result = shelterId
      ? await pool.query(`${baseQuery} WHERE a.shelterid = $1 ORDER BY a.animalid ASC`, [shelterId])
      : await pool.query(`${baseQuery} ORDER BY a.animalid ASC`)

    res.json({ animals: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch animals.', error: error.message })
  }
})

export default router

