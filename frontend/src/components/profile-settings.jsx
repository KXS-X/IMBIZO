import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, KeyRound, Mail, Save, UserRound } from 'lucide-react';

import { UserAvatar } from './common/UserAvatar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/authService';

function getNameParts(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts.shift() || '',
    lastName: parts.join(' '),
  };
}

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback;
}

function ProfileNotice({ notice }) {
  if (!notice) return null;

  return (
    <div
      role="status"
      className={notice.type === 'success'
        ? 'flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-3 text-sm text-emerald-700 dark:text-emerald-300'
        : 'rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive'}
    >
      {notice.type === 'success' && <Check className="size-4 shrink-0" aria-hidden="true" />}
      {notice.message}
    </div>
  );
}

export function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [profileNotice, setProfileNotice] = useState(null);
  const [avatarNotice, setAvatarNotice] = useState(null);
  const [passwordNotice, setPasswordNotice] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const nameParts = getNameParts(user?.name);
    setFirstName(nameParts.firstName);
    setLastName(nameParts.lastName);
    setAvatarPreview(user?.avatar || '');
  }, [user?.name, user?.avatar]);

  useEffect(() => () => {
    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarNotice(null);

    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setAvatarNotice({ type: 'error', message: 'Choisissez une image JPG, PNG, GIF ou WebP.' });
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarNotice({ type: 'error', message: 'La photo doit faire 5 Mo maximum.' });
      event.target.value = '';
      return;
    }

    if (avatarPreview.startsWith('blob:')) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleAvatarSubmit = async (event) => {
    event.preventDefault();
    if (!avatarFile) {
      setAvatarNotice({ type: 'error', message: 'Sélectionnez une nouvelle photo avant de l’enregistrer.' });
      return;
    }

    setSavingAvatar(true);
    setAvatarNotice(null);

    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      await authService.updateAvatar(formData);
      await refreshUser();
      setAvatarFile(null);
      setAvatarNotice({ type: 'success', message: 'Photo de profil mise à jour.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      setAvatarNotice({ type: 'error', message: getErrorMessage(error, 'Impossible de mettre à jour la photo.') });
    } finally {
      setSavingAvatar(false);
    }
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();

    if (!cleanFirstName || !cleanLastName) {
      setProfileNotice({ type: 'error', message: 'Le prénom et le nom sont requis.' });
      return;
    }

    setSavingProfile(true);
    setProfileNotice(null);

    try {
      await authService.updateProfile({ name: `${cleanFirstName} ${cleanLastName}` });
      await refreshUser();
      setProfileNotice({ type: 'success', message: 'Informations personnelles enregistrées.' });
    } catch (error) {
      setProfileNotice({ type: 'error', message: getErrorMessage(error, 'Impossible d’enregistrer vos informations.') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    setPasswordNotice(null);

    if (newPassword.length < 6) {
      setPasswordNotice({ type: 'error', message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', message: 'Les deux nouveaux mots de passe ne correspondent pas.' });
      return;
    }

    setSavingPassword(true);

    try {
      await authService.updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ type: 'success', message: 'Mot de passe modifié avec succès.' });
    } catch (error) {
      setPasswordNotice({ type: 'error', message: getErrorMessage(error, 'Impossible de modifier le mot de passe.') });
    } finally {
      setSavingPassword(false);
    }
  };

  const profileWithPreview = { ...user, avatar: avatarPreview };

  return (
    <div className="space-y-6 p-6 sm:p-8">
      <div className="space-y-6">
          <Card className="overflow-hidden shadow-none">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><UserRound className="size-4" aria-hidden="true" /></span>
                <div>
                  <CardTitle>Informations personnelles</CardTitle>
                  <CardDescription className="mt-1">Gérez votre photo et les informations visibles par votre équipe.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-6 py-0 sm:px-8">
              <form onSubmit={handleAvatarSubmit} className="flex flex-col gap-4 rounded-xl border bg-muted/20 p-4 sm:flex-row sm:items-center">
                <div className="relative mx-auto shrink-0 sm:mx-0">
                  <UserAvatar user={profileWithPreview} className="size-24 border-4 border-background shadow-md" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex size-8 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Choisir une photo de profil"
                  >
                    <Camera className="size-3.5" aria-hidden="true" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="sr-only" onChange={handleAvatarChange} />
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="font-medium">Photo de profil</p>
                  <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, GIF ou WebP · 5 Mo maximum</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Choisir une photo</Button>
                    <Button type="submit" size="sm" disabled={!avatarFile || savingAvatar}>
                      <Save aria-hidden="true" />
                      {savingAvatar ? 'Enregistrement…' : 'Enregistrer la photo'}
                    </Button>
                  </div>
                  <div className="mt-3"><ProfileNotice notice={avatarNotice} /></div>
                </div>
              </form>

              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-first-name">Prénom</Label>
                    <Input id="profile-first-name" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="ex. Jean" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-last-name">Nom</Label>
                    <Input id="profile-last-name" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="ex. Dupont" required className="h-10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input id="profile-email" type="email" value={user?.email || ''} readOnly className="h-10 bg-muted/40 pl-10" />
                  </div>
                  <p className="text-xs text-muted-foreground">L’adresse email est liée à votre compte et ne peut pas être modifiée ici.</p>
                </div>

                <ProfileNotice notice={profileNotice} />

                <div className="flex justify-end">
                  <Button type="submit" disabled={savingProfile}>
                    <Save aria-hidden="true" />
                    {savingProfile ? 'Enregistrement…' : 'Enregistrer les informations'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-300"><KeyRound className="size-4" aria-hidden="true" /></span>
                <div>
                  <CardTitle>Sécurité du compte</CardTitle>
                  <CardDescription className="mt-1">Modifiez votre mot de passe régulièrement pour protéger votre espace.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Mot de passe actuel</Label>
                  <Input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="h-10" required />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nouveau mot de passe</Label>
                    <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} className="h-10" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmation</Label>
                    <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} className="h-10" required />
                  </div>
                </div>
                <ProfileNotice notice={passwordNotice} />
                <div className="flex justify-end">
                  <Button type="submit" variant="outline" disabled={savingPassword}>
                    <KeyRound aria-hidden="true" />
                    {savingPassword ? 'Modification…' : 'Modifier le mot de passe'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
