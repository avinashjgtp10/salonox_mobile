import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { EmptyState, ErrorState } from "@/components/ui/StateViews";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import { deleteProductThunk, fetchProductsThunk } from "@/middleware/product/product.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { Product } from "@/types/product";

type Filter = "All" | "Active" | "Inactive" | "Low stock";
const FILTERS: Filter[] = ["All", "Active", "Inactive", "Low stock"];

const rejectedMessage = (payload: unknown) =>
  payload && typeof payload === "object" && "message" in payload
    ? String((payload as { message: unknown }).message)
    : "Something went wrong. Please try again.";

const money = (value: number) => `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ProductsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const insets = useSafeAreaInsets();
  const state = useAppSelector((root) => root.product);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void dispatch(fetchProductsThunk({
      isActive: filter === "Active" ? true : filter === "Inactive" ? false : null,
      offset: 0,
      reset: true,
      search: debouncedQuery,
    }));
  }, [debouncedQuery, dispatch, filter]);

  const products = useMemo(
    () => filter === "Low stock"
      ? state.products.filter((item) => item.stockQuantity <= item.lowStockThreshold)
      : state.products,
    [filter, state.products],
  );
  const lowStockCount = state.products.filter((item) => item.stockQuantity <= item.lowStockThreshold).length;

  const refresh = () => void dispatch(fetchProductsThunk({ refresh: true, search: debouncedQuery }));
  const loadMore = () => {
    if (!state.loading && !state.loadingMore && !state.refreshing && state.pagination.hasMore) {
      void dispatch(fetchProductsThunk({ offset: state.pagination.nextOffset }));
    }
  };

  const remove = (product: Product) => Alert.alert(
    "Delete Product",
    `Delete "${product.name}"? This action cannot be undone.`,
    [
      { style: "cancel", text: "Cancel" },
      { style: "destructive", text: "Delete", onPress: async () => {
        const action = await dispatch(deleteProductThunk(product.id));
        if (deleteProductThunk.rejected.match(action)) {
          Alert.alert("Unable to delete product", rejectedMessage(action.payload));
          return;
        }
        toast.showSuccess("Product deleted successfully.");
      } },
    ],
  );

  const header = (
    <View>
      <View style={styles.header}>
        <TouchableOpacity hitSlop={12} onPress={() => router.canGoBack() ? router.back() : router.replace("/more" as Href)} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={19} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity accessibilityLabel="Manage brands" onPress={() => router.push("/stock/brands" as Href)} style={styles.iconButton}>
          <Ionicons name="ribbon-outline" size={19} color={Colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={styles.summary}>
        <Metric label="Products" value={String(state.totalCount)} />
        <View style={styles.divider} />
        <Metric label="Low stock" value={String(lowStockCount)} warning={lowStockCount > 0} />
      </View>
      <View style={styles.search}>
        <Ionicons name="search-outline" size={19} color={Colors.text2} />
        <TextInput onChangeText={setQuery} placeholder="Search name or SKU" placeholderTextColor={Colors.placeholder} style={styles.searchInput} value={query} />
        {query ? <TouchableOpacity onPress={() => setQuery("")}><Ionicons name="close-circle" size={18} color={Colors.placeholder} /></TouchableOpacity> : null}
      </View>
      <View style={styles.filters}>
        {FILTERS.map((item) => <TouchableOpacity key={item} onPress={() => setFilter(item)} style={[styles.chip, filter === item && styles.chipActive]}><Text style={[styles.chipText, filter === item && styles.chipTextActive]}>{item}</Text></TouchableOpacity>)}
      </View>
      <View style={styles.resultRow}><Text style={styles.resultText}>{products.length} loaded</Text><TouchableOpacity onPress={() => router.push("/stock/brands" as Href)}><Text style={styles.brandLink}>Manage brands</Text></TouchableOpacity></View>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <FlatList
        contentContainerStyle={styles.content}
        data={products}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        ListEmptyComponent={state.loading ? <LoadingCards /> : <Empty error={state.error} onRetry={refresh} searching={Boolean(query || filter !== "All")} />}
        ListFooterComponent={<View style={{ height: 105 + insets.bottom }}>{state.loadingMore ? <ActivityIndicator color={Colors.primary} /> : null}</View>}
        onEndReached={loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={refresh} colors={[Colors.primary]} tintColor={Colors.primary} />}
        renderItem={({ item }) => <ProductCard deleting={state.deletingProductIds.includes(item.id)} item={item} onDelete={() => remove(item)} />}
        showsVerticalScrollIndicator={false}
      />
      <View style={[styles.floatingWrap, { bottom: insets.bottom + 12 }]}><TouchableOpacity onPress={() => router.push("/stock/new" as Href)} style={styles.addButton}><Ionicons name="add-circle-outline" size={19} color="#FFFFFF" /><Text style={styles.addText}>Add Product</Text></TouchableOpacity></View>
    </SafeAreaView>
  );
}

function Metric({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.metric}><Text style={styles.metricLabel}>{label}</Text><Text style={[styles.metricValue, warning && styles.warning]}>{value}</Text></View>;
}

function ProductCard({ deleting, item, onDelete }: { deleting: boolean; item: Product; onDelete: () => void }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const low = item.stockQuantity <= item.lowStockThreshold;
  return <TouchableOpacity activeOpacity={0.84} onPress={() => router.push(`/stock/${item.id}` as Href)} style={styles.card}>
    <View style={styles.productIcon}><Ionicons name="cube-outline" size={21} color={Colors.primaryDark} /></View>
    <View style={styles.cardCopy}><View style={styles.nameRow}><Text numberOfLines={1} style={styles.productName}>{item.name}</Text><View style={[styles.badge, item.isActive ? styles.activeBadge : styles.inactiveBadge]}><Text style={[styles.badgeText, !item.isActive && styles.inactiveText]}>{item.isActive ? "Active" : "Inactive"}</Text></View></View><Text style={styles.meta} numberOfLines={1}>{[item.brandName, item.category, item.sku].filter(Boolean).join("  |  ") || "Uncategorized"}</Text><View style={styles.cardBottom}><Text style={styles.price}>{money(item.price)}</Text><Text style={[styles.stock, low && styles.warning]}>{low ? "Low: " : "Stock: "}{item.stockQuantity}</Text></View></View>
    <TouchableOpacity accessibilityLabel="Delete product" disabled={deleting} hitSlop={8} onPress={(event) => { event.stopPropagation(); onDelete(); }} style={styles.delete}>{deleting ? <ActivityIndicator color={Colors.error} size="small" /> : <Ionicons name="trash-outline" size={18} color={Colors.error} />}</TouchableOpacity>
  </TouchableOpacity>;
}

function LoadingCards() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View>{[1,2,3,4].map((key) => <View key={key} style={styles.skeleton}><View style={styles.skeletonIcon} /><View style={styles.skeletonCopy}><View style={styles.skeletonTitle} /><View style={styles.skeletonLine} /></View></View>)}</View>;
}
function Empty({ error, onRetry, searching }: { error: string | null; onRetry: () => void; searching: boolean }) {
  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  return (
    <EmptyState
      accent="indigo"
      description={searching ? "Try changing your search or filter." : "Add your first retail product to begin tracking stock."}
      icon="cube-outline"
      title="No products found"
    />
  );
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea:{backgroundColor:Colors.bg,flex:1},content:{paddingHorizontal:Spacing.lg,paddingTop:Spacing.sm},header:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.md},iconButton:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.control,borderWidth:1,height:AppLayout.headerActionSize,justifyContent:"center",width:AppLayout.headerActionSize},title:{color:Colors.heading,fontSize:24,fontWeight:"800"},summary:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.card,borderWidth:1,flexDirection:"row",marginBottom:Spacing.md,padding:Spacing.lg},metric:{flex:1},metricLabel:{color:Colors.text2,fontSize:12,fontWeight:"600"},metricValue:{color:Colors.heading,fontSize:20,fontWeight:"800",marginTop:5},divider:{backgroundColor:Colors.border,height:38,marginHorizontal:Spacing.lg,width:1},search:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.search,borderWidth:1,flexDirection:"row",gap:Spacing.sm,minHeight:52,paddingHorizontal:Spacing.md},searchInput:{color:Colors.heading,flex:1,fontSize:15,minHeight:50},filters:{flexDirection:"row",flexWrap:"wrap",gap:Spacing.sm,marginVertical:Spacing.md},chip:{backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.pill,borderWidth:1,paddingHorizontal:13,paddingVertical:8},chipActive:{backgroundColor:Colors.primaryDark,borderColor:Colors.primaryDark},chipText:{color:Colors.text2,fontSize:12,fontWeight:"700"},chipTextActive:{color:"#FFFFFF"},resultRow:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.sm},resultText:{color:Colors.text2,fontSize:12},brandLink:{color:Colors.primary,fontSize:12,fontWeight:"800"},card:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.card,borderWidth:1,flexDirection:"row",marginBottom:Spacing.sm,padding:Spacing.md},productIcon:{alignItems:"center",backgroundColor:Colors.bg2,borderRadius:AppRadius.control,height:46,justifyContent:"center",width:46},cardCopy:{flex:1,marginLeft:Spacing.md,minWidth:0},nameRow:{alignItems:"center",flexDirection:"row",gap:Spacing.sm},productName:{color:Colors.heading,flex:1,fontSize:15,fontWeight:"800"},badge:{backgroundColor:Colors.successBg,borderRadius:AppRadius.pill,paddingHorizontal:8,paddingVertical:4},activeBadge:{backgroundColor:Colors.successBg},inactiveBadge:{backgroundColor:Colors.errorBg},badgeText:{color:Colors.primaryDark,fontSize:9,fontWeight:"800"},inactiveText:{color:Colors.error},meta:{color:Colors.text2,fontSize:11,marginTop:4},cardBottom:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",marginTop:7},price:{color:Colors.heading,fontSize:12,fontWeight:"700"},stock:{color:Colors.text2,fontSize:11,fontWeight:"700"},warning:{color:Colors.warning},delete:{alignItems:"center",height:38,justifyContent:"center",marginLeft:Spacing.sm,width:34},floatingWrap:{left:Spacing.lg,position:"absolute",right:Spacing.lg},addButton:{alignItems:"center",backgroundColor:Colors.primaryDark,borderRadius:AppRadius.pill,flexDirection:"row",gap:Spacing.sm,justifyContent:"center",minHeight:54},addText:{color:"#FFFFFF",fontSize:14,fontWeight:"800"},empty:{alignItems:"center",paddingHorizontal:Spacing.xl,paddingVertical:56},emptyTitle:{color:Colors.heading,fontSize:18,fontWeight:"800",marginTop:Spacing.md},emptyText:{color:Colors.text2,fontSize:13,lineHeight:19,marginTop:Spacing.sm,textAlign:"center"},retry:{backgroundColor:Colors.primaryDark,borderRadius:AppRadius.pill,marginTop:Spacing.lg,paddingHorizontal:22,paddingVertical:11},retryText:{color:"#FFFFFF",fontWeight:"800"},skeleton:{alignItems:"center",backgroundColor:Colors.card,borderRadius:AppRadius.card,flexDirection:"row",marginBottom:Spacing.sm,padding:Spacing.md},skeletonIcon:{backgroundColor:Colors.bg2,borderRadius:AppRadius.control,height:46,width:46},skeletonCopy:{flex:1,marginLeft:Spacing.md},skeletonTitle:{backgroundColor:Colors.bg2,borderRadius:6,height:14,width:"58%"},skeletonLine:{backgroundColor:Colors.bg2,borderRadius:6,height:10,marginTop:10,width:"82%"},
});
