import React, { useState } from 'react';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (err) {
      console.error('Erreur inscription:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du compte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Nouveau workspace"
      title="Créer un compte"
      description="Créez votre profil et donnez à votre équipe un point de départ commun."
      footer={
        <>
          Vous avez déjà un compte ?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 transition-colors hover:text-primary/80 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm leading-5 text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="register-name">Nom complet</Label>
          <div className="relative">
            <User aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="register-name"
              type="text"
              autoComplete="name"
              placeholder="ex. Jean Dupont"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Adresse email</Label>
          <div className="relative">
            <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="nom@exemple.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">Mot de passe</Label>
          <div className="relative">
            <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="6 caractères minimum"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 pl-10"
              minLength={6}
              required
            />
          </div>
        </div>

        <Button type="submit" size="lg" className="h-11 w-full gap-2" disabled={loading}>
          {loading ? 'Création du compte…' : 'Créer mon compte'}
          {!loading && <ArrowRight aria-hidden="true" />}
        </Button>
      </form>
    </AuthLayout>
  );
}
