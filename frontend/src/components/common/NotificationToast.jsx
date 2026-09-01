import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Toaster } from '../ui/toast';
import { useNotifications } from '../../context/NotificationContext';

export function NotificationToastStack() {
  const { toasts, removeToast } = useNotifications();
  const navigate = useNavigate();

  return (
    <Toaster
      toasts={toasts}
      onDismiss={removeToast}
      onAction={(toastData) => {
        navigate(`/projects/${toastData.projectId}`);
        removeToast(toastData.id);
      }}
    />
  );
}
