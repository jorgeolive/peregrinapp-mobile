import React, { memo } from 'react';
import { ShapeSource, CircleLayer, SymbolLayer } from "@maplibre/maplibre-react-native";

export interface OtherUser {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  color: string;
}

interface OtherUsersOverlayProps {
  otherUsers: OtherUser[];
  onUserPress?: (userId: string) => void;
}

export const OtherUsersOverlay = memo(({ 
  otherUsers,
  onUserPress
}: OtherUsersOverlayProps) => {
  if (!otherUsers.length) return null;
  
  return (
    <>
      {otherUsers.map(user => (
        <ShapeSource 
          key={`other-user-${user.id}`}
          id={`other-user-${user.id}`}
          shape={{
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [user.longitude, user.latitude]
            },
            properties: {
              id: user.id,
              name: user.name
            }
          }}
          onPress={() => {
            if (onUserPress) onUserPress(user.id);
          }}
        >
          {/* Outer ring */}
          <CircleLayer
            id={`other-user-halo-${user.id}`}
            style={{
              circleRadius: 14,
              circleColor: `rgba(${user.color || '255, 87, 34'}, 0.2)`,
              circleStrokeWidth: 1,
              circleStrokeColor: `rgba(${user.color || '255, 87, 34'}, 0.4)`
            }}
          />
          
          <CircleLayer
            id={`other-user-circle-${user.id}`}
            style={{
              circleRadius: 7,
              circleColor: `rgb(${user.color || '255, 87, 34'})`,
              circleStrokeWidth: 2,
              circleStrokeColor: '#ffffff'
            }}
          />
          
          {/* User label */}
          <SymbolLayer
            id={`other-user-label-${user.id}`}
            style={{
              textField: ['get', 'name'],
              textSize: 12,
              textOffset: [0, 2.0],
              textAnchor: 'top',
              textColor: '#000',
              textHaloColor: '#fff',
              textHaloWidth: 1
            }}
          />
        </ShapeSource>
      ))}
    </>
  );
}); 