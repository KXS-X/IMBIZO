import { FolderKanban, MoreHorizontal, Share2 } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useNotifications } from '@/context/NotificationContext';

export function NavProjects({ projects = [] }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useNotifications();
  const visibleProjects = projects.slice(0, 3);

  const handleShare = async (project) => {
    const projectUrl = `${window.location.origin}/projects/${project.id}`;

    try {
      await navigator.clipboard.writeText(projectUrl);
      addToast({
        title: 'Lien copié',
        message: `Le lien du projet « ${project.name} » est prêt à être partagé.`,
        type: 'INFO',
      });
    } catch {
      navigate(`/projects/${project.id}`);
    }
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Projets récents</SidebarGroupLabel>
      <SidebarMenu>
        {visibleProjects.map((project) => {
          const projectUrl = `/projects/${project.id}`;
          const isActive = location.pathname === projectUrl;

          return (
            <SidebarMenuItem key={project.id}>
              <SidebarMenuButton asChild isActive={isActive} tooltip={project.name}>
                <Link to={projectUrl}>
                  <FolderKanban />
                  <span>{project.name}</span>
                </Link>
              </SidebarMenuButton>

              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Actions pour ${project.name}`}
                  className="absolute top-1.5 right-1 flex size-5 items-center justify-center rounded-md text-sidebar-foreground opacity-0 outline-hidden transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-sidebar-ring group-hover/menu-item:opacity-100"
                >
                  <MoreHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-48">
                  <DropdownMenuItem onSelect={() => navigate(projectUrl)}>
                    <FolderKanban />
                    Ouvrir le projet
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleShare(project)}>
                    <Share2 />
                    Copier le lien
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/projects')}>
                    Voir tous les projets
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          );
        })}

        {projects.length === 0 ? (
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link to="/projects">
                <FolderKanban />
                <span>Aucun projet récent</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : projects.length > visibleProjects.length ? (
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <Link to="/projects">
                <MoreHorizontal />
                <span>Voir tous les projets</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ) : null}
      </SidebarMenu>
    </SidebarGroup>
  );
}
