import { Text } from "@/components/ui/AppTypography";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";

import { DateField } from "@/components/ui/DateField";
import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { StaffBottomSheet } from "@/features/staff/components/StaffBottomSheet";
import { useAppToast } from "@/hooks/useAppToast";
import { getApiErrorMessage } from "@/services/api";
import { clientService } from "@/services/client.service";
import { useThemeColors } from "@/theme/ThemeProvider";
import { getClientDateFields, toClientDatePayload, validateClientDates } from "@/utils/clientDates";

type ClientDatesSheetProps = {
  clientId: string;
  clientName: string;
  onClose: () => void;
  renderInline?: boolean;
  visible: boolean;
};

/**
 * Edit the selected client's Date of Birth and Anniversary from Quick Sale, like
 * the web's quick client edit. Loads the saved values each time it opens and
 * saves only these two fields (partial PATCH), leaving the rest of the client as is.
 */
export function ClientDatesSheet({ clientId, clientName, onClose, renderInline = false, visible }: ClientDatesSheetProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const toast = useAppToast();
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [errors, setErrors] = useState<{ anniversary?: string; dob?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !clientId) return undefined;
    let active = true;
    setErrors({});
    setLoading(true);
    clientService.getClient(clientId)
      .then((client) => {
        if (!active) return;
        const fields = getClientDateFields(client);
        setDob(fields.dob);
        setAnniversary(fields.anniversary);
      })
      .catch((failure) => { if (active) setErrors({ form: getApiErrorMessage(failure) }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientId, visible]);

  const save = async () => {
    const nextErrors = validateClientDates(dob, anniversary);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    try {
      await clientService.updateClient(clientId, toClientDatePayload(dob, anniversary));
      toast.showSuccess("Client dates saved.");
      onClose();
    } catch (failure) {
      setErrors({ form: getApiErrorMessage(failure) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <StaffBottomSheet
      centered={renderInline}
      onClose={() => { if (!saving) onClose(); }}
      renderInline={renderInline}
      subtitle={clientName}
      title="Date of Birth & Anniversary"
      visible={visible}
    >
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loading} />
      ) : (
        <View>
          <DateField
            error={errors.dob}
            label="Date of Birth"
            maximumDate={new Date()}
            onChange={(value) => { setDob(value); setErrors((current) => ({ ...current, anniversary: undefined, dob: undefined, form: undefined })); }}
            placeholder="Select date of birth"
            value={dob}
          />
          <DateField
            error={errors.anniversary}
            label="Anniversary Date"
            maximumDate={new Date()}
            onChange={(value) => { setAnniversary(value); setErrors((current) => ({ ...current, anniversary: undefined, form: undefined })); }}
            placeholder="Select anniversary date"
            value={anniversary}
          />
          {errors.form ? <Text style={styles.errorText}>{errors.form}</Text> : null}
          <View style={styles.actions}>
            <TouchableOpacity activeOpacity={0.84} disabled={saving} onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.84} disabled={saving} onPress={() => void save()} style={[styles.saveButton, saving && styles.disabled]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </StaffBottomSheet>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  loading: { paddingVertical: Spacing.xl },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: "700", marginBottom: Spacing.sm },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.sm },
  cancelButton: {
    alignItems: "center", backgroundColor: Colors.bg2, borderColor: Colors.border, borderRadius: AppRadius.control,
    borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 46,
  },
  cancelText: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  saveButton: { alignItems: "center", backgroundColor: Colors.primary, borderRadius: AppRadius.control, flex: 1, justifyContent: "center", minHeight: 46 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
