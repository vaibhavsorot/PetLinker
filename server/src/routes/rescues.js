import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        reportid AS id,
        reportername AS reporter,
        location AS area,
        COALESCE(description, '') AS description,
        urgency,
        status
      FROM rescuereport
      ORDER BY reportid ASC`,
    )

    res.json({ rescues: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch rescue reports.', error: error.message })
  }
})

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        reportid AS id,
        reportername AS reporter,
        location AS area,
        COALESCE(description, '') AS description,
        urgency,
        status
      FROM rescuereport
      WHERE LOWER(reportername) = LOWER($1)
      ORDER BY reportid ASC`,
      [req.user.name],
    )

    res.json({ rescues: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user rescue reports.', error: error.message })
  }
})

router.post('/', verifyToken, async (req, res) => {
  const { location, urgency, description } = req.body
  if (!location || !urgency) {
    return res.status(400).json({ message: 'Location and urgency are required.' })
  }
  if (!['Low', 'Medium', 'High'].includes(urgency)) {
    return res.status(400).json({ message: 'Urgency must be Low, Medium, or High.' })
  }

  try {
    await pool.query(
      `INSERT INTO rescuereport (reportername, location, description, urgency, status)
       VALUES ($1, $2, $3, $4, 'Pending')`,
      [req.user.name, location, description || '', urgency],
    )
    return res.status(201).json({ message: 'Rescue report submitted.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit rescue report.', error: error.message })
  }
})

router.patch('/:id/status', verifyToken, async (req, res) => {
  const reportId = Number(req.params.id)
  const { status } = req.body
  if (!reportId) return res.status(400).json({ message: 'Invalid report ID.' })
  if (status !== 'Resolved') {
    return res.status(400).json({ message: 'Only Resolved status update is allowed here.' })
  }

  try {
    const result = await pool.query(
      'UPDATE rescuereport SET status = $1 WHERE reportid = $2 RETURNING reportid',
      [status, reportId],
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Rescue report not found.' })
    }
    return res.json({ message: 'Rescue report marked as resolved.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update rescue report.', error: error.message })
  }
})

export default router

