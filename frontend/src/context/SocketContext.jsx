import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useNotifications } from './NotificationContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user, token, isAuthenticated } = useAuth();
  const { addRealtimeNotification, addToast } = useNotifications();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Connexion Socket.io
      const socket = io('/', {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('⚡ Connecté au serveur temps réel Socket.io ! Socket ID:', socket.id);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('🔌 Déconnecté du serveur Socket.io');
      });

      // Réception d'une notification personnelle directe
      socket.on('new_notification', (notification) => {
        console.log('🔔 [Temps Réel] Notification personnelle reçue:', notification);
        addRealtimeNotification(notification);
      });

      // Réception d'une notification projet (ex: GitHub push ou alerte globale)
      socket.on('new_project_notification', (notification) => {
        console.log('📢 [Temps Réel] Notification de projet reçue:', notification);
        addRealtimeNotification(notification);
      });

      // Réception d'un événement de push GitHub en direct
      socket.on('github_push_received', (pushData) => {
        console.log('🐙 [Temps Réel] GitHub Push reçu:', pushData);
        addToast({
          title: `GitHub Push - ${pushData.projectName || pushData.repo}`,
          message: `${pushData.pusher} a poussé sur [${pushData.branch}] : "${pushData.commitMessage}"`,
          type: 'GITHUB_PUSH',
          projectId: pushData.projectId
        });
      });

      return () => {
        socket.disconnect();
      };
    } else {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, token, addRealtimeNotification, addToast]);

  const joinProject = useCallback((projectId) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('join_project', projectId);
    }
  }, []);

  const leaveProject = useCallback((projectId) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('leave_project', projectId);
    }
  }, []);

  const sendMessage = useCallback((projectId, content) => {
    if (socketRef.current && projectId && content) {
      socketRef.current.emit('send_message', { projectId, content });
    }
  }, []);

  const sendTypingStart = useCallback((projectId) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('typing_start', { projectId });
    }
  }, []);

  const sendTypingStop = useCallback((projectId) => {
    if (socketRef.current && projectId) {
      socketRef.current.emit('typing_stop', { projectId });
    }
  }, []);

  const sendReaction = useCallback((projectId, messageId, emoji) => {
    if (socketRef.current && projectId && messageId && emoji) {
      socketRef.current.emit('toggle_reaction', { projectId, messageId, emoji });
    }
  }, []);

  const editMessage = useCallback((projectId, messageId, content) => {
    if (socketRef.current && projectId && messageId && content?.trim()) {
      socketRef.current.emit('edit_message', { projectId, messageId, content });
    }
  }, []);

  const deleteMessage = useCallback((projectId, messageId) => {
    if (socketRef.current && projectId && messageId) {
      socketRef.current.emit('delete_message', { projectId, messageId });
    }
  }, []);

  const togglePinMessage = useCallback((projectId, messageId) => {
    if (socketRef.current && projectId && messageId) {
      socketRef.current.emit('toggle_pin_message', { projectId, messageId });
    }
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinProject,
        leaveProject,
        sendMessage,
        sendTypingStart,
        sendTypingStop,
        sendReaction,
        editMessage,
        deleteMessage,
        togglePinMessage
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket doit être utilisé à l\'intérieur de SocketProvider');
  }
  return context;
}
