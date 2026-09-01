const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

let ioInstance = null;

const allowedReactionEmojis = ['👍', '❤️', '😂', '🎉', '😮', '👏'];
const reactionInclude = {
  user: {
    select: {
      id: true,
      name: true,
      avatar: true
    }
  }
};
const messageInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatar: true,
      role: true
    }
  },
  attachments: true,
  reactions: { include: reactionInclude }
};

/**
 * Initialise les gestionnaires d'événements Socket.io
 * 
 * Architecture des Salons (Rooms) :
 * - `user_${userId}` : Salon individuel permettant de pousser des notifications directes à un utilisateur précis (ex: assignation de tâche, alerte personnalisée).
 * - `project_${projectId}` : Salon de collaboration pour le projet (chat temps réel, synchronisation du tableau Kanban des tâches, alertes Webhooks GitHub).
 * 
 * @param {import('socket.io').Server} io - Instance de Socket.io
 */
function initSocket(io) {
  ioInstance = io;

  // Middleware d'authentification Socket.io
  // Vérifie le token JWT envoyé dans le handshake (socket.handshake.auth.token)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;

      if (!token) {
        return next(new Error('Authentification Socket requise : Jeton manquant.'));
      }

      // Décodage et vérification du JWT
      const decoded = verifyToken(token);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true
        }
      });

      if (!user) {
        return next(new Error('Utilisateur non trouvé.'));
      }

      // Attachement de l'utilisateur à l'objet socket
      socket.user = user;
      next();
    } catch (err) {
      console.error('Erreur authentification Socket.io:', err.message);
      return next(new Error('Authentification Socket invalide.'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 [Socket.io] Utilisateur connecté : ${user.name} (${user.id}) - Socket ID : ${socket.id}`);

    // Rejoint automatiquement son salon personnel pour recevoir ses notifications
    const userRoom = `user_${user.id}`;
    socket.join(userRoom);

    /**
     * 1. Rejoindre le salon d'un projet
     */
    socket.on('join_project', async (projectId) => {
      if (!projectId) return;

      try {
        // Vérifie si l'utilisateur est membre du projet ou Super-Admin
        const isMember = user.role === 'ADMIN' ? true : await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id
            }
          }
        });

        if (isMember) {
          const room = `project_${projectId}`;
          socket.join(room);
          console.log(`💬 [Socket.io] ${user.name} a rejoint le salon : ${room}`);
          socket.emit('joined_project_success', { projectId });
        } else {
          socket.emit('error_message', { message: 'Vous n\'êtes pas membre de ce projet.' });
        }
      } catch (error) {
        console.error('Erreur join_project:', error);
      }
    });

    /**
     * 2. Quitter le salon d'un projet
     */
    socket.on('leave_project', (projectId) => {
      if (!projectId) return;
      const room = `project_${projectId}`;
      socket.leave(room);
      console.log(`🚪 [Socket.io] ${user.name} a quitté le salon : ${room}`);
    });

    /**
     * 3. Envoi d'un message dans le chat du projet
     */
    socket.on('send_message', async ({ projectId, content }) => {
      if (!projectId || !content || !content.trim()) return;

      try {
        // Vérification des droits d'accès
        const isMember = user.role === 'ADMIN' ? true : await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id
            }
          }
        });

        if (!isMember) {
          return socket.emit('error_message', { message: 'Accès refusé au chat de ce projet.' });
        }

        // Sauvegarde du message en base de données PostgreSQL via Prisma
        const savedMessage = await prisma.message.create({
          data: {
            content: content.trim(),
            projectId,
            userId: user.id
          },
          include: messageInclude
        });

        // Diffusion du message à tous les membres présents dans le salon du projet
        io.to(`project_${projectId}`).emit('new_message', savedMessage);
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message chat:', error);
        socket.emit('error_message', { message: 'Impossible d\'envoyer le message.' });
      }
    });

    /**
     * 4. Indicateur de frappe (Typing indicator)
     */
    socket.on('typing_start', ({ projectId }) => {
      if (!projectId) return;
      socket.to(`project_${projectId}`).emit('user_typing', {
        projectId,
        user: { id: user.id, name: user.name }
      });
    });

    socket.on('typing_stop', ({ projectId }) => {
      if (!projectId) return;
      socket.to(`project_${projectId}`).emit('user_stopped_typing', {
        projectId,
        userId: user.id
      });
    });

    /**
     * 5. Ajouter ou retirer une réaction sur un message
     */
    socket.on('toggle_reaction', async ({ projectId, messageId, emoji }) => {
      if (!projectId || !messageId || !allowedReactionEmojis.includes(emoji)) return;

      try {
        const isMember = user.role === 'ADMIN' ? true : await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id
            }
          }
        });

        if (!isMember) {
          return socket.emit('error_message', { message: 'Accès refusé à cette réaction.' });
        }

        const message = await prisma.message.findFirst({
          where: { id: messageId, projectId },
          select: { id: true }
        });

        if (!message) {
          return socket.emit('error_message', { message: 'Message introuvable.' });
        }

        const existingReaction = await prisma.messageReaction.findUnique({
          where: {
            messageId_userId: {
              messageId,
              userId: user.id
            }
          }
        });

        if (existingReaction) {
          if (existingReaction.emoji === emoji) {
            await prisma.messageReaction.delete({ where: { id: existingReaction.id } });
          } else {
            await prisma.messageReaction.update({
              where: { id: existingReaction.id },
              data: { emoji }
            });
          }
        } else {
          await prisma.messageReaction.create({
            data: { messageId, userId: user.id, emoji }
          });
        }

        const reactions = await prisma.messageReaction.findMany({
          where: { messageId },
          include: reactionInclude,
          orderBy: { createdAt: 'asc' }
        });

        io.to(`project_${projectId}`).emit('message_reaction_updated', {
          projectId,
          messageId,
          reactions
        });
      } catch (error) {
        console.error('Erreur lors de la réaction au message:', error);
        socket.emit('error_message', { message: 'Impossible de modifier la réaction.' });
      }
    });

    /**
     * 6. Modifier, épingler ou supprimer un message
     */
    socket.on('edit_message', async ({ projectId, messageId, content }) => {
      if (!projectId || !messageId || typeof content !== 'string' || !content.trim()) return;

      try {
        const message = await prisma.message.findFirst({ where: { id: messageId, projectId } });
        if (!message || message.isDeleted || (message.userId !== user.id && user.role !== 'ADMIN')) {
          return socket.emit('error_message', { message: 'Vous ne pouvez pas modifier ce message.' });
        }

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: { content: content.trim() },
          include: messageInclude
        });

        io.to(`project_${projectId}`).emit('message_updated', updatedMessage);
      } catch (error) {
        console.error('Erreur lors de la modification du message:', error);
        socket.emit('error_message', { message: 'Impossible de modifier le message.' });
      }
    });

    socket.on('delete_message', async ({ projectId, messageId }) => {
      if (!projectId || !messageId) return;

      try {
        const message = await prisma.message.findFirst({ where: { id: messageId, projectId } });
        if (!message || (message.userId !== user.id && user.role !== 'ADMIN')) {
          return socket.emit('error_message', { message: 'Vous ne pouvez pas supprimer ce message.' });
        }
        if (message.isDeleted) return;

        const deletedMessage = await prisma.message.update({
          where: { id: messageId },
          data: { content: '', isPinned: false, isDeleted: true },
          include: messageInclude
        });
        io.to(`project_${projectId}`).emit('message_updated', deletedMessage);
      } catch (error) {
        console.error('Erreur lors de la suppression du message:', error);
        socket.emit('error_message', { message: 'Impossible de supprimer le message.' });
      }
    });

    socket.on('toggle_pin_message', async ({ projectId, messageId }) => {
      if (!projectId || !messageId) return;

      try {
        const isMember = user.role === 'ADMIN' ? true : await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId: user.id
            }
          }
        });

        if (!isMember) {
          return socket.emit('error_message', { message: 'Accès refusé à ce projet.' });
        }

        const message = await prisma.message.findFirst({ where: { id: messageId, projectId } });
        if (!message || message.isDeleted) return socket.emit('error_message', { message: 'Message introuvable.' });

        const updatedMessage = await prisma.message.update({
          where: { id: messageId },
          data: { isPinned: !message.isPinned },
          include: messageInclude
        });

        io.to(`project_${projectId}`).emit('message_updated', updatedMessage);
      } catch (error) {
        console.error('Erreur lors de l’épinglage du message:', error);
        socket.emit('error_message', { message: 'Impossible de modifier l’épinglage.' });
      }
    });

    /**
     * 7. Déconnexion
     */
    socket.on('disconnect', () => {
      console.log(`❌ [Socket.io] Déconnexion : ${user.name} (${socket.id})`);
    });
  });
}

/**
 * Fonctions utilitaires d'émission d'événements temps réel depuis les contrôleurs Express
 */

function getIO() {
  return ioInstance;
}

/**
 * Envoie une notification temps réel à un utilisateur spécifique
 */
function emitNotificationToUser(userId, notification) {
  if (ioInstance) {
    ioInstance.to(`user_${userId}`).emit('new_notification', notification);
  }
}

/**
 * Envoie une notification temps réel à tous les membres d'un projet
 */
function emitNotificationToProject(projectId, notification) {
  if (ioInstance) {
    ioInstance.to(`project_${projectId}`).emit('new_project_notification', notification);
  }
}

/**
 * Émet une mise à jour de tâche dans le salon du projet (Kanban synchronisé)
 */
function emitTaskUpdated(projectId, task, action = 'UPDATE') {
  if (ioInstance) {
    ioInstance.to(`project_${projectId}`).emit('task_changed', { task, action });
  }
}

/**
 * Émet un événement de push GitHub sur le salon du projet
 */
function emitGitHubPush(projectId, pushData) {
  if (ioInstance) {
    ioInstance.to(`project_${projectId}`).emit('github_push_received', pushData);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitNotificationToUser,
  emitNotificationToProject,
  emitTaskUpdated,
  emitGitHubPush
};
