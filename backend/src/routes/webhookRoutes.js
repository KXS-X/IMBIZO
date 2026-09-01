const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Endpoint public pour recevoir les événements GitHub réels
router.post('/github', webhookController.handleGitHubWebhook);

// Endpoint spécifique à un projet
router.post('/projects/:projectId/github', webhookController.handleGitHubWebhook);

module.exports = router;
