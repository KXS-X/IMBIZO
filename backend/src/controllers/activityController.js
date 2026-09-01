const prisma = require('../utils/prisma');

async function getProjectActivities(req, res) {
  try {
    const projectId = req.params.id;
    const requestedLimit = Number.parseInt(req.query.limit, 10) || 100;
    const limit = Math.min(Math.max(requestedLimit, 1), 200);

    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, avatar: true }
        },
        task: {
          select: { id: true, title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return res.status(200).json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    console.error('Erreur getProjectActivities:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l’activité du projet.'
    });
  }
}

module.exports = { getProjectActivities };
