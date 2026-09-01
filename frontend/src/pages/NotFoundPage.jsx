import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '70vh',
        textAlign: 'center',
        padding: '2rem'
      }}
    >
      <div
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '24px',
          background: 'rgba(244, 63, 94, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--rose)',
          marginBottom: '1.5rem'
        }}
      >
        <AlertTriangle size={36} />
      </div>
      <h1 style={{ fontSize: '3rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0.75rem 0' }}>Page introuvable</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px', marginBottom: '1.5rem' }}>
        L'adresse demandée n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn btn-primary">
        <Home size={16} /> Retour au tableau de bord
      </Link>
    </div>
  );
}
