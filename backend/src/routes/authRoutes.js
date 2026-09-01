const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');
const { validateBody } = require('../middlewares/validate');
const { uploadProfileAvatar } = require('../middlewares/upload');

// Inscription
router.post('/register', validateBody(['name', 'email', 'password']), authController.register);

// Connexion
router.post('/login', validateBody(['email', 'password']), authController.login);

// Obtenir son profil utilisateur connecté
router.get('/me', authenticateToken, authController.getMe);

// Mettre à jour son profil (nom, avatar, mot de passe)
router.put('/profile', authenticateToken, authController.updateProfile);

// Mettre à jour la photo de profil
router.put('/profile/avatar', authenticateToken, uploadProfileAvatar.single('avatar'), authController.updateAvatar);

module.exports = router;
