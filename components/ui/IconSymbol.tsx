// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, TextStyle, ViewStyle } from 'react-native';

type IconName = React.ComponentProps<typeof MaterialIcons>['name'] | React.ComponentProps<typeof FontAwesome6>['name'];

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING: Record<string, IconName> = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Add FontAwesome6 mappings
  'user-pen': 'user-pen',
  'me': 'user-pen',  // Add mapping for the Me tab
};

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons/FontAwesome6 on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons or FontAwesome6.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name];
  
  // Check if the icon is a FontAwesome6 icon
  if (iconName === 'user-pen') {
    return <FontAwesome6 name={iconName} size={size} color={color} style={style} />;
  }
  
  // Default to MaterialIcons
  return <MaterialIcons name={iconName} size={size} color={color} style={style} />;
}
