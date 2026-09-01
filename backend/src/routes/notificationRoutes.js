const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/auth');

router.use(authenticateToken);

// Récupérer toutes les notifications de l'utilisateur
router.get('/', notificationController.getUserNotifications);

// Marquer toutes les notifications comme lues
router.patch('/read-all', notificationController.markAllAsRead);

// Marquer une notification spécifique comme lue
router.patch('/:id/read', notificationController.markAsRead);

// Supprimer une notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;
