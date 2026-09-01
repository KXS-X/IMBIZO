import React, { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Copy, Download, FileText, Image as ImageIcon, LoaderCircle, MessageSquare, MoreHorizontal, Pencil, Pin, Plus, Send, SmilePlus, Trash2, X } from 'lucide-react';

import { UserAvatar } from '../common/UserAvatar';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Attachment, AttachmentAction, AttachmentActions, AttachmentContent, AttachmentDescription, AttachmentGroup, AttachmentMedia, AttachmentTitle } from '../ui/attachment';
import { Bubble, BubbleContent, BubbleReactions } from '../ui/bubble';
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageHeader } from '../ui/message';
import { messageService } from '../../services/messageService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const reactionOptions = ['👍', '❤️', '😂', '🎉', '😮', '👏'];

export function ProjectChat({ projectId, projectName }) {
  const { user } = useAuth();
  const { socket, joinProject, leaveProject, sendMessage, sendTypingStart, sendTypingStop, sendReaction, editMessage, deleteMessage, togglePinMessage } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [typingUsers, setTypingUsers] = useState([]);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [uploadError, setUploadError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const highlightTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const pendingAttachmentsRef = useRef(pendingAttachments);

  const allowedDocumentTypes = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ];
  const maxFileSize = 10 * 1024 * 1024;

  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      setLoading(true);
      try {
        const response = await messageService.getProjectMessages(projectId);
        if (isMounted) setMessages(response.data.messages);
      } catch (error) {
        console.error('Erreur chargement historique messages:', error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadHistory();
    return () => { isMounted = false; };
  }, [projectId]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleSocketConnect = () => joinProject(projectId);

    handleSocketConnect();
    socket.on('connect', handleSocketConnect);
    return () => {
      socket.off('connect', handleSocketConnect);
      sendTypingStop(projectId);
      leaveProject(projectId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [socket, projectId, joinProject, leaveProject, sendTypingStop]);

  useEffect(() => {
    if (!socket) return undefined;

    const handleNewMessage = (newMessage) => {
      if (newMessage.projectId === projectId) setMessages((current) => [...current, newMessage]);
    };
    const handleUserTyping = ({ projectId: typingProjectId, user: typingUser }) => {
      if (typingProjectId === projectId && typingUser.id !== user.id) {
        setTypingUsers((current) => current.some((item) => item.id === typingUser.id) ? current : [...current, typingUser]);
      }
    };
    const handleUserStoppedTyping = ({ projectId: typingProjectId, userId }) => {
      if (typingProjectId === projectId) setTypingUsers((current) => current.filter((item) => item.id !== userId));
    };
    const handleReactionUpdated = ({ projectId: reactionProjectId, messageId, reactions }) => {
      if (reactionProjectId !== projectId) return;
      setMessages((current) => current.map((message) => message.id === messageId ? { ...message, reactions } : message));
    };
    const handleMessageUpdated = (updatedMessage) => {
      if (updatedMessage.projectId !== projectId) return;
      setMessages((current) => current.map((message) => message.id === updatedMessage.id ? updatedMessage : message));
      setEditingMessage((current) => current?.id === updatedMessage.id ? null : current);
    };
    const handleMessageDeleted = ({ projectId: deletedProjectId, messageId }) => {
      if (deletedProjectId !== projectId) return;
      setMessages((current) => current.filter((message) => message.id !== messageId));
      setEditingMessage((current) => current?.id === messageId ? null : current);
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('message_reaction_updated', handleReactionUpdated);
    socket.on('message_updated', handleMessageUpdated);
    socket.on('message_deleted', handleMessageDeleted);
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('message_reaction_updated', handleReactionUpdated);
      socket.off('message_updated', handleMessageUpdated);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket, projectId, user.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  useEffect(() => {
    pendingAttachmentsRef.current = pendingAttachments;
  }, [pendingAttachments]);

  useEffect(() => () => {
    pendingAttachmentsRef.current.forEach(({ preview }) => {
      if (preview) URL.revokeObjectURL(preview);
    });
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
  }, []);

  const handleInputChange = (event) => {
    const nextValue = event.target.value;
    setInputMessage(nextValue);
    if (!nextValue.trim()) {
      sendTypingStop(projectId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      return;
    }
    sendTypingStart(projectId);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingStop(projectId), 2000);
  };

  const isAcceptedFile = (file) => file.type.startsWith('image/') || allowedDocumentTypes.includes(file.type);

  const openFilePicker = (accept) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.accept = accept;
    fileInputRef.current.click();
  };

  const formatFileSize = (size) => {
    if (!size) return 'Fichier';
    if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} Ko`;
    return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
  };

  const renderReactionControls = (message, align) => {
    const reactionGroups = Object.values((message.reactions || []).reduce((groups, reaction) => {
      if (!groups[reaction.emoji]) groups[reaction.emoji] = { emoji: reaction.emoji, count: 0, userIds: [] };
      groups[reaction.emoji].count += 1;
      groups[reaction.emoji].userIds.push(reaction.userId);
      return groups;
    }, {}));
    const hasUserReacted = reactionGroups.some((reaction) => reaction.userIds.includes(user.id));

    return (
      <BubbleReactions side="bottom" align={align} className={reactionGroups.length === 0 ? 'opacity-0 transition-opacity group-hover/message:opacity-100 focus-within:opacity-100' : ''}>
        {reactionGroups.map((reaction) => {
          const isSelected = reaction.userIds.includes(user.id);
          return (
            <Button
              key={reaction.emoji}
              type="button"
              variant={isSelected ? 'secondary' : 'ghost'}
              size="xs"
              className={`h-6 rounded-full px-2 text-xs ${isSelected ? 'border border-primary/50 bg-primary/10 text-primary hover:bg-primary/15' : 'text-foreground'}`}
              onClick={() => sendReaction(projectId, message.id, reaction.emoji)}
              aria-label={`${isSelected ? 'Retirer' : 'Ajouter'} la réaction ${reaction.emoji}`}
              aria-pressed={isSelected}
              title={`${reaction.count} réaction${reaction.count > 1 ? 's' : ''}`}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <span>{reaction.count}</span>
            </Button>
          );
        })}
        {!hasUserReacted && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Réagir au message">
                <SmilePlus />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align={align === 'end' ? 'end' : 'start'} className="w-auto min-w-0 p-1">
              <div className="flex items-center gap-0.5">
                {reactionOptions.map((emoji) => (
                  <DropdownMenuItem
                    key={emoji}
                    onSelect={() => sendReaction(projectId, message.id, emoji)}
                    className="size-8 justify-center rounded-md p-0 text-base"
                    aria-label={`Réagir ${emoji}`}
                  >
                    <span aria-hidden="true">{emoji}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </BubbleReactions>
    );
  };

  const copyMessage = async (message) => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error('Impossible de copier le message:', error);
    }
  };

  const renderMessageActions = (message, isMe) => {
    const canDelete = isMe || user.role === 'ADMIN';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-xs" className="size-6 rounded-full opacity-0 transition-opacity group-hover/message:opacity-100 focus-visible:opacity-100" aria-label="Actions du message">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align={isMe ? 'end' : 'start'} className="w-44">
          <DropdownMenuItem onSelect={() => setEditingMessage({ id: message.id, content: message.content || '' })} disabled={!isMe || !message.content}>
            <Pencil />
            <span>Modifier</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => copyMessage(message)} disabled={!message.content}>
            <Copy />
            <span>Copier</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => togglePinMessage(projectId, message.id)}>
            <Pin />
            <span>{message.isPinned ? 'Désépingler' : 'Épingler'}</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(message)} disabled={!canDelete}>
            <Trash2 />
            <span>Supprimer</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderAttachments = (attachments, align) => {
    if (!attachments?.length) return null;

    return (
      <AttachmentGroup className={align === 'end' ? 'items-end' : 'items-start'}>
        {attachments.map((attachment) => {
          const isImage = attachment.mimeType?.startsWith('image/');

          if (isImage) {
            return (
              <Attachment key={attachment.id} className="w-fit border-border/60 bg-background/80">
                <Button type="button" variant="ghost" className="h-auto w-auto rounded-lg p-0 hover:bg-transparent" onClick={() => setPreviewImage({ url: attachment.url, name: attachment.originalName })} aria-label={`Afficher ${attachment.originalName} en grand`}>
                  <AttachmentMedia variant="image" className="size-20 rounded-lg">
                    <img src={attachment.url} alt={attachment.originalName} className="size-full object-cover" />
                  </AttachmentMedia>
                </Button>
              </Attachment>
            );
          }

          return (
            <Attachment key={attachment.id} className="max-w-72">
              <a href={attachment.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ouvrir ${attachment.originalName}`}>
                <AttachmentMedia variant="icon" className="size-10 rounded-lg bg-muted/60">
                  <FileText className="size-4 text-muted-foreground" />
                </AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>{attachment.originalName}</AttachmentTitle>
                  <AttachmentDescription>Document · {formatFileSize(attachment.size)}</AttachmentDescription>
                </AttachmentContent>
              </a>
              <AttachmentActions>
                <AttachmentAction asChild aria-label={`Télécharger ${attachment.originalName}`}>
                  <a href={attachment.url} download={attachment.originalName} target="_blank" rel="noreferrer">
                    <Download />
                  </a>
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          );
        })}
      </AttachmentGroup>
    );
  };

  const renderPinnedAttachment = (attachment) => {
    const isImage = attachment.mimeType?.startsWith('image/');

    if (isImage) {
      return (
        <Button type="button" variant="ghost" className="size-full rounded-lg p-0 hover:bg-transparent" onClick={() => setPreviewImage({ url: attachment.url, name: attachment.originalName })} aria-label={`Afficher ${attachment.originalName} en grand`}>
          <img src={attachment.url} alt={attachment.originalName} className="size-full rounded-lg object-cover" />
        </Button>
      );
    }

    return (
      <a href={attachment.url} target="_blank" rel="noreferrer" className="flex size-full items-center justify-center rounded-lg bg-background/80 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Ouvrir ${attachment.originalName}`}>
        <FileText className="size-5 text-muted-foreground" />
      </a>
    );
  };

  const addAttachments = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const availableSlots = 5 - pendingAttachments.length;
    const nextFiles = files.slice(0, availableSlots);
    const invalidFile = nextFiles.find((file) => !isAcceptedFile(file));
    const oversizedFile = nextFiles.find((file) => file.size > maxFileSize);

    if (invalidFile) {
      setUploadError('Ce type de fichier n’est pas pris en charge.');
      return;
    }
    if (oversizedFile) {
      setUploadError('Chaque fichier doit faire 10 Mo maximum.');
      return;
    }

    setUploadError(files.length > availableSlots ? 'Vous pouvez joindre 5 fichiers maximum.' : '');
    setPendingAttachments((current) => [
      ...current,
      ...nextFiles.map((file) => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
      }))
    ]);
  };

  const removeAttachment = (index) => {
    setPendingAttachments((current) => {
      const attachment = current[index];
      if (attachment?.preview) URL.revokeObjectURL(attachment.preview);
      return current.filter((_, attachmentIndex) => attachmentIndex !== index);
    });
  };

  const clearAttachments = () => {
    pendingAttachments.forEach(({ preview }) => {
      if (preview) URL.revokeObjectURL(preview);
    });
    setPendingAttachments([]);
  };

  const pinnedMessages = messages.filter((message) => message.isPinned);

  const focusMessage = (messageId) => {
    document.getElementById(`chat-message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedMessageId(null), 1600);
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (isSending || (!inputMessage.trim() && pendingAttachments.length === 0)) return;

    setIsSending(true);
    try {
      if (pendingAttachments.length > 0) {
        await messageService.sendMessageWithAttachments(
          projectId,
          inputMessage,
          pendingAttachments.map(({ file }) => file)
        );
        clearAttachments();
      } else {
        sendMessage(projectId, inputMessage.trim());
      }
      sendTypingStop(projectId);
      setInputMessage('');
      setUploadError('');
    } catch (error) {
      setUploadError(error.response?.data?.message || 'Impossible d’envoyer la pièce jointe.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Card className="relative flex h-[620px] flex-col overflow-hidden p-0">
      <CardHeader className="border-b py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="size-4" /></span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">Chat de {projectName}</CardTitle>
              <CardDescription>Échangez avec les membres du projet.</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      {pinnedMessages.length > 0 && (
        <div className="pointer-events-auto absolute left-1/2 top-[104px] z-10 -translate-x-1/2" aria-label="Message épinglé">
          {(() => {
            const pinnedMessage = pinnedMessages[pinnedMessages.length - 1];
            const isMe = pinnedMessage.userId === user.id;

            return (
              <div className="flex min-w-0 items-center gap-1">
                {pinnedMessage.content && (
                  <Bubble align="start" variant={isMe ? 'default' : 'muted'} className="min-w-[84px] max-w-[calc(100vw-5rem)] sm:max-w-md">
                    <BubbleContent asChild className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="sm" className="h-auto max-w-full justify-start rounded-xl px-3 py-2 text-left font-normal hover:bg-transparent" onClick={() => focusMessage(pinnedMessage.id)}>
                        <UserAvatar user={pinnedMessage.user} className="size-5 shrink-0" />
                        <span>{pinnedMessage.content}</span>
                      </Button>
                    </BubbleContent>
                  </Bubble>
                )}
                {pinnedMessage.attachments?.map((attachment) => (
                  <Bubble key={attachment.id} align="start" variant={isMe ? 'default' : 'muted'}>
                    <BubbleContent className="size-10 p-1">
                      {renderPinnedAttachment(attachment)}
                    </BubbleContent>
                  </Bubble>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Chargement de l’historique…</p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
            <MessageSquare className="size-10 opacity-30" />
            <h3 className="mt-3 text-sm font-medium text-foreground">Aucun message pour l’instant</h3>
            <p className="mt-1 text-sm">Soyez le premier à écrire à l’équipe.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isMe = message.userId === user.id;
            const isDeleted = message.isDeleted;
            const previousMessage = messages[index - 1];
            const nextMessage = messages[index + 1];
            const isConsecutiveAuthor = previousMessage?.userId === message.userId;
            let formattedTime = '';
            let minuteKey = '';
            let nextMinuteKey = '';
            try {
              formattedTime = format(new Date(message.createdAt), 'HH:mm', { locale: fr });
              minuteKey = format(new Date(message.createdAt), 'yyyy-MM-dd HH:mm');
              if (nextMessage) nextMinuteKey = format(new Date(nextMessage.createdAt), 'yyyy-MM-dd HH:mm');
            } catch {
              // Une date invalide ne doit pas bloquer l’affichage du message.
            }
            const showTimestamp = Boolean(formattedTime) && (nextMessage?.userId !== message.userId || nextMinuteKey !== minuteKey);

            return (
              <Message key={message.id} id={`chat-message-${message.id}`} align={isMe ? 'end' : 'start'}>
                {!isMe && (
                  <MessageAvatar className="size-8">
                    <UserAvatar user={message.user} className="size-8" />
                  </MessageAvatar>
                )}
                <MessageContent className={isMe ? 'items-end' : 'items-start'}>
                  {!isMe && !isConsecutiveAuthor && <MessageHeader className="mb-1 text-xs font-medium text-foreground">{message.user?.name}</MessageHeader>}
                  {isDeleted ? (
                    <Bubble align={isMe ? 'end' : 'start'} variant="muted">
                      <BubbleContent className="italic text-muted-foreground">Message supprimé</BubbleContent>
                    </Bubble>
                  ) : (
                    <>
                      {isMe && renderAttachments(message.attachments, 'end')}
                      {message.content && editingMessage?.id !== message.id && (
                        <Bubble align={isMe ? 'end' : 'start'} variant={isMe ? 'default' : 'muted'} className={highlightedMessageId === message.id ? 'animate-pulse' : ''}>
                          <BubbleContent>{message.content}</BubbleContent>
                          {renderReactionControls(message, isMe ? 'end' : 'start')}
                        </Bubble>
                      )}
                      {editingMessage?.id === message.id && (
                        <Bubble align="end" variant="outline">
                          <BubbleContent className="flex items-center gap-2 p-1.5">
                            <Input
                              value={editingMessage.content}
                              onChange={(event) => setEditingMessage((current) => ({ ...current, content: event.target.value }))}
                              onKeyDown={(event) => {
                                if (event.key === 'Escape') setEditingMessage(null);
                                if (event.key === 'Enter' && !event.shiftKey) {
                                  event.preventDefault();
                                  if (editingMessage.content.trim()) {
                                    editMessage(projectId, message.id, editingMessage.content);
                                    setEditingMessage(null);
                                  }
                                }
                              }}
                              autoFocus
                              aria-label="Modifier le message"
                              className="h-7 min-w-40 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                            />
                            <Button
                              type="button"
                              size="icon-xs"
                              onClick={() => {
                                if (editingMessage.content.trim()) {
                                  editMessage(projectId, message.id, editingMessage.content);
                                  setEditingMessage(null);
                                }
                              }}
                              aria-label="Enregistrer la modification"
                            >
                              <Send />
                            </Button>
                          </BubbleContent>
                        </Bubble>
                      )}
                      {!isMe && renderAttachments(message.attachments, 'start')}
                    </>
                  )}
                  <MessageFooter className="mt-0">
                    {!isDeleted && !isMe && renderMessageActions(message, isMe)}
                    {!isDeleted && message.isPinned && <Pin className="mr-1 size-3 text-primary" aria-label="Message épinglé" />}
                    {showTimestamp && <span>{formattedTime}</span>}
                    {!isDeleted && isMe && renderMessageActions(message, isMe)}
                  </MessageFooter>
                </MessageContent>
              </Message>
            );
          })
        )}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground" role="status" aria-live="polite">
            <span>{typingUsers.length === 1 ? `${typingUsers[0].name} est` : `${typingUsers.map((item) => item.name).join(', ')} sont`} en train d’écrire</span>
            <span className="inline-flex gap-0.5" aria-hidden="true">
              <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
              <span className="size-1 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
              <span className="size-1 animate-bounce rounded-full bg-current" />
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <CardFooter className="border-t p-4">
        <div
          className={`w-full rounded-xl transition-colors ${isDragging ? 'bg-primary/5 ring-1 ring-primary/40' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(event) => { event.preventDefault(); setIsDragging(false); addAttachments(event.dataTransfer.files); }}
        >
          {pendingAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2 pl-10">
              {pendingAttachments.map(({ file, preview }, index) => (
                <Attachment key={`${file.name}-${index}`} size="sm" className="group max-w-56 bg-muted/40">
                  <AttachmentMedia variant={preview ? 'image' : 'icon'} className={preview ? 'size-10' : 'size-9'}>
                    {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <FileText className="size-4 text-muted-foreground" />}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{file.name}</AttachmentTitle>
                    <AttachmentDescription>Prêt à envoyer</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction type="button" onClick={() => removeAttachment(index)} aria-label={`Retirer ${file.name}`}>
                      <X />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ))}
            </div>
          )}
          {uploadError && <p className="mb-2 text-xs text-destructive">{uploadError}</p>}
          <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
            <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx" onChange={(event) => { addAttachments(event.target.files); event.target.value = ''; }} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Ajouter une pièce jointe" disabled={isSending}>
                  <Plus />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-52">
                <DropdownMenuItem onSelect={() => openFilePicker('image/*')}>
                  <ImageIcon />
                  <span>Image</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openFilePicker('.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx')}>
                  <FileText />
                  <span>Document</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Input value={inputMessage} onChange={handleInputChange} placeholder={isDragging ? 'Déposez vos fichiers ici…' : 'Écrivez un message…'} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); handleSendMessage(event); } }} disabled={isSending} />
            <Button type="submit" size="icon" disabled={isSending || (!inputMessage.trim() && pendingAttachments.length === 0)} aria-label="Envoyer le message">
              {isSending ? <LoaderCircle className="animate-spin" /> : <Send />}
            </Button>
          </form>
        </div>
      </CardFooter>
      </Card>
      <Dialog open={Boolean(previewImage)} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-5xl border-0 bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">{previewImage?.name || 'Aperçu de l’image'}</DialogTitle>
          {previewImage && <img src={previewImage.url} alt={previewImage.name} className="max-h-[85vh] w-auto max-w-full rounded-xl object-contain" />}
        </DialogContent>
      </Dialog>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est définitive. Le message sera supprimé pour tous les membres du projet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteMessage(projectId, deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
