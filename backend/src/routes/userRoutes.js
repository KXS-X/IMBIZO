const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateToken } = require('../middlewares/auth');
const { requireAdmin } = require('../middlewares/role');

// Toutes les routes utilisateurs nécessitent une authentification
router.use(authenticateToken);

// Liste de tous les utilisateurs (accessible pour ajouter des membres ou pour l'admin)
router.get('/', requireAdmin, userController.getAllUsers);

// Détail d'un utilisateur
router.get('/:id', userController.getUserById);

// Routes réservées exclusivement aux administrateurs (Back-Office)
router.post('/', requireAdmin, userController.createUser);
router.put('/:id/role', requireAdmin, userController.updateUserRole);
router.delete('/:id', requireAdmin, userController.deleteUser);

module.exports = router;
