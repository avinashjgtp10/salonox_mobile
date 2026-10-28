import { Text } from "@/components/ui/AppTypography";
import type { PickerTab } from "@/features/appointments/components/form/ServiceCatalogPicker";
import type { AppointmentSelectedService } from "@/features/appointments/types/appointmentForm";
import { formatDurationLabel } from "@/features/appointments/utils/appointmentForm";
import { c, s, Section, types } from "@/features/quickSale/components/QuickSaleForm";
import { itemTimeLabel, localItemTime } from "@/features/quickSale/utils/itemTime";
import { formatCurrency } from "@/features/quickSale/utils/money";
import { Ionicons } from "@expo/vector-icons";
import { Keyboard, Pressable, ScrollView, View } from "react-native";

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
  services: AppointmentSelectedService[];
}) {
  const itemCount = services.reduce((total, item) => total + (item.quantity ?? 1), 0);

  return (
    <Section title="Services & items" aside={<Text style={s.muted}>{itemCount} {itemCount === 1 ? "item" : "items"}</Text>}>
      <Text style={s.muted}>Assign staff separately for each service, product, package or membership.</Text>
      {!services.length ? (
        <View style={s.empty}>
          <Ionicons name="bag-outline" size={26} color={c.plum} />
          <Text style={s.name}>No items added yet</Text>
          <Text style={s.muted}>Add a service, product, package or membership.</Text>
        </View>
      ) : null}
      {services.map((item) => {
        const type = types[item.itemKind ?? "service"] ?? types.service;
        const isService = !item.itemKind;
        const quantity = item.quantity ?? 1;
        const staffName = item.staffName || defaultStaffName;
        const time = localItemTime(item.startTime) ?? localItemTime(defaultTime);
        return (
          <View key={item.id} style={s.lineCard}>
            <View style={[s.lineTop, { backgroundColor: type.bg }]}>
              <Text style={[s.tag, { color: type.color }]}>{type.label}</Text>
              <Pressable accessibilityLabel={`Remove ${item.name}`} hitSlop={10} onPress={() => onRemove(item.id)}>
                <Ionicons name="close" size={20} color="#E5484D" />
              </Pressable>
            </View>
            <View style={s.lineBody}>
              <Text style={s.name}>{item.name}</Text>
              <Text style={s.muted}>
                {formatCurrency(item.price)}{quantity > 1 ? " each" : ""}
                {isService && item.durationMinutes ? ` · ${formatDurationLabel(item.durationMinutes)}` : ""}
              </Text>
              <View style={s.staffRow}>
                <View style={s.staffField}>
                  <Text style={s.label}>Staff{isService ? " *" : ""}</Text>
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
                  <Text style={s.label}>Time</Text>
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
                <Text style={s.muted}>{quantity > 1 ? `Qty ${quantity}` : ""}</Text>
                <Text style={s.total}>{formatCurrency(item.price * quantity)}</Text>
              </View>
            </View>
          </View>
        );
      })}
      <ScrollView contentContainerStyle={s.addRow} horizontal showsHorizontalScrollIndicator={false}>
        {ADD_OPTIONS.map(([tab, label]) => (
          <Pressable accessibilityRole="button" key={tab} onPress={() => onAdd(tab)} style={s.add}>
            <Text style={s.addText}>+ {label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </Section>
  );
}
