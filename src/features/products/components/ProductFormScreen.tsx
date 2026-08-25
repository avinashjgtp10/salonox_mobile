import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import {
  DashboardSpacing as Spacing,
  type ThemeColors,
} from "@/constants/theme";
import { CategorySelectModal } from "@/features/services/components/CategorySelectModal";
import {
  createProductThunk,
  fetchBrandsThunk,
  fetchProductByIdThunk,
  fetchProductsThunk,
  updateProductThunk,
} from "@/middleware/product/product.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  clearProductMutationError,
  selectProductById,
} from "@/store/product/product.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ServiceCategoryItem } from "@/types/service";

type Props = { id?: string; mode: "create" | "edit" };

const messageFrom = (payload: unknown, fallback: string) => {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

export default function ProductFormScreen({ id, mode }: Props) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const product = useAppSelector(selectProductById(id ?? ""));
  const state = useAppSelector((root) => root.product);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [legacyCategoryName, setLegacyCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategoryItem | null>(null);
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [lowStockThreshold, setLowStockThreshold] = useState("5");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [sku, setSku] = useState("");
  const [stockQuantity, setStockQuantity] = useState("0");
  const prefilled = useRef(false);

  const liveProduct = product ?? (state.currentProduct?.id === id ? state.currentProduct : null);
  const chosenBrand = state.brands.find((brand) => brand.id === brandId);
  const isSubmitting = state.mutationLoading;
  const title = mode === "create" ? "New Product" : "Edit Product";

  useEffect(() => {
    void dispatch(fetchBrandsThunk(undefined));
    if (mode === "edit" && id) void dispatch(fetchProductByIdThunk(id));
    return () => {
      dispatch(clearProductMutationError());
    };
  }, [dispatch, id, mode]);

  useEffect(() => {
    if (mode === "edit" && liveProduct && !prefilled.current) {
      setBrandId(liveProduct.brandId);
      setSelectedCategory(
        liveProduct.categoryId && liveProduct.category
          ? { id: liveProduct.categoryId, name: liveProduct.category }
          : null,
      );
      setLegacyCategoryName(liveProduct.category ?? "");
      setDescription(liveProduct.description ?? "");
      setIsActive(liveProduct.isActive);
      setLowStockThreshold(String(liveProduct.lowStockThreshold));
      setName(liveProduct.name);
      setPrice(String(liveProduct.price));
      setSku(liveProduct.sku ?? "");
      setStockQuantity(String(liveProduct.stockQuantity));
      prefilled.current = true;
    }
  }, [liveProduct, mode]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/stock" as Href);
  };

  const submit = async () => {
    const numericPrice = Number(price);
    const numericStock = Number(stockQuantity);
    const numericThreshold = Number(lowStockThreshold);
    setFormError(null);

    if (!name.trim()) return setFormError("Product name is required.");
    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice < 0) {
      return setFormError("Enter a valid price.");
    }
    if (!Number.isInteger(numericStock) || numericStock < 0) {
      return setFormError("Stock quantity must be a whole number of zero or more.");
    }
    if (!Number.isInteger(numericThreshold) || numericThreshold < 0) {
      return setFormError("Low stock threshold must be a whole number of zero or more.");
    }

    const categoryName = selectedCategory?.name ?? legacyCategoryName.trim();
    const categoryId = selectedCategory?.id ?? liveProduct?.categoryId ?? "";
    const data = {
      ...(mode === "edit" || brandId ? { brand_id: brandId } : {}),
      ...(mode === "edit" || categoryName ? { category: categoryName } : {}),
      ...((mode === "edit" && categoryId) || selectedCategory ? { category_id: categoryId } : {}),
      ...(mode === "edit" || description.trim()
        ? { description: description.trim() }
        : {}),
      is_active: isActive,
      low_stock_threshold: numericThreshold,
      name: name.trim(),
      price: numericPrice,
      ...(mode === "edit" || sku.trim() ? { sku: sku.trim() } : {}),
      stock_quantity: numericStock,
    };
    const action = mode === "create"
      ? await dispatch(createProductThunk(data))
      : await dispatch(updateProductThunk({ data, id: id ?? "" }));

    if (createProductThunk.rejected.match(action) || updateProductThunk.rejected.match(action)) {
      setFormError(messageFrom(action.payload, `Unable to ${mode} product.`));
      return;
    }

    await dispatch(fetchProductsThunk({ offset: 0, reset: true }));
    const productId = "product" in action.payload ? action.payload.product.id : id;
    router.replace((productId ? `/stock/${productId}` : "/stock") as Href);
  };

  if (mode === "edit" && state.detailsLoading && !liveProduct) {
    return <LoadingScreen title={title} onBack={goBack} />;
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <AppStatusBar />
      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.flex}>
          <Header title={title} onBack={goBack} />
          {state.detailsError && mode === "edit" && !liveProduct ? (
            <ErrorNotice message={state.detailsError} />
          ) : (
            <View style={styles.formCard}>
              <Field icon="cube-outline" label="Product name" value={name} onChangeText={setName} placeholder="e.g. Repair shampoo" />
              <Field icon="cash-outline" keyboardType="decimal-pad" label="Price" value={price} onChangeText={setPrice} placeholder="0.00" />
              <TouchableOpacity activeOpacity={0.8} onPress={() => setBrandModalOpen(true)} style={styles.inputGroup}>
                <Text style={styles.label}>Brand</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="ribbon-outline" size={18} color={Colors.text2} />
                  <Text style={[styles.selectText, !chosenBrand && styles.placeholder]}>{chosenBrand?.name ?? "No brand"}</Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.text2} />
                </View>
              </TouchableOpacity>
              <Field icon="barcode-outline" label="SKU" value={sku} onChangeText={setSku} placeholder="Optional" />
              <TouchableOpacity activeOpacity={0.8} onPress={() => setCategoryModalOpen(true)} style={styles.inputGroup}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="layers-outline" size={18} color={Colors.text2} />
                  <Text style={[styles.selectText, !selectedCategory && !legacyCategoryName && styles.placeholder]}>
                    {(selectedCategory?.name ?? legacyCategoryName) || "Select category"}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={Colors.text2} />
                </View>
              </TouchableOpacity>
              <View style={styles.twoColumn}>
                <View style={styles.column}><Field icon="archive-outline" keyboardType="number-pad" label="Stock" value={stockQuantity} onChangeText={setStockQuantity} placeholder="0" /></View>
                <View style={styles.column}><Field icon="warning-outline" keyboardType="number-pad" label="Low stock at" value={lowStockThreshold} onChangeText={setLowStockThreshold} placeholder="5" /></View>
              </View>
              <Field icon="document-text-outline" label="Description" multiline value={description} onChangeText={setDescription} placeholder="Optional product notes" />
              <View style={styles.switchRow}>
                <View><Text style={styles.switchTitle}>Active product</Text><Text style={styles.switchHint}>Available to operational workflows</Text></View>
                <Switch onValueChange={setIsActive} value={isActive} trackColor={{ false: Colors.border, true: Colors.secondary }} thumbColor="#FFFFFF" />
              </View>
              {formError ?? state.mutationError ? <ErrorNotice message={formError ?? state.mutationError ?? ""} /> : null}
              <TouchableOpacity activeOpacity={0.88} disabled={isSubmitting} onPress={() => void submit()} style={[styles.submit, isSubmitting && styles.disabled]}>
                {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />}
                <Text style={styles.submitText}>{isSubmitting ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}</Text>
              </TouchableOpacity>
            </View>
          )}
      </KeyboardAwareScrollView>
      <Modal animationType="fade" transparent visible={brandModalOpen} onRequestClose={() => setBrandModalOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setBrandModalOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Brand</Text>
            <ScrollView style={styles.brandList}>
              {[{ id: "", name: "No brand" }, ...state.brands].map((brand) => (
                <TouchableOpacity key={brand.id || "none"} onPress={() => { setBrandId(brand.id || null); setBrandModalOpen(false); }} style={styles.brandRow}>
                  <Text style={styles.brandName}>{brand.name}</Text>
                  {(brand.id || null) === brandId ? <Ionicons name="checkmark-circle" size={20} color={Colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <CategorySelectModal
        onClose={() => setCategoryModalOpen(false)}
        onSelectCategory={(category) => {
          setSelectedCategory(category);
          setLegacyCategoryName("");
        }}
        selectedCategoryId={selectedCategory?.id}
        type="product"
        visible={categoryModalOpen}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.header}><TouchableOpacity hitSlop={12} onPress={onBack} style={styles.iconButton}><Ionicons name="arrow-back" size={19} color={Colors.primary} /></TouchableOpacity><Text style={styles.headerTitle}>{title}</Text><View style={styles.iconButtonSpacer} /></View>;
}

function LoadingScreen({ onBack, title }: { onBack: () => void; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <SafeAreaView style={styles.safeArea}><View style={styles.content}><Header title={title} onBack={onBack} /><View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View></View></SafeAreaView>;
}

function ErrorNotice({ message }: { message: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color={Colors.error} /><Text style={styles.errorText}>{message}</Text></View>;
}

type FieldProps = React.ComponentProps<typeof TextInput> & { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string };
function Field({ icon, label, multiline, ...props }: FieldProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.inputGroup}><Text style={styles.label}>{label}</Text><View style={[styles.inputWrap, multiline && styles.multilineWrap]}><Ionicons name={icon} size={18} color={Colors.text2} /><TextInput {...props} multiline={multiline} placeholderTextColor={Colors.placeholder} style={[styles.input, multiline && styles.multilineInput]} /></View></View>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea:{flex:1,backgroundColor:Colors.bg},flex:{flex:1},content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},header:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.lg},headerTitle:{color:Colors.heading,fontSize:22,fontWeight:"800"},iconButton:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.control,borderWidth:1,height:AppLayout.headerActionSize,justifyContent:"center",width:AppLayout.headerActionSize},iconButtonSpacer:{width:AppLayout.headerActionSize},formCard:{backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.card,borderWidth:1,padding:Spacing.lg},inputGroup:{marginBottom:Spacing.lg},label:{color:Colors.text2,fontSize:13,fontWeight:"700",marginBottom:Spacing.sm},inputWrap:{alignItems:"center",backgroundColor:Colors.bg,borderColor:Colors.border,borderRadius:AppRadius.control,borderWidth:1,flexDirection:"row",minHeight:52,paddingHorizontal:Spacing.md},input:{color:Colors.heading,flex:1,fontSize:15,marginLeft:Spacing.sm,minHeight:50},placeholder:{color:Colors.placeholder},selectText:{color:Colors.heading,flex:1,fontSize:15,marginLeft:Spacing.sm},multilineWrap:{alignItems:"flex-start",paddingTop:15},multilineInput:{minHeight:84,textAlignVertical:"top"},twoColumn:{flexDirection:"row",gap:Spacing.sm},column:{flex:1},switchRow:{alignItems:"center",backgroundColor:Colors.bg2,borderRadius:AppRadius.control,flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.lg,padding:Spacing.md},switchTitle:{color:Colors.heading,fontSize:14,fontWeight:"700"},switchHint:{color:Colors.text2,fontSize:11,marginTop:3},error:{alignItems:"center",backgroundColor:Colors.errorBg,borderRadius:AppRadius.control,flexDirection:"row",marginBottom:Spacing.lg,padding:Spacing.md},errorText:{color:Colors.error,flex:1,fontSize:13,fontWeight:"600",marginLeft:Spacing.sm},submit:{alignItems:"center",backgroundColor:Colors.primaryDark,borderRadius:AppRadius.pill,flexDirection:"row",gap:Spacing.sm,justifyContent:"center",minHeight:52},submitText:{color:"#FFFFFF",fontSize:14,fontWeight:"800"},disabled:{opacity:0.7},loading:{alignItems:"center",flex:1,justifyContent:"center",minHeight:300},overlay:{backgroundColor:"rgba(15,23,32,0.3)",flex:1,justifyContent:"flex-end",padding:Spacing.lg},sheet:{backgroundColor:Colors.card,borderRadius:AppRadius.card,maxHeight:"65%",padding:Spacing.lg},sheetTitle:{color:Colors.heading,fontSize:17,fontWeight:"800",marginBottom:Spacing.sm},brandList:{maxHeight:360},brandRow:{alignItems:"center",borderBottomColor:Colors.border,borderBottomWidth:1,flexDirection:"row",justifyContent:"space-between",minHeight:50},brandName:{color:Colors.heading,fontSize:14,fontWeight:"600"},
});
