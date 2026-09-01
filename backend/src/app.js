const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import des routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const messageRoutes = require('./routes/messageRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { uploadDirectory } = require('./middlewares/upload');

const app = express();

// Middlewares de sécurité et de journalisation
app.use(helmet({
  crossOriginResourcePolicy: false
}));

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par la politique CORS.'));
    }
  },
  credentials: true
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parsing JSON avec conservation du rawBody pour la vérification HMAC GitHub
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadDirectory));

// Endpoint de santé de l'API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'DevOps Tracker API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Montage des routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects/:projectId/tasks', taskRoutes);
app.use('/api/projects/:projectId/messages', messageRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/stats', statsRoutes);

// Gestion des routes 404 (non trouvées)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`
  });
});

// Gestionnaire global d'erreurs
app.use((err, req, res, next) => {
  console.error('❌ Erreur non capturée :', err);
  const isUploadError = err.code?.startsWith('LIMIT_') || err.message === 'Ce type de fichier n’est pas pris en charge.';
  const uploadMessage = err.code === 'LIMIT_FILE_SIZE'
    ? (err.field === 'avatar' ? 'La photo de profil doit faire 5 Mo maximum.' : 'Chaque fichier doit faire 10 Mo maximum.')
    : err.code === 'LIMIT_FILE_COUNT'
      ? 'Vous pouvez joindre 5 fichiers maximum.'
      : err.message;

  const isProfileUploadError = err.message === 'La photo de profil doit être au format JPG, PNG, GIF ou WebP.';
  res.status(isUploadError || isProfileUploadError ? 400 : err.status || 500).json({
    success: false,
    message: isUploadError ? uploadMessage : isProfileUploadError ? err.message : err.message || 'Une erreur interne est survenue sur le serveur.',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

module.exports = app;
