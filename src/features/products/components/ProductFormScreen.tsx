import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, type Href } from "expo-router";
import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { CategorySelectModal } from "@/features/services/components/CategorySelectModal";
import {
  createBrandThunk,
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
import { formatAppDate } from "@/utils/dateTime";
import type { ServiceCategoryItem } from "@/types/service";
import type { RecognizedProduct } from "@/types/productAudit";
import { useValidationScroll } from "@/hooks/useValidationScroll";
import { SupplierSelectModal } from "./SupplierSelectModal";
import { selectCurrentUser } from "@/store/user/user.slice";
import { hasInventoryPermission } from "@/utils/permissions";
import { getApiErrorMessage } from "@/services/api";
import { consumableService } from "@/services/consumable.service";
import { serviceService } from "@/services/service.service";
import { productFormInventory } from "../utils/productFormInventory";
import { productTaxCode } from "@/utils/productTax";

type Props = { id?: string; mode: "create" | "edit"; scannerDraft?: Partial<RecognizedProduct>; onCreated?: (productId: string, physicalQuantity: number) => void };
type ProductType = "retail" | "consumable" | "both";
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
  { label: "Both", value: "both" },
];

const TAX_TYPES = [{label: "No tax", value: "no_tax"}, {label: "GST 5%", value: "gst_5"}, {label: "GST 12%", value: "gst_12"}, {label: "GST 18%", value: "gst_18"}, {label: "GST 28%", value: "gst_28"}];
const MEASURE_UNITS = ["ml", "l", "g", "kg", "pcs", "oz", "lb", "bottle", "tube", "pack", "box", "roll"];

const formatDate = (value: Date | null) => (value ? formatAppDate(value) : "");

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

export default function ProductFormScreen({ id, mode, scannerDraft, onCreated }: Props) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const canCreateSupplier = hasInventoryPermission(user, "create_suppliers");
  const saveLock = useRef(false);
  const createdProductId = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const originalAssignedIds = useRef<string[]>([]);
  const [serviceQuantities, setServiceQuantities] = useState<Record<string, string>>({});
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentRetry, setAssignmentRetry] = useState(0);
  const [newBrandName, setNewBrandName] = useState("");
  const [brandError, setBrandError] = useState("");
  const [brandSaving, setBrandSaving] = useState(false);
  const product = useAppSelector(selectProductById(id ?? ""));
  const productState = useAppSelector((root) => root.product);
  const services = useAppSelector(selectServices);
  const prefilled = useRef(false);
  const scannerBrandPrefilled = useRef(false);
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
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierCreateMode, setSupplierCreateMode] = useState(false);
  const [supplyPrice, setSupplyPrice] = useState("");
  const [taxGroup, setTaxGroup] = useState("");
  const [taxType, setTaxType] = useState("no_tax");
  const [taxTypeOpen, setTaxTypeOpen] = useState(false);
  const [unit, setUnit] = useState("ml");
  const [unitSize, setUnitSize] = useState("");

  useEffect(() => {
    if (mode !== "create" || !scannerDraft || prefilled.current) return;
    prefilled.current = true;
    const productName = scannerDraft.name ?? "";
    const variant = scannerDraft.variant?.trim();
    setName([productName, variant && !productName.toLowerCase().includes(variant.toLowerCase()) ? variant : null].filter(Boolean).join(" ").slice(0, 100));
    setBarcode(scannerDraft.barcode ?? "");
    setDescription([scannerDraft.description, scannerDraft.brand ? `Brand: ${scannerDraft.brand}` : null, scannerDraft.size ? `Pack size: ${scannerDraft.size}` : null].filter(Boolean).join("\n"));
    if (scannerDraft.measure_unit && scannerDraft.bottle_size) {
      setUnit(scannerDraft.measure_unit); setUnitSize(String(scannerDraft.bottle_size));
    }
    // New catalog records start with zero stock; physical stock comes through
    // the audit's existing approval/reconciliation workflow.
    setStockQuantity("0"); setProductQuantity("0"); setLowStockAlert("0");
  }, [mode, scannerDraft]);

  useEffect(() => {
    if (mode === "create" && scannerDraft?.brand && !brandId && !scannerBrandPrefilled.current) {
      const matching = productState.brands.find(b => b.name.trim().toLowerCase() === scannerDraft.brand?.trim().toLowerCase());
      if (matching) { scannerBrandPrefilled.current = true; setBrandId(matching.id); }
    }
  }, [mode, scannerDraft, productState.brands, brandId]);

  const liveProduct = product ?? (productState.currentProduct?.id === id ? productState.currentProduct : null);
  const chosenBrand = productState.brands.find((brand) => brand.id === brandId);
  const isSubmitting = saving || productState.mutationLoading;
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
    setProductQuantity(String(liveProduct.bottleSize ? liveProduct.stockQuantity / liveProduct.bottleSize : liveProduct.stockQuantity));
    setProductType((liveProduct.productType as ProductType) || "retail");
    setRetailPrice(String(liveProduct.retailPrice ?? liveProduct.price));
    setStockQuantity(String(liveProduct.stockQuantity));
    setSupplyPrice(String(liveProduct.supplyPrice ?? ""));
    setSupplierId(liveProduct.supplierId ?? null);
    setSupplierName(liveProduct.supplierName ?? "");
    setTaxType(liveProduct.taxType ?? "no_tax");
    setTaxGroup(liveProduct.taxGroup ?? "");
    setHsnSac(liveProduct.hsnSac ?? "");
    setLotNumber(liveProduct.lotNumber ?? "");
    setRemark(liveProduct.remark ?? "");
    setExpiryDate(liveProduct.expiryDate ? new Date(`${liveProduct.expiryDate.slice(0, 10)}T12:00:00`) : null);
    setUnit(liveProduct.measureUnit ?? "ml");
    setUnitSize(liveProduct.bottleSize ? String(liveProduct.bottleSize) : "");
    prefilled.current = true;
  }, [liveProduct, mode]);

  const editingConsumable = mode === "edit" && !!liveProduct && liveProduct.productType !== "retail";
  useEffect(() => {
    if (!editingConsumable || !id) return;
    let active = true;
    setAssignmentsLoading(true);
    consumableService.getAssignedServices(id).then((rows) => {
      if (!active) return;
      originalAssignedIds.current = rows.map((row) => row.serviceId);
      setSelectedServiceIds(originalAssignedIds.current);
      setServiceQuantities(Object.fromEntries(rows.map((row) => [row.serviceId, String(row.qty)])));
      setAssignmentError(null);
    }).catch((error) => { if (active) setAssignmentError(getApiErrorMessage(error)); })
      .finally(() => { if (active) setAssignmentsLoading(false); });
    return () => { active = false; };
  }, [id, editingConsumable, assignmentRetry]);

  const syncServiceAssignments = async (productId: string) => {
    const desired = hasConsumableInventory ? selectedServiceIds : [];
    for (const serviceId of new Set([...originalAssignedIds.current, ...desired])) {
      const service = await serviceService.getService(serviceId);
      const recipe = (service.consumablesUsed ?? [])
        .filter((item) => item.productId !== productId)
        .map((item) => ({ product_id: item.productId, qty: item.qty, unit: item.unit }));
      if (desired.includes(serviceId)) recipe.push({ product_id: productId, qty: Number(serviceQuantities[serviceId]), unit: unit.trim().toLowerCase() });
      await serviceService.updateService(serviceId, { consumables_used: recipe });
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/stock" as Href);
  };

  const updateField = (field: ProductField, value: string, setter: (nextValue: string) => void) => {
    setter(value);
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    if (isSubmitting || assignmentsLoading) return;
    const numericRetailPrice = parseNumber(retailPrice);
    const numericStockQuantity = parseNumber(stockQuantity);
    const numericProductQuantity = parseNumber(productQuantity);
    const numericUnitSize = parseNumber(unitSize);
    const numericLowStock = lowStockAlert.trim() ? parseNumber(lowStockAlert) : 0;
    const numericSupplyPrice = supplyPrice.trim() ? parseNumber(supplyPrice) : 0;
    const categoryId = selectedCategory?.id ?? liveProduct?.categoryId ?? "";

    setFormError(null);

    const nextErrors: ProductFieldErrors = {};
    if (!name.trim()) nextErrors.name = "Product Name is required.";
    else if (name.trim().length > 100) nextErrors.name = "Product Name must be 100 characters or less.";
    if (!categoryId) nextErrors.category = "Category is required.";
    if (isRetail && (numericStockQuantity === null || numericStockQuantity < 0)) {
      nextErrors.stockQuantity = "Stock Quantity is required.";
    }
    if (hasConsumableInventory && (numericProductQuantity === null || numericProductQuantity < 0)) {
      nextErrors.productQuantity = "Product Quantity is required.";
    }
    if (hasConsumableInventory && (numericUnitSize === null || numericUnitSize <= 0)) {
      nextErrors.unitSize = "Unit Size is required.";
    }
    if (hasConsumableInventory && !MEASURE_UNITS.includes(unit.trim().toLowerCase())) nextErrors.unit = "Use ml, l, g, kg, pcs, oz, lb, bottle, tube, pack, box or roll.";
    if (numericLowStock === null || numericLowStock < 0) nextErrors.lowStockAlert = "Low Stock Alert must be zero or more.";
    if (numericSupplyPrice === null || numericSupplyPrice < 0) nextErrors.supplyPrice = "Supply Price must be zero or more.";
    if (hasRetailSale && (numericRetailPrice === null || numericRetailPrice < 0)) {
      nextErrors.retailPrice = "Retail Price is required.";
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFormError("Please complete the highlighted fields before saving.");
      scrollToFirstError(nextErrors);
      return;
    }

    if (assignmentError) { setFormError(assignmentError); return; }
    if (hasConsumableInventory && selectedServiceIds.some((serviceId) => !Number.isFinite(Number(serviceQuantities[serviceId])) || !(Number(serviceQuantities[serviceId]) > 0))) {
      setFormError("Enter a positive usage quantity for each assigned service."); return;
    }
    const inventory = productFormInventory({
      consumable: hasConsumableInventory,
      quantity: numericProductQuantity ?? 0,
      unitSize: numericUnitSize ?? 0,
      stockQuantity: numericStockQuantity ?? 0,
      lowStockAlert: numericLowStock ?? 0,
      audit: !!scannerDraft,
    });
    const physicalQuantity = inventory.baseStock;
    if (!scannerDraft && (numericLowStock ?? 0) > 0 && (numericLowStock ?? 0) * (hasConsumableInventory ? numericUnitSize ?? 1 : 1) >= physicalQuantity) {
      setFieldErrors({ lowStockAlert: "Low stock alert must be less than available stock." });
      scrollToFirstError({ lowStockAlert: "Invalid alert" }); return;
    }
    if (saveLock.current) return;
    saveLock.current = true; setSaving(true);
    try {
      const data = {
        name: name.trim(),
        barcode: barcode.trim() || null,
        brand_id: brandId,
        category_id: categoryId,
        supplier_id: supplierId,
        description: description.trim() || null,
        remark: remark.trim() || null,
        expiry_date: toIsoDate(expiryDate) ?? null,
        hsn_sac: hsnSac.trim() || null,
        lot_number: lotNumber.trim() || null,
        measure_unit: hasConsumableInventory ? unit.trim().toLowerCase() : "pcs",
        product_type: productType,
        amount: inventory.amount,
        bottle_size: inventory.bottle_size,
        qty_alert: inventory.qty_alert,
        retail_sales_enabled: hasRetailSale,
        retail_price: hasRetailSale ? numericRetailPrice : null,
        supply_price: numericSupplyPrice ?? 0,
        tax_group: taxGroup.trim() || null,
        tax_type: productTaxCode(taxType),
        ...(scannerDraft?.size ? { size: scannerDraft.size.slice(0, 30) } : {}),
      };
      const targetId = id ?? createdProductId.current;
      const response = targetId
        ? await dispatch(updateProductThunk({ data, id: targetId })).unwrap()
        : await dispatch(createProductThunk(data)).unwrap();
      const productId = response.product.id;
      if (mode === "create") createdProductId.current = productId;
      if (scannerDraft && (numericLowStock ?? 0) > 0) {
        await dispatch(updateProductThunk({ id: productId, data: { qty_alert: numericLowStock } })).unwrap();
      }
      await syncServiceAssignments(productId);
      void dispatch(fetchProductsThunk({ offset: 0, reset: true }));
      if (mode === "create" && onCreated) {
        onCreated(productId, inventory.physicalPacks);
        return;
      }
      router.replace(`/stock/${productId}` as Href);
    } catch (error) {
      const message = getApiErrorMessage(error);
      setFormError(createdProductId.current ? `Product saved, but setup could not finish. Retry Save to finish without creating another product. ${message}` : message);
    } finally { saveLock.current = false; setSaving(false); }
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
                {isSubmitting ? <ActivityIndicator color={Colors.onPrimary} size="small" /> : null}
                <Text style={styles.headerSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>

          {productState.detailsError && mode === "edit" && !liveProduct ? (
            <ErrorNotice message={productState.detailsError} />
          ) : (
            <>
            {scannerDraft && <Text style={styles.counter}>Verify the scanned label, brand, variant and pack size. The quantity entered below becomes the audit physical count. Stock updates after audit approval.</Text>}
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

              <SelectField label="Supplier" onPress={() => { setSupplierCreateMode(false); setSupplierModalOpen(true); }} placeholder="Select supplier" value={supplierName || undefined} />
              {canCreateSupplier && <TouchableOpacity onPress={() => { setSupplierCreateMode(true); setSupplierModalOpen(true); }}><Text style={styles.inlineLink}>+ Add supplier</Text></TouchableOpacity>}
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
              {productType === "both" && <Text style={styles.helperText}>Used in services and also sold to clients.</Text>}
            </Section>

            <Section emphasized title="Inventory Setup">
              {hasConsumableInventory ? (
                <>
                  <View style={styles.twoColumn}>
                    <Field ref={(input) => setFieldRef("productQuantity", input)} error={fieldErrors.productQuantity} keyboardType="decimal-pad" label="Product Quantity *" onChangeText={(value) => updateField("productQuantity", value, setProductQuantity)} value={productQuantity} />
                    <Field ref={(input) => setFieldRef("unitSize", input)} error={fieldErrors.unitSize} keyboardType="decimal-pad" label="Unit Size *" onChangeText={(value) => updateField("unitSize", value, setUnitSize)} placeholder="e.g. 1000" value={unitSize} />
                  </View>
                  <View>
                    <Field ref={(input) => setFieldRef("unit", input)} error={fieldErrors.unit} label="Unit * (ml, g, pcs, etc.)" autoCapitalize="none" onChangeText={(value) => updateField("unit", value, setUnit)} value={unit} />
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
                <Section title="Service Assignment">
                  <Text style={styles.helperText}>Assign this product to the services that consume it, with how much each one uses.</Text>
                  {assignmentsLoading && <ActivityIndicator />}
                  {!!assignmentError && <TouchableOpacity onPress={() => setAssignmentRetry((value) => value + 1)}><Text style={styles.fieldError}>{assignmentError} Tap to retry.</Text></TouchableOpacity>}
                  <Field label="" onChangeText={setServiceSearch} placeholder="Search a service to assign..." value={serviceSearch} />
                  {filteredServices.map((service) => (
                    <TouchableOpacity
                      key={service.id}
                      onPress={() => {
                        setSelectedServiceIds((current) => [...current, service.id]);
                        setServiceQuantities((current) => ({ ...current, [service.id]: "" }));
                        setServiceSearch("");
                      }}
                      style={styles.optionRow}
                    >
                      <Text style={styles.optionText}>{service.name}</Text>
                      <Ionicons color={Colors.primaryText} name="add-circle-outline" size={18} />
                    </TouchableOpacity>
                  ))}
                  {selectedServices.map((service) => (
                    <View key={service.id} style={styles.selectedServiceRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedServiceText}>{service.name}</Text>
                        <Field label={`Usage per service (${unit})`} keyboardType="decimal-pad" value={serviceQuantities[service.id] ?? ""} onChangeText={(value) => setServiceQuantities((current) => ({ ...current, [service.id]: value }))} />
                      </View>
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
                <SelectField label="Tax Type" onPress={() => setTaxTypeOpen(true)} value={TAX_TYPES.find((item) => item.value === taxType)?.label ?? taxType} />
              </View>
              <Field label="Tax Group" onChangeText={setTaxGroup} value={taxGroup} />
              <Field label="HSN/SAC" onChangeText={setHsnSac} value={hsnSac} />
              <Text style={styles.label}>Expiry Date</Text>
              <TouchableOpacity activeOpacity={0.84} onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
                <Ionicons color={Colors.heading} name="calendar-outline" size={17} />
                <Text style={[styles.dateText, !expiryDate && styles.placeholder]}>{formatDate(expiryDate) || "dd-mm-yy"}</Text>
                <Ionicons color={Colors.text2} name="chevron-down" size={16} />
              </TouchableOpacity>
              {hasRetailSale ? <Field ref={(input) => setFieldRef("retailPrice", input)} error={fieldErrors.retailPrice} keyboardType="decimal-pad" label="Retail Price *" onChangeText={(value) => updateField("retailPrice", value, setRetailPrice)} value={retailPrice} /> : null}
            </Section>

            {hasConsumableInventory ? (
              <Section title="Inventory Preview">
                <PreviewRow label="Stock" value={String(availableStock)} />
                <PreviewRow label="Average Service Usage" value="No usage data yet" />
                <PreviewRow label="Assigned Services" value={String(selectedServices.length)} />
                <PreviewRow label="Status" value={availableStock <= 0 ? "Out of Stock" : "In Stock"} warning={availableStock <= 0} />
              </Section>
            ) : null}

            {formError ?? productState.mutationError ? <ErrorNotice message={formError ?? productState.mutationError ?? ""} /> : null}

            <View style={styles.footer}>
              <TouchableOpacity activeOpacity={0.84} onPress={goBack} style={styles.cancelButton}>
                <Text style={styles.cancelText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={() => void submit()} style={[styles.saveButton, isSubmitting && styles.disabled]}>
                {isSubmitting ? <ActivityIndicator color={Colors.onPrimary} /> : null}
                <Text style={styles.saveText}>{isSubmitting ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
            </>
          )}
        </KeyboardAwareScrollView>
      </KeyboardAvoidingView>

      <SupplierSelectModal visible={supplierModalOpen} initialCreate={supplierCreateMode} canCreate={canCreateSupplier} onClose={() => setSupplierModalOpen(false)} onSelect={(supplier) => { setSupplierId(supplier?.id ?? null); setSupplierName(supplier?.name ?? ""); }} />
      <Modal animationType="fade" transparent visible={brandModalOpen} onRequestClose={() => setBrandModalOpen(false)}>
        <Pressable onPress={() => setBrandModalOpen(false)} style={styles.overlay}>
          <Pressable onPress={(event) => event.stopPropagation()} style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Brand</Text>
            <Field label="New brand name" maxLength={100} value={newBrandName} onChangeText={setNewBrandName} editable={!brandSaving} />
            {!!brandError && <Text style={styles.fieldError}>{brandError}</Text>}
            <TouchableOpacity disabled={brandSaving || !newBrandName.trim()} onPress={async () => {
              if (brandSaving || !newBrandName.trim()) return;
              setBrandSaving(true); setBrandError("");
              try {
                const result = await dispatch(createBrandThunk({ name: newBrandName.trim() })).unwrap();
                setBrandId(result.brand.id); setNewBrandName(""); setBrandModalOpen(false);
              } catch (error) { setBrandError(getApiErrorMessage(error)); }
              finally { setBrandSaving(false); }
            }}><Text style={styles.inlineLink}>{brandSaving ? "Adding…" : "+ Add brand"}</Text></TouchableOpacity>
            {scannerDraft?.brand && !productState.brands.some(b => b.name.trim().toLowerCase() === scannerDraft.brand?.trim().toLowerCase()) && <TouchableOpacity disabled={isSubmitting} style={styles.sheetRow} onPress={async () => {
              const result = await dispatch(createBrandThunk({ name: scannerDraft.brand! }));
              if (createBrandThunk.fulfilled.match(result)) { scannerBrandPrefilled.current = true; setBrandId(result.payload.brand.id); setBrandModalOpen(false); }
              else setFormError(result.payload?.message ?? "Unable to create the scanned brand.");
            }}><Text style={styles.inlineLink}>Create verified brand: {scannerDraft.brand}</Text></TouchableOpacity>}
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
                  {(brand.id || null) === brandId ? <Ionicons color={Colors.primaryText} name="checkmark-circle" size={20} /> : null}
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
              <TouchableOpacity key={item.value} onPress={() => { setTaxType(item.value); setTaxTypeOpen(false); }} style={styles.sheetRow}>
                <Text style={styles.sheetRowText}>{item.label}</Text>
                {taxType === item.value ? <Ionicons color={Colors.primaryText} name="checkmark-circle" size={20} /> : null}
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
        <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primaryText} /></View>
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
  headerSaveText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "800" },
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
  inlineLink: { color: Colors.primaryText, fontSize: 14, fontWeight: "800", marginBottom: Spacing.md },
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
  segmentTextActive: { color: Colors.onPrimary },
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
  cancelText: { color: Colors.primaryText, fontSize: 14, fontWeight: "800" },
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
  saveText: { color: Colors.onPrimary, fontSize: 14, fontWeight: "800" },
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
