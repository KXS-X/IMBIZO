const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');

/**
 * Récupère tous les utilisateurs de la plateforme (pour l'admin ou la recherche de membres)
 */
async function getAllUsers(req, res) {
  try {
    const { search, role } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (role && (role === 'ADMIN' || role === 'USER')) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            projectMembers: true,
            assignedTasks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Erreur getAllUsers:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisateurs.'
    });
  }
}

/**
 * Récupère les détails d'un utilisateur
 */
async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
        projectMembers: {
          include: {
            project: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Erreur getUserById:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'utilisateur.'
    });
  }
}

/**
 * Modification du rôle global d'un utilisateur (ADMIN uniquement)
 */
async function updateUserRole(req, res) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['ADMIN', 'USER'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Rôle invalide. Les rôles autorisés sont ADMIN ou USER.'
      });
    }

    // Empêcher l'administrateur de révoquer son propre statut admin s'il est le seul
    if (id === req.user.id && role === 'USER') {
      const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Impossible de rétrograder le dernier administrateur de la plateforme.'
        });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });

    return res.status(200).json({
      success: true,
      message: `Rôle de ${updatedUser.name} mis à jour avec succès en ${role}.`,
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Erreur updateUserRole:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du rôle utilisateur.'
    });
  }
}

/**
 * Création d'un utilisateur par un administrateur
 */
async function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nom, email et mot de passe requis.'
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Un compte avec cet email existe déjà.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role: role === 'ADMIN' ? 'ADMIN' : 'USER',
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`
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

    return res.status(201).json({
      success: true,
      message: 'Utilisateur créé avec succès.',
      data: { user: newUser }
    });
  } catch (error) {
    console.error('Erreur createUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur.'
    });
  }
}

/**
 * Suppression d'un utilisateur (ADMIN uniquement)
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Vous ne pouvez pas supprimer votre propre compte administrateur.'
      });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé.'
      });
    }

    await prisma.user.delete({ where: { id } });

    return res.status(200).json({
      success: true,
      message: `L'utilisateur ${user.name} a été supprimé avec succès.`
    });
  } catch (error) {
    console.error('Erreur deleteUser:', error);
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'utilisateur.'
    });
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  createUser,
  deleteUser
};
