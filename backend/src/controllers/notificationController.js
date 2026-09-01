const prisma = require('../utils/prisma');

/**
 * Récupère toutes les notifications de l'utilisateur connecté
 */
async function getUserNotifications(req, res) {
  try {
    const userId = req.user.id;
    const { unreadOnly, limit = 50 } = req.query;

    const where = { userId };
    if (unreadOnly === 'true') {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false }
    });

    return res.status(200).json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error) {
    console.error('Erreur getUserNotifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des notifications.'
    });
  }
}

/**
 * Marquer une notification comme lue
 */
async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification introuvable.'
      });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas modifier cette notification.'
      });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    return res.status(200).json({
      success: true,
      data: { notification: updated }
    });
  } catch (error) {
    console.error('Erreur markAsRead:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la notification.'
    });
  }
}

/**
 * Marquer toutes les notifications de l'utilisateur comme lues
 */
async function markAllAsRead(req, res) {
  try {
    const userId = req.user.id;

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });

    return res.status(200).json({
      success: true,
      message: 'Toutes les notifications ont été marquées comme lues.'
    });
  } catch (error) {
    console.error('Erreur markAllAsRead:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour des notifications.'
    });
  }
}

/**
 * Supprimer une notification
 */
async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== userId) {
      return res.status(404).json({
        success: false,
        message: 'Notification non trouvée.'
      });
    }

    await prisma.notification.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: 'Notification supprimée avec succès.'
    });
  } catch (error) {
    console.error('Erreur deleteNotification:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la notification.'
    });
  }
}

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
