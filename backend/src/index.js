require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { initSocket } = require('./sockets/socketHandler');
const prisma = require('./utils/prisma');

const PORT = process.env.PORT || 5000;

// Création du serveur HTTP
const server = http.createServer(app);

// Initialisation de Socket.io avec configuration CORS
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true
  }
});

// Initialisation des gestionnaires d'événements Socket.io
initSocket(io);

// Démarrage du serveur
server.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Serveur DevOps Tracker démarré sur le port ${PORT}`);
  console.log(`📡 URL API : http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket Socket.io initialisé et prêt`);
  console.log(`🌍 Environnement : ${process.env.NODE_ENV || 'development'}`);
  console.log('====================================================');
});

// Gestion de l'arrêt gracieux
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Signal ${signal} reçu. Fermeture du serveur en cours...`);
  server.close(async () => {
    console.log('🔌 Serveur HTTP et Socket.io fermés.');
    await prisma.$disconnect();
    console.log('🗄️ Connexion PostgreSQL Prisma déconnectée.');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
