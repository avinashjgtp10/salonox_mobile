import { Ionicons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { createBrandThunk, fetchBrandByIdThunk, fetchBrandsThunk, updateBrandThunk } from "@/middleware/product/product.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearBrandMutationError, selectBrandById } from "@/store/product/product.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import { useValidationScroll } from "@/hooks/useValidationScroll";

type BrandField = "name";
const VALIDATION_FIELD_ORDER: BrandField[] = ["name"];

export default function BrandFormScreen({ id, mode }: { id?: string; mode: "create" | "edit" }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const storedBrand = useAppSelector(selectBrandById(id ?? ""));
  const state = useAppSelector((root) => root.product);
  const { scrollToFirstError, scrollViewRef, setFieldRef } = useValidationScroll(VALIDATION_FIELD_ORDER);
  const brand = storedBrand ?? (state.currentBrand?.id === id ? state.currentBrand : null);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | undefined>();
  const prefilled = useRef(false);
  const title = mode === "create" ? "New Brand" : "Edit Brand";

  useEffect(() => {
    if (mode === "edit" && id) void dispatch(fetchBrandByIdThunk(id));
    return () => { dispatch(clearBrandMutationError()); };
  }, [dispatch, id, mode]);
  useEffect(() => {
    if (brand && !prefilled.current) {
      setDescription(brand.description ?? ""); setIsActive(brand.isActive); setName(brand.name); prefilled.current = true;
    }
  }, [brand]);

  const back = () => router.canGoBack() ? router.back() : router.replace("/stock/brands" as Href);
  const submit = async () => {
    if (!name.trim()) {
      const errors = { name: "Brand name is required." };
      setNameError(errors.name);
      scrollToFirstError(errors);
      return;
    }
    setNameError(undefined);
    setError(null);
    const descriptionValue = description.trim();
    const action = mode === "create"
      ? await dispatch(createBrandThunk({
          ...(descriptionValue ? { description: descriptionValue } : {}),
          name: name.trim(),
        }))
      : await dispatch(updateBrandThunk({
          data: { description: descriptionValue, is_active: isActive, name: name.trim() },
          id: id ?? "",
        }));
    if (createBrandThunk.rejected.match(action) || updateBrandThunk.rejected.match(action)) {
      return setError(action.payload?.message ?? `Unable to ${mode} brand.`);
    }
    await dispatch(fetchBrandsThunk({ refresh: true }));
    router.replace("/stock/brands" as Href);
  };

  return <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}><AppStatusBar /><KeyboardAwareScrollView ref={scrollViewRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" style={styles.flex}>
    <View style={styles.header}><TouchableOpacity hitSlop={12} onPress={back} style={styles.iconButton}><Ionicons name="arrow-back" size={19} color={Colors.primary} /></TouchableOpacity><Text style={styles.title}>{title}</Text><View style={styles.spacer} /></View>
    {mode === "edit" && state.brandDetailsLoading && !brand ? <View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /></View> : mode === "edit" && state.brandDetailsError && !brand ? <Notice message={state.brandDetailsError} /> : <View style={styles.card}>
      <View style={styles.field}><Text style={styles.label}>Brand name</Text><View style={[styles.inputWrap, nameError && styles.inputWrapError]}><Ionicons name="ribbon-outline" size={18} color={nameError ? Colors.error : Colors.text2} /><TextInput ref={(input) => setFieldRef("name", input)} autoCapitalize="words" onChangeText={(value) => { setName(value); setNameError(undefined); }} placeholder="Enter brand name" placeholderTextColor={Colors.placeholder} style={styles.input} value={name} /></View>{nameError ? <Text style={styles.fieldError}>{nameError}</Text> : null}</View>
      <View style={styles.field}><Text style={styles.label}>Description</Text><View style={[styles.inputWrap, styles.multilineWrap]}><Ionicons name="document-text-outline" size={18} color={Colors.text2} /><TextInput multiline onChangeText={setDescription} placeholder="Optional notes" placeholderTextColor={Colors.placeholder} style={[styles.input, styles.multiline]} value={description} /></View></View>
      {mode === "edit" ? <View style={styles.switchRow}><View><Text style={styles.switchTitle}>Active brand</Text><Text style={styles.switchHint}>Available when assigning products</Text></View><Switch onValueChange={setIsActive} value={isActive} trackColor={{ false: Colors.border, true: Colors.secondary }} thumbColor="#FFFFFF" /></View> : null}
      {error ?? state.brandMutationError ? <Notice message={error ?? state.brandMutationError ?? ""} /> : null}
      <TouchableOpacity disabled={state.brandMutationLoading} onPress={() => void submit()} style={[styles.submit, state.brandMutationLoading && styles.disabled]}>{state.brandMutationLoading ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="checkmark-circle-outline" size={19} color="#FFFFFF" />}<Text style={styles.submitText}>{state.brandMutationLoading ? "Saving..." : mode === "create" ? "Create Brand" : "Save Changes"}</Text></TouchableOpacity>
    </View>}
  </KeyboardAwareScrollView></SafeAreaView>;
}

function Notice({ message }: { message: string }) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  return <View style={styles.notice}><Ionicons name="alert-circle-outline" size={18} color={Colors.error} /><Text style={styles.noticeText}>{message}</Text></View>;
}
const createStyles = (Colors: ThemeColors) => StyleSheet.create({safeArea:{backgroundColor:Colors.bg,flex:1},flex:{flex:1},content:{padding:Spacing.lg},header:{alignItems:"center",flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.lg},iconButton:{alignItems:"center",backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.control,borderWidth:1,height:AppLayout.headerActionSize,justifyContent:"center",width:AppLayout.headerActionSize},spacer:{width:AppLayout.headerActionSize},title:{color:Colors.heading,fontSize:22,fontWeight:"800"},card:{backgroundColor:Colors.card,borderColor:Colors.border,borderRadius:AppRadius.card,borderWidth:1,padding:Spacing.lg},field:{marginBottom:Spacing.lg},label:{color:Colors.text2,fontSize:13,fontWeight:"700",marginBottom:Spacing.sm},inputWrap:{alignItems:"center",backgroundColor:Colors.bg,borderColor:Colors.border,borderRadius:AppRadius.control,borderWidth:1,flexDirection:"row",minHeight:52,paddingHorizontal:Spacing.md},inputWrapError:{borderColor:Colors.error,borderWidth:1.5},fieldError:{color:Colors.error,fontSize:12,fontWeight:"700",marginTop:6},input:{color:Colors.heading,flex:1,fontSize:15,marginLeft:Spacing.sm,minHeight:50},multilineWrap:{alignItems:"flex-start",paddingTop:15},multiline:{minHeight:90,textAlignVertical:"top"},switchRow:{alignItems:"center",backgroundColor:Colors.bg2,borderRadius:AppRadius.control,flexDirection:"row",justifyContent:"space-between",marginBottom:Spacing.lg,padding:Spacing.md},switchTitle:{color:Colors.heading,fontSize:14,fontWeight:"700"},switchHint:{color:Colors.text2,fontSize:11,marginTop:3},notice:{alignItems:"center",backgroundColor:Colors.errorBg,borderRadius:AppRadius.control,flexDirection:"row",marginBottom:Spacing.lg,padding:Spacing.md},noticeText:{color:Colors.error,flex:1,fontSize:13,fontWeight:"600",marginLeft:Spacing.sm},submit:{alignItems:"center",backgroundColor:Colors.primaryDark,borderRadius:AppRadius.pill,flexDirection:"row",gap:Spacing.sm,justifyContent:"center",minHeight:52},submitText:{color:"#FFFFFF",fontSize:14,fontWeight:"800"},disabled:{opacity:0.7},loading:{alignItems:"center",justifyContent:"center",minHeight:300}});
