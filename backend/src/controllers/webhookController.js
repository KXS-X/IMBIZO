const crypto = require('crypto');
const prisma = require('../utils/prisma');
const { emitNotificationToUser, emitGitHubPush } = require('../sockets/socketHandler');

/**
 * Vérifie la signature HMAC SHA-256 du webhook GitHub si un secret est configuré
 */
function verifyGitHubSignature(secret, signature, payload) {
  if (!secret) return true;
  if (!signature) return false;

  try {
    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(typeof payload === 'string' ? payload : JSON.stringify(payload)).digest('hex');
    const expected = Buffer.from(digest);
    const received = Buffer.from(signature);
    if (expected.length !== received.length) return false;
    return crypto.timingSafeEqual(expected, received);
  } catch (err) {
    console.error('Erreur lors de la vérification de signature webhook:', err);
    return false;
  }
}

/**
 * Handler principal pour les Webhooks GitHub
 * Supporte :
 * 1. POST /api/webhooks/github (Découverte automatique du projet par repository name/url)
 * 2. POST /api/projects/:projectId/webhook/github (Ciblage direct d'un projet)
 */
async function handleGitHubWebhook(req, res) {
  try {
    const event = req.headers['x-github-event'] || 'push';
    const signature = req.headers['x-hub-signature-256'];
    const payload = req.body;
    const directProjectId = req.params.projectId;

    console.log(`📡 [Webhook GitHub] Événement reçu : ${event}`);

    // Nous traitons en priorité les événements de type "push" ou "ping"
    if (event === 'ping') {
      return res.status(200).json({
        success: true,
        message: 'Ping GitHub reçu avec succès. Le webhook est bien configuré !'
      });
    }

    if (event !== 'push') {
      return res.status(200).json({
        success: true,
        message: `Événement ${event} ignoré. Seuls les événements "push" déclenchent des notifications.`
      });
    }

    // Extraction des métadonnées du push GitHub
    const repository = payload.repository || {};
    const repoFullName = repository.full_name || repository.name || 'Dépôt GitHub';
    const pusher = payload.pusher?.name || payload.sender?.login || payload.head_commit?.author?.name || 'Un collaborateur';
    const ref = payload.ref || 'refs/heads/main';
    const branch = ref.replace('refs/heads/', '');
    const commits = payload.commits || [];
    const headCommit = payload.head_commit || (commits.length > 0 ? commits[commits.length - 1] : null);
    const commitMessage = headCommit?.message || 'Nouveau push sans message de commit spécifique.';
    const commitUrl = headCommit?.url || repository.html_url || '';

    let project = null;

    if (directProjectId) {
      project = await prisma.project.findUnique({
        where: { id: directProjectId },
        include: { members: { include: { user: true } } }
      });
    } else {
      // Recherche du projet par correspondance avec le dépôt GitHub configuré
      const projects = await prisma.project.findMany({
        where: {
          githubRepo: {
            not: null
          }
        },
        include: { members: { include: { user: true } } }
      });

      // Recherche par nom de repo (ex: "samso/Devops-tracker" ou "Devops-tracker")
      project = projects.find(p => {
        if (!p.githubRepo) return false;
        const cleanRepo = p.githubRepo.toLowerCase().trim();
        const cleanTarget = repoFullName.toLowerCase().trim();
        return cleanRepo === cleanTarget || cleanRepo.endsWith('/' + cleanTarget) || cleanTarget.endsWith('/' + cleanRepo);
      });
    }

    if (!project) {
      console.warn(`[Webhook GitHub] Aucun projet Imbizo associé au dépôt : ${repoFullName}`);
      return res.status(200).json({
        success: true,
        message: `Webhook reçu pour ${repoFullName}, mais aucun projet correspondant n'a été trouvé.`
      });
    }

    // Vérification de la signature secrète si configurée sur le projet
    if (project.webhookSecret && !signature) {
      return res.status(401).json({
        success: false,
        message: 'Signature GitHub Webhook manquante.'
      });
    }

    if (project.webhookSecret && signature) {
      const isValid = verifyGitHubSignature(project.webhookSecret, signature, req.rawBody || payload);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Signature GitHub Webhook invalide.'
        });
      }
    }

    // Préparation de la notification
    const notifTitle = `Nouveau push sur ${project.name} (${branch})`;
    const notifMessage = `${pusher} a poussé ${commits.length || 1} commit(s) sur [${branch}] : "${commitMessage.slice(0, 120)}${commitMessage.length > 120 ? '...' : ''}"`;
    const pushData = {
      repo: repoFullName,
      branch,
      pusher,
      commitsCount: commits.length || 1,
      commitMessage,
      commitUrl,
      projectId: project.id,
      projectName: project.name,
      timestamp: new Date().toISOString()
    };

    // Création de la notification en base pour TOUS les membres du projet
    const createdNotifications = [];
    for (const member of project.members) {
      const notif = await prisma.notification.create({
        data: {
          userId: member.userId,
          projectId: project.id,
          type: 'GITHUB_PUSH',
          title: notifTitle,
          message: notifMessage,
          data: JSON.stringify(pushData)
        }
      });

      // Envoi direct par Socket.io au salon individuel du membre
      emitNotificationToUser(member.userId, notif);
      createdNotifications.push(notif);
    }

    // Émission temps réel sur le salon du projet pour alertes visuelles / logs
    emitGitHubPush(project.id, pushData);

    console.log(`✅ [Webhook GitHub] ${createdNotifications.length} notification(s) envoyée(s) pour le projet "${project.name}".`);

    return res.status(200).json({
      success: true,
      message: `Webhook traité avec succès. ${createdNotifications.length} membres notifiés.`,
      data: {
        project: project.name,
        notifiedMembersCount: createdNotifications.length,
        pushData
      }
    });
  } catch (error) {
    console.error('Erreur lors du traitement du Webhook GitHub:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors du traitement du Webhook GitHub.'
    });
  }
}

module.exports = {
  handleGitHubWebhook,
  verifyGitHubSignature
};
