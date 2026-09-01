import React from 'react';
import { X } from 'lucide-react';

import { ProfileSettings } from './profile-settings';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

export function ProfileModal({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!flex h-[min(700px,calc(100vh-2rem))] max-h-[calc(100vh-2rem)] !max-w-2xl flex-col gap-0 overflow-hidden p-0"
      >
        <header className="flex shrink-0 items-center justify-between border-b px-6 py-4 sm:px-8">
          <div>
            <DialogTitle>Mon profil</DialogTitle>
            <DialogDescription className="mt-1">Gérez vos informations personnelles et votre sécurité.</DialogDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fermer le profil"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 overflow-y-auto">
          <ProfileSettings />
        </div>
      </DialogContent>
    </Dialog>
  );
}
