import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'M';
}

function isGeneratedAvatar(avatar) {
  return typeof avatar === 'string' && avatar.includes('api.dicebear.com');
}

export function UserAvatar({ user, className = '', size = 'default' }) {
  const avatar = user?.avatar && !isGeneratedAvatar(user.avatar) ? user.avatar : null;

  return (
    <Avatar size={size} className={className}>
      {avatar && <AvatarImage src={avatar} alt={user?.name || 'Utilisateur'} />}
      <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
    </Avatar>
  );
}
