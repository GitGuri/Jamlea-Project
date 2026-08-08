const { validationResult } = require('express-validator');

// Runs after a chain of express-validator checks; short-circuits with 400 on failure.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, details: errors.array() });
  }
  next();
};

module.exports = validate;
