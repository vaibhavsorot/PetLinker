import { body } from 'express-validator'

export const signupValidators = [
  body('name').trim().escape().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters.'),
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['user', 'staff']).withMessage('Role must be user or staff.'),
]

export const loginValidators = [
  body('email').trim().normalizeEmail().isEmail().withMessage('Valid email is required.'),
  body('password').notEmpty().withMessage('Password is required.'),
  body('role').isIn(['user', 'staff']).withMessage('Role must be user or staff.'),
]
