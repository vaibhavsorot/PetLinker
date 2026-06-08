import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken, requireStaff } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, requireStaff, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        mr.recordid AS id,
        COALESCE(a.name, 'Unknown') AS animal,
        mr.treatment,
        TO_CHAR(mr.vaccinationdate::timestamp, 'YYYY-MM-DD') AS "vaccinationDate",
        TO_CHAR(mr.nextcheckupdate::timestamp, 'YYYY-MM-DD') AS "nextCheckupDate",
        COALESCE(v.name, 'Unknown') AS vet
      FROM medicalrecord mr
      LEFT JOIN animal a ON a.animalid = mr.animalid
      LEFT JOIN veterinarian v ON v.vetid = mr.vetid
      ORDER BY mr.recordid ASC`,
    )

    res.json({ medicalRecords: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch medical records.', error: error.message })
  }
})

export default router

