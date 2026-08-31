const express = require('express');
const router = express.Router();
const { receiveItn } = require('../controllers/payfastWebhookController');

// No authenticateToken -- this is called by PayFast's servers, not a
// logged-in user. Trust comes entirely from the signature check +
// server-to-server re-validation inside receiveItn, exactly like the
// WhatsApp webhook trusts Meta's own signature instead of a session.
router.post('/notify', receiveItn);

module.exports = router;
