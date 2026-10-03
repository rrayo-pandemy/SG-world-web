const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  return res.json({
    success: true,
    service: 'Ganesh API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
