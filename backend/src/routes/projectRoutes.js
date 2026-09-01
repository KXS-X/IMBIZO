const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const activityController = require('../controllers/activityController');
const { authenticateToken } = require('../middlewares/auth');
const { requireProjectRole, requireAdmin } = require('../middlewares/role');
const { validateBody } = require('../middlewares/validate');

// Authentification requise pour toutes les routes projets
router.use(authenticateToken);

// Récupérer la liste des projets de l'utilisateur
router.get('/', projectController.getUserProjects);

// Créer un nouveau projet (tous les utilisateurs enregistrés peuvent créer un projet)
router.post('/', validateBody(['name']), projectController.createProject);

// Obtenir les détails d'un projet par son ID
router.get('/:id', projectController.getProjectById);

// Utilisateurs disponibles pour rejoindre le projet
router.get('/:id/available-members', requireProjectRole(['CHEF_DE_PROJET']), projectController.getAvailableMembers);

// Historique des changements du projet
router.get('/:id/activities', requireProjectRole(), activityController.getProjectActivities);

// Mettre à jour un projet (CHEF_DE_PROJET ou ADMIN)
router.put('/:id', requireProjectRole(['CHEF_DE_PROJET']), projectController.updateProject);

// Supprimer un projet (CHEF_DE_PROJET ou ADMIN)
router.delete('/:id', requireProjectRole(['CHEF_DE_PROJET']), projectController.deleteProject);

// Gestion des membres du projet
// Ajouter un membre (CHEF_DE_PROJET ou ADMIN)
router.post('/:id/members', requireProjectRole(['CHEF_DE_PROJET']), validateBody(['userId']), projectController.addProjectMember);

// Retirer un membre (CHEF_DE_PROJET ou ADMIN)
router.delete('/:id/members/:memberId', requireProjectRole(['CHEF_DE_PROJET']), projectController.removeProjectMember);

// Modifier le rôle d'un membre (CHEF_DE_PROJET ou ADMIN)
router.put('/:id/members/:memberId/role', requireProjectRole(['CHEF_DE_PROJET']), validateBody(['role']), projectController.updateMemberRole);

module.exports = router;
