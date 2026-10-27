const prisma = require('../utils/prisma');

/**
 * Middleware de contrôle d'accès : Rôle Global ADMIN
 * 
 * Rôle :
 * Vérifie que l'utilisateur connecté possède le rôle global 'ADMIN'.
 * Si l'utilisateur est un simple 'USER', l'accès est bloqué avec un statut HTTP 403 (Forbidden).
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise.'
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Accès réservé aux administrateurs de la plateforme.'
    });
  }

  next();
}

/**
 * Middleware de contrôle d'accès : Rôle Projet (CHEF_DE_PROJET, DEVELOPPEUR, DESIGNER, MEMBRE)
 * 
 * Rôle :
 * 1. Identifie l'identifiant du projet ciblé via les paramètres d'URL (:projectId ou :id) ou le body.
 * 2. Si l'utilisateur est un super-administrateur global (ADMIN), l'accès lui est automatiquement accordé (Bypass de super-admin).
 * 3. Sinon, vérifie l'adhésion de l'utilisateur au projet et son rôle.
 * 4. Si `allowedRoles` est fourni, vérifie que le rôle de l'utilisateur dans ce projet figure dans la liste autorisée.
 * 5. Injecte les informations d'adhésion `req.projectMember` dans l'objet requête.
 * 
 * @param {Array<string>} [allowedRoles] - Rôles projets autorisés (ex: ['CHEF_DE_PROJET'])
 */
function requireProjectRole(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const projectId = req.params.projectId || req.params.id || req.body.projectId;

      if (!projectId) {
        return res.status(400).json({
          success: false,
          message: 'Identifiant du projet manquant dans la requête.'
        });
      }

      // Si l'utilisateur est un Super-Admin global, il a tous les droits
      if (req.user && req.user.role === 'ADMIN') {
        req.isSuperAdmin = true;
        return next();
      }

      // Recherche de l'adhésion de l'utilisateur au projet
      const member = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: req.user.id
          }
        },
        include: {
          project: true
        }
      });

      if (!member) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas membre de ce projet.'
        });
      }

      // Vérification des rôles autorisés si restreints
      if (allowedRoles.length > 0 && !allowedRoles.includes(member.role)) {
        return res.status(403).json({
          success: false,
          message: `Action non autorisée. Rôle(s) requis : ${allowedRoles.join(', ')}. Votre rôle : ${member.role}.`
        });
      }

      // Injecte le membre pour les contrôleurs suivants
      req.projectMember = member;
      next();
    } catch (error) {
      console.error('Erreur dans le middleware requireProjectRole:', error);
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la vérification des permissions du projet.'
      });
    }
  };
}

/**
 * Middleware vérifiant les permissions de modification d'une tâche :
 * - Un ADMIN global peut modifier toutes les tâches.
 * - Le CHEF_DE_PROJET du projet parent peut modifier/assigner/supprimer toutes les tâches.
 * - Le membre assigné à la tâche (ou le créateur) peut modifier le statut de sa propre tâche.
 */
async function canModifyTask(req, res, next) {
  try {
    const taskId = req.params.taskId || req.params.id;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Identifiant de la tâche manquant.'
      });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
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

    // Bypass pour le super admin
    if (req.user.role === 'ADMIN') {
      req.task = task;
      return next();
    }

    // Recherche de l'adhésion de l'utilisateur au projet de la tâche
    const member = task.project.members.find(m => m.userId === req.user.id);

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas membre du projet associé à cette tâche.'
      });
    }

    // Chef de projet, créateur de la tâche, ou assigné
    const isChef = member.role === 'CHEF_DE_PROJET';
    const isAssignee = task.assignedToId === req.user.id;
    const isCreator = task.createdById === req.user.id;

    if (!isChef && !isAssignee && !isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas les droits nécessaires pour modifier cette tâche.'
      });
    }

    req.task = task;
    req.projectMember = member;
    req.isChef = isChef;
    req.isAssignee = isAssignee;
    next();
  } catch (error) {
    console.error('Erreur dans canModifyTask:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des permissions de la tâche.'
    });
  }
}

/**
 * Middleware vérifiant l'autorisation de créer un projet :
 * Seuls le Super Administrateur ('ADMIN') et les Chefs de projet ('CHEF_DE_PROJET')
 * peuvent créer un nouveau projet. Les utilisateurs standards ('USER') ne le peuvent pas.
 */
async function requireCanCreateProject(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentification requise.'
      });
    }

    // Seuls le super admin et les chefs de projet peuvent créer un projet
    if (req.user.role === 'ADMIN' || req.user.role === 'CHEF_DE_PROJET') {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Action non autorisée. Seuls le super administrateur et les chefs de projet peuvent créer un projet.'
    });
  } catch (error) {
    console.error('Erreur requireCanCreateProject:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification des permissions de création de projet.'
    });
  }
}

module.exports = {
  requireAdmin,
  requireProjectRole,
  canModifyTask,
  requireCanCreateProject
};
