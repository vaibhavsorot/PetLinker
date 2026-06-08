import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken, requireStaff } from '../middleware/auth.js'
import { handleValidation } from '../middleware/validate.js'
import {
  createRescueValidators,
  updateRescueValidators,
  rescueIdValidator,
} from '../validators/rescueValidators.js'

const router = Router()

const rescueSelect = `SELECT
  reportid AS id,
  reportername AS reporter,
  location AS area,
  COALESCE(description, '') AS description,
  urgency,
  status
FROM rescuereport`

async function findReport(reportId) {
  const result = await pool.query(`${rescueSelect} WHERE reportid = $1`, [reportId])
  return result.rows[0] || null
}

function isOwner(report, userName) {
  return report.reporter.toLowerCase() === userName.toLowerCase()
}

router.get('/', verifyToken, requireStaff, async (_req, res) => {
  try {
    const result = await pool.query(`${rescueSelect} ORDER BY reportid ASC`)
    res.json({ rescues: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch rescue reports.', error: error.message })
  }
})

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `${rescueSelect} WHERE LOWER(reportername) = LOWER($1) ORDER BY reportid ASC`,
      [req.user.name],
    )
    res.json({ rescues: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user rescue reports.', error: error.message })
  }
})

router.get('/:id', verifyToken, rescueIdValidator, handleValidation, async (req, res) => {
  const reportId = Number(req.params.id)
  try {
    const report = await findReport(reportId)
    if (!report) return res.status(404).json({ message: 'Rescue report not found.' })
    if (req.user.role !== 'staff' && !isOwner(report, req.user.name)) {
      return res.status(403).json({ message: 'Not allowed to view this report.' })
    }
    return res.json({ rescue: report })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch rescue report.', error: error.message })
  }
})

router.post('/', verifyToken, createRescueValidators, handleValidation, async (req, res) => {
  const { location, urgency, description } = req.body
  try {
    const result = await pool.query(
      `INSERT INTO rescuereport (reportername, location, description, urgency, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING reportid AS id, reportername AS reporter, location AS area,
                 COALESCE(description, '') AS description, urgency, status`,
      [req.user.name, location, description || '', urgency],
    )
    return res.status(201).json({ message: 'Rescue report submitted.', rescue: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit rescue report.', error: error.message })
  }
})

router.put('/:id', verifyToken, updateRescueValidators, handleValidation, async (req, res) => {
  const reportId = Number(req.params.id)
  const { location, description, urgency, status } = req.body

  try {
    const existing = await findReport(reportId)
    if (!existing) return res.status(404).json({ message: 'Rescue report not found.' })

    const owner = isOwner(existing, req.user.name)
    if (req.user.role !== 'staff' && !owner) {
      return res.status(403).json({ message: 'Not allowed to update this report.' })
    }
    if (req.user.role !== 'staff' && existing.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending reports can be edited.' })
    }
    if (status !== undefined && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Only staff can change status.' })
    }

    const result = await pool.query(
      `UPDATE rescuereport
       SET location = COALESCE($1, location),
           description = COALESCE($2, description),
           urgency = COALESCE($3, urgency),
           status = COALESCE($4, status)
       WHERE reportid = $5
       RETURNING reportid AS id, reportername AS reporter, location AS area,
                 COALESCE(description, '') AS description, urgency, status`,
      [location ?? null, description ?? null, urgency ?? null, status ?? null, reportId],
    )

    return res.json({ message: 'Rescue report updated.', rescue: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update rescue report.', error: error.message })
  }
})

router.patch('/:id/status', verifyToken, requireStaff, rescueIdValidator, handleValidation, async (req, res) => {
  const reportId = Number(req.params.id)
  const { status } = req.body
  if (!['Ongoing', 'Resolved'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Ongoing or Resolved.' })
  }

  try {
    const result = await pool.query(
      `UPDATE rescuereport SET status = $1 WHERE reportid = $2
       RETURNING reportid AS id, reportername AS reporter, location AS area,
                 COALESCE(description, '') AS description, urgency, status`,
      [status, reportId],
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Rescue report not found.' })
    }
    return res.json({ message: 'Rescue report status updated.', rescue: result.rows[0] })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update rescue report.', error: error.message })
  }
})

router.delete('/:id', verifyToken, rescueIdValidator, handleValidation, async (req, res) => {
  const reportId = Number(req.params.id)

  try {
    const existing = await findReport(reportId)
    if (!existing) return res.status(404).json({ message: 'Rescue report not found.' })

    const owner = isOwner(existing, req.user.name)
    if (req.user.role !== 'staff' && !owner) {
      return res.status(403).json({ message: 'Not allowed to delete this report.' })
    }
    if (req.user.role !== 'staff' && existing.status !== 'Pending') {
      return res.status(400).json({ message: 'Only pending reports can be deleted.' })
    }

    await pool.query('DELETE FROM rescuereport WHERE reportid = $1', [reportId])
    return res.json({ message: 'Rescue report deleted.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete rescue report.', error: error.message })
  }
})

export default router
