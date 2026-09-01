const fs = require('fs');
const prisma = require('../utils/prisma');
const { getIO } = require('../sockets/socketHandler');

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
  reactions: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatar: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  }
};

/**
 * Récupère l'historique des messages de chat d'un projet
 */
async function getProjectMessages(req, res) {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit) || 100;

    const messages = await prisma.message.findMany({
      where: { projectId },
      include: messageInclude,
      orderBy: { createdAt: 'asc' },
      take: limit
    });

    return res.status(200).json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Erreur getProjectMessages:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des messages.'
    });
  }
}

/**
 * Envoi d'un message via REST (alternative ou fallback au websocket)
 */
async function sendMessage(req, res) {
  const uploadedFiles = req.files || [];

  try {
    const { projectId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    const trimmedContent = typeof content === 'string' ? content.trim() : '';

    if (!trimmedContent && uploadedFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Ajoutez un message ou au moins une pièce jointe.'
      });
    }

    const message = await prisma.message.create({
      data: {
        content: trimmedContent,
        projectId,
        userId,
        attachments: {
          create: uploadedFiles.map((file) => ({
            originalName: file.originalname,
            storedName: file.filename,
            mimeType: file.mimetype,
            size: file.size,
            url: `/uploads/${file.filename}`
          }))
        }
      },
      include: messageInclude
    });

    // Émettre en temps réel sur le salon Socket.io si disponible
    const io = getIO();
    if (io) {
      io.to(`project_${projectId}`).emit('new_message', message);
    }

    return res.status(201).json({
      success: true,
      data: { message }
    });
  } catch (error) {
    await Promise.all(uploadedFiles.map((file) => fs.promises.unlink(file.path).catch(() => undefined)));
    console.error('Erreur sendMessage:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du message.'
    });
  }
}

module.exports = {
  getProjectMessages,
  sendMessage
};
