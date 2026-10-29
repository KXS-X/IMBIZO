const prisma = require('../utils/prisma');

/**
 * Récupère toutes les fonctionnalités d'un projet avec leurs tâches associées
 */
async function getProjectFeatures(req, res) {
  try {
    const projectId = req.params.projectId || req.params.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant du projet requis.'
      });
    }

    const features = await prisma.feature.findMany({
      where: { projectId },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            assignedToId: true,
            assignedTo: {
              select: { id: true, name: true, avatar: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const featuresWithStats = features.map((feature) => {
      const totalTasks = feature.tasks.length;
      const completedTasks = feature.tasks.filter((t) => t.status === 'TERMINE').length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        ...feature,
        stats: {
          total: totalTasks,
          completed: completedTasks,
          progress: progressPercent
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: { features: featuresWithStats }
    });
  } catch (error) {
    console.error('Erreur getProjectFeatures:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des fonctionnalités.'
    });
  }
}

/**
 * Création d'une fonctionnalité - STRICTEMENT RÉSERVÉ AU SUPER ADMIN
 */
async function createFeature(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Seul le super administrateur est autorisé à créer des fonctionnalités.'
      });
    }

    const projectId = req.params.projectId || req.body.projectId;
    const { title, description, status } = req.body;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'L\'identifiant du projet est requis.'
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le titre de la fonctionnalité est requis.'
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet introuvable.'
      });
    }

    const feature = await prisma.feature.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status: status || 'A_FAIRE',
        projectId,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true }
        },
        tasks: true,
        _count: {
          select: { tasks: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Fonctionnalité créée avec succès.',
      data: {
        feature: {
          ...feature,
          stats: {
            total: 0,
            completed: 0,
            progress: 0
          }
        }
      }
    });
  } catch (error) {
    console.error('Erreur createFeature:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la fonctionnalité.'
    });
  }
}

/**
 * Mise à jour d'une fonctionnalité - STRICTEMENT RÉSERVÉ AU SUPER ADMIN
 */
async function updateFeature(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Seul le super administrateur est autorisé à modifier une fonctionnalité.'
      });
    }

    const { id } = req.params;
    const { title, description, status } = req.body;

    const existingFeature = await prisma.feature.findUnique({
      where: { id }
    });

    if (!existingFeature) {
      return res.status(404).json({
        success: false,
        message: 'Fonctionnalité introuvable.'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;

    const updatedFeature = await prisma.feature.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, avatar: true }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assignedTo: {
              select: { id: true, name: true, avatar: true }
            }
          }
        },
        _count: {
          select: { tasks: true }
        }
      }
    });

    const totalTasks = updatedFeature.tasks.length;
    const completedTasks = updatedFeature.tasks.filter((t) => t.status === 'TERMINE').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: 'Fonctionnalité mise à jour avec succès.',
      data: {
        feature: {
          ...updatedFeature,
          stats: {
            total: totalTasks,
            completed: completedTasks,
            progress: progressPercent
          }
        }
      }
    });
  } catch (error) {
    console.error('Erreur updateFeature:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la fonctionnalité.'
    });
  }
}

/**
 * Suppression d'une fonctionnalité - STRICTEMENT RÉSERVÉ AU SUPER ADMIN
 */
async function deleteFeature(req, res) {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Seul le super administrateur est autorisé à supprimer une fonctionnalité.'
      });
    }

    const { id } = req.params;

    const existingFeature = await prisma.feature.findUnique({
      where: { id }
    });

    if (!existingFeature) {
      return res.status(404).json({
        success: false,
        message: 'Fonctionnalité introuvable.'
      });
    }

    await prisma.feature.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Fonctionnalité supprimée avec succès.'
    });
  } catch (error) {
    console.error('Erreur deleteFeature:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la fonctionnalité.'
    });
  }
}

module.exports = {
  getProjectFeatures,
  createFeature,
  updateFeature,
  deleteFeature
};

