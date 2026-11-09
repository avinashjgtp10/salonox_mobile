import { useEffect, useRef, useState } from "react";
import { Keyboard, TouchableOpacity, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { pearl } from "@/components/auth/pearl/tokens";
import { inboxService } from "@/services/inbox.service";
import { getApiErrorMessage } from "@/services/api";
import type { InboxMessage, InboxTemplate } from "@/types/inbox";
import { InboxButton } from "./InboxButton";
import {
  renderInboxTemplate,
  templateSlots,
  validateInboxTemplate,
} from "./templatePresentation";
import { useInboxTheme } from "./inboxTheme";

export function SendTemplateSheet({
  phone,
  name,
  onClose,
  onSent,
}: {
  phone: string;
  name?: string | null;
  onClose: () => void;
  onSent: (message: InboxMessage | null) => void;
}) {
  const { styles: s, palette: p } = useInboxTheme();
  const [templates, setTemplates] = useState<InboxTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<InboxTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [coupon, setCoupon] = useState("");
  const [expiry, setExpiry] = useState<Date | null>(null);
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const fields = useRef<Record<string, TextInput | null>>({});
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setTemplates([]);
    void inboxService
      .getApprovedTemplates(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setTemplates(items);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setLoadError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);
  const choose = (template: InboxTemplate) => {
    setPicked(template);
    setError(null);
    setCoupon("");
    setExpiry(null);
    const first = templateSlots(template.body)[0];
    setValues(first && name ? { [first]: name.trim() } : {});
  };
  const send = async () => {
    if (!picked || lock.current) return;
    const validation = validateInboxTemplate(picked, values, coupon, expiry);
    if (validation) {
      setError(validation);
      const missing = templateSlots(picked.body).find(
        (slot) => !values[slot]?.trim(),
      );
      if (missing) fields.current[missing]?.focus();
      return;
    }
    lock.current = true;
    setSending(true);
    setError(null);
    Keyboard.dismiss();
    try {
      const message = await inboxService.sendTemplate(
        phone,
        picked.id,
        Object.fromEntries(
          Object.entries(values).map(([key, value]) => [key, value.trim()]),
        ),
        {
          couponCode: picked.needsCoupon ? coupon.trim() : undefined,
          expiresAt: picked.needsExpiry ? expiry!.toISOString() : undefined,
        },
      );
      if (mounted.current) onSent(message);
    } catch (err) {
      if (mounted.current) setError(getApiErrorMessage(err));
    } finally {
      lock.current = false;
      if (mounted.current) setSending(false);
    }
  };
  const slots = picked ? templateSlots(picked.body) : [];
  const focusOrder = [...slots, ...(picked?.needsCoupon ? ["coupon"] : [])];
  return (
    <BottomSheet
      visible
      pearlStyle
      centered={false}
      avoidKeyboard
      title="Choose a template"
      subtitle="Approved templates for your salon"
      onClose={() => {
        if (!lock.current) {
          Keyboard.dismiss();
          onClose();
        }
      }}
      footer={
        picked ? (
          <>
            <InboxButton
              secondary
              label="Back"
              disabled={sending}
              onPress={() => {
                setPicked(null);
                setError(null);
              }}
            />
            <InboxButton
              label={sending ? "Sending…" : "Send template"}
              disabled={sending}
              onPress={() => void send()}
            />
          </>
        ) : undefined
      }
    >
      {loading ? (
        <ActivityIndicator color={pearl.accent} />
      ) : loadError ? (
        <View style={{ gap: 12 }}>
          <Text style={s.error}>{loadError}</Text>
          <InboxButton
            label="Retry"
            onPress={() => setRevision((v) => v + 1)}
          />
        </View>
      ) : !picked ? (
        <View style={{ gap: 10 }}>
          <TextInput
            accessibilityLabel="Search templates"
            value={search}
            onChangeText={setSearch}
            placeholder="Search templates…"
            placeholderTextColor={p.muted}
            style={s.input}
            autoCorrect={false}
          />
          {templates
            .filter((t) =>
              `${t.name} ${t.body}`
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
            )
            .map((t) => (
              <TouchableOpacity
                key={t.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: false }}
                onPress={() => choose(t)}
                style={{
                  flexDirection: "row",
                  gap: 12,
                  padding: 14,
                  borderRadius: 16,
                  backgroundColor: pearl.glass,
                  borderWidth: 1,
                  borderColor: pearl.fieldBorder,
                }}
              >
                <Ionicons
                  name="radio-button-off"
                  size={22}
                  color={pearl.muted}
                />
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={s.heading}>{t.name}</Text>
                  <Text style={s.muted}>
                    {[t.category, t.language].filter(Boolean).join(" · ")}
                  </Text>
                  <Text numberOfLines={3} style={s.text}>
                    {renderInboxTemplate(
                      t.body,
                      templateSlots(t.body)[0] && name
                        ? {
                            [templateSlots(t.body)[0]]: name.trim(),
                          }
                        : {},
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          {!templates.length && (
            <Text translate style={s.emptyText}>
              No approved templates yet. Add a template in the webapp and wait
              for Meta approval.
            </Text>
          )}
          {!!templates.length &&
            !templates.some((t) =>
              `${t.name} ${t.body}`
                .toLowerCase()
                .includes(search.trim().toLowerCase()),
            ) && (
              <Text translate style={s.emptyText}>
                No approved templates match your search.
              </Text>
            )}
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          <Text style={s.heading}>{picked.name}</Text>
          {slots.map((slot, index) => (
            <View key={slot} style={{ gap: 6 }}>
              <Text style={s.muted}>
                {index === 0 ? "Client name / value " : "Value "}
                {slot}
              </Text>
              <TextInput
                ref={(ref) => {
                  fields.current[slot] = ref;
                }}
                editable={!sending}
                accessibilityLabel={`Template value ${slot}`}
                value={values[slot] || ""}
                maxLength={1024}
                onChangeText={(text) =>
                  setValues((v) => ({ ...v, [slot]: text }))
                }
                placeholder={`Enter value ${slot}`}
                placeholderTextColor={p.muted}
                style={s.input}
                returnKeyType={
                  focusOrder.indexOf(slot) < focusOrder.length - 1
                    ? "next"
                    : "done"
                }
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  const next = focusOrder[focusOrder.indexOf(slot) + 1];
                  if (next) fields.current[next]?.focus();
                  else Keyboard.dismiss();
                }}
              />
            </View>
          ))}
          {picked.needsCoupon && (
            <View style={{ gap: 6 }}>
              <Text translate style={s.muted}>Coupon code</Text>
              <TextInput
                ref={(ref) => {
                  fields.current.coupon = ref;
                }}
                editable={!sending}
                accessibilityLabel="Coupon code"
                value={coupon}
                maxLength={15}
                onChangeText={(text) => setCoupon(text.replace(/\s/g, ""))}
                style={s.input}
                placeholder="Enter coupon code"
                placeholderTextColor={p.muted}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
          )}
          {picked.needsExpiry && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={sending}
              onPress={() => {
                Keyboard.dismiss();
                setPicker("date");
              }}
              style={[s.input, { flex: 0 }]}
            >
              <Text translate style={s.muted}>Offer expires on</Text>
              <Text style={s.text}>
                {expiry
                  ? expiry.toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Select date and time"}
              </Text>
            </TouchableOpacity>
          )}
          {picker && (
            <DateTimePicker
              value={expiry ?? new Date(Date.now() + 3600000)}
              mode={picker}
              minimumDate={picker === "date" ? new Date() : undefined}
              onChange={(event, value) => {
                const mode = picker;
                setPicker(null);
                if (event.type !== "set" || !value) return;
                setExpiry(value);
                if (mode === "date") setTimeout(() => setPicker("time"), 250);
              }}
            />
          )}
          <View style={[s.bubble, s.outgoing, { maxWidth: "100%" }]}>
            <Text translate style={s.muted}>Preview</Text>
            {!!picked.header && <Text style={s.heading}>{picked.header}</Text>}
            <Text style={s.messageText}>
              {renderInboxTemplate(picked.body, values)}
            </Text>
            {!!picked.footer && <Text style={s.muted}>{picked.footer}</Text>}
          </View>
          {!!error && (
            <Text translate accessibilityRole="alert" style={s.error}>
              {error}
            </Text>
          )}
        </View>
      )}
    </BottomSheet>
  );
}
