const express = require('express');
const router = express.Router({ mergeParams: true });
const messageController = require('../controllers/messageController');
const { authenticateToken } = require('../middlewares/auth');
const { requireProjectRole } = require('../middlewares/role');
const { uploadMessageAttachments } = require('../middlewares/upload');

router.use(authenticateToken);
router.use(requireProjectRole());

// Historique des messages du projet
router.get('/', messageController.getProjectMessages);

// Envoi d'un message (REST fallback)
router.post('/', uploadMessageAttachments.array('files', 5), messageController.sendMessage);

module.exports = router;
