import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken, requireStaff } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, requireStaff, async (_req, res) => {
  try {
    const [animalsCount, pendingAdoptions, activeRescues, monthlyDonations] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM animal'),
      pool.query("SELECT COUNT(*)::int AS count FROM adoption WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*)::int AS count FROM rescuereport WHERE status IN ('Pending', 'Ongoing')"),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0)::numeric(10,2) AS total
         FROM donation
         WHERE date_trunc('month', date) = date_trunc('month', CURRENT_DATE)`,
      ),
    ])

    res.json({
      stats: {
        animalsInShelters: animalsCount.rows[0].count,
        pendingAdoptions: pendingAdoptions.rows[0].count,
        activeRescues: activeRescues.rows[0].count,
        monthDonations: monthlyDonations.rows[0].total,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch dashboard stats.', error: error.message })
  }
})

export default router

