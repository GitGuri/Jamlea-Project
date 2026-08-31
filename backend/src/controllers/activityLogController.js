const asyncHandler = require('../utils/asyncHandler');
const { listActivity } = require('../services/activityLogService');

// Admin only -- see activityLogRoutes.js.
const getActivityLog = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const result = await listActivity({ page, limit });
  return res.json(result);
});

module.exports = { getActivityLog };
