// Express 4 does not catch errors from async handlers on its own.
export const asyncHandler = (handler) => (req, res, next) => handler(req, res, next).catch(next);
