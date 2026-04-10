import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { pool } from './db.js'
import authRoutes from './routes/auth.js'
import animalsRoutes from './routes/animals.js'
import adoptionsRoutes from './routes/adoptions.js'
import rescuesRoutes from './routes/rescues.js'
import dashboardRoutes from './routes/dashboard.js'
import donationsRoutes from './routes/donations.js'
import sheltersRoutes from './routes/shelters.js'
import staffRoutes from './routes/staff.js'
import licensesRoutes from './routes/licenses.js'
import medicalRoutes from './routes/medical.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173'

app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok' })
  } catch {
    res.status(500).json({ status: 'db_unreachable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/animals', animalsRoutes)
app.use('/api/adoptions', adoptionsRoutes)
app.use('/api/rescues', rescuesRoutes)
app.use('/api/donations', donationsRoutes)
app.use('/api/shelters', sheltersRoutes)
app.use('/api/staff', staffRoutes)
app.use('/api/licenses', licensesRoutes)
app.use('/api/medical', medicalRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

