const express = require('express');
const router = express.Router({ mergeParams: true });
const featureController = require('../controllers/featureController');
const { authenticateToken } = require('../middlewares/auth');
const { requireProjectRole, requireAdmin } = require('../middlewares/role');
const { validateBody } = require('../middlewares/validate');

// Authentification requise pour toutes les opérations sur les fonctionnalités
router.use(authenticateToken);

// Consultation : accessible à tous les membres du projet et au super admin
router.get('/', requireProjectRole(), featureController.getProjectFeatures);

// Création : STRICTEMENT RÉSERVÉE au Super Admin
router.post('/', requireAdmin, validateBody(['title']), featureController.createFeature);

// Modification et suppression : STRICTEMENT RÉSERVÉES au Super Admin
router.put('/:id', requireAdmin, featureController.updateFeature);
router.delete('/:id', requireAdmin, featureController.deleteFeature);

module.exports = router;

