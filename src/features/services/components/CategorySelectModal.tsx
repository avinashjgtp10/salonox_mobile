import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
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
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppRadius } from "@/constants/layout";
import { DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { useAppToast } from "@/hooks/useAppToast";
import { createCategoryThunk, fetchCategoriesThunk } from "@/middleware/service/service.thunk";
import {
  selectCategoriesByType,
  selectCategoriesErrorByType,
  selectCategoriesLoadedAtByType,
  selectCategoriesLoadingByType,
  selectCreateCategoryErrorByType,
  selectCreatingCategoryByType,
} from "@/store/service/service.slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { CategoryType, ServiceCategoryItem } from "@/types/service";

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

type CategorySelectModalProps = {
  onClose: () => void;
  onSelectCategory: (category: ServiceCategoryItem) => void;
  selectedCategoryId?: string | null;
  type: CategoryType;
  visible: boolean;
};

export function CategorySelectModal({
  onClose,
  onSelectCategory,
  selectedCategoryId,
  type,
  visible,
}: CategorySelectModalProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const toast = useAppToast();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const categories = useAppSelector((state) => selectCategoriesByType(state, type));
  const categoriesLoadedAt = useAppSelector((state) => selectCategoriesLoadedAtByType(state, type));
  const categoriesLoading = useAppSelector((state) => selectCategoriesLoadingByType(state, type));
  const categoriesError = useAppSelector((state) => selectCategoriesErrorByType(state, type));
  const creatingCategory = useAppSelector((state) => selectCreatingCategoryByType(state, type));
  const createCategoryError = useAppSelector((state) => selectCreateCategoryErrorByType(state, type));

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [createValidationError, setCreateValidationError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const categoriesAreStale =
      !categoriesLoadedAt || Date.now() - categoriesLoadedAt > CATEGORY_CACHE_TTL_MS;

    if (visible && !categoriesLoading && (categories.length === 0 || categoriesError || categoriesAreStale)) {
      void dispatch(fetchCategoriesThunk({ type }));
    }
  }, [categories.length, categoriesError, categoriesLoadedAt, categoriesLoading, dispatch, type, visible]);

  const handleRetryFetch = () => {
    void dispatch(fetchCategoriesThunk({ type }));
  };

  const handleSelect = (category: ServiceCategoryItem) => {
    onSelectCategory(category);
    onClose();
  };

  const handleOpenCreateModal = () => {
    Keyboard.dismiss();
    setNewCategoryName("");
    setCreateValidationError(null);
    setCreateModalOpen(true);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setNewCategoryName("");
    setCreateValidationError(null);
  };

  const handleCreateCategorySubmit = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setCreateValidationError("Category name is required.");
      return;
    }

    setCreateValidationError(null);
    const resultAction = await dispatch(createCategoryThunk({ name: trimmed, type }));

    if (createCategoryThunk.fulfilled.match(resultAction)) {
      const createdCategory = resultAction.payload;
      handleCloseCreateModal();
      toast.showSuccess("Category created successfully.");
      handleSelect(createdCategory);
    }
  };

  useEffect(() => {
    if (!createModalOpen) {
      setKeyboardHeight(0);
      return undefined;
    }

    setKeyboardHeight(Keyboard.metrics()?.height ?? 0);

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (event: { endCoordinates?: { height?: number } }) => {
      setKeyboardHeight(event.endCoordinates?.height ?? 0);
    };
    const onHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [createModalOpen]);

  const createSheetBottom = keyboardHeight > 0 ? keyboardHeight + Spacing.xl : Math.max(insets.bottom, Spacing.lg);
  const createSheetMaxHeight = Math.max(280, windowHeight - createSheetBottom - Math.max(insets.top, Spacing.lg));

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.sheetTitle}>Select Category</Text>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={Colors.text2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.84}
            onPress={handleOpenCreateModal}
            style={styles.createOptionButton}
          >
            <View style={styles.createOptionIcon}>
              <Ionicons name="add" size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.createOptionText}>Create Category</Text>
          </TouchableOpacity>

          {categoriesLoading && categories.length === 0 ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : categoriesError && categories.length === 0 ? (
            <View style={styles.centerContainer}>
              <Ionicons name="alert-circle-outline" size={28} color={Colors.error} />
              <Text style={styles.errorText}>{categoriesError}</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={handleRetryFetch} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.categoryList}>
              {categories.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No categories available yet.</Text>
                  <Text style={styles.emptySubtext}>Tap &quot;Create Category&quot; above to add one.</Text>
                </View>
              ) : (
                categories.map((category) => {
                  const isSelected = category.id === selectedCategoryId;
                  return (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      key={category.id}
                      onPress={() => handleSelect(category)}
                      style={[styles.categoryRow, isSelected && styles.categoryRowSelected]}
                    >
                      <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
                        {category.name}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>

      <Modal animationType="fade" onRequestClose={handleCloseCreateModal} transparent visible={createModalOpen}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          pointerEvents="box-none"
          style={styles.keyboardLayer}
        >
          <Pressable onPress={handleCloseCreateModal} style={styles.overlay}>
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={[
                styles.createSheet,
                {
                  marginBottom: createSheetBottom,
                  maxHeight: createSheetMaxHeight,
                },
              ]}
            >
              <View style={styles.header}>
                <Text style={styles.sheetTitle}>New Category</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={handleCloseCreateModal} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={Colors.text2} />
                </TouchableOpacity>
              </View>

              <View style={styles.createInputGroup}>
                <Text style={styles.createInputLabel}>Category Name</Text>
                <TextInput
                  autoCapitalize="words"
                  autoFocus
                  editable={!creatingCategory}
                  onChangeText={(text) => {
                    setNewCategoryName(text);
                    if (createValidationError) setCreateValidationError(null);
                  }}
                  placeholder="Enter category name"
                  placeholderTextColor={Colors.placeholder}
                  returnKeyType="done"
                  style={styles.createTextInput}
                  value={newCategoryName}
                />
                {createValidationError ? (
                  <Text style={styles.createErrorText}>{createValidationError}</Text>
                ) : null}
                {createCategoryError ? (
                  <Text style={styles.createErrorText}>{createCategoryError}</Text>
                ) : null}
              </View>

              <View style={styles.createActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={creatingCategory}
                  onPress={handleCloseCreateModal}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={creatingCategory}
                  onPress={handleCreateCategorySubmit}
                  style={[styles.saveCategoryButton, creatingCategory && styles.buttonDisabled]}
                >
                  {creatingCategory ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                  )}
                  <Text style={styles.saveCategoryButtonText}>
                    {creatingCategory ? "Saving..." : "Save Category"}
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      backgroundColor: "rgba(15, 23, 32, 0.45)",
      flex: 1,
      justifyContent: "flex-end",
    },
    keyboardLayer: {
      flex: 1,
    },
    sheet: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: AppRadius.card,
      borderTopRightRadius: AppRadius.card,
      maxHeight: "75%",
      minHeight: 320,
      padding: Spacing.lg,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: Spacing.md,
    },
    sheetTitle: {
      color: Colors.heading,
      fontSize: 18,
      fontWeight: "800",
    },
    closeButton: {
      padding: Spacing.xs,
    },
    createOptionButton: {
      alignItems: "center",
      backgroundColor: Colors.bg2,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      flexDirection: "row",
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: 12,
    },
    createOptionIcon: {
      alignItems: "center",
      backgroundColor: Colors.primary,
      borderRadius: 12,
      height: 24,
      justifyContent: "center",
      marginRight: Spacing.sm,
      width: 24,
    },
    createOptionText: {
      color: Colors.primary,
      fontSize: 14,
      fontWeight: "700",
    },
    categoryList: {
      maxHeight: 360,
    },
    categoryRow: {
      alignItems: "center",
      borderBottomColor: Colors.border,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      minHeight: 52,
      paddingHorizontal: Spacing.xs,
    },
    categoryRowSelected: {
      backgroundColor: Colors.bg2,
      borderRadius: AppRadius.control,
    },
    categoryName: {
      color: Colors.heading,
      fontSize: 15,
      fontWeight: "500",
    },
    categoryNameSelected: {
      color: Colors.primary,
      fontWeight: "700",
    },
    centerContainer: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: Spacing.xxl,
    },
    loadingText: {
      color: Colors.text2,
      fontSize: 13,
      marginTop: Spacing.sm,
    },
    errorText: {
      color: Colors.error,
      fontSize: 13,
      fontWeight: "600",
      marginTop: Spacing.sm,
      textAlign: "center",
    },
    retryButton: {
      backgroundColor: Colors.primary,
      borderRadius: AppRadius.pill,
      marginTop: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.sm,
    },
    retryButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "700",
    },
    emptyContainer: {
      alignItems: "center",
      paddingVertical: Spacing.xl,
    },
    emptyText: {
      color: Colors.heading,
      fontSize: 14,
      fontWeight: "700",
    },
    emptySubtext: {
      color: Colors.text2,
      fontSize: 12,
      marginTop: 4,
    },
    createSheet: {
      backgroundColor: Colors.card,
      borderRadius: AppRadius.card,
      margin: Spacing.lg,
      padding: Spacing.lg,
    },
    createInputGroup: {
      marginVertical: Spacing.md,
    },
    createInputLabel: {
      color: Colors.text2,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: Spacing.sm,
    },
    createTextInput: {
      backgroundColor: Colors.bg,
      borderColor: Colors.border,
      borderRadius: AppRadius.control,
      borderWidth: 1,
      color: Colors.heading,
      fontSize: 15,
      minHeight: 48,
      paddingHorizontal: Spacing.md,
    },
    createErrorText: {
      color: Colors.error,
      fontSize: 12,
      fontWeight: "600",
      marginTop: Spacing.xs,
    },
    createActions: {
      flexDirection: "row",
      gap: Spacing.md,
      justifyContent: "flex-end",
      marginTop: Spacing.md,
    },
    cancelButton: {
      alignItems: "center",
      borderColor: Colors.border,
      borderRadius: AppRadius.pill,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: Spacing.lg,
    },
    cancelButtonText: {
      color: Colors.text2,
      fontSize: 14,
      fontWeight: "700",
    },
    saveCategoryButton: {
      alignItems: "center",
      backgroundColor: Colors.primaryDark,
      borderRadius: AppRadius.pill,
      flexDirection: "row",
      gap: Spacing.xs,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: Spacing.lg,
    },
    saveCategoryButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },
    buttonDisabled: {
      opacity: 0.7,
    },
  });
