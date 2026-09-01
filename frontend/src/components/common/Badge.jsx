import React from 'react';

export function RoleBadge({ role }) {
  switch (role) {
    case 'ADMIN':
      return <span className="badge badge-admin">Super Admin</span>;
    case 'CHEF_DE_PROJET':
      return <span className="badge badge-chef">Chef de Projet</span>;
    case 'DEVELOPPEUR':
      return <span className="badge badge-dev">Développeur</span>;
    case 'DESIGNER':
      return <span className="badge badge-designer">Designer</span>;
    case 'MEMBRE':
      return <span className="badge badge-membre">Membre</span>;
    default:
      return <span className="badge">{role}</span>;
  }
}
