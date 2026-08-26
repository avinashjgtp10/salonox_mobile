import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { CategorySelectModal } from "@/features/services/components/CategorySelectModal";
import { createProductThunk, fetchBrandsThunk } from "@/middleware/product/product.thunk";
import { fetchConsumablesThunk } from "@/middleware/consumable/consumable.thunk";
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearProductMutationError } from "@/store/product/product.slice";
import { selectServices } from "@/store/service/service.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceCategoryItem } from "@/types/service";

type ProductType = "retail" | "consumable" | "both";

type UnitConversionDraft = {
  conversion: string;
  name: string;
};

const PRODUCT_TYPES: { label: string; value: ProductType }[] = [
  { label: "Retail", value: "retail" },
  { label: "Consumable", value: "consumable" },
  { label: "Both (also sold retail)", value: "both" },
];

const TAX_TYPES = ["No tax", "GST 5%", "GST 12%", "GST 18%"];

const formatDate = (value: Date | null) => {
  if (!value) return "";
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${value.getFullYear()}`;
};

const toIsoDate = (value: Date | null) => {
  if (!value) return undefined;
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
};

const parseNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const messageFrom = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export default function NewConsumableScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const productState = useAppSelector((state) => state.product);
  const services = useAppSelector(selectServices);

  const [barcode, setBarcode] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [hsnSac, setHsnSac] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState("");
  const [name, setName] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [productType, setProductType] = useState<ProductType>("consumable");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplyPrice, setSupplyPrice] = useState("");
  const [taxType, setTaxType] = useState("No tax");
  const [taxTypeOpen, setTaxTypeOpen] = useState(false);
  const [unit, setUnit] = useState("ml");
  const [unitConversions, setUnitConversions] = useState<UnitConversionDraft[]>([]);
  const [unitSize, setUnitSize] = useState("");

  const chosenBrand = productState.brands.find((brand) => brand.id === brandId);
  const isSubmitting = productState.mutationLoading;
  const quantityValue = parseNumber(productQuantity) ?? 0;
  const unitSizeValue = parseNumber(unitSize) ?? 0;
  const availableStock = quantityValue * unitSizeValue;
  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [selectedServiceIds, services],
  );
  const filteredServices = useMemo(() => {
    const trimmed = serviceSearch.trim().toLowerCase();
    if (!trimmed) return [];
    return services
      .filter((service) => service.name.toLowerCase().includes(trimmed))
      .filter((service) => !selectedServiceIds.includes(service.id))
      .slice(0, 5);
  }, [selectedServiceIds, serviceSearch, services]);

  useEffect(() => {
    void dispatch(fetchBrandsThunk(undefined));
    void dispatch(fetchServicesThunk({ limit: 100, offset: 0, reset: true, search: "" }));

    return () => {
      dispatch(clearProductMutationError());
    };
  }, [dispatch]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog" as Href);
  };

  const addUnitConversion = () => {
    setUnitConversions((current) => [...current, { conversion: "", name: "" }]);
  };

  const updateUnitConversion = (index: number, patch: Partial<UnitConversionDraft>) => {
    setUnitConversions((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  };

  const removeUnitConversion = (index: number) => {
    setUnitConversions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const submit = async () => {
    const numericQuantity = parseNumber(productQuantity);
    const numericUnitSize = parseNumber(unitSize);
    const numericLowStock = lowStockAlert.trim() ? parseNumber(lowStockAlert) : 0;
    const numericSupplyPrice = supplyPrice.trim() ? parseNumber(supplyPrice) : 0;

    setFormError(null);

    if (!name.trim()) return setFormError("Product Name is required.");
    if (!selectedCategory) return setFormError("Category is required.");
    if (numericQuantity === null || numericQuantity < 0) return setFormError("Product Quantity is required.");
    if (numericUnitSize === null || numericUnitSize <= 0) return setFormError("Unit Size is required.");
    if (!unit.trim()) return setFormError("Unit is required.");
    if (numericLowStock === null || numericLowStock < 0) return setFormError("Low Stock Alert must be zero or more.");
    if (numericSupplyPrice === null || numericSupplyPrice < 0) return setFormError("Supply Price must be zero or more.");

    const conversions = unitConversions
      .map((item) => ({
        conversion_to_base: parseNumber(item.conversion) ?? 0,
        unit_name: item.name.trim(),
      }))
      .filter((item) => item.unit_name && item.conversion_to_base > 0);

    const action = await dispatch(
      createProductThunk({
        ...(barcode.trim() ? { barcode: barcode.trim(), sku: barcode.trim() } : {}),
        ...(brandId ? { brand_id: brandId } : {}),
        category: selectedCategory.name,
        category_id: selectedCategory.id,
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(toIsoDate(expiryDate) ? { expiry_date: toIsoDate(expiryDate) } : {}),
        ...(hsnSac.trim() ? { hsn_sac: hsnSac.trim() } : {}),
        is_active: true,
        low_stock_threshold: numericLowStock ?? 0,
        measure_unit: unit.trim(),
        name: name.trim(),
        price: numericSupplyPrice ?? 0,
        product_type: productType,
        qty_alert: numericLowStock ?? 0,
        retail_price: productType === "consumable" ? undefined : numericSupplyPrice ?? 0,
        stock_quantity: numericQuantity,
        supply_price: numericSupplyPrice ?? 0,
        ...(supplierName.trim() ? { supplier_name: supplierName.trim() } : {}),
        unit_conversions: conversions,
        bottle_size: numericUnitSize,
      }),
    );

    if (createProductThunk.rejected.match(action)) {
      setFormError(messageFrom(action.payload, "Unable to create consumable."));
      return;
    }

    await dispatch(fetchConsumablesThunk({ page: 1, refresh: true, reset: true }));
    router.replace(`/consumables/${action.payload.product.id}` as Href);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity hitSlop={12} onPress={goBack} style={styles.iconButton}>
            <Ionicons color={Colors.primary} name="arrow-back" size={20} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Consumable</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Section title="Basic Information">
          <Field maxLength={100} label="Product Name *" onChangeText={setName} value={name} />
          <Text style={styles.counter}>{name.length}/100</Text>
          <Field label="Barcode (Optional)" onChangeText={setBarcode} value={barcode} />

          <View style={styles.twoColumn}>
            <SelectField
              label="Category *"
              onPress={() => setCategoryModalOpen(true)}
              placeholder="Search category..."
              value={selectedCategory?.name}
            />
            <SelectField
              label="Brand"
              onPress={() => setBrandModalOpen(true)}
              placeholder="None"
              value={chosenBrand?.name}
            />
          </View>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setCategoryModalOpen(true)}>
            <Text style={styles.inlineLink}>+ Add a category</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setBrandModalOpen(true)}>
            <Text style={styles.inlineLink}>+ Add a brand</Text>
          </TouchableOpacity>

          <SelectField label="Supplier" onPress={() => undefined} placeholder="None" value={supplierName || undefined} />
          <TextInput
            onChangeText={setSupplierName}
            placeholder="+ Add a supplier"
            placeholderTextColor={Colors.primary}
            style={styles.linkInput}
            value={supplierName}
          />
          <Field inputStyle={styles.textArea} label="Description" multiline onChangeText={setDescription} value={description} />

          <Text style={styles.label}>Product Type</Text>
          <View style={styles.segmentRow}>
            {PRODUCT_TYPES.map((item) => (
              <TouchableOpacity
                activeOpacity={0.84}
                key={item.value}
                onPress={() => setProductType(item.value)}
                style={[styles.segment, productType === item.value && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, productType === item.value && styles.segmentTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section emphasized title="Inventory Setup">
          <View style={styles.threeColumn}>
            <Field keyboardType="decimal-pad" label="Product Quantity *" onChangeText={setProductQuantity} value={productQuantity} />
            <Field keyboardType="decimal-pad" label="Unit Size *" onChangeText={setUnitSize} placeholder="e.g. 1000" value={unitSize} />
            <Field label="Unit" onChangeText={setUnit} value={unit} />
          </View>
          <View style={styles.stockPreview}>
            <Text style={styles.stockPreviewText}>
              Total Available Stock: <Text style={styles.bold}>{quantityValue} x {unitSizeValue} {unit} = {availableStock} {unit}</Text>
            </Text>
          </View>
          <Field keyboardType="decimal-pad" label="Low Stock Alert (in bottles/units)" onChangeText={setLowStockAlert} value={lowStockAlert} />
        </Section>

        <Section title="Unit Conversion">
          <Text style={styles.helperText}>
            Display units staff can log usage in (e.g. Bottle, Sachet) - inventory itself always stays in the base unit ({unit}). Only units in the same measurement family as the base unit are allowed (Volume: ml {"<->"} L).
          </Text>
          {unitConversions.map((item, index) => (
            <View key={`unit-${index}`} style={styles.conversionRow}>
              <Field label="Unit name" onChangeText={(value) => updateUnitConversion(index, { name: value })} value={item.name} />
              <Field keyboardType="decimal-pad" label={`In ${unit}`} onChangeText={(value) => updateUnitConversion(index, { conversion: value })} value={item.conversion} />
              <TouchableOpacity onPress={() => removeUnitConversion(index)} style={styles.removeButton}>
                <Ionicons color={Colors.error} name="trash-outline" size={18} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity activeOpacity={0.8} onPress={addUnitConversion}>
            <Text style={styles.inlineLink}>+ Add a unit</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Service Assignment">
          <Text style={styles.helperText}>Assign this product to the services that consume it, with how much each one uses.</Text>
          <Field label="" onChangeText={setServiceSearch} placeholder="Search a service to assign..." value={serviceSearch} />
          {filteredServices.map((service) => (
            <TouchableOpacity
              key={service.id}
              onPress={() => {
                setSelectedServiceIds((current) => [...current, service.id]);
                setServiceSearch("");
              }}
              style={styles.optionRow}
            >
              <Text style={styles.optionText}>{service.name}</Text>
              <Ionicons color={Colors.primary} name="add-circle-outline" size={18} />
            </TouchableOpacity>
          ))}
          {selectedServices.map((service) => (
            <View key={service.id} style={styles.selectedServiceRow}>
              <Text style={styles.selectedServiceText}>{service.name}</Text>
              <TouchableOpacity onPress={() => setSelectedServiceIds((current) => current.filter((id) => id !== service.id))}>
                <Ionicons color={Colors.error} name="close-circle-outline" size={18} />
              </TouchableOpacity>
            </View>
          ))}
        </Section>

        <Section title="Supply Information">
          <View style={styles.twoColumn}>
            <Field keyboardType="decimal-pad" label="Supply Price" onChangeText={setSupplyPrice} value={supplyPrice} />
            <SelectField label="Tax Type" onPress={() => setTaxTypeOpen(true)} value={taxType} />
          </View>
          <Field label="HSN/SAC" onChangeText={setHsnSac} value={hsnSac} />
          <Text style={styles.label}>Expiry Date</Text>
          <TouchableOpacity activeOpacity={0.84} onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <Ionicons color={Colors.heading} name="calendar-outline" size={17} />
            <Text style={[styles.dateText, !expiryDate && styles.placeholder]}>{formatDate(expiryDate) || "dd-mm-yyyy"}</Text>
            <Ionicons color={Colors.text2} name="chevron-down" size={16} />
          </TouchableOpacity>
        </Section>

        <Section title="Inventory Preview">
          <PreviewRow label="Stock" value={String(availableStock)} />
          <PreviewRow label="Average Service Usage" value="No usage data yet" />
          <PreviewRow label="Estimated Services" value={selectedServices.length ? String(selectedServices.length) : "-"} />
          <PreviewRow label="Status" value={availableStock <= 0 ? "Out of Stock" : "In Stock"} warning={availableStock <= 0} />
        </Section>

        {formError ?? productState.mutationError ? (
          <View style={styles.errorBox}>
            <Ionicons color={Colors.error} name="alert-circle-outline" size={18} />
            <Text style={styles.errorText}>{formError ?? productState.mutationError}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <TouchableOpacity activeOpacity={0.84} onPress={goBack} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={() => void submit()} style={[styles.saveButton, isSubmitting && styles.disabled]}>
            {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : null}
            <Text style={styles.saveText}>{isSubmitting ? "Saving..." : "Save"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      <Modal animationType="fade" transparent visible={brandModalOpen} onRequestClose={() => setBrandModalOpen(false)}>
        <Pressable onPress={() => setBrandModalOpen(false)} style={styles.overlay}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Brand</Text>
            <ScrollView style={styles.sheetList}>
              {[{ id: "", name: "None" }, ...productState.brands].map((brand) => (
                <TouchableOpacity
                  key={brand.id || "none"}
                  onPress={() => {
                    setBrandId(brand.id || null);
                    setBrandModalOpen(false);
                  }}
                  style={styles.sheetRow}
                >
                  <Text style={styles.sheetRowText}>{brand.name}</Text>
                  {(brand.id || null) === brandId ? <Ionicons color={Colors.primary} name="checkmark-circle" size={20} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal animationType="fade" transparent visible={taxTypeOpen} onRequestClose={() => setTaxTypeOpen(false)}>
        <Pressable onPress={() => setTaxTypeOpen(false)} style={styles.overlay}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <Text style={styles.sheetTitle}>Tax Type</Text>
            {TAX_TYPES.map((item) => (
              <TouchableOpacity key={item} onPress={() => { setTaxType(item); setTaxTypeOpen(false); }} style={styles.sheetRow}>
                <Text style={styles.sheetRowText}>{item}</Text>
                {taxType === item ? <Ionicons color={Colors.primary} name="checkmark-circle" size={20} /> : null}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {showDatePicker ? (
        <DateTimePicker
          mode="date"
          onChange={(_event, date) => {
            if (Platform.OS !== "ios") setShowDatePicker(false);
            if (date) setExpiryDate(date);
          }}
          value={expiryDate ?? new Date()}
        />
      ) : null}

      <CategorySelectModal
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={setSelectedCategory}
        selectedCategoryId={selectedCategory?.id}
        type="product"
        visible={categoryModalOpen}
      />
    </SafeAreaView>
  );
}

function Section({
  children,
  emphasized,
  title,
}: {
  children: React.ReactNode;
  emphasized?: boolean;
  title: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={[styles.section, emphasized && styles.sectionEmphasized]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  inputStyle,
  label,
  ...props
}: React.ComponentProps<typeof TextInput> & { inputStyle?: object; label: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...props}
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, props.multiline && styles.multilineInput, inputStyle]}
      />
    </View>
  );
}

function SelectField({
  label,
  onPress,
  placeholder,
  value,
}: {
  label: string;
  onPress: () => void;
  placeholder?: string;
  value?: string;
}) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectInput}>
        <Text numberOfLines={1} style={[styles.selectText, !value && styles.placeholder]}>{value || placeholder || "None"}</Text>
        <Ionicons color={Colors.text2} name="chevron-down" size={16} />
      </View>
    </TouchableOpacity>
  );
}

function PreviewRow({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.previewRow}>
      <Text style={styles.previewLabel}>{label}</Text>
      <Text style={[styles.previewValue, warning && styles.previewWarning]}>{value}</Text>
    </View>
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { backgroundColor: Colors.bg, flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: AppLayout.contentBottomPadding },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.lg },
  iconButton: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, height: AppLayout.headerActionSize, justifyContent: "center", width: AppLayout.headerActionSize },
  headerTitle: { color: Colors.heading, fontSize: 24, fontWeight: "800" },
  headerSpacer: { width: AppLayout.headerActionSize },
  section: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, marginBottom: Spacing.lg, padding: Spacing.lg },
  sectionEmphasized: { borderColor: Colors.heading },
  sectionTitle: { color: Colors.heading, fontSize: 17, fontWeight: "800", marginBottom: Spacing.md },
  field: { flex: 1, marginBottom: Spacing.md },
  label: { color: Colors.text2, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  input: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, color: Colors.heading, fontSize: 15, minHeight: 48, paddingHorizontal: 13, paddingVertical: 10 },
  multilineInput: { minHeight: 96, textAlignVertical: "top" },
  textArea: { minHeight: 96 },
  counter: { alignSelf: "flex-end", color: Colors.text2, fontSize: 12, marginBottom: Spacing.md, marginTop: -Spacing.sm },
  twoColumn: { flexDirection: "row", gap: Spacing.md },
  threeColumn: { flexDirection: "row", gap: Spacing.sm },
  selectInput: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", minHeight: 48, paddingHorizontal: 13 },
  selectText: { color: Colors.heading, flex: 1, fontSize: 15 },
  placeholder: { color: Colors.placeholder },
  inlineLink: { color: Colors.primary, fontSize: 14, fontWeight: "800", marginBottom: Spacing.md },
  linkInput: { color: Colors.heading, fontSize: 15, fontWeight: "700", marginBottom: Spacing.lg, minHeight: 42 },
  segmentRow: { flexDirection: "row", gap: Spacing.sm },
  segment: { alignItems: "center", borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48, paddingHorizontal: 8 },
  segmentActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  segmentText: { color: Colors.heading, fontSize: 13, fontWeight: "800", textAlign: "center" },
  segmentTextActive: { color: "#FFFFFF" },
  stockPreview: { backgroundColor: Colors.bg2, borderRadius: 8, marginBottom: Spacing.md, padding: Spacing.md },
  stockPreviewText: { color: Colors.heading, fontSize: 14 },
  bold: { fontWeight: "800" },
  helperText: { color: Colors.text2, fontSize: 14, lineHeight: 21, marginBottom: Spacing.md },
  conversionRow: { alignItems: "flex-end", flexDirection: "row", gap: Spacing.sm },
  removeButton: { alignItems: "center", height: 48, justifyContent: "center", marginBottom: Spacing.md, width: 34 },
  optionRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 46 },
  optionText: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  selectedServiceRow: { alignItems: "center", backgroundColor: Colors.bg2, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", marginTop: 8, padding: Spacing.md },
  selectedServiceText: { color: Colors.heading, flex: 1, fontSize: 14, fontWeight: "700" },
  dateButton: { alignItems: "center", alignSelf: "flex-start", borderColor: Colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 46, paddingHorizontal: 13 },
  dateText: { color: Colors.heading, fontSize: 14 },
  previewRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  previewLabel: { color: Colors.text2, fontSize: 14 },
  previewValue: { color: Colors.heading, fontSize: 14, fontWeight: "800", maxWidth: "55%", textAlign: "right" },
  previewWarning: { backgroundColor: Colors.errorBg, borderRadius: 14, color: Colors.error, overflow: "hidden", paddingHorizontal: 12, paddingVertical: 5 },
  errorBox: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: 8, flexDirection: "row", gap: 8, marginBottom: Spacing.md, padding: Spacing.md },
  errorText: { color: Colors.error, flex: 1, fontSize: 13, fontWeight: "700" },
  footer: { flexDirection: "row", gap: Spacing.md },
  cancelButton: { alignItems: "center", borderColor: Colors.primary, borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 50, justifyContent: "center" },
  cancelText: { color: Colors.primary, fontSize: 14, fontWeight: "800" },
  saveButton: { alignItems: "center", backgroundColor: Colors.primaryDark, borderRadius: 8, flex: 1, flexDirection: "row", gap: 8, minHeight: 50, justifyContent: "center" },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.7 },
  overlay: { alignItems: "center", backgroundColor: "rgba(15,23,32,0.35)", flex: 1, justifyContent: "center", padding: Spacing.lg },
  sheet: { backgroundColor: Colors.card, borderRadius: 8, maxHeight: "70%", padding: Spacing.lg, width: "100%" },
  sheetTitle: { color: Colors.heading, fontSize: 18, fontWeight: "800", marginBottom: Spacing.md },
  sheetList: { maxHeight: 360 },
  sheetRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 50 },
  sheetRowText: { color: Colors.heading, fontSize: 15, fontWeight: "700" },
});
