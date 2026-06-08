import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import swaggerUi from 'swagger-ui-express'
import { pool } from './db.js'
import { swaggerSpec } from './swagger.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
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

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: CLIENT_ORIGIN }))
app.use(express.json({ limit: '10kb' }))

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

const v1 = express.Router()

v1.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', version: 'v1' })
  } catch {
    res.status(500).json({ status: 'db_unreachable' })
  }
})

v1.use('/auth', authRoutes)
v1.use('/dashboard', dashboardRoutes)
v1.use('/animals', animalsRoutes)
v1.use('/adoptions', adoptionsRoutes)
v1.use('/rescues', rescuesRoutes)
v1.use('/donations', donationsRoutes)
v1.use('/shelters', sheltersRoutes)
v1.use('/staff', staffRoutes)
v1.use('/licenses', licensesRoutes)
v1.use('/medical', medicalRoutes)

app.use('/api/v1', v1)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`API v1: http://localhost:${PORT}/api/v1`)
  console.log(`Swagger: http://localhost:${PORT}/api/docs`)
})
