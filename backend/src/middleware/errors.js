function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.path,
    method: req.method,
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message;

  return res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = { notFound, errorHandler };
