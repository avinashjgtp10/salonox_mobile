import { useEffect, useRef, useState } from "react";
import { Switch, View } from "react-native";
import { Page } from "@/components/pearl/Page";
import { EmptyState, SmallButton, Skeleton } from "@/components/pearl/ui";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { usePearlPalette } from "@/components/auth/pearl/usePearlPalette";
import { useAuth } from "@/context/AuthContext";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { canAccessBusinessModule } from "@/utils/staffExperience";
import { formatAppDateTime } from "@/utils/dateTime";
import { getApiErrorMessage } from "@/services/api";
import { appAlert } from "@/services/appAlert";
import { normalizePaymentMethodName, notifyPaymentMethodsChanged, paymentMethodNameProblem, paymentMethodsService, type CustomPaymentMethod, type PaymentMethodConfiguration } from "@/services/paymentMethods.service";
import { SettingsHeader, useSettingsStyles } from "./SettingsUI";

export function PaymentMethodsScreen() {
  const { user } = useAuth();
  const canManage = canAccessBusinessModule(user, "manage_payment_methods");
  const canView = canManage || canAccessBusinessModule(user, "view_settings_payment_methods");
  const methods = usePaymentMethods(canView, true);
  const ui = useSettingsStyles(), p = usePearlPalette();
  const [form, setForm] = useState<{ method: CustomPaymentMethod | null } | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const scopeNow = useRef(methods.scope);
  scopeNow.current = methods.scope;
  useEffect(() => () => { scopeNow.current = ""; }, []);
  const builtIns = methods.config.builtIns.filter(method => method.key !== "upi" || methods.offersUpi);
  const activeCount = builtIns.filter(method => method.is_active).length + methods.config.custom.filter(method => method.is_active).length;
  const disabled = busy || !methods.ready || !!methods.error;

  const open = (method: CustomPaymentMethod | null) => { setName(method?.name ?? ""); setError(""); setForm({ method }); };
  const close = () => { if (!lock.current) { setForm(null); setError(""); } };
  const mutate = async (operation: () => Promise<(config: PaymentMethodConfiguration) => PaymentMethodConfiguration>, closeAfter = false) => {
    if (lock.current || !canManage || disabled) return;
    const scope = methods.scope;
    lock.current = true; setBusy(true); setError("");
    try {
      const update = await operation();
      if (scopeNow.current !== scope) return;
      methods.apply(update);
      if (closeAfter) setForm(null);
      notifyPaymentMethodsChanged(scope);
      void methods.refresh().catch(() => {});
    } catch (err) { if (scopeNow.current === scope) setError(getApiErrorMessage(err)); }
    finally { lock.current = false; if (scopeNow.current === scope) setBusy(false); }
  };
  const save = () => {
    if (!form) return;
    const problem = paymentMethodNameProblem(name, methods.config.custom, form.method?.id);
    if (problem) { setError(problem); return; }
    void mutate(async () => {
      const method = form.method
        ? await paymentMethodsService.update(form.method.id, { name: normalizePaymentMethodName(name) })
        : await paymentMethodsService.create(name);
      return config => ({ ...config, custom: form.method ? config.custom.map(row => row.id === method.id ? method : row) : [...config.custom, method] });
    }, true);
  };
  const remove = (method: CustomPaymentMethod) => {
    const scope = methods.scope;
    appAlert.alert("Delete payment method?", `Delete “${method.name}”? It will no longer be available for new payments. Existing transactions keep their original payment details.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        if (scopeNow.current !== scope) return;
        void mutate(async () => { await paymentMethodsService.remove(method.id); return config => ({ ...config, custom: config.custom.filter(row => row.id !== method.id) }); });
      } },
    ]);
  };

  return <>
    <Page header={<SettingsHeader title="Payment methods" subtitle="Shared with your salon on web" />}
      refreshing={methods.refreshing && methods.ready} onRefresh={() => { void methods.refresh().catch(() => {}); }}>
      {!canView ? <EmptyState icon="lock" title="Access restricted" body="Ask your salon owner for permission to view payment methods." /> : <>
        <View style={[ui.card, { padding: 18, gap: 12 }]}>
          <Text style={ui.title}>How clients can pay</Text>
          <Text style={ui.muted}>Active methods are available at checkout. Default names are fixed; custom names can be edited. Changes sync with the web for this salon.</Text>
          {canManage ? <SmallButton title="Add payment method" icon="plus" primary disabled={disabled} onPress={() => open(null)} /> : <Text style={ui.muted}>You can view payment methods. Managing them requires additional permission.</Text>}
        </View>
        {!!methods.error && <View style={[ui.card, { padding: 16, gap: 10 }]}><Text accessibilityRole="alert" style={ui.error}>{methods.error}</Text><SmallButton title="Retry sync" icon="repeat" onPress={() => { void methods.refresh().catch(() => {}); }} /></View>}
        {!!error && !form && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
        {methods.loading ? <><Skeleton h={88} /><Skeleton h={88} /></> : methods.ready && <>
          <Text translate style={ui.section}>Default methods</Text>
          <View style={ui.card}>{builtIns.map(method => <View key={method.key} style={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ flex: 1, gap: 4 }}><Text style={ui.title}>{method.name}</Text><Text style={ui.muted}>Default · {method.is_active ? "Active" : "Inactive"}</Text></View>
            <Switch accessibilityLabel={`Enable ${method.name}`} value={method.is_active} disabled={disabled || !canManage || (method.is_active && activeCount <= 1)}
              trackColor={{ true: p.accent }} onValueChange={active => { void mutate(async () => {
                const updated = await paymentMethodsService.setBuiltIn(method.key, active);
                return config => ({ ...config, builtIns: config.builtIns.map(row => row.key === updated.key ? updated : row) });
              }); }} />
          </View>)}</View>
          <Text translate style={ui.section}>Custom methods</Text>
          {!methods.config.custom.length ? <EmptyState icon="wallet" title="No custom methods yet" body="Add another way your clients pay, such as a bank transfer or a local payment provider." />
          : methods.config.custom.map(method => <View key={method.id} style={[ui.card, { padding: 16, gap: 12 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1, gap: 4 }}><Text style={ui.title}>{method.name}</Text><Text style={ui.muted}>{method.is_active ? "Active at checkout" : "Inactive"}</Text><Text style={ui.muted}>Updated {formatAppDateTime(method.updated_at)}</Text></View>
              <Switch accessibilityLabel={`Enable ${method.name}`} value={method.is_active} disabled={disabled || !canManage || (method.is_active && activeCount <= 1)} trackColor={{ true: p.accent }}
                onValueChange={active => { void mutate(async () => { const updated = await paymentMethodsService.update(method.id, { is_active: active }); return config => ({ ...config, custom: config.custom.map(row => row.id === updated.id ? updated : row) }); }); }} />
            </View>
            {canManage && <View style={{ flexDirection: "row", gap: 12 }}>
              <SmallButton title="Edit" icon="edit" disabled={disabled} onPress={() => open(method)} />
              <SmallButton title="Delete" icon="x" disabled={disabled || (method.is_active && activeCount <= 1)} onPress={() => remove(method)} />
            </View>}
          </View>)}
          <Text style={ui.muted}>At least one payment method must stay active. Previous payments and invoices retain the method recorded at the time of payment.</Text>
        </>}
      </>}
    </Page>
    <BottomSheet visible={!!form && canManage} title={form?.method ? "Edit payment method" : "Add payment method"} onClose={close} pearlStyle avoidKeyboard
      footer={<View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12 }}><SmallButton title="Cancel" disabled={busy} onPress={close} /><SmallButton title={busy ? "Saving…" : "Save"} primary disabled={disabled} onPress={save} /></View>}>
      <Text translate style={ui.body}>Payment method name</Text>
      <TextInput accessibilityLabel="Payment method name" value={name} onChangeText={value => { setName(value); setError(""); }} editable={!busy} maxLength={40} placeholder="e.g. Bank transfer" placeholderTextColor={p.placeholder}
        style={[ui.input, { color: p.ink, marginTop: 8 }]} autoCapitalize="words" />
      <Text style={[ui.muted, { marginTop: 12 }]}>Use a unique name for this salon, up to 40 characters.</Text>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {!!methods.error && <Text accessibilityRole="alert" style={ui.error}>{methods.error}</Text>}
    </BottomSheet>
  </>;
}
