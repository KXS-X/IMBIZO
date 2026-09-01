import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { UserPlus, UserX } from 'lucide-react';

import { AddMemberModal } from './AddMemberModal';
import { ConfirmModal } from '../common/Modal';
import { UserAvatar } from '../common/UserAvatar';
import { projectService } from '../../services/projectService';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const roleLabels = {
  ADMIN: 'Super admin',
  CHEF_DE_PROJET: 'Chef de projet',
  DEVELOPPEUR: 'Développeur',
  DESIGNER: 'Designer',
  MEMBRE: 'Membre',
};

const roleStyles = {
  ADMIN: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  CHEF_DE_PROJET: 'border-primary/30 bg-primary/10 text-primary',
  DEVELOPPEUR: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  DESIGNER: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  MEMBRE: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

function MemberRoleBadge({ role }) {
  return <Badge variant="outline" className={roleStyles[role] || ''}>{roleLabels[role] || role}</Badge>;
}

export function MemberList({ projectId, members = [], isChefOrAdmin, currentUserId, onMembersChanged }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await projectService.updateMemberRole(projectId, memberId, newRole);
      onMembersChanged();
    } catch (error) {
      console.error('Erreur changement rôle membre:', error);
      alert(error.response?.data?.message || 'Erreur lors du changement de rôle.');
    }
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setLoading(true);
    try {
      await projectService.removeMember(projectId, memberToRemove.id);
      setIsRemoveModalOpen(false);
      setMemberToRemove(null);
      onMembersChanged();
    } catch (error) {
      console.error('Erreur suppression membre:', error);
      alert(error.response?.data?.message || 'Erreur lors du retrait du membre.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Membres de l’équipe</h2>
          <p className="text-sm text-muted-foreground">{members.length} membre{members.length > 1 ? 's' : ''} et leurs rôles sur ce projet.</p>
        </div>
        {isChefOrAdmin && (
          <Button onClick={() => setIsAddModalOpen(true)}>
            <UserPlus />
            Ajouter un membre
          </Button>
        )}
      </div>

      <Card className="py-0">
        <CardHeader className="sr-only">
          <CardTitle>Équipe du projet</CardTitle>
          <CardDescription>Liste des membres, rôles et dates d’adhésion.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Utilisateur</th>
                  <th className="px-5 py-2.5 font-medium">Rôle</th>
                  <th className="px-5 py-2.5 font-medium">Membre depuis</th>
                  {isChefOrAdmin && <th className="px-5 py-2.5 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const isMe = member.userId === currentUserId;
                  let joinedTime = 'récemment';
                  try {
                    joinedTime = formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true, locale: fr });
                  } catch {
                    // La date peut être absente pour un membre fraîchement créé.
                  }

                  return (
                    <tr key={member.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={member.user} className="size-9" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-medium">
                              <span className="truncate">{member.user?.name}</span>
                              {isMe && <Badge variant="secondary" className="shrink-0 text-xs">Vous</Badge>}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{member.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {isChefOrAdmin && !isMe ? (
                          <Select value={member.role} onValueChange={(value) => handleRoleChange(member.id, value)}>
                            <SelectTrigger size="sm" className="w-44 px-3">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CHEF_DE_PROJET">Chef de projet</SelectItem>
                              <SelectItem value="DEVELOPPEUR">Développeur</SelectItem>
                              <SelectItem value="DESIGNER">Designer</SelectItem>
                              <SelectItem value="MEMBRE">Membre</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : <MemberRoleBadge role={member.role} />}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">{joinedTime}</td>
                      {isChefOrAdmin && (
                        <td className="px-5 py-3 text-right">
                          {!isMe && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => { setMemberToRemove(member); setIsRemoveModalOpen(true); }}
                            >
                              <UserX />
                              Retirer
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AddMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        projectId={projectId}
        existingMemberUserIds={members.map((member) => member.userId)}
        onMemberAdded={onMembersChanged}
      />

      <ConfirmModal
        isOpen={isRemoveModalOpen}
        onClose={() => setIsRemoveModalOpen(false)}
        onConfirm={confirmRemoveMember}
        loading={loading}
        title="Retirer le membre"
        message={`Êtes-vous certain de vouloir retirer ${memberToRemove?.user?.name} du projet ? Ses tâches en cours seront désassignées.`}
      />
    </div>
  );
}
