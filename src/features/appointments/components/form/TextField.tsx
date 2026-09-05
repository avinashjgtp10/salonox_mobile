import { createStyles } from "@/features/appointments/styles/appointmentStyles";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useMemo } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

export function TextField({
  actionLabel,
  editable = true,
  error,
  keyboardType,
  label,
  multiline,
  onActionPress,
  onChangeText,
  placeholder,
  value,
}: {
  actionLabel?: string;
  editable?: boolean;
  error?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  label: string;
  multiline?: boolean;
  onActionPress?: () => void;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.inputLabelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {actionLabel && onActionPress ? (
          <TouchableOpacity activeOpacity={0.8} onPress={onActionPress}>
            <Text style={styles.inputActionText}>{actionLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TextInput
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.placeholder}
        style={[
          styles.textInput,
          !editable && styles.readOnlyInput,
          multiline && styles.textArea,
          error && styles.inputError,
        ]}
        value={value}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
