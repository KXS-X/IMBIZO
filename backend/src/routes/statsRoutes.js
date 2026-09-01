const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');

router.use(authenticateToken);
router.use(requireAdmin);

// Métriques globales de la plateforme pour le Back-Office Admin
router.get('/platform', statsController.getPlatformStats);

module.exports = router;
