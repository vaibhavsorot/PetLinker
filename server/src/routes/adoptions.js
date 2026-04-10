import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        ap.adoptionid AS id,
        COALESCE(an.name, 'Unknown') AS animal,
        ad.name AS adopter,
        ap.status
      FROM adoption ap
      LEFT JOIN animal an ON an.animalid = ap.animalid
      LEFT JOIN adopter ad ON ad.adopterid = ap.adopterid
      ORDER BY ap.adoptionid ASC`,
    )

    res.json({ adoptions: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch adoptions.', error: error.message })
  }
})

router.get('/mine', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        ap.adoptionid AS id,
        COALESCE(an.name, 'Unknown') AS animal,
        ad.name AS adopter,
        ap.status
      FROM adoption ap
      LEFT JOIN animal an ON an.animalid = ap.animalid
      LEFT JOIN adopter ad ON ad.adopterid = ap.adopterid
      WHERE LOWER(ad.name) = LOWER($1)
      ORDER BY ap.adoptionid ASC`,
      [req.user.name],
    )

    res.json({ adoptions: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user adoptions.', error: error.message })
  }
})

router.patch('/:id/status', verifyToken, async (req, res) => {
  const adoptionId = Number(req.params.id)
  const { status } = req.body
  if (!adoptionId) return res.status(400).json({ message: 'Invalid adoption ID.' })
  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ message: 'Status must be Approved or Rejected.' })
  }

  try {
    const result = await pool.query(
      'UPDATE adoption SET status = $1 WHERE adoptionid = $2 RETURNING adoptionid',
      [status, adoptionId],
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Adoption request not found.' })
    return res.json({ message: `Request ${status.toLowerCase()}.` })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update adoption request.', error: error.message })
  }
})

router.post('/request', verifyToken, async (req, res) => {
  const { animalId } = req.body
  const numericAnimalId = Number(animalId)
  if (!numericAnimalId) {
    return res.status(400).json({ message: 'Valid animal ID is required.' })
  }

  try {
    const adopterResult = await pool.query(
      'SELECT adopterid FROM adopter WHERE LOWER(name) = LOWER($1) LIMIT 1',
      [req.user.name],
    )
    if (adopterResult.rowCount === 0) {
      return res.status(404).json({ message: 'Adopter profile not found for this user.' })
    }

    const animalResult = await pool.query(
      'SELECT status FROM animal WHERE animalid = $1',
      [numericAnimalId],
    )
    if (animalResult.rowCount === 0) {
      return res.status(404).json({ message: 'Animal not found.' })
    }
    if (animalResult.rows[0].status !== 'Available') {
      return res.status(400).json({ message: 'This animal is not available for adoption.' })
    }

    const existingRequest = await pool.query(
      `SELECT 1 FROM adoption
       WHERE animalid = $1 AND adopterid = $2 AND status = 'Pending'`,
      [numericAnimalId, adopterResult.rows[0].adopterid],
    )
    if (existingRequest.rowCount > 0) {
      return res.status(409).json({ message: 'You already have a pending request for this animal.' })
    }

    await pool.query(
      `INSERT INTO adoption (animalid, adopterid, adoptiondate, status)
       VALUES ($1, $2, CURRENT_DATE, 'Pending')`,
      [numericAnimalId, adopterResult.rows[0].adopterid],
    )

    return res.status(201).json({ message: 'Adoption request submitted.' })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to submit adoption request.', error: error.message })
  }
})

export default router

