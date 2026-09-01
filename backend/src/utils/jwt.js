const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'devops_tracker_jwt_secret_key_change_in_production_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Génère un JSON Web Token pour un utilisateur donné
 * @param {Object} payload - Données incluses dans le token (id, email, role)
 * @returns {string} Token JWT signé
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

/**
 * Vérifie et décode un token JWT
 * @param {string} token - Token JWT à vérifier
 * @returns {Object} Payload décodé
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = {
  generateToken,
  verifyToken,
  JWT_SECRET
};
