const prisma = require('./prisma');

async function logActivity({ projectId, taskId, userId, type, message, data }) {
  try {
    return await prisma.activity.create({
      data: {
        projectId,
        taskId: taskId || null,
        userId,
        type,
        message,
        data: data ? JSON.stringify(data) : null
      }
    });
  } catch (error) {
    // Une panne du journal ne doit pas annuler une opération métier déjà réussie.
    console.error('Erreur journalisation activité:', error);
    return null;
  }
}

module.exports = { logActivity };
