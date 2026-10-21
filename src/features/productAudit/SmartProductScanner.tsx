import { useEffect, useRef, useState } from "react";
import { AppState, Image, Linking, Modal, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, type Href } from "expo-router";
import { Text } from "@/components/ui/AppTypography";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { productAuditService } from "@/services/productAudit.service";
import { getApiErrorMessage } from "@/services/api";
import { useThemeColors } from "@/theme/ThemeProvider";
import type {
  RecognitionResult,
  RecognizedProduct,
} from "@/types/productAudit";
import {
  AuditPage,
  AuditButton,
  AuditField,
  AuditCard,
  auditStyles,
} from "./AuditUI";

export function SmartProductScanner({
  auditId,
  onClose,
  onSelect,
  canCreateProduct,
  existingProductIds = [],
}: {
  auditId: string;
  onClose: () => void;
  onSelect: (ids: string[]) => Promise<void>;
  canCreateProduct: boolean;
  existingProductIds?: string[];
}) {
  const c = useThemeColors();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const locked = useRef(false);
  const request = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"barcode" | "photo" | "search">("barcode");
  const [barcode, setBarcode] = useState("");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Record<string, RecognizedProduct>>({});
  const [adding, setAdding] = useState(false);
  const selectedProducts = Object.values(selected);
  const existingIds = new Set(existingProductIds);
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener("change", (s) => {
      setActive(s === "active");
      if (s !== "active") setReady(false);
    });
    return () => {
      alive.current = false;
      request.current?.abort();
      sub.remove();
    };
  }, []);
  const identify = async (input: {
    barcode?: string;
    query?: string;
    image?: { base64: string; mime_type: string };
  }) => {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError("");
    setResult(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const found = await productAuditService.recognize(
        auditId,
        input,
        controller.signal,
      );
      if (alive.current) {
        setResult(found);
      }
    } catch (e) {
      if (alive.current && !controller.signal.aborted)
        setError(getApiErrorMessage(e));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const capture = async () => {
    if (!camera.current || !ready || locked.current) return;
    // Lock immediately so repeated taps cannot take concurrent photos.
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      const photo = await camera.current.takePictureAsync({
        base64: true,
        quality: 0.55,
        exif: false,
      });
      if (!alive.current) return;
      if (!photo?.base64)
        throw new Error("Unable to capture packaging. Please try again.");
      setPreview(photo.uri);
      locked.current = false;
      await identify({
        barcode: barcode.trim() || undefined,
        image: { base64: photo.base64, mime_type: "image/jpeg" },
      });
    } catch (e) {
      if (alive.current) setError(getApiErrorMessage(e));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const manual = (draft?: RecognizedProduct) => {
    onClose();
    router.push(
      `/product-audits/new-product?auditId=${encodeURIComponent(auditId)}&draft=${encodeURIComponent(JSON.stringify(draft ?? { barcode }))}` as Href,
    );
  };
  const toggleProduct = (candidate: RecognizedProduct) => {
    const id = candidate.product_id;
    if (!id || locked.current || existingIds.has(id)) return;
    setSelected(previous => {
      const next = { ...previous };
      if (next[id]) delete next[id];
      else next[id] = candidate;
      return next;
    });
  };
  const confirm = async () => {
    const ids = Object.keys(selected).filter(id => !existingIds.has(id));
    if (locked.current || !ids.length) return;
    locked.current = true;
    setBusy(true);
    setAdding(true);
    setError("");
    try {
      await onSelect(ids);
      if (alive.current) onClose();
    } catch (e) {
      if (alive.current) setError(getApiErrorMessage(e));
    } finally {
      locked.current = false;
      if (alive.current) { setBusy(false); setAdding(false); }
    }
  };
  const reset = () => {
    setResult(null);
    setPreview(null);
    setError("");
  };
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (adding) return;
        request.current?.abort();
        onClose();
      }}
    >
      <AuditPage
        title="Smart Product Scanner"
        onBack={() => {
          if (adding) return;
          request.current?.abort();
          onClose();
        }}
      >
        <View style={auditStyles.row}>
          {(["barcode", "photo", "search"] as const).map((m) => (
            <AuditButton
              key={m}
              label={
                m === "barcode"
                  ? "Barcode"
                  : m === "photo"
                    ? "Packaging photo"
                    : "Search"
              }
              disabled={busy}
              onPress={() => {
                reset();
                setReady(false);
                setMode(m);
              }}
            />
          ))}
        </View>
        {!result && mode !== "search" && (
          <>
            <Text style={{ color: c.text2 }}>
              {mode === "barcode"
                ? "Place one product barcode inside the frame."
                : "Photograph the front label clearly, including the brand, variant and size."}
            </Text>
            {permission?.granted && active ? (
              <View
                style={{
                  height: 320,
                  borderRadius: 22,
                  overflow: "hidden",
                  backgroundColor: "#111",
                }}
              >
                <CameraView
                  ref={camera}
                  style={{ flex: 1 }}
                  facing="back"
                  onCameraReady={() => setReady(true)}
                  onMountError={() => {
                    setReady(false);
                    setError(
                      "Camera unavailable. Use manual search or product entry.",
                    );
                  }}
                  barcodeScannerSettings={{
                    barcodeTypes: [
                      "ean13",
                      "ean8",
                      "upc_a",
                      "upc_e",
                      "code128",
                      "code39",
                      "itf14",
                    ],
                  }}
                  onBarcodeScanned={
                    mode === "barcode" && !busy && !error
                      ? (scan) => {
                          if (!locked.current) {
                            setBarcode(scan.data);
                            void identify({ barcode: scan.data });
                          }
                        }
                      : undefined
                  }
                />
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 65,
                    left: 35,
                    right: 35,
                    height: 180,
                    borderColor: "white",
                    borderWidth: 2,
                    borderRadius: 20,
                  }}
                />
              </View>
            ) : (
              <AuditCard>
                <Text style={{ color: c.text }}>
                  Camera access is needed to scan products. You can also search
                  or enter details manually.
                </Text>
                <AuditButton
                  label={
                    permission?.canAskAgain === false
                      ? "Open settings"
                      : "Allow camera"
                  }
                  onPress={() => {
                    if (permission?.canAskAgain === false)
                      void Linking.openSettings();
                    else void requestPermission();
                  }}
                />
              </AuditCard>
            )}
            {mode === "photo" && (
              <AuditButton
                label="Identify packaging"
                disabled={!ready || busy || !active}
                onPress={() => void capture()}
              />
            )}
            {mode === "barcode" && (
              <>
                <AuditField
                  label="Barcode (or type it manually)"
                  value={barcode}
                  onChange={setBarcode}
                />
                <AuditButton
                  label="Look up barcode"
                  disabled={!barcode.trim() || busy}
                  onPress={() => void identify({ barcode: barcode.trim() })}
                />
              </>
            )}
          </>
        )}
        {mode === "search" && (
          <>
            <AuditField
              label="Search inventory and external products"
              value={query}
              onChange={setQuery}
            />
            <AuditButton
              label="Search products"
              disabled={!query.trim() || busy}
              onPress={() => void identify({ query: query.trim() })}
            />
          </>
        )}
        <AuditCard>
          <Text accessibilityLiveRegion="polite" style={{ color: c.heading, fontWeight: "700" }}>
            {selectedProducts.length} products selected
          </Text>
          <Text style={{ color: c.text2 }}>Select products below. Your selections stay when you search again.</Text>
          <View style={auditStyles.row}>
            {selectedProducts.map(product => (
              <TouchableOpacity key={product.product_id} accessibilityRole="button"
                accessibilityLabel={`Remove ${product.name} from selection`}
                disabled={busy} onPress={() => toggleProduct(product)}
                style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12, backgroundColor: c.backgroundSelected, maxWidth: "100%" }}>
                <Text style={{ color: c.text, flexShrink: 1 }}>{product.name}</Text>
                <Ionicons name="close" size={18} color={c.text} />
              </TouchableOpacity>
            ))}
          </View>
          <AuditButton label={adding ? "Adding products..." : `Add selected products (${selectedProducts.length})`}
            disabled={busy || !selectedProducts.length} onPress={() => void confirm()} />
          {selectedProducts.length > 0 && <AuditButton label="Clear selection" disabled={busy} onPress={() => setSelected({})} />}
        </AuditCard>
        {busy && (
          <>
            <ActivityIndicator />
            <Text style={{ color: c.text2 }}>{adding ? "Adding selected products..." : "Checking product details…"}</Text>
          </>
        )}
        {!!error && <Text style={{ color: c.error }}>{error}</Text>}
        {preview && (
          <Image
            source={{ uri: preview }}
            style={{ height: 130, borderRadius: 12 }}
            resizeMode="contain"
            accessibilityLabel="Captured product packaging"
          />
        )}
        {result && (
          <>
            {result.warnings
              .filter((warning) => !/^External packaging catalog\b/i.test(warning))
              .map((warning, i) => (
                <Text key={i} style={{ color: c.warning }}>
                  {warning}
                </Text>
              ))}
            {!result.candidates.length && (
              <Text style={{ color: c.text }}>
                No reliable match found. Try a packaging photo, search the
                catalog, or enter the product manually.
              </Text>
            )}
            {result.candidates.map((candidate, i) => (
              <AuditCard
                key={`${candidate.product_id ?? candidate.barcode ?? "candidate"}-${i}`}
              >
                <Text
                  style={{ color: c.heading, fontWeight: "800", fontSize: 18 }}
                >
                  {candidate.name}
                </Text>
                <Text style={{ color: c.text }}>
                  {[candidate.brand, candidate.variant, candidate.size]
                    .filter(Boolean)
                    .join(" · ") || "Details unavailable"}
                </Text>
                <Text style={{ color: c.text2 }}>
                  {candidate.source === "vision" ||
                  candidate.source_label.startsWith("AI web search")
                    ? "SalonOX AI search"
                    : candidate.source_label}
                </Text>
                {candidate.barcode && (
                  <Text style={{ color: c.text2 }}>
                    Barcode: {candidate.barcode}
                  </Text>
                )}
                {candidate.product_id ? (
                  <TouchableOpacity
                    accessibilityRole="checkbox"
                    accessibilityLabel={candidate.name}
                    accessibilityState={{ checked: !!selected[candidate.product_id] || existingIds.has(candidate.product_id), disabled: busy || existingIds.has(candidate.product_id) }}
                    disabled={busy || existingIds.has(candidate.product_id)}
                    onPress={() => toggleProduct(candidate)}
                    style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1,
                      borderColor: selected[candidate.product_id] ? c.focusBorder : c.border,
                      backgroundColor: selected[candidate.product_id] ? c.backgroundSelected : c.bg }}>
                    <Ionicons name={selected[candidate.product_id] || existingIds.has(candidate.product_id) ? "checkbox" : "square-outline"} size={24} color={c.primaryText} />
                    <Text style={{ color: c.text, fontWeight: "700", flexShrink: 1 }}>
                      {existingIds.has(candidate.product_id) ? "Already in audit" : selected[candidate.product_id] ? "Selected — tap to deselect" : "Select product"}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <AuditButton disabled={busy || !canCreateProduct || selectedProducts.length > 0}
                    label="Create product" onPress={() => manual(candidate)} />
                )}
                {!candidate.product_id && selectedProducts.length > 0 && <Text style={{ color: c.text2 }}>Add or clear your selected products before creating a new product.</Text>}
                {!candidate.product_id && !canCreateProduct && (
                  <Text style={{ color: c.text2 }}>
                    Ask a manager with product creation permission to add this
                    product.
                  </Text>
                )}
              </AuditCard>
            ))}
            <AuditButton label="Scan again" disabled={busy} onPress={reset} />
            <AuditButton
              label="Try packaging recognition"
              disabled={busy}
              onPress={() => {
                reset();
                setReady(false);
                setMode("photo");
              }}
            />
          </>
        )}
        {canCreateProduct && (
          <AuditButton
            label="Enter a new product manually"
            disabled={busy || selectedProducts.length > 0}
            onPress={() => manual()}
          />
        )}
        <AuditButton
          label="Close scanner"
          disabled={adding}
          onPress={() => {
            request.current?.abort();
            onClose();
          }}
        />
      </AuditPage>
    </Modal>
  );
}
