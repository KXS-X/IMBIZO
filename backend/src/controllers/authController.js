const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const prisma = require('../utils/prisma');
const { generateToken } = require('../utils/jwt');
const { uploadDirectory } = require('../middlewares/upload');

function getLocalAvatarPath(avatar) {
  if (typeof avatar !== 'string' || !avatar.startsWith('/uploads/')) return null;

  const uploadRoot = path.resolve(uploadDirectory);
  const candidate = path.resolve(uploadRoot, path.basename(avatar));
  return candidate.startsWith(`${uploadRoot}${path.sep}`) ? candidate : null;
}

/**
 * Inscription d'un nouvel utilisateur
 */
async function register(req, res) {
  try {
    const { name, email, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom, adresse email et mot de passe requis.'
      });
    }

    // Vérification d'un compte existant
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Un compte avec cette adresse email existe déjà.'
      });
    }

    // Hachage sécurisé du mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Si c'est le tout premier utilisateur inscrit, on lui attribue le rôle ADMIN
    const userCount = await prisma.user.count();
    const role = userCount === 0 ? 'ADMIN' : 'USER';

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true
      }
    });

    // Génération du JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      success: true,
      message: 'Compte créé avec succès.',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'inscription.'
    });
  }
}

/**
 * Connexion d'un utilisateur existant
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email et mot de passe requis.'
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides (email ou mot de passe incorrect).'
      });
    }

    // Vérification du mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides (email ou mot de passe incorrect).'
      });
    }

    // Génération du JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    const isChefDeProjet = user.role === 'CHEF_DE_PROJET';
    const canCreateProject = user.role === 'ADMIN' || user.role === 'CHEF_DE_PROJET';

    const userPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      isChefDeProjet,
      canCreateProject
    };

    return res.status(200).json({
      success: true,
      message: 'Connexion réussie.',
      data: {
        user: userPayload,
        token
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la connexion.'
    });
  }
}

/**
 * Récupère le profil de l'utilisateur connecté avec ses statistiques
 */
async function getMe(req, res) {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        projectMembers: {
          select: {
            role: true
          }
        },
        _count: {
          select: {
            projectMembers: true,
            assignedTasks: true,
            notifications: {
              where: { read: false }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable.'
      });
    }

    const isChefDeProjet = user.role === 'CHEF_DE_PROJET';
    const canCreateProject = user.role === 'ADMIN' || user.role === 'CHEF_DE_PROJET';

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
          isChefDeProjet,
          canCreateProject,
          stats: {
            projectsCount: user._count.projectMembers,
            assignedTasksCount: user._count.assignedTasks,
            unreadNotificationsCount: user._count.notifications
          }
        }
      }
    });
  } catch (error) {
    console.error('Erreur getMe:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération du profil.'
    });
  }
}

/**
 * Mise à jour du profil utilisateur
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.id;
    const { name, avatar, currentPassword, newPassword } = req.body;

    const updateData = {};
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Le nom doit être une chaîne de caractères.'
        });
      }

      const cleanName = name.trim();
      if (cleanName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Le nom doit contenir au moins 2 caractères.'
        });
      }
      updateData.name = cleanName;
    }
    if (avatar) updateData.avatar = avatar;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe actuel est requis pour définir un nouveau mot de passe.'
        });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Le mot de passe actuel est incorrect.'
        });
      }

      if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.'
        });
      }

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Profil mis à jour avec succès.',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour du profil.'
    });
  }
}

/**
 * Enregistre la photo de profil de l'utilisateur connecté
 */
async function updateAvatar(req, res) {
  const uploadedFile = req.file;

  try {
    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: 'Une photo de profil est requise.'
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true }
    });

    const avatar = `/uploads/${uploadedFile.filename}`;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        updatedAt: true
      }
    });

    const previousAvatarPath = getLocalAvatarPath(currentUser?.avatar);
    if (previousAvatarPath && previousAvatarPath !== getLocalAvatarPath(avatar)) {
      await fs.promises.unlink(previousAvatarPath).catch(() => undefined);
    }

    return res.status(200).json({
      success: true,
      message: 'Photo de profil mise à jour avec succès.',
      data: { user: updatedUser }
    });
  } catch (error) {
    if (uploadedFile?.path) {
      await fs.promises.unlink(uploadedFile.path).catch(() => undefined);
    }

    console.error('Erreur updateAvatar:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la mise à jour de la photo de profil.'
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  updateAvatar
};
