import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckSquare, FolderKanban, GitBranch, Plus, Search, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { projectService } from '../services/projectService';
import { useAuth } from '../context/AuthContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';

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
  DEVELOPPEUR: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  DESIGNER: 'border-pink-500/30 bg-pink-500/10 text-pink-700 dark:text-pink-300',
  MEMBRE: 'border-muted-foreground/20 bg-muted text-muted-foreground',
};

function ProjectRoleBadge({ role }) {
  return (
    <Badge variant="outline" className={roleStyles[role] || ''}>
      {roleLabels[role] || role}
    </Badge>
  );
}

function getGithubHref(repository) {
  if (/^https?:\/\//i.test(repository)) return repository;
  return `https://github.com/${repository.replace(/^\/+/, '')}`;
}

function MemberStack({ members = [] }) {
  if (members.length === 0) {
    return <span className="text-xs text-muted-foreground">Aucun membre</span>;
  }

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {members.slice(0, 4).map((member) => (
          <UserAvatar key={member.id} user={member.user} className="size-7 border-2 border-card" />
        ))}
      </div>
      {members.length > 4 && (
        <span className="ml-2 text-xs text-muted-foreground">+{members.length - 4}</span>
      )}
    </div>
  );
}

function ProjectCard({ project }) {
  const progress = project.taskStats?.progressPercent || 0;
  const totalTasks = project.taskStats?.total || 0;
  const completedTasks = project.taskStats?.done || 0;

  return (
    <Card className="flex h-full flex-col shadow-none transition-colors hover:border-primary/40">
      <CardHeader className="gap-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FolderKanban className="size-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{project.name}</CardTitle>
              {project.githubRepo && (
                <a
                  href={getGithubHref(project.githubRepo)}
                  target="_blank"
                  rel="noreferrer"
                  title={project.githubRepo}
                  className="mt-1 flex min-w-0 max-w-full items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-primary"
                >
                  <GitBranch className="size-3.5 shrink-0" />
                  <span className="min-w-0 truncate">{project.githubRepo}</span>
                </a>
              )}
            </div>
          </div>
          {project.myRole && (
            <div className="shrink-0">
              <ProjectRoleBadge role={project.myRole} />
            </div>
          )}
        </div>
        <CardDescription className="line-clamp-2 min-h-10">
          {project.description || 'Aucune description fournie.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto space-y-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckSquare className="size-3.5" />
            {completedTasks}/{totalTasks} tâches terminées
          </span>
          <span className="font-medium text-foreground">{progress}%</span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`Progression de ${project.name}`}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </CardContent>

      <CardFooter className="mt-5 justify-between border-t pt-4">
        <MemberStack members={project.members} />
        <Button asChild size="sm" variant="outline">
          <Link to={`/projects/${project.id}`}>
            Ouvrir
            <ArrowRight />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function ProjectSkeleton() {
  return (
    <Card className="shadow-none">
      <CardHeader className="gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-1.5 w-full" />
      </CardContent>
    </Card>
  );
}

export function ProjectsPage() {
  const navigate = useNavigate();
  const { canCreateProject } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectService.getUserProjects();
      setProjects(res.data.projects);
    } catch (err) {
      console.error('Erreur chargement projets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setGithubRepo('');
    setWebhookSecret('');
    setError('');
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;

    setCreating(true);
    setError('');

    try {
      const res = await projectService.createProject({
        name: name.trim(),
        description: description.trim(),
        githubRepo: githubRepo.trim(),
        webhookSecret: webhookSecret.trim(),
      });

      setIsCreateModalOpen(false);
      resetCreateForm();
      navigate(`/projects/${res.data.project.id}`);
    } catch (err) {
      console.error('Erreur création projet:', err);
      setError(err.response?.data?.message || 'Erreur lors de la création du projet.');
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query) ||
      project.githubRepo?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 md:p-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-medium text-primary">Espace de travail</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Projets et équipes</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Retrouvez vos espaces de travail, suivez leur activité et collaborez avec votre équipe.
          </p>
        </div>
        {canCreateProject && (
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus />
            Nouveau projet
          </Button>
        )}
      </section>

      <section className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Rechercher un projet ou un dépôt…"
            className="pl-9"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Rechercher un projet"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>{projects.length} projet{projects.length > 1 ? 's' : ''}</span>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => <ProjectSkeleton key={item} />)}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <FolderKanban className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Aucun projet trouvé</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {searchQuery
                ? 'Aucun projet ne correspond à votre recherche.'
                : canCreateProject
                  ? 'Créez votre premier espace de travail collaboratif.'
                  : 'Vous n’êtes membre d’aucun projet pour le moment.'}
            </p>
            {!searchQuery && canCreateProject && (
              <Button className="mt-6" onClick={() => setIsCreateModalOpen(true)}>
                <Plus />
                Créer un projet
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      )}

      <Dialog
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open && !creating) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un nouveau projet</DialogTitle>
            <DialogDescription>
              Définissez les informations principales de votre espace de travail.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject} className="space-y-5">
            {error && (
              <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="project-name">Nom du projet</Label>
              <Input
                id="project-name"
                placeholder="Ex. Refonte plateforme Imbizo"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                placeholder="Objectifs, périmètre et jalons clés…"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-repository">Dépôt GitHub lié</Label>
              <Input
                id="project-repository"
                placeholder="Ex. organisation/depot"
                value={githubRepo}
                onChange={(event) => setGithubRepo(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optionnel, utilisé pour les webhooks.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-webhook-secret">Clé secrète du webhook</Label>
              <Input
                id="project-webhook-secret"
                placeholder="Ex. une-clé-secrète"
                value={webhookSecret}
                onChange={(event) => setWebhookSecret(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Optionnel, vous pourrez la configurer plus tard.</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={creating}>
                Annuler
              </Button>
              <Button type="submit" disabled={creating || !name.trim()}>
                <Plus />
                {creating ? 'Création en cours…' : 'Créer le projet'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
