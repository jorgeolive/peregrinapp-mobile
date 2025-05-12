import React, { memo } from 'react';
import { useOtherUsersContext } from '../context/OtherUsersContext';
import { OtherUsersOverlay } from './OtherUsersOverlay';

interface OtherUsersContainerProps {
  onUserPress: (userId: string) => void;
}

// This container component will re-render when other users change,
// but won't cause the parent MapView to re-render
const OtherUsersContainer = memo(({ onUserPress }: OtherUsersContainerProps) => {
  console.log('[OtherUsersContainer] Rendering');
  const { otherUsers } = useOtherUsersContext();
  
  return (
    <OtherUsersOverlay
      otherUsers={otherUsers}
      onUserPress={onUserPress}
    />
  );
});

export default OtherUsersContainer; 