const { PrismaClient } = require('@prisma/client');

// Instance unique de PrismaClient pour éviter l'épuisement du pool de connexions
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

module.exports = prisma;
