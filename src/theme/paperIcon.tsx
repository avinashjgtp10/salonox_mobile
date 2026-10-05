
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type PaperIconProps = {
  name: string;
  color?: string;
  size: number;
  direction?: 'rtl' | 'ltr';
  testID?: string;
};

export function PaperIcon({ color, name, size, testID }: PaperIconProps) {
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
