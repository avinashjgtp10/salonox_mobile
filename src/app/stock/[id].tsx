import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import { deleteProductThunk, fetchProductByIdThunk } from "@/middleware/product/product.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectProductById } from "@/store/product/product.slice";
import { useThemeColors } from "@/theme/ThemeProvider";

const money = (value: number) => `INR ${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function ProductDetailsScreen() {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const storedProduct = useAppSelector(selectProductById(id ?? ""));
  const state = useAppSelector((root) => root.product);
  const product = storedProduct ?? (state.currentProduct?.id === id ? state.currentProduct : null);

  useEffect(() => { if (id) void dispatch(fetchProductByIdThunk(id)); }, [dispatch, id]);
  const back = () => router.canGoBack() ? router.back() : router.replace("/stock" as Href);
  const remove = () => product && Alert.alert("Delete Product", `Delete "${product.name}"?`, [
    { style: "cancel", text: "Cancel" },
    { style: "destructive", text: "Delete", onPress: async () => {
      const action = await dispatch(deleteProductThunk(product.id));
      if (deleteProductThunk.fulfilled.match(action)) {
        toast.showSuccess("Product deleted successfully.");
        router.replace("/stock" as Href);
      } else {
        Alert.alert("Unable to delete product", action.payload?.message ?? "Please try again.");
      }
    } },
  ]);

  return <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
    <AppStatusBar />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}><AppBackButton onPress={back} /><Text style={styles.title}>Product Details</Text><TouchableOpacity disabled={!product} hitSlop={12} onPress={() => router.push(`/stock/${id}/edit` as Href)} style={styles.iconButton}><Ionicons name="create-outline" size={19} color={Colors.primary} /></TouchableOpacity></View>
      {state.detailsLoading && !product ? <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View> : state.detailsError && !product ? <StateMessage title="Unable to load product" message={state.detailsError} /> : !product ? <StateMessage title="Product not found" message="This product could not be found." /> : <>
        <View style={styles.hero}><View style={styles.avatar}><Ionicons name="cube-outline" size={30} color={Colors.primaryDark} /></View><Text style={styles.productName}>{product.name}</Text><Text style={styles.productMeta}>{product.brandName ?? product.category ?? "Uncategorized"}</Text><View style={[styles.badge, product.isActive ? styles.active : styles.inactive]}><Text style={[styles.badgeText, !product.isActive && styles.inactiveText]}>{product.isActive ? "Active" : "Inactive"}</Text></View><View style={styles.stats}><Stat label="Price" value={money(product.price)} /><Stat label="In stock" value={String(product.stockQuantity)} /></View></View>
        <View style={styles.section}><Text style={styles.sectionTitle}>Product Information</Text><Row label="Brand" value={product.brandName ?? "-"} /><Row label="Category" value={product.category ?? "-"} /><Row label="SKU" value={product.sku ?? "-"} /><Row label="Low stock threshold" value={String(product.lowStockThreshold)} /><Row label="Status" value={product.isActive ? "Active" : "Inactive"} /></View>
        {product.description ? <View style={styles.section}><Text style={styles.sectionTitle}>Description</Text><Text style={styles.description}>{product.description}</Text></View> : null}
        <TouchableOpacity disabled={state.deletingProductIds.includes(product.id)} onPress={remove} style={styles.deleteButton}>{state.deletingProductIds.includes(product.id) ? <ActivityIndicator color={Colors.error} /> : <Ionicons name="trash-outline" size={19} color={Colors.error} />}<Text style={styles.deleteText}>Delete Product</Text></TouchableOpacity>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

function Stat({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.stat}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}
function Row({ label, value }: { label: string; value: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={styles.rowValue}>{value}</Text></View>;
}
function StateMessage({ message, title }: { message: string; title: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.message}><Ionicons name="alert-circle-outline" size={32} color={Colors.error} /><Text style={styles.messageTitle}>{title}</Text><Text style={styles.messageText}>{message}</Text></View>;
}

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea:{backgroundColor:Colors.bg,flex:1},content:{padding:Spacing.lg,paddingBottom:Spacing.xxl},header:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.lg},iconButton:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.control,borderWidth:1,height:AppLayout.headerActionSize,justifyContent:"center",width:AppLayout.headerActionSize},title:{color:Colors.heading,fontSize:22,fontWeight:"800"},center:{alignItems:"center",minHeight:320,justifyContent:"center"},hero:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.card,borderWidth:1,padding:Spacing.xl},avatar:{alignItems:"center",backgroundColor:Colors.bg2,borderRadius:32,height:64,justifyContent:"center",width:64},productName:{color:Colors.heading,fontSize:21,fontWeight:"800",marginTop:Spacing.md,textAlign:"center"},productMeta:{color:Colors.text2,fontSize:13,marginTop:5},badge:{borderRadius:AppRadius.pill,marginTop:Spacing.sm,paddingHorizontal:12,paddingVertical:5},active:{backgroundColor:Colors.successBg},inactive:{backgroundColor:Colors.errorBg},badgeText:{color:Colors.primaryDark,fontSize:11,fontWeight:"800"},inactiveText:{color:Colors.error},stats:{flexDirection:"row",gap:Spacing.sm,marginTop:Spacing.lg,width:"100%"},stat:{alignItems:"center",backgroundColor:Colors.bg2,borderRadius:AppRadius.control,flex:1,minWidth:0,padding:Spacing.md},statValue:{color:Colors.heading,fontSize:16,fontWeight:"800",maxWidth:"100%"},statLabel:{color:Colors.text2,fontSize:11,marginTop:4},section:{backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.card,borderWidth:1,marginTop:Spacing.md,padding:Spacing.lg},sectionTitle:{color:Colors.heading,fontSize:16,fontWeight:"800",marginBottom:Spacing.sm},row:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",paddingVertical:9},rowLabel:{color:Colors.text2,fontSize:13},rowValue:{color:Colors.heading,flexShrink:1,fontSize:13,fontWeight:"700",marginLeft:Spacing.md,textAlign:"right"},description:{color:Colors.text,fontSize:13,lineHeight:20},deleteButton:{alignItems:"center",borderColor:Colors.error,borderRadius:AppRadius.pill,borderWidth:1,flexDirection:"row",gap:Spacing.sm,justifyContent:"center",marginTop:Spacing.lg,minHeight:50},deleteText:{color:Colors.error,fontSize:14,fontWeight:"800"},message:{alignItems:"center",backgroundColor:Colors.card,borderRadius:AppRadius.card,marginTop:Spacing.xl,padding:Spacing.xl},messageTitle:{color:Colors.heading,fontSize:18,fontWeight:"800",marginTop:Spacing.md},messageText:{color:Colors.text2,fontSize:13,marginTop:Spacing.sm,textAlign:"center"},
});
