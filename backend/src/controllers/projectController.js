const prisma = require('../utils/prisma');
const { emitNotificationToUser } = require('../sockets/socketHandler');

function sanitizeProject(project) {
  const { webhookSecret, ...safeProject } = project;
  return {
    ...safeProject,
    hasWebhookSecret: Boolean(webhookSecret)
  };
}

/**
 * Création d'un nouveau projet
 * Le créateur devient automatiquement CHEF_DE_PROJET.
 */
async function createProject(req, res) {
  try {
    const { name, description, githubRepo, webhookSecret } = req.body;
    const userId = req.user.id;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du projet est obligatoire.'
      });
    }

    const isSuperAdmin = req.user.role === 'ADMIN';

    const projectData = {
      name: name.trim(),
      description: description ? description.trim() : null,
      githubRepo: githubRepo ? githubRepo.trim() : null,
      webhookSecret: webhookSecret ? webhookSecret.trim() : null,
      createdById: userId,
    };

    // Si le créateur n'est pas un Super Admin, il devient automatiquement CHEF_DE_PROJET.
    // Lorsque le super admin crée un projet, il ne doit pas être automatiquement ajouté dans le projet.
    if (!isSuperAdmin) {
      projectData.members = {
        create: {
          userId: userId,
          role: 'CHEF_DE_PROJET'
        }
      };
    }

    const project = await prisma.project.create({
      data: projectData,
      include: {
        members: {
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
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Projet créé avec succès.',
      data: { project: sanitizeProject(project) }
    });
  } catch (error) {
    console.error('Erreur createProject:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du projet.'
    });
  }
}

/**
 * Récupère les projets de l'utilisateur connecté (ou tous si ADMIN)
 */
async function getUserProjects(req, res) {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    let projects;

    if (isAdmin) {
      // Pour l'administrateur : accès à l'ensemble des projets (même s'il n'est pas membre)
      projects = await prisma.project.findMany({
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true }
              }
            }
          },
          _count: {
            select: {
              tasks: true,
              members: true,
              messages: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    } else {
      // Projets dont l'utilisateur est membre
      projects = await prisma.project.findMany({
        where: {
          members: {
            some: {
              userId: userId
            }
          }
        },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          },
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true }
              }
            }
          },
          _count: {
            select: {
              tasks: true,
              members: true,
              messages: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    // Récupération des compteurs de tâches par statut pour chaque projet
    const projectIds = projects.map(p => p.id);
    const tasksCount = await prisma.task.groupBy({
      by: ['projectId', 'status'],
      where: {
        projectId: { in: projectIds }
      },
      _count: { _all: true }
    });

    const enrichedProjects = projects.map(p => {
      const pTasks = tasksCount.filter(t => t.projectId === p.id);
      const todoCount = pTasks.find(t => t.status === 'A_FAIRE')?._count._all || 0;
      const inProgressCount = pTasks.find(t => t.status === 'EN_COURS')?._count._all || 0;
      const doneCount = pTasks.find(t => t.status === 'TERMINE')?._count._all || 0;
      const myMembership = p.members.find(m => m.userId === userId);

      return {
        ...sanitizeProject(p),
        myRole: myMembership ? myMembership.role : (isAdmin ? 'ADMIN_VIEW' : null),
        taskStats: {
          total: todoCount + inProgressCount + doneCount,
          todo: todoCount,
          inProgress: inProgressCount,
          done: doneCount,
          progressPercent: (todoCount + inProgressCount + doneCount) > 0 
            ? Math.round((doneCount / (todoCount + inProgressCount + doneCount)) * 100) 
            : 0
        }
      };
    });

    return res.status(200).json({
      success: true,
      data: { projects: enrichedProjects }
    });
  } catch (error) {
    console.error('Erreur getUserProjects:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des projets.'
    });
  }
}

/**
 * Récupère les détails complets d'un projet par son ID
 */
async function getProjectById(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        tasks: {
          include: {
            assignedTo: {
              select: { id: true, name: true, email: true, avatar: true }
            },
            createdBy: {
              select: { id: true, name: true }
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
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            messages: true,
            tasks: true,
            members: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projet non trouvé.'
      });
    }

    // Vérification de permission
    const myMembership = project.members.find(m => m.userId === userId);
    if (!myMembership && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas membre de ce projet.'
      });
    }

    const todoCount = project.tasks.filter(t => t.status === 'A_FAIRE').length;
    const inProgressCount = project.tasks.filter(t => t.status === 'EN_COURS').length;
    const doneCount = project.tasks.filter(t => t.status === 'TERMINE').length;

    const result = {
      ...sanitizeProject(project),
      myRole: myMembership ? myMembership.role : 'ADMIN_VIEW',
      taskStats: {
        total: project.tasks.length,
        todo: todoCount,
        inProgress: inProgressCount,
        done: doneCount,
        progressPercent: project.tasks.length > 0 ? Math.round((doneCount / project.tasks.length) * 100) : 0
      }
    };

    return res.status(200).json({
      success: true,
      data: { project: result }
    });
  } catch (error) {
    console.error('Erreur getProjectById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du projet.'
    });
  }
}

/**
 * Récupère les utilisateurs qui ne sont pas encore membres d'un projet.
 * Cette liste est réservée aux chefs de projet et aux administrateurs.
 */
async function getAvailableMembers(req, res) {
  try {
    const { id: projectId } = req.params;
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      select: { userId: true }
    });
    const memberIds = members.map((member) => member.userId);

    const users = await prisma.user.findMany({
      where: { id: { notIn: memberIds } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true
      },
      orderBy: { name: 'asc' }
    });

    return res.status(200).json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Erreur getAvailableMembers:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des membres disponibles.'
    });
  }
}

/**
 * Mise à jour des informations d'un projet
 */
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { name, description, githubRepo, webhookSecret } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (githubRepo !== undefined) updateData.githubRepo = githubRepo ? githubRepo.trim() : null;
    // Le secret n’est jamais relu côté client : un champ vide conserve le secret actuel.
    if (webhookSecret && webhookSecret.trim()) updateData.webhookSecret = webhookSecret.trim();

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true }
            }
          }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Projet mis à jour avec succès.',
      data: { project: sanitizeProject(updatedProject) }
    });
  } catch (error) {
    console.error('Erreur updateProject:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du projet.'
    });
  }
}

/**
 * Suppression d'un projet
 */
async function deleteProject(req, res) {
  try {
    const { id } = req.params;

    await prisma.project.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Projet supprimé avec succès.'
    });
  } catch (error) {
    console.error('Erreur deleteProject:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du projet.'
    });
  }
}

/**
 * Ajouter un membre à un projet avec un rôle spécifique
 */
async function addProjectMember(req, res) {
  try {
    const { id: projectId } = req.params;
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'L\'identifiant de l\'utilisateur à ajouter est requis.'
      });
    }

    const validRoles = ['CHEF_DE_PROJET', 'DESIGNER', 'DEVELOPPEUR', 'MEMBRE'];
    const assignedRole = role && validRoles.includes(role) ? role : 'MEMBRE';

    // Vérifie si l'utilisateur existe
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    // Vérifie si déjà membre
    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId }
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Cet utilisateur est déjà membre de ce projet.'
      });
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId,
        role: assignedRole
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, role: true }
        },
        project: {
          select: { id: true, name: true }
        }
      }
    });

    // Création d'une notification pour l'utilisateur invité
    const notif = await prisma.notification.create({
      data: {
        userId,
        projectId,
        type: 'PROJECT_INVITE',
        title: 'Ajout à un projet',
        message: `Vous avez été ajouté au projet "${member.project.name}" avec le rôle ${assignedRole}.`
      }
    });

    // Envoi temps réel Socket.io
    emitNotificationToUser(userId, notif);

    return res.status(201).json({
      success: true,
      message: `${targetUser.name} a été ajouté au projet avec le rôle ${assignedRole}.`,
      data: { member }
    });
  } catch (error) {
    console.error('Erreur addProjectMember:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'ajout du membre au projet.'
    });
  }
}

/**
 * Retirer un membre d'un projet
 */
async function removeProjectMember(req, res) {
  try {
    const { id: projectId, memberId } = req.params;

    // Recherche de l'adhésion par son ID ou par userId
    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        OR: [
          { id: memberId },
          { userId: memberId }
        ]
      },
      include: {
        user: true,
        project: true
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre introuvable dans ce projet.'
      });
    }

    // Réassigner les tâches assignées à null
    await prisma.task.updateMany({
      where: {
        projectId,
        assignedToId: member.userId
      },
      data: {
        assignedToId: null
      }
    });

    await prisma.projectMember.delete({
      where: { id: member.id }
    });

    return res.status(200).json({
      success: true,
      message: `${member.user.name} a été retiré du projet.`
    });
  } catch (error) {
    console.error('Erreur removeProjectMember:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors du retrait du membre.'
    });
  }
}

/**
 * Mettre à jour le rôle d'un membre de projet
 */
async function updateMemberRole(req, res) {
  try {
    const { id: projectId, memberId } = req.params;
    const { role } = req.body;

    const validRoles = ['CHEF_DE_PROJET', 'DESIGNER', 'DEVELOPPEUR', 'MEMBRE'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Rôle invalide. Rôles autorisés : ${validRoles.join(', ')}`
      });
    }

    const member = await prisma.projectMember.findFirst({
      where: {
        projectId,
        OR: [
          { id: memberId },
          { userId: memberId }
        ]
      },
      include: {
        user: true,
        project: true
      }
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Membre non trouvé dans ce projet.'
      });
    }

    const updated = await prisma.projectMember.update({
      where: { id: member.id },
      data: { role },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true }
        }
      }
    });

    return res.status(200).json({
      success: true,
      message: `Rôle de ${updated.user.name} mis à jour en ${role}.`,
      data: { member: updated }
    });
  } catch (error) {
    console.error('Erreur updateMemberRole:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du rôle du membre.'
    });
  }
}

module.exports = {
  createProject,
  getUserProjects,
  getProjectById,
  getAvailableMembers,
  updateProject,
  deleteProject,
  addProjectMember,
  removeProjectMember,
  updateMemberRole
};
