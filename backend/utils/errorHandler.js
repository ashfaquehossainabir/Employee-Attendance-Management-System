// Converts common Mongoose/MongoDB errors into clear, correctly-coded
// HTTP responses instead of a generic opaque 500. Always logs the full
// error server-side so it shows up in your terminal/logs for debugging.
const handleDbError = (err, res, fallbackMessage = 'Something went wrong') => {
  console.error(fallbackMessage, '-', err);

  // Duplicate key (e.g. email or employeeId already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      message: `An account with that ${field} already exists`,
      error: err.message,
    });
  }

  // Mongoose schema validation errors (missing/invalid fields)
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: details.join('; ') || 'Validation failed',
      error: err.message,
    });
  }

  // Malformed ObjectId, etc.
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: `Invalid value for ${err.path}`,
      error: err.message,
    });
  }

  return res.status(500).json({ message: fallbackMessage, error: err.message });
};

module.exports = { handleDbError };
