import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, type Href } from "expo-router";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import {
  createProductThunk,
  fetchBrandsThunk,
  fetchProductByIdThunk,
  fetchProductsThunk,
  updateProductThunk,
} from "@/middleware/product/product.thunk";
import { fetchServicesThunk } from "@/middleware/service/service.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearProductMutationError, selectProductById } from "@/store/product/product.slice";
import { selectServices } from "@/store/service/service.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceCategoryItem } from "@/types/service";
import { useValidationScroll } from "@/hooks/useValidationScroll";

type Props = { id?: string; mode: "create" | "edit" };
type ProductType = "retail" | "consumable" | "both";
type UnitConversionDraft = { conversion: string; name: string };
type ProductField = "category" | "lowStockAlert" | "name" | "productQuantity" | "retailPrice" | "stockQuantity" | "supplyPrice" | "unit" | "unitSize";
type ProductFieldErrors = Partial<Record<ProductField, string>>;
const VALIDATION_FIELD_ORDER: ProductField[] = [
  "name",
  "category",
  "stockQuantity",
  "productQuantity",
  "unitSize",
  "unit",
  "lowStockAlert",
  "supplyPrice",
  "retailPrice",
];

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
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const messageFrom = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

const getTaxRate = (taxType: string) => {
  const match = taxType.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export default function ProductFormScreen({ id, mode }: Props) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const product = useAppSelector(selectProductById(id ?? ""));
  const productState = useAppSelector((root) => root.product);
  const services = useAppSelector(selectServices);
  const prefilled = useRef(false);
  const { scrollToFirstError, scrollViewRef, setFieldRef } = useValidationScroll(VALIDATION_FIELD_ORDER);

  const [barcode, setBarcode] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [legacyCategoryName, setLegacyCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [hsnSac, setHsnSac] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [lowStockAlert, setLowStockAlert] = useState("");
  const [name, setName] = useState("");
  const [productQuantity, setProductQuantity] = useState("");
  const [productType, setProductType] = useState<ProductType>("retail");
  const [remark, setRemark] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [serviceSearch, setServiceSearch] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [stockQuantity, setStockQuantity] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplyPrice, setSupplyPrice] = useState("");
  const [taxGroup, setTaxGroup] = useState("");
  const [taxType, setTaxType] = useState("No tax");
  const [taxTypeOpen, setTaxTypeOpen] = useState(false);
  const [unit, setUnit] = useState("ml");
  const [unitConversions, setUnitConversions] = useState<UnitConversionDraft[]>([]);
  const [unitSize, setUnitSize] = useState("");

  const liveProduct = product ?? (productState.currentProduct?.id === id ? productState.currentProduct : null);
  const chosenBrand = productState.brands.find((brand) => brand.id === brandId);
  const isSubmitting = productState.mutationLoading;
  const title = mode === "create" ? "Add Product" : "Edit Product";
  const isRetail = productType === "retail";
  const hasRetailSale = productType === "retail" || productType === "both";
  const hasConsumableInventory = productType === "consumable" || productType === "both";
  const quantityValue = parseNumber(productQuantity) ?? 0;
  const unitSizeValue = parseNumber(unitSize) ?? 0;
  const retailStockValue = parseNumber(stockQuantity) ?? 0;
  const availableStock = hasConsumableInventory ? quantityValue * unitSizeValue : retailStockValue;
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
    if (mode === "edit" && id) void dispatch(fetchProductByIdThunk(id));
    return () => {
      dispatch(clearProductMutationError());
    };
  }, [dispatch, id, mode]);

  useEffect(() => {
    if (mode !== "edit" || !liveProduct || prefilled.current) return;
    setBarcode(liveProduct.sku ?? "");
    setBrandId(liveProduct.brandId);
    setSelectedCategory(liveProduct.categoryId && liveProduct.category ? { id: liveProduct.categoryId, name: liveProduct.category } : null);
    setLegacyCategoryName(liveProduct.category ?? "");
    setDescription(liveProduct.description ?? "");
    setLowStockAlert(String(liveProduct.lowStockThreshold));
    setName(liveProduct.name);
    setProductQuantity(String(liveProduct.stockQuantity));
    setProductType((liveProduct.productType as ProductType) || "retail");
    setRetailPrice(String(liveProduct.retailPrice ?? liveProduct.price));
    setStockQuantity(String(liveProduct.stockQuantity));
    setSupplyPrice(String(liveProduct.supplyPrice ?? ""));
    setUnit(liveProduct.measureUnit ?? "ml");
    setUnitSize(liveProduct.bottleSize ? String(liveProduct.bottleSize) : "");
    prefilled.current = true;
  }, [liveProduct, mode]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/stock" as Href);
  };

  const addUnitConversion = () => {
    setUnitConversions((current) => [...current, { conversion: "", name: "" }]);
  };

  const updateUnitConversion = (index: number, patch: Partial<UnitConversionDraft>) => {
    setUnitConversions((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const removeUnitConversion = (index: number) => {
    setUnitConversions((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateField = (field: ProductField, value: string, setter: (nextValue: string) => void) => {
    setter(value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const numericRetailPrice = parseNumber(retailPrice);
    const numericStockQuantity = parseNumber(stockQuantity);
    const numericProductQuantity = parseNumber(productQuantity);
    const numericUnitSize = parseNumber(unitSize);
    const numericLowStock = lowStockAlert.trim() ? parseNumber(lowStockAlert) : 0;
    const numericSupplyPrice = supplyPrice.trim() ? parseNumber(supplyPrice) : 0;
    const categoryName = selectedCategory?.name ?? legacyCategoryName.trim();
    const categoryId = selectedCategory?.id ?? liveProduct?.categoryId ?? "";

    setFormError(null);

    const nextErrors: ProductFieldErrors = {};
    if (!name.trim()) nextErrors.name = "Product Name is required.";
    else if (name.trim().length > 100) nextErrors.name = "Product Name must be 100 characters or less.";
    if (!categoryName) nextErrors.category = "Category is required.";
    if (isRetail && (numericStockQuantity === null || numericStockQuantity < 0)) {
      nextErrors.stockQuantity = "Stock Quantity is required.";
    }
    if (hasConsumableInventory && (numericProductQuantity === null || numericProductQuantity < 0)) {
      nextErrors.productQuantity = "Product Quantity is required.";
    }
    if (hasConsumableInventory && (numericUnitSize === null || numericUnitSize <= 0)) {
      nextErrors.unitSize = "Unit Size is required.";
    }
    if (hasConsumableInventory && !unit.trim()) nextErrors.unit = "Unit is required.";
    if (numericLowStock === null || numericLowStock < 0) nextErrors.lowStockAlert = "Low Stock Alert must be zero or more.";
    if (numericSupplyPrice === null || numericSupplyPrice < 0) nextErrors.supplyPrice = "Supply Price must be zero or more.";
    if (hasRetailSale && (numericRetailPrice === null || numericRetailPrice < 0)) {
      nextErrors.retailPrice = "Retail Price is required.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstError(nextErrors);
      return;
    }

    const conversions = unitConversions
      .map((item) => ({ conversion_to_base: parseNumber(item.conversion) ?? 0, unit_name: item.name.trim() }))
      .filter((item) => item.unit_name && item.conversion_to_base > 0);
    const stockForPayload = hasConsumableInventory ? numericProductQuantity ?? 0 : numericStockQuantity ?? 0;
    const priceForPayload = hasRetailSale ? numericRetailPrice ?? 0 : numericSupplyPrice ?? 0;
    const expiry = toIsoDate(expiryDate);
    const data = {
      ...(barcode.trim() ? { barcode: barcode.trim(), sku: barcode.trim() } : {}),
      ...(brandId ? { brand_id: brandId } : {}),
      category: categoryName,
      ...(categoryId ? { category_id: categoryId } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(expiry ? { expiry_date: expiry } : {}),
      ...(hsnSac.trim() ? { hsn_sac: hsnSac.trim() } : {}),
      is_active: true,
      ...(lotNumber.trim() ? { lot_number: lotNumber.trim() } : {}),
      low_stock_threshold: numericLowStock ?? 0,
      ...(hasConsumableInventory ? { measure_unit: unit.trim() } : {}),
      name: name.trim(),
      price: priceForPayload,
      product_type: productType,
      qty_alert: numericLowStock ?? 0,
      ...(remark.trim() ? { remark: remark.trim() } : {}),
      ...(hasRetailSale ? { retail_price: numericRetailPrice ?? 0 } : {}),
      stock_quantity: stockForPayload,
      ...(numericSupplyPrice !== null ? { supply_price: numericSupplyPrice } : {}),
      ...(supplierName.trim() ? { supplier_name: supplierName.trim() } : {}),
      ...(taxGroup.trim() ? { tax_group: taxGroup.trim() } : {}),
      tax_rate: getTaxRate(taxType),
      tax_type: taxType,
      ...(conversions.length ? { unit_conversions: conversions } : {}),
      ...(hasConsumableInventory ? { bottle_size: numericUnitSize ?? 0 } : {}),
    };
    const action = mode === "create"
      ? await dispatch(createProductThunk(data))
      : await dispatch(updateProductThunk({ data, id: id ?? "" }));

    if (createProductThunk.rejected.match(action) || updateProductThunk.rejected.match(action)) {
      setFormError(messageFrom(action.payload, `Unable to ${mode === "create" ? "create" : "update"} product.`));
      return;
    }

    await dispatch(fetchProductsThunk({ offset: 0, reset: true }));
    const productId = "product" in action.payload ? action.payload.product.id : id;
    router.replace((productId ? `/stock/${productId}` : "/stock") as Href);
  };

  if (mode === "edit" && productState.detailsLoading && !liveProduct) {
    return <LoadingScreen title={title} onBack={goBack} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={0} style={styles.keyboardAvoidingView}>
        <KeyboardAwareScrollView ref={scrollViewRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity activeOpacity={0.84} onPress={goBack} style={styles.headerCloseButton}>
                <Text style={styles.headerCloseText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={() => void submit()} style={[styles.headerSaveButton, isSubmitting && styles.disabled]}>
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text style={styles.headerSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {productState.detailsError && mode === "edit" && !liveProduct ? (
            <ErrorNotice message={productState.detailsError} />
          ) : (
            <>
            <Section title="Basic Information">
              <Field ref={(input) => setFieldRef("name", input)} error={fieldErrors.name} maxLength={100} label="Product Name *" onChangeText={(value) => updateField("name", value, setName)} value={name} />
              <Text style={styles.counter}>{name.length}/100</Text>
              <Field label="Barcode (Optional)" onChangeText={setBarcode} value={barcode} />

              <View style={styles.twoColumn}>
                <View ref={(view) => setFieldRef("category", view)} style={styles.flexField}>
                  <SelectField
                    error={fieldErrors.category}
                    label="Category *"
                    onPress={() => setCategoryModalOpen(true)}
                    placeholder="Search category..."
                    value={selectedCategory?.name ?? legacyCategoryName}
                  />
                </View>
                <SelectField label="Brand" onPress={() => setBrandModalOpen(true)} placeholder="None" value={chosenBrand?.name} />
              </View>
              <View style={styles.inlineLinkRow}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setCategoryModalOpen(true)} style={styles.inlineLinkCell}>
                  <Text style={styles.inlineLink}>+ Add a category</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setBrandModalOpen(true)} style={styles.inlineLinkCell}>
                  <Text style={styles.inlineLink}>+ Add a brand</Text>
                </TouchableOpacity>
              </View>

              <SelectField label="Supplier" onPress={() => undefined} placeholder="None" value={supplierName || undefined} />
              <TextInput
                onChangeText={setSupplierName}
                placeholder="+ Add a supplier"
                placeholderTextColor={Colors.primary}
                style={styles.linkInput}
                value={supplierName}
              />
              <Field inputStyle={styles.textArea} label="Description" multiline onChangeText={setDescription} value={description} />
              <Field inputStyle={styles.remarkArea} label="Remark" multiline onChangeText={setRemark} value={remark} />

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
              {hasConsumableInventory ? (
                <>
                  <View style={styles.threeColumn}>
                    <Field ref={(input) => setFieldRef("productQuantity", input)} error={fieldErrors.productQuantity} keyboardType="decimal-pad" label="Product Quantity *" onChangeText={(value) => updateField("productQuantity", value, setProductQuantity)} value={productQuantity} />
                    <Field ref={(input) => setFieldRef("unitSize", input)} error={fieldErrors.unitSize} keyboardType="decimal-pad" label="Unit Size *" onChangeText={(value) => updateField("unitSize", value, setUnitSize)} placeholder="e.g. 1000" value={unitSize} />
                    <Field ref={(input) => setFieldRef("unit", input)} error={fieldErrors.unit} label="Unit" onChangeText={(value) => updateField("unit", value, setUnit)} value={unit} />
                  </View>
                  <View style={styles.stockPreview}>
                    <Text style={styles.stockPreviewText}>
                      Total Available Stock: <Text style={styles.bold}>{quantityValue} x {unitSizeValue} {unit} = {availableStock} {unit}</Text>
                    </Text>
                  </View>
                  <Field ref={(input) => setFieldRef("lowStockAlert", input)} error={fieldErrors.lowStockAlert} keyboardType="decimal-pad" label="Low Stock Alert (in bottles/units)" onChangeText={(value) => updateField("lowStockAlert", value, setLowStockAlert)} value={lowStockAlert} />
                  <Field label="Lot Number" onChangeText={setLotNumber} value={lotNumber} />
                </>
              ) : (
                <>
                  <Field ref={(input) => setFieldRef("stockQuantity", input)} error={fieldErrors.stockQuantity} keyboardType="decimal-pad" label="Stock Quantity *" onChangeText={(value) => updateField("stockQuantity", value, setStockQuantity)} value={stockQuantity} />
                  <Field ref={(input) => setFieldRef("lowStockAlert", input)} error={fieldErrors.lowStockAlert} keyboardType="decimal-pad" label="Low Stock Alert" onChangeText={(value) => updateField("lowStockAlert", value, setLowStockAlert)} value={lowStockAlert} />
                  <Field label="Lot Number" onChangeText={setLotNumber} value={lotNumber} />
                </>
              )}
            </Section>

            {hasConsumableInventory ? (
              <>
                <Section title="Unit Conversion">
                  <Text style={styles.helperText}>
                    Display units staff can log usage in (e.g. Bottle, Sachet) - inventory itself always stays in the base unit ({unit}) above. Only units in the same measurement family as the base unit are allowed (Volume: ml {"<->"} L).
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
                      <TouchableOpacity onPress={() => setSelectedServiceIds((current) => current.filter((serviceId) => serviceId !== service.id))}>
                        <Ionicons color={Colors.error} name="close-circle-outline" size={18} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </Section>
              </>
            ) : null}

            <Section title="Supply Information">
              <View style={styles.twoColumn}>
                <Field ref={(input) => setFieldRef("supplyPrice", input)} error={fieldErrors.supplyPrice} keyboardType="decimal-pad" label="Supply Price" onChangeText={(value) => updateField("supplyPrice", value, setSupplyPrice)} value={supplyPrice} />
                <SelectField label="Tax Type" onPress={() => setTaxTypeOpen(true)} value={taxType} />
              </View>
              <Field label="Tax Group" onChangeText={setTaxGroup} value={taxGroup} />
              <Field label="HSN/SAC" onChangeText={setHsnSac} value={hsnSac} />
              <Text style={styles.label}>Expiry Date</Text>
              <TouchableOpacity activeOpacity={0.84} onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <Ionicons color={Colors.heading} name="calendar-outline" size={17} />
                <Text style={[styles.dateText, !expiryDate && styles.placeholder]}>{formatDate(expiryDate) || "dd-mm-yyyy"}</Text>
                <Ionicons color={Colors.text2} name="chevron-down" size={16} />
              </TouchableOpacity>
              {hasRetailSale ? <Field ref={(input) => setFieldRef("retailPrice", input)} error={fieldErrors.retailPrice} keyboardType="decimal-pad" label="Retail Price *" onChangeText={(value) => updateField("retailPrice", value, setRetailPrice)} value={retailPrice} /> : null}
            </Section>

            {hasConsumableInventory ? (
              <Section title="Inventory Preview">
                <PreviewRow label="Stock" value={String(availableStock)} />
                <PreviewRow label="Average Service Usage" value="No usage data yet" />
                <PreviewRow label="Estimated Services" value={selectedServices.length ? String(selectedServices.length) : "-"} />
                <PreviewRow label="Status" value={availableStock <= 0 ? "Out of Stock" : "In Stock"} warning={availableStock <= 0} />
              </Section>
            ) : null}

            {formError ?? productState.mutationError ? <ErrorNotice message={formError ?? productState.mutationError ?? ""} /> : null}

            <View style={styles.footer}>
              <TouchableOpacity activeOpacity={0.84} onPress={goBack} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={() => void submit()} style={[styles.saveButton, isSubmitting && styles.disabled]}>
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text style={styles.saveText}>{isSubmitting ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
            </>
          )}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

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
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setLegacyCategoryName("");
          setFieldErrors((current) => ({ ...current, category: undefined }));
        }}
        selectedCategoryId={selectedCategory?.id}
        type="product"
        visible={categoryModalOpen}
      />
    </SafeAreaView>
  );
}

function LoadingScreen({ onBack, title }: { onBack: () => void; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <AppStatusBar />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity activeOpacity={0.84} onPress={onBack} style={styles.headerCloseButton}>
            <Text style={styles.headerCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </View>
    </SafeAreaView>
  );
}

function ErrorNotice({ message }: { message: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.errorBox}>
      <Ionicons color={Colors.error} name="alert-circle-outline" size={18} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

function Section({ children, emphasized, title }: { children: React.ReactNode; emphasized?: boolean; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={[styles.section, emphasized && styles.sectionEmphasized]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const Field = forwardRef<TextInput, React.ComponentProps<typeof TextInput> & { error?: string; inputStyle?: object; label: string }>(function Field({ error, inputStyle, label, ...props }, ref) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <View style={styles.field}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        {...props}
        placeholderTextColor={Colors.placeholder}
        style={[styles.input, props.multiline && styles.multilineInput, error && styles.inputError, inputStyle]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
});

function SelectField({ error, label, onPress, placeholder, value }: { error?: string; label: string; onPress: () => void; placeholder?: string; value?: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.selectInput, error && styles.inputError]}>
        <Text numberOfLines={1} style={[styles.selectText, !value && styles.placeholder]}>{value || placeholder || "None"}</Text>
        <Ionicons color={Colors.text2} name="chevron-down" size={16} />
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
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
  keyboardAvoidingView: { flex: 1 },
  content: { padding: Spacing.lg, paddingBottom: AppLayout.contentBottomPadding },
  header: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: -Spacing.lg,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.xl,
    minHeight: 74,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: { color: Colors.heading, flex: 1, fontSize: 21, fontWeight: "800" },
  headerActions: { alignItems: "center", flexDirection: "row", gap: Spacing.sm },
  headerCloseButton: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: AppRadius.pill,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 20,
  },
  headerCloseText: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  headerSaveButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: AppRadius.pill,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 24,
  },
  headerSaveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  section: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  sectionEmphasized: { borderColor: Colors.heading },
  sectionTitle: { color: Colors.heading, fontSize: 17, fontWeight: "800", marginBottom: Spacing.md },
  field: { flex: 1, marginBottom: Spacing.md },
  flexField: { flex: 1 },
  label: { color: Colors.text2, fontSize: 13, fontWeight: "700", marginBottom: 8 },
  input: {
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: Colors.heading,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  inputError: { borderColor: Colors.error, borderWidth: 1.5 },
  fieldError: { color: Colors.error, fontSize: 12, fontWeight: "700", marginTop: 6 },
  multilineInput: { minHeight: 96, textAlignVertical: "top" },
  textArea: { minHeight: 96 },
  remarkArea: { minHeight: 72 },
  counter: { alignSelf: "flex-end", color: Colors.text2, fontSize: 12, marginBottom: Spacing.md, marginTop: -Spacing.sm },
  twoColumn: { flexDirection: "row", gap: Spacing.md },
  threeColumn: { flexDirection: "row", gap: Spacing.sm },
  inlineLinkRow: { flexDirection: "row", gap: Spacing.md },
  inlineLinkCell: { flex: 1 },
  inlineLink: { color: Colors.primary, fontSize: 14, fontWeight: "800", marginBottom: Spacing.md },
  linkInput: { color: Colors.heading, fontSize: 15, fontWeight: "700", marginBottom: Spacing.lg, minHeight: 42 },
  selectInput: {
    alignItems: "center",
    backgroundColor: Colors.card,
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 13,
  },
  selectText: { color: Colors.heading, flex: 1, fontSize: 15 },
  placeholder: { color: Colors.placeholder },
  segmentRow: { flexDirection: "row", gap: Spacing.sm },
  segment: {
    alignItems: "center",
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 8,
  },
  segmentActive: { backgroundColor: Colors.primaryDark, borderColor: Colors.primaryDark },
  segmentText: { color: Colors.heading, fontSize: 13, fontWeight: "800", textAlign: "center" },
  segmentTextActive: { color: "#FFFFFF" },
  stockPreview: { backgroundColor: Colors.bg2, borderRadius: 8, marginBottom: Spacing.md, padding: Spacing.md },
  stockPreviewText: { color: Colors.heading, fontSize: 14 },
  bold: { fontWeight: "800" },
  helperText: { color: Colors.text2, fontSize: 14, lineHeight: 21, marginBottom: Spacing.md },
  conversionRow: { alignItems: "flex-end", flexDirection: "row", gap: Spacing.sm },
  removeButton: { alignItems: "center", height: 48, justifyContent: "center", marginBottom: Spacing.md, width: 34 },
  optionRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46,
  },
  optionText: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  selectedServiceRow: {
    alignItems: "center",
    backgroundColor: Colors.bg2,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    padding: Spacing.md,
  },
  selectedServiceText: { color: Colors.heading, flex: 1, fontSize: 14, fontWeight: "700" },
  dateButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderColor: Colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  dateText: { color: Colors.heading, fontSize: 14 },
  previewRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingVertical: 8 },
  previewLabel: { color: Colors.text2, fontSize: 14 },
  previewValue: { color: Colors.heading, fontSize: 14, fontWeight: "800", maxWidth: "55%", textAlign: "right" },
  previewWarning: {
    backgroundColor: Colors.errorBg,
    borderRadius: 14,
    color: Colors.error,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  errorBox: {
    alignItems: "center",
    backgroundColor: Colors.errorBg,
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  errorText: { color: Colors.error, flex: 1, fontSize: 13, fontWeight: "700" },
  footer: { flexDirection: "row", gap: Spacing.md },
  cancelButton: {
    alignItems: "center",
    borderColor: Colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  cancelText: { color: Colors.primary, fontSize: 14, fontWeight: "800" },
  saveButton: {
    alignItems: "center",
    backgroundColor: Colors.primaryDark,
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.7 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 300 },
  overlay: { alignItems: "center", backgroundColor: "rgba(15,23,32,0.35)", flex: 1, justifyContent: "center", padding: Spacing.lg },
  sheet: { backgroundColor: Colors.card, borderRadius: 8, maxHeight: "70%", padding: Spacing.lg, width: "100%" },
  sheetTitle: { color: Colors.heading, fontSize: 18, fontWeight: "800", marginBottom: Spacing.md },
  sheetList: { maxHeight: 360 },
  sheetRow: {
    alignItems: "center",
    borderBottomColor: Colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 50,
  },
  sheetRowText: { color: Colors.heading, fontSize: 15, fontWeight: "700" },
});
