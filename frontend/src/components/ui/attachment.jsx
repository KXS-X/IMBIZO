import { cva } from 'class-variance-authority';

import { cn } from '../../lib/utils';
import { Button } from './button';

const attachmentVariants = cva('group/attachment relative flex min-w-0 max-w-full items-center gap-2 overflow-hidden rounded-xl border border-border/70 bg-background/80 p-[10px] text-foreground transition-colors');

function Attachment({ className, size, ...props }) {
  return <div data-slot="attachment" data-size={size} className={cn(attachmentVariants(), className)} {...props} />;
}

function AttachmentMedia({ className, variant = 'icon', ...props }) {
  return <div data-slot="attachment-media" data-variant={variant} className={cn('flex shrink-0 items-center justify-center overflow-hidden', variant === 'image' ? 'size-14' : 'size-10', className)} {...props} />;
}

function AttachmentContent({ className, ...props }) {
  return <div data-slot="attachment-content" className={cn('min-w-0 flex-1', className)} {...props} />;
}

function AttachmentTitle({ className, ...props }) {
  return <span data-slot="attachment-title" className={cn('block max-w-full truncate text-xs font-medium', className)} {...props} />;
}

function AttachmentDescription({ className, ...props }) {
  return <span data-slot="attachment-description" className={cn('block truncate text-[11px] text-muted-foreground', className)} {...props} />;
}

function AttachmentActions({ className, ...props }) {
  return <div data-slot="attachment-actions" className={cn('flex shrink-0 items-center gap-1 px-0.5', className)} {...props} />;
}

function AttachmentAction({ className, ...props }) {
  return <Button data-slot="attachment-action" variant="ghost" size="icon-sm" className={cn('rounded-full text-muted-foreground hover:bg-muted hover:text-foreground', className)} {...props} />;
}

function AttachmentGroup({ className, ...props }) {
  return <div data-slot="attachment-group" className={cn('grid min-w-0 gap-2', className)} {...props} />;
}

export { Attachment, AttachmentMedia, AttachmentContent, AttachmentTitle, AttachmentDescription, AttachmentActions, AttachmentAction, AttachmentGroup };
