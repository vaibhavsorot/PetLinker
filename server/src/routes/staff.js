import { Router } from 'express'
import { pool } from '../db.js'
import { verifyToken } from '../middleware/auth.js'

const router = Router()

router.get('/', verifyToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        st.staffid AS id,
        st.name,
        COALESCE(st.role, 'Unassigned') AS role,
        st.contactinfo AS contact,
        COALESCE(sh.name, 'Unassigned') AS shelter
      FROM staffmember st
      LEFT JOIN shelter sh ON sh.shelterid = st.assignedshelterid
      ORDER BY st.staffid ASC`,
    )

    res.json({ staff: result.rows })
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch staff.', error: error.message })
  }
})

export default router

