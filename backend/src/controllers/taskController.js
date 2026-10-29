const prisma = require('../utils/prisma');
const { emitTaskUpdated, emitNotificationToUser, emitNotificationToProject } = require('../sockets/socketHandler');
const { logActivity } = require('../utils/activityLogger');

/**
 * Création d'une nouvelle tâche dans un projet
 */
async function createTask(req, res) {
  try {
    const { projectId } = req.params;
    const { title, description, status, priority, assignedToId, featureId } = req.body;
    const userId = req.user.id;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le titre de la tâche est obligatoire.'
      });
    }

    // Vérification de l'assigné s'il est spécifié
    if (assignedToId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId: assignedToId }
        }
      });
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: 'L\'utilisateur assigné n\'est pas membre de ce projet.'
        });
      }

      // Un membre ne peut pas assigner des tâches à un autre membre.
      // Seul l'utilisateur (à lui-même) et le chef de projet (ou admin) peuvent faire ça.
      if (assignedToId !== userId) {
        const isChef = req.user.role === 'ADMIN'
          || req.user.role === 'CHEF_DE_PROJET'
          || req.projectMember?.role === 'CHEF_DE_PROJET';

        if (!isChef) {
          return res.status(403).json({
            success: false,
            message: 'En tant que membre, vous ne pouvez pas assigner une tâche à un autre membre. Seul le chef de projet peut assigner des tâches à d\'autres membres.'
          });
        }
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description ? description.trim() : null,
        status: status || 'A_FAIRE',
        priority: priority || 'MOYENNE',
        projectId,
        assignedToId: assignedToId || null,
        featureId: featureId || null,
        createdById: userId
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        },
        feature: {
          select: { id: true, title: true, status: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    await logActivity({
      projectId,
      taskId: task.id,
      userId,
      type: 'TASK_CREATED',
      message: `${req.user.name} a créé la tâche « ${task.title} ».`
    });

    // Émettre la mise à jour temps réel sur le salon du projet
    emitTaskUpdated(projectId, task, 'CREATE');

    // Notifier le membre assigné si différent du créateur
    if (assignedToId && assignedToId !== userId) {
      const notif = await prisma.notification.create({
        data: {
          userId: assignedToId,
          projectId,
          type: 'TASK_ASSIGNED',
          title: 'Nouvelle tâche assignée',
          message: `${req.user.name} vous a assigné la tâche "${task.title}" sur le projet "${task.project.name}".`
        }
      });
      emitNotificationToUser(assignedToId, notif);
    }

    return res.status(201).json({
      success: true,
      message: 'Tâche créée avec succès.',
      data: { task }
    });
  } catch (error) {
    console.error('Erreur createTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de la tâche.'
    });
  }
}

/**
 * Récupère toutes les tâches d'un projet avec filtres
 */
async function getProjectTasks(req, res) {
  try {
    const { projectId } = req.params;
    const { status, assignedToId, search, featureId } = req.query;

    const where = { projectId };
    if (status) where.status = status;
    if (assignedToId) where.assignedToId = assignedToId;
    if (featureId) where.featureId = featureId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        feature: {
          select: { id: true, title: true, status: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return res.status(200).json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Erreur getProjectTasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des tâches.'
    });
  }
}

/**
 * Récupère toutes les tâches personnelles de l'utilisateur connecté
 */
async function getMyTasks(req, res) {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    const where = { assignedToId: userId };
    if (status) where.status = status;

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        feature: {
          select: { id: true, title: true, status: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { comments: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    console.error('Erreur getMyTasks:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de vos tâches.'
    });
  }
}

/**
 * Mise à jour d'une tâche
 */
async function updateTask(req, res) {
  try {
    const { id } = req.params;
    const { title, description, status, priority, assignedToId, featureId } = req.body;
    const currentTask = req.task; // Récupéré depuis le middleware canModifyTask

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (featureId !== undefined) updateData.featureId = featureId || null;

    // Seul le CHEF_DE_PROJET ou un ADMIN peut assigner une tâche à autrui.
    // Un membre peut uniquement s'assigner la tâche à lui-même ou la laisser non assignée.
    if (assignedToId !== undefined) {
      if (assignedToId && assignedToId !== req.user.id) {
        const isChef = req.isChef || req.user.role === 'ADMIN';
        if (!isChef) {
          return res.status(403).json({
            success: false,
            message: 'En tant que membre, vous ne pouvez pas assigner une tâche à un autre membre. Seul le chef de projet peut assigner des tâches à d\'autres membres.'
          });
        }
      }

      if (assignedToId) {
        const isProjectMember = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId: currentTask.projectId,
              userId: assignedToId
            }
          }
        });

        if (!isProjectMember) {
          return res.status(400).json({
            success: false,
            message: 'L’utilisateur assigné n’est pas membre de ce projet.'
          });
        }
      }
      updateData.assignedToId = assignedToId || null;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        },
        feature: {
          select: { id: true, title: true, status: true }
        },
        comments: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { comments: true }
        }
      }
    });

    // Synchronisation en temps réel sur le tableau Kanban
    emitTaskUpdated(updatedTask.projectId, updatedTask, 'UPDATE');

    const statusChanged = status !== undefined && status !== currentTask.status;
    const assignmentChanged = assignedToId !== undefined
      && updateData.assignedToId !== undefined
      && assignedToId !== currentTask.assignedToId;
    const activityType = statusChanged
      ? (status === 'TERMINE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED')
      : assignmentChanged
        ? 'TASK_ASSIGNED'
        : 'TASK_UPDATED';
    await logActivity({
      projectId: updatedTask.projectId,
      taskId: updatedTask.id,
      userId: req.user.id,
      type: activityType,
      message: statusChanged
        ? `${req.user.name} a changé le statut de « ${updatedTask.title} » en ${updatedTask.status}.`
        : assignmentChanged
          ? `${req.user.name} a modifié l’assignation de « ${updatedTask.title} ».`
          : `${req.user.name} a modifié la tâche « ${updatedTask.title} ».`
    });

    // Notifier la nouvelle personne assignée si réassignation
    if (assignedToId && assignedToId !== currentTask.assignedToId && assignedToId !== req.user.id) {
      const notif = await prisma.notification.create({
        data: {
          userId: assignedToId,
          projectId: updatedTask.projectId,
          type: 'TASK_ASSIGNED',
          title: 'Nouvelle tâche assignée',
          message: `${req.user.name} vous a assigné la tâche "${updatedTask.title}".`
        }
      });
      emitNotificationToUser(assignedToId, notif);
    }

    return res.status(200).json({
      success: true,
      message: 'Tâche mise à jour avec succès.',
      data: { task: updatedTask }
    });
  } catch (error) {
    console.error('Erreur updateTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour de la tâche.'
    });
  }
}

/**
 * Basculer le statut d'une tâche (Cocher / Décocher comme terminée)
 */
async function toggleTaskStatus(req, res) {
  try {
    const { id } = req.params;
    const task = req.task;

    // Si TERMINE => on repasse à EN_COURS ou A_FAIRE
    // Sinon => TERMINE
    const newStatus = task.status === 'TERMINE' ? 'EN_COURS' : 'TERMINE';

    const updatedTask = await prisma.task.update({
      where: { id },
      data: { status: newStatus },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        createdBy: {
          select: { id: true, name: true }
        },
        project: {
          select: { id: true, name: true }
        },
        feature: {
          select: { id: true, title: true, status: true }
        },
      }
    });

    // Synchronisation temps réel
    emitTaskUpdated(updatedTask.projectId, updatedTask, 'UPDATE');

    await logActivity({
      projectId: updatedTask.projectId,
      taskId: updatedTask.id,
      userId: req.user.id,
      type: newStatus === 'TERMINE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
      message: `${req.user.name} a changé le statut de « ${updatedTask.title} » en ${newStatus}.`
    });

    return res.status(200).json({
      success: true,
      message: `Statut de la tâche passé à ${newStatus}.`,
      data: { task: updatedTask }
    });
  } catch (error) {
    console.error('Erreur toggleTaskStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la modification du statut de la tâche.'
    });
  }
}

/**
 * Suppression d'une tâche
 */
async function deleteTask(req, res) {
  try {
    const { id } = req.params;
    const task = req.task;

    // Seul le CHEF_DE_PROJET, le créateur ou l'ADMIN peut supprimer la tâche
    if (!req.isChef && req.user.role !== 'ADMIN' && task.createdById !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Seul le chef de projet ou le créateur peut supprimer cette tâche.'
      });
    }

    await logActivity({
      projectId: task.projectId,
      taskId: task.id,
      userId: req.user.id,
      type: 'TASK_DELETED',
      message: `${req.user.name} a supprimé la tâche « ${task.title} ».`
    });

    await prisma.task.delete({ where: { id } });

    // Émission temps réel de la suppression
    emitTaskUpdated(task.projectId, { id, projectId: task.projectId }, 'DELETE');

    return res.status(200).json({
      success: true,
      message: 'Tâche supprimée avec succès.'
    });
  } catch (error) {
    console.error('Erreur deleteTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la tâche.'
    });
  }
}

/**
 * Signalement d'absence de tâche : "Je n'ai pas de tâche"
 * Notifie immédiatement tous les CHEF_DE_PROJET du projet ciblé
 */
async function signalNoTask(req, res) {
  try {
    const { projectId } = req.body;
    const userId = req.user.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'L\'identifiant du projet est requis pour signaler l\'absence de tâche.'
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { role: 'CHEF_DE_PROJET' },
          include: { user: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet introuvable.'
      });
    }

    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Vous devez être membre de ce projet pour signaler votre disponibilité.'
      });
    }

    const senderName = req.user.name;
    const notifTitle = `Disponibilité : ${senderName} est sans tâche`;
    const notifMessage = `${senderName} a signalé être sans tâche assignée sur le projet "${project.name}". Veuillez lui affecter une nouvelle tâche.`;

    const notificationsCreated = [];

    // Notifier chaque CHEF_DE_PROJET du projet
    for (const chefMember of project.members) {
      if (chefMember.userId !== userId) {
        const notif = await prisma.notification.create({
          data: {
            userId: chefMember.userId,
            projectId: project.id,
            type: 'NO_TASK_SIGNAL',
            title: notifTitle,
            message: notifMessage,
            data: JSON.stringify({
              senderId: userId,
              senderName: senderName,
              projectName: project.name
            })
          }
        });

        // Émission temps réel Socket.io vers le chef
        emitNotificationToUser(chefMember.userId, notif);
        notificationsCreated.push(notif);
      }
    }

    // Si le créateur du projet n'est pas dans la liste des chefs
    const isCreatorChef = project.members.some(m => m.userId === project.createdById);
    if (!isCreatorChef && project.createdById !== userId) {
      const notifCreator = await prisma.notification.create({
        data: {
          userId: project.createdById,
          projectId: project.id,
          type: 'NO_TASK_SIGNAL',
          title: notifTitle,
          message: notifMessage,
          data: JSON.stringify({ senderId: userId, senderName, projectName: project.name })
        }
      });
      emitNotificationToUser(project.createdById, notifCreator);
    }

    return res.status(200).json({
      success: true,
      message: 'Votre disponibilité a bien été signalée aux chefs de projet.',
      data: { count: notificationsCreated.length }
    });
  } catch (error) {
    console.error('Erreur signalNoTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du signalement.'
    });
  }
}

/**
 * Récupère tous les commentaires d'une tâche
 */
async function getTaskComments(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            members: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche introuvable.'
      });
    }

    const isMember = task.project.members.some(m => m.userId === userId);
    if (!isMember && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas accès à ce projet.'
      });
    }

    const comments = await prisma.taskComment.findMany({
      where: { taskId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: { comments }
    });
  } catch (error) {
    console.error('Erreur getTaskComments:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des commentaires.'
    });
  }
}

/**
 * Ajoute un commentaire sur une tâche
 * Règle : Un utilisateur doit pouvoir laisser un commentaire sur la tâche qui lui est attribuée.
 * Également permis au Super Admin, au Chef de Projet et au créateur de la tâche.
 */
async function createTaskComment(req, res) {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le contenu du commentaire ne peut pas être vide.'
      });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            members: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Tâche introuvable.'
      });
    }

    const isAssignee = task.assignedToId === userId;
    const isChef = task.project.members.some(m => m.userId === userId && m.role === 'CHEF_DE_PROJET') || req.user.role === 'CHEF_DE_PROJET';
    const isCreator = task.createdById === userId;

    if (!isAssignee && !isAdmin && !isChef && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Action non autorisée. Vous ne pouvez laisser un commentaire que sur les tâches qui vous sont attribuées.'
      });
    }

    const comment = await prisma.taskComment.create({
      data: {
        content: content.trim(),
        taskId: id,
        userId: userId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true
          }
        }
      }
    });

    // Journal d'activité
    await logActivity({
      projectId: task.projectId,
      taskId: task.id,
      userId,
      type: 'TASK_UPDATED',
      message: `${req.user.name} a commenté la tâche « ${task.title} ».`
    });

    // Notification à la personne assignée si elle n'est pas l'auteur du commentaire
    if (task.assignedToId && task.assignedToId !== userId) {
      const notif = await prisma.notification.create({
        data: {
          userId: task.assignedToId,
          projectId: task.projectId,
          type: 'GENERAL',
          title: 'Nouveau commentaire',
          message: `${req.user.name} a commenté la tâche "${task.title}".`
        }
      });
      emitNotificationToUser(task.assignedToId, notif);
    }

    // Si l'auteur est la personne assignée, notifier le chef de projet ou le créateur de la tâche
    if (isAssignee && task.createdById !== userId) {
      const notifCreator = await prisma.notification.create({
        data: {
          userId: task.createdById,
          projectId: task.projectId,
          type: 'GENERAL',
          title: 'Nouveau commentaire de l\'assigné',
          message: `${req.user.name} a commenté la tâche "${task.title}".`
        }
      });
      emitNotificationToUser(task.createdById, notifCreator);
    }

    // Émettre la mise à jour en temps réel
    emitTaskUpdated(task.projectId, { ...task, newComment: comment }, 'UPDATE');

    return res.status(201).json({
      success: true,
      message: 'Commentaire ajouté avec succès.',
      data: { comment }
    });
  } catch (error) {
    console.error('Erreur createTaskComment:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du commentaire.'
    });
  }
}

/**
 * Supprime un commentaire
 */
async function deleteTaskComment(req, res) {
  try {
    const { id, commentId } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const comment = await prisma.taskComment.findUnique({
      where: { id: commentId },
      include: {
        task: {
          include: {
            project: {
              include: {
                members: true
              }
            }
          }
        }
      }
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Commentaire introuvable.'
      });
    }

    const isAuthor = comment.userId === userId;
    const isChef = comment.task.project.members.some(m => m.userId === userId && m.role === 'CHEF_DE_PROJET');

    if (!isAuthor && !isAdmin && !isChef) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer ce commentaire.'
      });
    }

    await prisma.taskComment.delete({
      where: { id: commentId }
    });

    return res.status(200).json({
      success: true,
      message: 'Commentaire supprimé avec succès.'
    });
  } catch (error) {
    console.error('Erreur deleteTaskComment:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du commentaire.'
    });
  }
}

module.exports = {
  createTask,
  getProjectTasks,
  getMyTasks,
  updateTask,
  toggleTaskStatus,
  deleteTask,
  signalNoTask,
  getTaskComments,
  createTaskComment,
  deleteTaskComment
};
