/**
 * Wrapper to handle async route errors without needing try/catch blocks everywhere.
 * Passes the error to the next() middleware (our global error handler).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
