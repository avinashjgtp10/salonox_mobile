import { createContext, forwardRef, useContext, useRef, useImperativeHandle } from "react";
import { FormFieldFocusContext } from "@/components/ui/KeyboardAwareForm";
import {
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from "react-native";

import { resolveFontStyle } from "@/theme/typography";
import { translateUiText } from "@/localization/translate";
import { useRegionalPreferences } from "@/localization/preferences";

const InheritedTypography = createContext<TextStyle>({ fontWeight: "400" });

export type Text = NativeText;
export type TextInput = NativeTextInput;

// eslint-disable-next-line @typescript-eslint/no-redeclare -- Preserve React Native's shared component and instance type name.
export const Text = forwardRef<NativeText, TextProps & { translate?: boolean }>(function AppText({ style, children, translate = false, ...props }, ref) {
  const { language } = useRegionalPreferences();
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
        {translate ? translateChildren(children, language) : children}
      </NativeText>
    </InheritedTypography.Provider>
  );
});

// eslint-disable-next-line @typescript-eslint/no-redeclare -- Preserve React Native's shared component and instance type name.
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function AppTextInput({ style, onFocus, ...props }, ref) {
  const { language } = useRegionalPreferences();
  const inputRef = useRef<NativeTextInput>(null);
  const revealField = useContext(FormFieldFocusContext);
  useImperativeHandle(ref, () => inputRef.current as NativeTextInput);
  return <NativeTextInput {...props} placeholder={props.placeholder ? translateUiText(props.placeholder, language) : undefined} ref={inputRef} onFocus={(event) => {
    revealField?.(inputRef.current);
    onFocus?.(event);
  }} style={[style, resolveFontStyle(StyleSheet.flatten(style) ?? {})]} />;
});

function translateChildren(children: import("react").ReactNode, language: string): import("react").ReactNode {
  if (typeof children === "string") return translateUiText(children, language);
  if (Array.isArray(children)) return children.map(child => translateChildren(child, language));
  return children;
}
