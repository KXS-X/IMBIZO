const prisma = require('../utils/prisma');

/**
 * Récupère les métriques et statistiques globales de la plateforme (pour l'admin back-office)
 */
async function getPlatformStats(req, res) {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalProjects,
      totalTasks,
      todoTasks,
      inProgressTasks,
      doneTasks,
      totalMessages,
      totalNotifications
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.project.count(),
      prisma.task.count(),
      prisma.task.count({ where: { status: 'A_FAIRE' } }),
      prisma.task.count({ where: { status: 'EN_COURS' } }),
      prisma.task.count({ where: { status: 'TERMINE' } }),
      prisma.message.count(),
      prisma.notification.count()
    ]);

    // Activités récentes
    const recentTasks = await prisma.task.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { name: true } },
        assignedTo: { select: { name: true } }
      }
    });

    const recentProjects = await prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { name: true } },
        _count: { select: { members: true, tasks: true } }
      }
    });

    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          users: {
            total: totalUsers,
            admins: totalAdmins,
            regular: totalUsers - totalAdmins
          },
          projects: {
            total: totalProjects
          },
          tasks: {
            total: totalTasks,
            todo: todoTasks,
            inProgress: inProgressTasks,
            done: doneTasks,
            completionRate
          },
          messages: {
            total: totalMessages
          },
          notifications: {
            total: totalNotifications
          }
        },
        recentActivities: {
          tasks: recentTasks,
          projects: recentProjects
        }
      }
    });
  } catch (error) {
    console.error('Erreur getPlatformStats:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du calcul des statistiques de la plateforme.'
    });
  }
}

module.exports = {
  getPlatformStats
};
