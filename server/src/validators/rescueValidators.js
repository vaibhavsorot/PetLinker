import { body, param } from 'express-validator'

const urgencyValues = ['Low', 'Medium', 'High']
const statusValues = ['Pending', 'Ongoing', 'Resolved']

export const createRescueValidators = [
  body('location').trim().escape().isLength({ min: 2, max: 200 }).withMessage('Location must be 2–200 characters.'),
  body('description').optional().trim().escape().isLength({ max: 500 }).withMessage('Description max 500 characters.'),
  body('urgency').isIn(urgencyValues).withMessage('Urgency must be Low, Medium, or High.'),
]

export const updateRescueValidators = [
  param('id').isInt({ min: 1 }).withMessage('Valid report ID is required.'),
  body('location').optional().trim().escape().isLength({ min: 2, max: 200 }),
  body('description').optional().trim().escape().isLength({ max: 500 }),
  body('urgency').optional().isIn(urgencyValues),
  body('status').optional().isIn(statusValues),
]

export const rescueIdValidator = [
  param('id').isInt({ min: 1 }).withMessage('Valid report ID is required.'),
]
