const { verifyToken } = require('../utils/jwt');
const prisma = require('../utils/prisma');

/**
 * Middleware d'authentification JWT
 * 
 * Rôle :
 * 1. Extrait le token Bearer présent dans le header 'Authorization'.
 * 2. Vérifie la validité cryptographique et la date d'expiration du token.
 * 3. Récupère l'utilisateur correspondant en base de données pour garantir qu'il existe toujours.
 * 4. Injecte l'objet utilisateur (sans le mot de passe haché) dans `req.user`.
 * 
 * Si le token est absent ou invalide, une réponse HTTP 401 (Unauthorized) est renvoyée.
 */
async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    
    // Le header doit être au format "Bearer <token>"
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Accès non autorisé : jeton d\'authentification manquant ou mal formé.'
      });
    }

    const token = authHeader.split(' ')[1];

    // Vérification cryptographique du JWT
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Session expirée : veuillez vous reconnecter.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Jeton d\'authentification invalide.'
      });
    }

    // Récupération de l'utilisateur actif en base
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable ou compte supprimé.'
      });
    }

    // Attachement de l'utilisateur authentifié à la requête Express
    req.user = user;
    next();
  } catch (error) {
    console.error('Erreur dans le middleware authenticateToken:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur interne lors de la vérification de l\'authentification.'
    });
  }
}

module.exports = {
  authenticateToken
};
