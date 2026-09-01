import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, FolderKanban, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';

import { ConfirmModal } from '../components/common/Modal';
import { UserAvatar } from '../components/common/UserAvatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { adminService } from '../services/adminService';
import { projectService } from '../services/projectService';
import { statsService } from '../services/statsService';

function MetricCard({ title, value, description }) {
  return (
    <Card size="sm" className="shadow-none">
      <CardHeader className="pb-0"><CardTitle className="text-sm font-normal text-muted-foreground">{title}</CardTitle></CardHeader>
      <CardContent className="pt-0"><div className="text-3xl font-semibold leading-none tracking-tight">{value}</div><p className="mt-3 text-xs leading-5 text-muted-foreground">{description}</p></CardContent>
    </Card>
  );
}

export function AdminBackofficePage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [allProjects, setAllProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchUser, setSearchUser] = useState('');
  const [activeTab, setActiveTab] = useState('users');
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('USER');
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [statsResponse, usersResponse, projectsResponse] = await Promise.all([
          statsService.getPlatformStats(),
          adminService.getAllUsers(),
          projectService.getUserProjects(true),
        ]);
        setStats(statsResponse.data.stats);
        setUsersList(usersResponse.data.users);
        setAllProjects(projectsResponse.data.projects);
      } catch (error) {
        console.error('Erreur chargement back-office admin:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAdminData();
  }, [isAdmin]);

  const loadAdminData = async () => {
    const [statsResponse, usersResponse, projectsResponse] = await Promise.all([
      statsService.getPlatformStats(),
      adminService.getAllUsers(),
      projectService.getUserProjects(true),
    ]);
    setStats(statsResponse.data.stats);
    setUsersList(usersResponse.data.users);
    setAllProjects(projectsResponse.data.projects);
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await adminService.updateUserRole(targetUserId, newRole);
      await loadAdminData();
    } catch (error) {
      console.error('Erreur changement rôle global:', error);
      alert(error.response?.data?.message || 'Erreur lors du changement de rôle.');
    }
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    setCreatingUser(true);
    setCreateUserError('');
    try {
      await adminService.createUser({ name: newUserName.trim(), email: newUserEmail.trim(), password: newUserPassword, role: newUserRole });
      setIsCreateUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('USER');
      await loadAdminData();
    } catch (error) {
      console.error('Erreur création utilisateur:', error);
      setCreateUserError(error.response?.data?.message || 'Erreur lors de la création de l’utilisateur.');
    } finally {
      setCreatingUser(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingUser(true);
    try {
      await adminService.deleteUser(userToDelete.id);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await loadAdminData();
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      alert(error.response?.data?.message || 'Erreur lors de la suppression.');
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const query = searchUser.toLowerCase();
    return usersList.filter((item) => item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query));
  }, [searchUser, usersList]);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">Espace d’administration</p>
              <Badge>Super admin</Badge>
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Administration</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gérez les utilisateurs, les projets et l’activité de la plateforme.</p>
          </div>
        </div>
        <Button onClick={() => setIsCreateUserModalOpen(true)}><UserPlus />Créer un utilisateur</Button>
      </div>

      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-xl" />)}</div>
      ) : stats && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Utilisateurs totaux" value={stats.users.total} description={`${stats.users.admins} admin${stats.users.admins > 1 ? 's' : ''} / ${stats.users.regular} utilisateur${stats.users.regular > 1 ? 's' : ''}`} />
          <MetricCard title="Projets globaux" value={stats.projects.total} description="Espaces de travail actifs" />
          <MetricCard title="Tâches plateforme" value={stats.tasks.total} description={`${stats.tasks.done} terminées (${stats.tasks.completionRate}%)`} />
          <MetricCard title="Messages échangés" value={stats.messages.total} description="Historique des discussions" />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <div className="min-w-0 overflow-x-auto overflow-y-hidden pb-2">
          <TabsList variant="line" className="min-w-max gap-1 rounded-none bg-transparent p-0">
            <TabsTrigger value="users" className="flex-none gap-2 px-3 py-3"><Users />Utilisateurs<Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[11px]">{usersList.length}</Badge></TabsTrigger>
            <TabsTrigger value="projects" className="flex-none gap-2 px-3 py-3"><FolderKanban />Projets<Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5 text-[11px]">{allProjects.length}</Badge></TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="mt-0 space-y-4">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={searchUser} onChange={(event) => setSearchUser(event.target.value)} placeholder="Rechercher un nom ou un email…" className="pl-9" />
          </div>

          <Card className="py-0">
            <CardHeader className="sr-only"><CardTitle>Utilisateurs de la plateforme</CardTitle><CardDescription>Gérez les comptes et les rôles globaux.</CardDescription></CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Utilisateur</th><th className="px-5 py-3 font-medium">Rôle global</th><th className="px-5 py-3 font-medium">Projets</th><th className="px-5 py-3 font-medium">Tâches assignées</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map((item) => {
                      const isMe = item.id === user.id;
                      return <tr key={item.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-5 py-4"><div className="flex items-center gap-3"><UserAvatar user={item} className="size-9" /><div className="min-w-0"><div className="flex items-center gap-2 font-medium"><span className="truncate">{item.name}</span>{isMe && <Badge variant="secondary" className="text-xs">Vous</Badge>}</div><p className="truncate text-xs text-muted-foreground">{item.email}</p></div></div></td>
                        <td className="px-5 py-4"><Select value={item.role} onValueChange={(value) => handleRoleChange(item.id, value)}><SelectTrigger size="sm" className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USER">Utilisateur</SelectItem><SelectItem value="ADMIN">Administrateur</SelectItem></SelectContent></Select></td>
                        <td className="px-5 py-4 text-muted-foreground">{item._count?.projectMembers || 0}</td>
                        <td className="px-5 py-4 text-muted-foreground">{item._count?.assignedTasks || 0}</td>
                        <td className="px-5 py-4 text-right">{!isMe && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => { setUserToDelete(item); setIsDeleteModalOpen(true); }}><Trash2 />Supprimer</Button>}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="mt-0">
          {allProjects.length === 0 ? <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Aucun projet à afficher.</CardContent></Card> : <div className="grid gap-4 lg:grid-cols-2">
            {allProjects.map((project) => <Card key={project.id} className="shadow-none"><CardHeader><div className="flex items-start justify-between gap-3"><div className="min-w-0"><CardTitle className="truncate text-base">{project.name}</CardTitle><CardDescription className="mt-1 truncate">Créé par {project.createdBy?.name || 'un membre'}</CardDescription></div><Badge variant="secondary">Admin</Badge></div></CardHeader><CardContent className="space-y-4"><p className="line-clamp-2 text-sm text-muted-foreground">{project.description || 'Aucune description.'}</p><div className="grid grid-cols-3 divide-x rounded-lg border bg-muted/30 py-3 text-center"><div><p className="text-xs text-muted-foreground">Membres</p><p className="mt-1 font-semibold">{project._count?.members || 0}</p></div><div><p className="text-xs text-muted-foreground">Tâches</p><p className="mt-1 font-semibold">{project._count?.tasks || 0}</p></div><div><p className="text-xs text-muted-foreground">Messages</p><p className="mt-1 font-semibold">{project._count?.messages || 0}</p></div></div><Button variant="outline" size="sm" asChild><Link to={`/projects/${project.id}`}>Accéder au projet<ExternalLink /></Link></Button></CardContent></Card>)}
          </div>}
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateUserModalOpen} onOpenChange={(open) => !open && setIsCreateUserModalOpen(false)}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Créer un utilisateur</DialogTitle><DialogDescription>Ajoutez un compte à la plateforme et définissez son accès global.</DialogDescription></DialogHeader><form onSubmit={handleCreateUser} className="space-y-5">{createUserError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{createUserError}</p>}<div className="space-y-2"><Label htmlFor="admin-user-name">Nom complet</Label><Input id="admin-user-name" value={newUserName} onChange={(event) => setNewUserName(event.target.value)} placeholder="Sophie Laurent" required autoFocus /></div><div className="space-y-2"><Label htmlFor="admin-user-email">Adresse email</Label><Input id="admin-user-email" type="email" value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} placeholder="sophie@exemple.com" required /></div><div className="space-y-2"><Label htmlFor="admin-user-password">Mot de passe temporaire</Label><Input id="admin-user-password" type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} placeholder="••••••••" minLength={6} required /></div><div className="space-y-2"><Label htmlFor="admin-user-role">Rôle global</Label><Select value={newUserRole} onValueChange={setNewUserRole}><SelectTrigger id="admin-user-role" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="USER">Utilisateur</SelectItem><SelectItem value="ADMIN">Administrateur</SelectItem></SelectContent></Select></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsCreateUserModalOpen(false)} disabled={creatingUser}>Annuler</Button><Button type="submit" disabled={creatingUser}><UserPlus />{creatingUser ? 'Création…' : 'Créer l’utilisateur'}</Button></DialogFooter></form></DialogContent>
      </Dialog>

      <ConfirmModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} onConfirm={confirmDeleteUser} loading={deletingUser} title="Supprimer l’utilisateur" message={`Êtes-vous certain de vouloir supprimer le compte de ${userToDelete?.name} (${userToDelete?.email}) ? Tous ses messages, assignations et adhésions seront supprimés.`} />
    </div>
  );
}
