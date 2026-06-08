export function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'Route not found.' })
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  res.status(status).json({
    message: err.message || 'Internal server error.',
    ...(process.env.NODE_ENV !== 'production' && err.stack ? { error: err.stack } : {}),
  })
}
