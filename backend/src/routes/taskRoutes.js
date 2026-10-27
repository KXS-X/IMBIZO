const express = require('express');
const router = express.Router({ mergeParams: true });
const taskController = require('../controllers/taskController');
const { authenticateToken } = require('../middlewares/auth');
const { requireProjectRole, canModifyTask } = require('../middlewares/role');
const { validateBody } = require('../middlewares/validate');

// Authentification requise pour toutes les routes des tâches
router.use(authenticateToken);

// 1. Routes globales de tâches (montées sous /api/tasks)
router.get('/my-tasks', taskController.getMyTasks);
router.post('/signal-no-task', validateBody(['projectId']), taskController.signalNoTask);

// 2. Routes relatives aux projets (montées sous /api/projects/:projectId/tasks)
router.post('/', requireProjectRole(), validateBody(['title']), taskController.createTask);
router.get('/', requireProjectRole(), taskController.getProjectTasks);

// 3. Commentaires sur une tâche
router.get('/:id/comments', taskController.getTaskComments);
router.post('/:id/comments', validateBody(['content']), taskController.createTaskComment);
router.delete('/:id/comments/:commentId', taskController.deleteTaskComment);

// 4. Modification / Suppression / Basculement de statut d'une tâche précise
router.put('/:id', canModifyTask, taskController.updateTask);
router.patch('/:id/toggle', canModifyTask, taskController.toggleTaskStatus);
router.delete('/:id', canModifyTask, taskController.deleteTask);

module.exports = router;
