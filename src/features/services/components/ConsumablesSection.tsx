import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing, type ThemeColors } from "@/constants/theme";
import { fetchProductsThunk } from "@/middleware/product/product.thunk";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectProductState } from "@/store/product/product.slice";
import { useThemeColors } from "@/theme/ThemeProvider";
import type { ConsumableRecipeItem } from "@/types/consumable";
import type { Product } from "@/types/product";

// Mirrors Web's ConsumablesTab.tsx exactly: a product is eligible to be
// picked as a consumable purely by product_type — there is no separate
// "inventory tracked" flag anywhere in the backend.
const isConsumableType = (type: string | null | undefined) => type === "consumable" || type === "both";

const MIN_SEARCH_LENGTH = 2;
const DEBOUNCE_MS = 300;
const SEED_PAGE_SIZE = 50;
const MAX_RESULTS = 20;

type ConsumablesSectionProps = {
  disabled?: boolean;
  onChange: (items: ConsumableRecipeItem[]) => void;
  value: ConsumableRecipeItem[];
};

export function ConsumablesSection({ disabled = false, onChange, value }: ConsumablesSectionProps) {
  const Colors = useThemeColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const dispatch = useAppDispatch();
  const { loading, products } = useAppSelector(selectProductState);

  const [isAdding, setIsAdding] = useState(false);
  const [query, setQuery] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const hasSeededRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const consumableProducts = useMemo(
    () => products.filter((product) => isConsumableType(product.productType)),
    [products],
  );

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    const pool = trimmed
      ? consumableProducts.filter((product) => product.name.toLowerCase().includes(trimmed))
      : consumableProducts;

    return pool.slice(0, MAX_RESULTS);
  }, [consumableProducts, query]);

  const startAdd = () => {
    setIsAdding(true);
    setAddError(null);
    if (!hasSeededRef.current) {
      hasSeededRef.current = true;
      void dispatch(fetchProductsThunk({ limit: SEED_PAGE_SIZE }));
    }
  };

  const closeAdd = () => {
    setIsAdding(false);
    setQuery("");
    setAddError(null);
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setAddError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = text.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      void dispatch(fetchProductsThunk({ limit: MAX_RESULTS, search: trimmed }));
    }, DEBOUNCE_MS);
  };

  const pickProduct = (product: Product) => {
    if (value.some((item) => item.productId === product.id)) {
      setAddError("This consumable is already added.");
      return;
    }

    const newItem: ConsumableRecipeItem = {
      productId: product.id,
      productName: product.name,
      qty: 1,
      unit: product.measureUnit ?? "",
    };

    onChange([...value, newItem]);
    closeAdd();
  };

  const removeRow = (productId: string) => {
    onChange(value.filter((item) => item.productId !== productId));
  };

  const updateQty = (productId: string, rawText: string) => {
    const qty = parseFloat(rawText) || 0;
    onChange(value.map((item) => (item.productId === productId ? { ...item, qty } : item)));
  };

  return (
    <View>
      {value.map((item) => (
        <View key={item.productId} style={styles.row}>
          <View style={styles.rowInfo}>
            <Text numberOfLines={1} style={styles.rowName}>
              {item.productName ?? item.productId}
            </Text>
            <Text style={styles.rowUnit}>{item.unit || "—"}</Text>
          </View>
          <TextInput
            editable={!disabled}
            keyboardType="decimal-pad"
            onChangeText={(text) => updateQty(item.productId, text)}
            style={styles.qtyInput}
            value={String(item.qty)}
          />
          <TouchableOpacity
            accessibilityLabel={`Remove ${item.productName ?? "consumable"}`}
            disabled={disabled}
            onPress={() => removeRow(item.productId)}
            style={styles.removeButton}
          >
            <Ionicons color={Colors.error} name="trash-outline" size={16} />
          </TouchableOpacity>
        </View>
      ))}

      {value.length === 0 && !isAdding ? (
        <View style={styles.emptyState}>
          <Ionicons color={Colors.text2} name="flask-outline" size={20} />
          <Text style={styles.emptyStateText}>
            Track back-bar products this service consumes. Optional — leave empty if this service doesn&apos;t use
            any.
          </Text>
        </View>
      ) : null}

      {isAdding ? (
        <View style={styles.addBox}>
          <View style={styles.searchRow}>
            <Ionicons color={Colors.text2} name="search-outline" size={16} />
            <TextInput
              autoFocus
              editable={!disabled}
              onChangeText={handleQueryChange}
              placeholder="Search products..."
              placeholderTextColor={Colors.placeholder}
              style={styles.searchInput}
              value={query}
            />
            <TouchableOpacity accessibilityLabel="Close consumable search" onPress={closeAdd}>
              <Ionicons color={Colors.text2} name="close" size={18} />
            </TouchableOpacity>
          </View>

          {loading ? <ActivityIndicator color={Colors.primary} style={styles.loadingIndicator} /> : null}

          {!loading && results.length === 0 ? (
            <Text style={styles.noResultsText}>
              {consumableProducts.length === 0
                ? "No consumable-type products found. Mark a product as Consumable or Both in Inventory first."
                : "No matching products."}
            </Text>
          ) : null}

          {results.map((product) => (
            <TouchableOpacity
              key={product.id}
              activeOpacity={0.84}
              onPress={() => pickProduct(product)}
              style={styles.resultRow}
            >
              <Text numberOfLines={1} style={styles.resultName}>
                {product.name}
              </Text>
              <Text style={styles.resultStock}>
                {product.stockQuantity} {product.measureUnit ?? ""}
              </Text>
            </TouchableOpacity>
          ))}

          {addError ? <Text style={styles.errorText}>{addError}</Text> : null}
        </View>
      ) : (
        <TouchableOpacity activeOpacity={0.84} disabled={disabled} onPress={startAdd} style={styles.addButton}>
          <Ionicons color={Colors.primaryDark} name="add" size={16} />
          <Text style={styles.addButtonText}>Add consumable</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    row: {
      alignItems: "center",
      backgroundColor: Colors.bg,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      flexDirection: "row",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    rowInfo: {
      flex: 1,
    },
    rowName: {
      color: Colors.heading,
      fontSize: 13,
      fontWeight: "700",
    },
    rowUnit: {
      color: Colors.text2,
      fontSize: 11,
      marginTop: 2,
    },
    qtyInput: {
      backgroundColor: Colors.card,
      borderColor: Colors.border,
      borderRadius: Radius.sm,
      borderWidth: 1,
      color: Colors.heading,
      fontSize: 13,
      height: 40,
      paddingHorizontal: 10,
      textAlign: "center",
      width: 64,
    },
    removeButton: {
      alignItems: "center",
      backgroundColor: Colors.errorBg,
      borderRadius: AppRadius.control,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    emptyState: {
      alignItems: "center",
      backgroundColor: Colors.bg,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderStyle: "dashed",
      gap: Spacing.sm,
      marginBottom: Spacing.md,
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.lg,
    },
    emptyStateText: {
      color: Colors.text2,
      fontSize: 12,
      lineHeight: 18,
      textAlign: "center",
    },
    addBox: {
      backgroundColor: Colors.bg,
      borderColor: Colors.border,
      borderRadius: Radius.md,
      borderWidth: 1,
      padding: Spacing.sm,
    },
    searchRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    searchInput: {
      color: Colors.heading,
      flex: 1,
      fontSize: 14,
      height: 36,
    },
    loadingIndicator: {
      marginVertical: Spacing.sm,
    },
    noResultsText: {
      color: Colors.text2,
      fontSize: 12,
      lineHeight: 18,
      paddingVertical: Spacing.sm,
    },
    resultRow: {
      alignItems: "center",
      borderTopColor: Colors.border,
      borderTopWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 10,
    },
    resultName: {
      color: Colors.heading,
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      marginRight: Spacing.sm,
    },
    resultStock: {
      color: Colors.text2,
      fontSize: 12,
    },
    errorText: {
      color: Colors.error,
      fontSize: 12,
      fontWeight: "700",
      marginTop: Spacing.sm,
    },
    addButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      flexDirection: "row",
      gap: 6,
    },
    addButtonText: {
      color: Colors.primaryDark,
      fontSize: 13,
      fontWeight: "800",
    },
  });
