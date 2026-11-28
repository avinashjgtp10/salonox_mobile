import { useRegionalPreferences } from "@/localization/preferences";
import { BookingSection } from "./BookingSection";
import { Text } from "@/components/ui/AppTypography";
import type { PickerTab } from "@/features/appointments/components/form/ServiceCatalogPicker";
import type { AppointmentSelectedService } from "@/features/appointments/types/appointmentForm";
import { formatDurationLabel } from "@/features/appointments/utils/appointmentForm";
import { FormField, s as legacyStyles, types } from "@/features/quickSale/components/QuickSaleForm";
import { itemTimeLabel, localItemTime } from "@/features/quickSale/utils/itemTime";
import { formatCurrency, parseAmount } from "@/features/quickSale/utils/money";
import { currencyLabel } from "@/utils/currency";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Keyboard, Pressable, ScrollView, View } from "react-native";
import { themedStyles, themedTokens } from "@/components/auth/pearl/themedStyles";

const ADD_OPTIONS: [PickerTab, string][] = [
  ["service", "Service"],
  ["product", "Product"],
  ["package", "Package"],
  ["membership", "Membership"],
];

/** The Quick Sale "Services & items" card for the booking form's selected lines. */
export function AppointmentItemsSection({
  defaultStaffName,
  defaultTime,
  error,
  onAdd,
  onPickStaff,
  onPickTime,
  onRemove,
  onSetDiscount,
  onSetPrice,
  onSetQuantity,
  services,
}: {
  // Each line falls back to the booking's staff and start time until changed.
  defaultStaffName?: string;
  defaultTime?: string;
  error?: string;
  onAdd: (tab: PickerTab) => void;
  onPickStaff: (itemId: string) => void;
  onPickTime: (itemId: string) => void;
  onRemove: (itemId: string) => void;
  onSetDiscount: (itemId: string, discount: number) => void;
  onSetPrice: (itemId: string, price: number) => void;
  onSetQuantity: (itemId: string, quantity: number) => void;
  services: AppointmentSelectedService[];
}) {
  "use no memo";
  useRegionalPreferences();
  // One line at a time, like Quick Sale: the link reads Edit, then Done.
  const [editing, setEditing] = useState<string | null>(null);
  const itemCount = services.reduce((total, item) => total + (item.quantity ?? 1), 0);

  return (
    <BookingSection title="Services & items" action={<Text style={s.muted}>{itemCount} {itemCount === 1 ? "item" : "items"}</Text>}>
      <ScrollView contentContainerStyle={s.addRow} horizontal showsHorizontalScrollIndicator={false}>
        {ADD_OPTIONS.map(([tab, label]) => (
          <Pressable accessibilityRole="button" key={tab} onPress={() => onAdd(tab)} style={s.add}>
            <Text translate style={s.addText}>+ {label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Text translate style={s.muted}>Assign staff separately for each service, product, package or membership.</Text>
      {!services.length ? (
        <View style={s.empty}>
          <Ionicons name="bag-outline" size={26} color={c.plum} />
          <Text translate style={s.name}>No items added yet</Text>
          <Text translate style={s.muted}>Add a service, product, package or membership.</Text>
        </View>
      ) : null}
      {services.map((item) => {
        const type = types[item.itemKind ?? "service"] ?? types.service;
        const isService = !item.itemKind;
        const quantity = item.quantity ?? 1;
        const staffName = item.staffName || defaultStaffName;
        const time = localItemTime(item.startTime) ?? localItemTime(defaultTime);
        // The pricing totals treat a line discount as per unit, so the row
        // total has to as well, or an edited line reads higher than the booking.
        const lineDiscount = Math.min(Math.max(item.discountAmount ?? 0, 0), Math.max(item.price, 0));
        const lineTotal = Math.max(0, (item.price - lineDiscount) * quantity);
        return (
          <View key={item.id} style={s.lineCard}>
            <View style={[s.lineTop, { backgroundColor: type.bg }]}>
              <Text translate style={[s.tag, { color: type.color }]}>{type.label}</Text>
              <Pressable accessibilityLabel={`Remove ${item.name}`} hitSlop={10} onPress={() => onRemove(item.id)}>
                <Ionicons name="close" size={20} color="#E5484D" />
              </Pressable>
            </View>
            <View style={s.lineBody}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.muted}>
                {formatCurrency(item.price)}{quantity > 1 ? " each" : ""}
                {item.unitSize ? ` · ${item.unitSize}` : ""}
                {isService && item.durationMinutes ? ` · ${formatDurationLabel(item.durationMinutes)}` : ""}
              </Text>
              <View style={s.staffRow}>
                <View style={s.staffField}>
                  <Text translate style={s.label}>Staff{isService ? " *" : ""}</Text>
                  <Pressable
                    accessibilityHint="Assigns staff to this item only"
                    accessibilityLabel={`Select staff for ${item.name}`}
                    accessibilityRole="button"
                    onPress={() => { Keyboard.dismiss(); onPickStaff(item.id); }}
                    style={[s.staffSelect, isService && !staffName && s.staffRequired]}
                  >
                    <Ionicons name="person-outline" size={16} color={c.plum} />
                    <Text numberOfLines={1} style={[s.staffName, !staffName && s.link]}>{staffName || "Select staff"}</Text>
                    <Ionicons name="chevron-down" size={16} color={c.plum} />
                  </Pressable>
                </View>
                <View style={s.timeField}>
                  <Text translate style={s.label}>Time</Text>
                  <Pressable
                    accessibilityLabel={`Select time for ${item.name}`}
                    accessibilityRole="button"
                    onPress={() => { Keyboard.dismiss(); onPickTime(item.id); }}
                    style={s.timeSelect}
                  >
                    <Text numberOfLines={1} style={s.timeText}>{time ? itemTimeLabel(time) : "Time"}</Text>
                    <Ionicons name="chevron-down" size={16} color={c.plum} />
                  </Pressable>
                </View>
              </View>
              <View style={s.row}>
                <View style={s.stepper}>
                  <Pressable accessibilityLabel={`Decrease ${item.name}`} accessibilityRole="button" hitSlop={6} onPress={() => (quantity <= 1 ? onRemove(item.id) : onSetQuantity(item.id, quantity - 1))} style={s.step}>
                    <Ionicons name="remove" size={18} color={c.plum} />
                  </Pressable>
                  <Text style={s.name}>{quantity}</Text>
                  <Pressable accessibilityLabel={`Increase ${item.name}`} accessibilityRole="button" hitSlop={6} onPress={() => onSetQuantity(item.id, quantity + 1)} style={s.step}>
                    <Ionicons name="add" size={18} color={c.plum} />
                  </Pressable>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`${editing === item.id ? "Close" : "Edit"} price and discount for ${item.name}`} onPress={() => setEditing(editing === item.id ? null : item.id)}>
                  <Text translate style={s.link}>{editing === item.id ? "Done" : "Edit"}</Text>
                </Pressable>
                <Text style={s.total}>{formatCurrency(lineTotal)}</Text>
              </View>
              {editing === item.id ? (
                <View style={s.editor}>
                  <View style={s.row}>
                    <FormField
                      label={currencyLabel("Price (₹)")}
                      multiline={false}
                      numeric
                      onChange={(value) => onSetPrice(item.id, parseAmount(value))}
                      value={String(item.price)}
                    />
                    <FormField
                      label={currencyLabel("Discount (₹)")}
                      multiline={false}
                      numeric
                      onChange={(value) => onSetDiscount(item.id, parseAmount(value))}
                      value={String(item.discountAmount ?? 0)}
                    />
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        );
      })}

      {error ? <Text translate style={s.error}>{error}</Text> : null}
    </BookingSection>
  );
}

const c = themedTokens((p) => ({ plum: p.accentDeep }));
const s = themedStyles((p) => ({
  ...legacyStyles,
  muted: { ...legacyStyles.muted, color: p.muted },
  name: { ...legacyStyles.name, color: p.ink },
  label: { ...legacyStyles.label, color: p.ink2 },
  link: { ...legacyStyles.link, color: p.accentDeep },
  total: { ...legacyStyles.total, color: p.ink },
  lineCard: { ...legacyStyles.lineCard, backgroundColor: p.glass, borderColor: p.glassBorder, borderRadius: 18 },
  add: { ...legacyStyles.add, borderRadius: 12, backgroundColor: p.glass, borderColor: p.glassBorder },
  addText: { ...legacyStyles.addText, color: p.accentDeep },
  staffSelect: { ...legacyStyles.staffSelect, borderRadius: 16, backgroundColor: p.glass, borderColor: p.glassBorder },
  timeSelect: { ...legacyStyles.timeSelect, borderRadius: 16, backgroundColor: p.glass, borderColor: p.glassBorder },
}));