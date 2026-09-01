import React, { useState } from 'react';
import { Hand } from 'lucide-react';
import { SidebarTrigger } from '../ui/sidebar';
import { Button } from '../ui/button';
import { NotificationDropdown } from '../notifications/NotificationDropdown';
import { NoTaskSignalModal } from '../kanban/NoTaskSignalButton';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { isAdmin } = useAuth();
  const [isSignalModalOpen, setIsSignalModalOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {!isAdmin && (
          <Button
            variant="ghost"
            size="icon"
            className="text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
            aria-label="Signaler ma disponibilité"
            title="Signaler ma disponibilité"
            onClick={() => setIsSignalModalOpen(true)}
          >
            <Hand />
          </Button>
        )}
        <NotificationDropdown />
      </div>

      {!isAdmin && (
        <NoTaskSignalModal
          isOpen={isSignalModalOpen}
          onClose={() => setIsSignalModalOpen(false)}
        />
      )}
    </header>
  );
}
