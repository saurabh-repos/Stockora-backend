/**
 * Reusable middleware to validate request bodies against Joi schemas.
 */
const validateRequest = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    // Format Joi errors into a single string or array of messages
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return res.status(400).json({ message: errorMessage });
  }
  
  next();
};

module.exports = validateRequest;
