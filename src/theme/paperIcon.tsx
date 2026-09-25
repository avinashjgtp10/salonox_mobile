/**
 * Paper v5 renders icons through `@react-native-vector-icons/material-design-icons`
 * by default, which this project does not install (and which would need a native
 * font link). `@expo/vector-icons` already ships the same Material Community set,
 * so this adapter is handed to `PaperProvider` via `settings.icon`.
 */

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Mirrors Paper's own `IconProps` (color is optional there, so it must be here
// too or `settings.icon` won't typecheck).
type PaperIconProps = {
  name: string;
  color?: string;
  size: number;
  direction?: 'rtl' | 'ltr';
  testID?: string;
};

export function PaperIcon({ color, name, size, testID }: PaperIconProps) {
  // Paper invokes `settings.icon` as a plain function — `s({ color, size, ... })`
  // in its Icon.tsx — not as `<Icon />`. This project has React Compiler on, and
  // the compiler would otherwise see a PascalCase function returning JSX and
  // insert a `useMemoCache` hook, which then runs outside any component render
  // and throws "Invalid hook call". The directive keeps this one plain.
  'use no memo';

  return (
    <MaterialCommunityIcons
      color={color}
      name={name as MaterialCommunityIconName}
      size={size}
      testID={testID}
    />
  );
}
