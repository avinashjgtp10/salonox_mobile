import { createContext, forwardRef, useContext } from "react";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { resolveFontStyle } from "@/theme/typography";

const InheritedTypography = createContext<TextStyle>({ fontWeight: "400" });

export type Text = NativeText;
export type TextInput = NativeTextInput;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- Preserve React Native's shared component and instance type name.
export const Text = forwardRef<NativeText, TextProps>(function AppText({ style, children, ...props }, ref) {
  const inherited = useContext(InheritedTypography);
  const flattened = StyleSheet.flatten(style) ?? {};
  const typography: TextStyle = {
    fontFamily: flattened.fontFamily ?? inherited.fontFamily,
    fontWeight: flattened.fontWeight ?? inherited.fontWeight,
    fontStyle: flattened.fontStyle ?? inherited.fontStyle,
  };
  return (
    <InheritedTypography.Provider value={typography}>
      <NativeText {...props} ref={ref} style={[style, resolveFontStyle(typography)]}>
        {children}
      </NativeText>
    </InheritedTypography.Provider>
  );
});

// eslint-disable-next-line @typescript-eslint/no-redeclare -- Preserve React Native's shared component and instance type name.
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function AppTextInput({ style, ...props }, ref) {
  return <NativeTextInput {...props} ref={ref} style={[style, resolveFontStyle(StyleSheet.flatten(style) ?? {})]} />;
});
