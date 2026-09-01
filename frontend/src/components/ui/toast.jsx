import * as React from 'react';
import { Toast as ToastPrimitive } from 'radix-ui';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';

import { cn } from '../../lib/utils';

const ToastProvider = ToastPrimitive.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn('fixed right-0 bottom-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-[420px]', className)}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between gap-4 overflow-hidden rounded-xl border p-4 pr-10 shadow-lg transition-all data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-right-2',
  {
    variants: {
      variant: {
        default: 'border-border bg-card text-card-foreground',
        destructive: 'border-destructive bg-destructive text-destructive-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root ref={ref} className={cn(toastVariants({ variant }), className)} {...props} />
));
Toast.displayName = ToastPrimitive.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn('inline-flex h-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitive.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn('absolute top-2 right-2 inline-flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-70 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100', className)}
    toast-close=""
    {...props}
  >
    <X className="size-4" />
    <span className="sr-only">Fermer</span>
  </ToastPrimitive.Close>
));
ToastClose.displayName = ToastPrimitive.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn('text-sm font-semibold leading-5', className)} {...props} />
));
ToastTitle.displayName = ToastPrimitive.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitive.Description ref={ref} className={cn('text-sm leading-5 text-muted-foreground', className)} {...props} />
));
ToastDescription.displayName = ToastPrimitive.Description.displayName;

function Toaster({ toasts = [], onDismiss, onAction }) {
  return (
    <ToastProvider swipeDirection="right">
      {toasts.map((toastData) => (
        <Toast
          key={toastData.id}
          duration={6000}
          onOpenChange={(open) => {
            if (!open) onDismiss(toastData.id);
          }}
        >
          <div className="grid min-w-0 gap-0.5">
            <ToastTitle>{toastData.title}</ToastTitle>
            {toastData.message && <ToastDescription>{toastData.message}</ToastDescription>}
          </div>
          {toastData.projectId && (
            <ToastAction altText="Ouvrir le projet" onClick={() => onAction?.(toastData)}>
              Ouvrir
            </ToastAction>
          )}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}

export { Toaster, Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport, toastVariants };
