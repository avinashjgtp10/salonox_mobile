import { useEffect, useRef, useState } from "react";
import { AppState, Image, Linking, Modal, View } from "react-native";
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
}: {
  auditId: string;
  onClose: () => void;
  onSelect: (id: string) => Promise<void>;
  canCreateProduct: boolean;
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
  const confirm = async (candidate: RecognizedProduct) => {
    if (locked.current) return;
    if (!candidate.product_id) {
      if (!canCreateProduct) return;
      locked.current = true;
      manual(candidate);
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await onSelect(candidate.product_id);
      if (alive.current) onClose();
    } catch (e) {
      if (alive.current) setError(getApiErrorMessage(e));
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
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
        request.current?.abort();
        onClose();
      }}
    >
      <AuditPage
        title="Smart Product Scanner"
        onBack={() => {
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
        {busy && (
          <>
            <ActivityIndicator />
            <Text style={{ color: c.text2 }}>Checking product details…</Text>
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
                <AuditButton
                  disabled={busy || (!candidate.product_id && !canCreateProduct)}
                  label="Add product"
                  onPress={() => void confirm(candidate)}
                />
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
            disabled={busy}
            onPress={() => manual()}
          />
        )}
        <AuditButton
          label="Close scanner"
          onPress={() => {
            request.current?.abort();
            onClose();
          }}
        />
      </AuditPage>
    </Modal>
  );
}
