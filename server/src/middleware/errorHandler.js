export function errorHandler(err, req, res, next) {
  console.error('[API Error]:', err.message);

  const status = err.status || 400;
  res.status(status).json({
    error: err.message || 'An unexpected error occurred',
    code: err.code || 'BAD_REQUEST',
    timestamp: new Date().toISOString(),
  });
}
