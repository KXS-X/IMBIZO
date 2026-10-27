import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckSquare, FolderKanban, LayoutDashboard, ShieldCheck } from 'lucide-react';
import { OrangeLogo } from './common/OrangeLogo';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '../context/AuthContext';
import { projectService } from '../services/projectService';

export function AppSidebar({ ...props }) {
  const { user, isAdmin } = useAuth();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    let isMounted = true;

    if (!user?.id) {
      setProjects([]);
      return () => {
        isMounted = false;
      };
    }

    projectService.getUserProjects()
      .then((response) => {
        if (isMounted) setProjects(response.data.projects || []);
      })
      .catch((error) => {
        console.error('Erreur chargement raccourcis projets:', error);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const navItems = [
    { title: 'Tableau de bord', url: '/', icon: <LayoutDashboard /> },
    { title: 'Projets & équipes', url: '/projects', exact: true, icon: <FolderKanban /> },
    { title: 'Mes tâches', url: '/tasks', icon: <CheckSquare /> },
    { title: 'Notifications', url: '/notifications', icon: <Bell /> },
    ...(isAdmin ? [{ title: 'Back-office admin', url: '/admin', icon: <ShieldCheck /> }] : []),
  ];

  return (
    <>
      <Sidebar variant="inset" collapsible="icon" {...props}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="Imbizo">
                <Link to="/">
                  <OrangeLogo className="size-8 rounded-lg shrink-0 shadow-sm" />
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Imbizo</span>
                    <span className="truncate text-xs text-sidebar-foreground/60">Espace d’équipe</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <NavMain items={navItems} />
          <NavProjects projects={projects} />
        </SidebarContent>

        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
