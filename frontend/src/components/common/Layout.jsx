import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../app-sidebar';
import { Navbar } from './Navbar';
import { NotificationToastStack } from './NotificationToast';
import { ErrorBoundary } from './ErrorBoundary';
import { SidebarInset, SidebarProvider } from '../ui/sidebar';

export function Layout() {
  return (
    <SidebarProvider className="h-svh max-h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="min-h-0 overflow-hidden">
        <Navbar />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </SidebarInset>
      <NotificationToastStack />
    </SidebarProvider>
  );
}
