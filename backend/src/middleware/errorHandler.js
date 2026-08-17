function notFound(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  // Nothing in this codebase sets err.status -- every error reaching here is
  // an unhandled one (thrown DB/Postgres errors etc.), so always genericize
  // the message rather than leaking raw internal error text (e.g. Postgres
  // column/constraint details) to the client.
  const message = status === 500 ? 'Internal server error' : err.message || 'Internal server error';
  res.status(status).json({ error: message });
}

module.exports = { notFound, errorHandler };
