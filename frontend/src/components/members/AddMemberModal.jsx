import React, { useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';

import { projectService } from '../../services/projectService';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

export function AddMemberModal({ isOpen, onClose, projectId, existingMemberUserIds = [], onMemberAdded }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('MEMBRE');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setFetchingUsers(true);
    projectService.getAvailableMembers(projectId)
      .then((response) => {
        const availableUsers = response.data.users.filter((user) => !existingMemberUserIds.includes(user.id));
        setUsers(availableUsers);
        setSelectedUserId(availableUsers[0]?.id || '');
      })
      .catch((loadError) => {
        console.error('Erreur chargement utilisateurs:', loadError);
        setError('Impossible de charger la liste des utilisateurs.');
      })
      .finally(() => setFetchingUsers(false));
  }, [isOpen, existingMemberUserIds]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUserId) {
      setError('Veuillez sélectionner un utilisateur.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await projectService.addMember(projectId, selectedUserId, selectedRole);
      onMemberAdded();
      onClose();
    } catch (submitError) {
      console.error('Erreur ajout membre:', submitError);
      setError(submitError.response?.data?.message || 'Erreur lors de l’ajout du membre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un membre</DialogTitle>
          <DialogDescription>Invitez un collaborateur et choisissez son rôle sur ce projet.</DialogDescription>
        </DialogHeader>

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{error}</p>}
        {fetchingUsers ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Recherche des utilisateurs disponibles…</p>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Tous les utilisateurs enregistrés sont déjà membres de ce projet.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="member-user">Utilisateur</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="member-user" className="w-full px-3"><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                <SelectContent>
                  {users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="member-role">Rôle sur le projet</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="member-role" className="w-full px-3"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEVELOPPEUR">Développeur</SelectItem>
                  <SelectItem value="DESIGNER">Designer</SelectItem>
                  <SelectItem value="MEMBRE">Membre</SelectItem>
                  <SelectItem value="CHEF_DE_PROJET">Chef de projet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Annuler</Button>
              <Button type="submit" disabled={loading || !selectedUserId}><UserPlus />{loading ? 'Ajout en cours…' : 'Ajouter au projet'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
