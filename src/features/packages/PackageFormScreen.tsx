// Catalog → Package → Add / Edit.
//
// Feature parity with the web "Create / Edit Package Template" form
// (salon_mgm_frontend/src/components/packages/PackageCreateForm.tsx run in its
// `templateOnly` mode, which is what the web Catalog's Packages → Templates
// tab opens from "New Template"). Same fields, same validation, same payload
// to the same /package-templates endpoints, so a package created here and one
// created on web are the same record.
//
// A package template is the reusable definition — name, the services it covers
// with their session counts, a price and a validity. Selling a copy of it to a
// client stays on the existing Quick Sale "+ Package" flow; nothing here
// charges anyone or touches a client's account.
import { pearl, pearlGradients } from "@/components/auth/pearl/tokens";
import { PearlBackground } from "@/components/auth/pearl/PearlBackground";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { ActivityIndicator } from "@/components/ui/AppActivityIndicator";
import { Text, TextInput } from "@/components/ui/AppTypography";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppLayout, AppRadius } from "@/constants/layout";
import { DashboardRadius as Radius, DashboardSpacing as Spacing } from "@/constants/theme";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { StickyFooterLayout } from "@/components/ui/StickyFooterLayout";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { packageService } from "@/services/package.service";
import { serviceService } from "@/services/service.service";
import { selectActiveBranchId } from "@/store/branch/branch.slice";
import { useAppSelector } from "@/store/hooks";
import { usePearlColors, type PearlColors as ThemeColors } from "@/components/auth/pearl/usePearlColors";
import type { CreatePackageTemplateRequest, PackageTemplate } from "@/types/package";
import type { ServiceListItem } from "@/types/service";
import { getApiErrorMessage } from "@/services/api";
import { currencySymbol, formatCurrency } from "@/utils/currency";
import { toTitleCase } from "@/utils/titleCase";

type PackageFormScreenProps = {
  mode: "create" | "edit";
  templateId?: string;
};

/** How many catalog services the service picker preloads. */
const SERVICE_PAGE_SIZE = 200;
/** Average days in a month — the web form's own figure for the months label. */
const DAYS_PER_MONTH = 30.4368;

type ServiceRow = {
  /** Stable key for the row; unrelated to any catalog service id. */
  key: string;
  name: string;
  price: number;
  priceStr: string;
  /** True once the price has been hand-edited, so sessions stop rescaling it. */
  priceManual: boolean;
  sessions: number;
  sessionsStr: string;
  /** Per-session price, kept so changing Sessions can rescale the row total. */
  unitPrice: number;
};

let rowSequence = 0;
const newServiceRow = (): ServiceRow => {
  rowSequence += 1;

  return {
    key: `row-${rowSequence}`,
    name: "",
    price: 0,
    priceStr: "",
    priceManual: false,
    sessions: 1,
    sessionsStr: "1",
    unitPrice: 0,
  };
};

export function PackageFormScreen({ mode, templateId }: PackageFormScreenProps) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);
  const branchId = useAppSelector(selectActiveBranchId);
  const fieldRefs = useRef<Record<string, TextInput | null>>({});

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validityDaysStr, setValidityDaysStr] = useState("");
  const [neverExpires, setNeverExpires] = useState(false);
  // Optional aggregate cap. Once a sold copy has this many completed sessions
  // across all its services, the client's package closes early — whichever of
  // this and the expiry is hit first ends it. Blank = no cap.
  const [expireAfterServicesStr, setExpireAfterServicesStr] = useState("");
  // Gates the field above. OFF is the normal multi-session package. ON forces
  // every row to exactly 1 session and caps by how many distinct services get
  // used instead. The two modes never combine.
  const [serviceBasedExpiry, setServiceBasedExpiry] = useState(false);
  const [rows, setRows] = useState<ServiceRow[]>([newServiceRow()]);
  const [packagePrice, setPackagePrice] = useState(0);
  const [packagePriceStr, setPackagePriceStr] = useState("");
  const [packagePriceManual, setPackagePriceManual] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [discountStr, setDiscountStr] = useState("");
  // "flat" = money off the package price, "percent" = % of it. The payload
  // always carries the resolved money figure either way.
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  // Templates created before the app existed may carry a GST rate; it has no
  // input here (the web template form has none either), so it is read on edit
  // and sent back untouched rather than silently reset to 0.
  const [gstPercentage, setGstPercentage] = useState(0);

  const [catalogServices, setCatalogServices] = useState<ServiceListItem[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [pickerRowKey, setPickerRowKey] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);

  const symbol = currencySymbol();

  useEffect(() => {
    let active = true;
    setServicesLoading(true);

    void (async () => {
      try {
        const result = await serviceService.getServices(
          { limit: SERVICE_PAGE_SIZE, offset: 0, search: "", sort_by: "name", sort_order: "asc" },
          branchId,
        );
        if (active) setCatalogServices(result.services);
      } catch {
        // The picker falls back to an empty list; the form still saves.
      } finally {
        if (active) setServicesLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [branchId]);

  const applyTemplate = useCallback((template: PackageTemplate) => {
    setName(template.name);
    setDescription(template.description ?? "");
    setNeverExpires(template.neverExpires);
    // expiryDays is exact; expiryMonths is only the rounded label older
    // templates may be left with, so it is the fallback, not the source.
    setValidityDaysStr(
      template.neverExpires
        ? ""
        : String(
            template.expiryDays ??
              (template.expiryMonths != null ? Math.round(template.expiryMonths * DAYS_PER_MONTH) : ""),
          ),
    );
    setExpireAfterServicesStr(template.expireAfterServices != null ? String(template.expireAfterServices) : "");
    // Reflect the template's own state, or a template saved WITH a cap would
    // load the value into a field the toggle keeps hidden.
    setServiceBasedExpiry(template.expireAfterServices != null);
    setRows(
      template.services.length > 0
        ? template.services.map((service) => {
            rowSequence += 1;

            return {
              key: `row-${rowSequence}`,
              name: service.serviceName,
              price: service.price,
              priceStr: service.price > 0 ? String(service.price) : "",
              priceManual: true,
              sessions: service.totalSessions,
              sessionsStr: String(service.totalSessions),
              unitPrice: service.totalSessions > 0 ? service.price / service.totalSessions : service.price,
            };
          })
        : [newServiceRow()],
    );
    setPackagePrice(template.basePrice);
    setPackagePriceStr(String(template.basePrice));
    setPackagePriceManual(true);
    setGstPercentage(template.gstPercentage);
    setDiscount(template.discount);
    setDiscountStr(template.discount > 0 ? String(template.discount) : "");
    // Templates persist the discount as a flat money figure — a leftover "%"
    // toggle must never reinterpret it as a percentage.
    setDiscountType("flat");
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !templateId) return;
    let active = true;

    void (async () => {
      try {
        const template = await packageService.getPackageTemplateById(templateId);
        if (active) applyTemplate(template);
      } catch (error) {
        if (active) setFormError(getApiErrorMessage(error));
      } finally {
        if (active) setLoadingTemplate(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [applyTemplate, mode, templateId]);

  const servicesTotal = rows.reduce((sum, row) => sum + (row.price || 0), 0);

  // The package price follows the services total until it is hand-edited.
  useEffect(() => {
    if (packagePriceManual) return;
    setPackagePrice(servicesTotal);
    setPackagePriceStr(servicesTotal > 0 ? String(servicesTotal) : "");
  }, [packagePriceManual, servicesTotal]);

  const discountValue =
    discountType === "percent"
      ? Number(((packagePrice * Math.min(Math.max(discount, 0), 100)) / 100).toFixed(2))
      : Math.min(discount, packagePrice);
  const afterDiscount = Math.max(0, packagePrice - discountValue);
  const gstAmount = Number(((afterDiscount * gstPercentage) / 100).toFixed(2));
  const totalAmount = Number((afterDiscount + gstAmount).toFixed(2));
  const validityDays = parseInt(validityDaysStr, 10);

  const namedRows = rows.filter((row) => row.name.trim());
  const totalSessionsSelected = namedRows.reduce((sum, row) => sum + (row.sessions || 0), 0);
  const expireAfterServicesNumber = expireAfterServicesStr.trim()
    ? parseInt(expireAfterServicesStr, 10)
    : null;
  // Live check, recomputed every render so it reacts as the cap or the rows
  // change rather than only at Save. A cap at or above the package's own total
  // sessions can never fire — the package runs out of its own sessions first.
  // Service-based mode forces 1 session per row, so there the total IS the
  // service count and "expires after using all of them" is a real scenario.
  const expireAfterServicesError =
    expireAfterServicesNumber !== null &&
    totalSessionsSelected > 0 &&
    (serviceBasedExpiry
      ? expireAfterServicesNumber > totalSessionsSelected
      : expireAfterServicesNumber >= totalSessionsSelected)
      ? serviceBasedExpiry
        ? `Can't be more than the number of services selected (${totalSessionsSelected}).`
        : `Must be less than the total sessions selected (${totalSessionsSelected}) — otherwise the package finishes on its own first and the cap never applies.`
      : null;

  const patchRow = (key: string, next: Partial<ServiceRow>) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...next } : row)));
  };

  const addRow = () => setRows((current) => [...current, newServiceRow()]);

  const removeRow = (key: string) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((row) => row.key !== key)));
    setDuplicateError(null);
  };

  const setSessions = (row: ServiceRow, value: string) => {
    const sessions = Math.max(1, parseInt(value, 10) || 1);

    if (row.priceManual) {
      // The price was hand-set — only track the new count.
      patchRow(row.key, { sessions, sessionsStr: value });
      return;
    }

    const total = row.unitPrice * sessions;
    patchRow(row.key, {
      price: total,
      priceStr: total > 0 ? String(total) : "",
      sessions,
      sessionsStr: value,
    });
  };

  const pickService = (service: ServiceListItem) => {
    const rowKey = pickerRowKey;
    if (!rowKey) return;

    // The same service twice would silently double-count it in the package
    // total — point staff at the existing row's Sessions field instead.
    const alreadyUsed = rows.some(
      (row) => row.key !== rowKey && row.name.trim().toLowerCase() === service.name.trim().toLowerCase(),
    );

    if (alreadyUsed) {
      setDuplicateError(`${service.name} is already in this package — change its Sessions instead of adding it twice.`);
      setPickerRowKey(null);
      setPickerSearch("");
      return;
    }

    const row = rows.find((item) => item.key === rowKey);
    const sessions = row?.sessions || 1;
    const unitPrice = service.price || 0;
    const total = unitPrice * sessions;

    setDuplicateError(null);
    patchRow(rowKey, {
      name: service.name,
      price: total,
      priceStr: total > 0 ? String(total) : "",
      priceManual: false,
      unitPrice,
    });
    setPickerRowKey(null);
    setPickerSearch("");
  };

  const enableServiceBasedExpiry = (enabled: boolean) => {
    setServiceBasedExpiry(enabled);

    if (!enabled) {
      // The field below is about to hide — clear it so a stale value can't
      // silently ride along on save.
      setExpireAfterServicesStr("");
      return;
    }

    // Force every row to exactly 1 session, rescaling the price unless it was
    // hand-set — the same rule the per-row Sessions field follows.
    setRows((current) =>
      current.map((row) => {
        if (row.priceManual) return { ...row, sessions: 1, sessionsStr: "1" };
        const total = row.unitPrice;

        return { ...row, price: total, priceStr: total > 0 ? String(total) : "", sessions: 1, sessionsStr: "1" };
      }),
    );
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/catalog" as Href);
  };

  const save = async () => {
    Keyboard.dismiss();
    setFormError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setFormError("Package name is required.");
      fieldRefs.current.name?.focus();
      return;
    }
    if (!neverExpires && !(validityDays >= 1)) {
      setFormError("Enter the validity in days (a whole number of 1 or more) or check 'Never expires'.");
      fieldRefs.current.validityDays?.focus();
      return;
    }
    if (namedRows.length === 0) {
      setFormError("Add at least one service.");
      return;
    }
    if (serviceBasedExpiry && !expireAfterServicesStr.trim()) {
      setFormError("Enter how many services this package should expire after, or turn off service-based expiry.");
      fieldRefs.current.expireAfterServices?.focus();
      return;
    }
    if (
      expireAfterServicesStr.trim() &&
      (!Number.isInteger(expireAfterServicesNumber) || (expireAfterServicesNumber ?? 0) <= 0)
    ) {
      setFormError('"Expires after this many services" must be a whole number greater than 0.');
      fieldRefs.current.expireAfterServices?.focus();
      return;
    }
    // The inline message under the field is already on screen, so this gate
    // only blocks the save rather than repeating the same text in the banner.
    if (expireAfterServicesError) {
      fieldRefs.current.expireAfterServices?.focus();
      return;
    }

    const payload: CreatePackageTemplateRequest = {
      basePrice: packagePrice,
      description: description.trim() || null,
      discount: discountValue,
      expireAfterServices: expireAfterServicesNumber,
      // The typed day count is the source of truth; months is the same figure
      // rounded, kept only as the human-friendly label.
      expiryDays: neverExpires ? null : validityDays,
      expiryMonths: neverExpires ? null : Math.max(1, Math.round(validityDays / DAYS_PER_MONTH)),
      gstPercentage,
      name: toTitleCase(name.trim()),
      neverExpires,
      services: namedRows.map((row) => ({
        price: row.price,
        serviceName: row.name,
        totalSessions: row.sessions || 1,
      })),
    };

    setSaving(true);

    try {
      if (mode === "edit" && templateId) await packageService.updatePackageTemplate(templateId, payload);
      else await packageService.createPackageTemplate(payload);

      setSuccessMessage(mode === "create" ? "Package created successfully." : "Package updated successfully.");
      setTimeout(goBack, 550);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const pickerResults = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();

    return query
      ? catalogServices.filter((service) => service.name.toLowerCase().includes(query))
      : catalogServices;
  }, [catalogServices, pickerSearch]);

  if (loadingTemplate) {
    return (
      <PearlBackground>
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <AppStatusBar />
          <View style={styles.centered}>
            <ActivityIndicator color={pearl.accentDeep} size="large" />
          </View>
        </SafeAreaView>
      </PearlBackground>
    );
  }

  return (
    <PearlBackground>
      <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
        <AppStatusBar />
        <StickyFooterLayout
          contentContainerStyle={styles.content}
          header={
            <View style={styles.headerRow}>
              <AppBackButton activeOpacity={0.84} disabled={saving} hitSlop={12} onPress={goBack} />
              <Text translate style={styles.headerTitle}>
                {mode === "create" ? "Add package" : "Edit package"}
              </Text>
              <View style={styles.headerSpacer} />
            </View>
          }
          headerStyle={styles.headerWrap}
          footer={
            <>
              <TouchableOpacity disabled={saving} onPress={goBack} style={styles.cancelButton}>
                <Text translate style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={saving}
                onPress={() => void save()}
                style={[styles.saveButton, saving && styles.disabled]}
              >
                <LinearGradient
                  colors={pearlGradients.primary}
                  end={{ x: 1, y: 1 }}
                  start={{ x: 0, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
                <Text translate style={styles.saveText}>{saving ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </>
          }
        >
          {formError ? (
            <View style={styles.messageError}>
              <Ionicons color={Colors.error} name="alert-circle-outline" size={18} />
              <Text style={styles.messageErrorText}>{formError}</Text>
            </View>
          ) : null}
          {successMessage ? (
            <View style={styles.messageSuccess}>
              <Ionicons color={Colors.success} name="checkmark-circle-outline" size={18} />
              <Text style={styles.messageSuccessText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* 1 — Package details. */}
          <View style={styles.card}>
            <Text translate style={styles.cardTitle}>Package details</Text>

            <Field
              icon="albums-outline"
              label="Package Name"
              onChangeText={setName}
              placeholder="e.g. Bridal Glow"
              ref={(input) => {
                fieldRefs.current.name = input;
              }}
              required
              value={name}
            />

            {!neverExpires ? (
              <Field
                hint="Counted from the day a client buys this package."
                icon="calendar-outline"
                keyboardType="number-pad"
                label="Validity (Days)"
                maxLength={5}
                onChangeText={(value) => setValidityDaysStr(value.replace(/\D/g, ""))}
                placeholder="e.g. 90"
                ref={(input) => {
                  fieldRefs.current.validityDays = input;
                }}
                required
                value={validityDaysStr}
              />
            ) : null}

            <Toggle
              label="Never expires"
              onPress={() => {
                const next = !neverExpires;
                setNeverExpires(next);
                if (next) setValidityDaysStr("");
              }}
              value={neverExpires}
            />

            <Field
              icon="document-text-outline"
              label="Description"
              multiline
              onChangeText={setDescription}
              placeholder="What's included, terms, or anything staff should know before selling this package"
              value={description}
            />
          </View>

          {/* 2 — Services Included. */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text translate style={[styles.cardTitle, styles.cardTitleInline]}>Services Included</Text>
              <TouchableOpacity activeOpacity={0.84} onPress={addRow} style={styles.addRowButton}>
                <Ionicons color={Colors.primaryText} name="add" size={14} />
                <Text translate style={styles.addRowText}>Add service</Text>
              </TouchableOpacity>
            </View>

            {duplicateError ? <Text style={styles.inlineError}>{duplicateError}</Text> : null}

            {rows.map((row, index) => (
              <View key={row.key} style={styles.serviceRow}>
                <View style={styles.serviceRowHead}>
                  <Text style={styles.serviceRowIndex}>{`Service ${index + 1}`}</Text>
                  <TouchableOpacity
                    activeOpacity={0.84}
                    disabled={rows.length <= 1}
                    onPress={() => removeRow(row.key)}
                    style={[styles.rowRemove, rows.length <= 1 && styles.disabled]}
                  >
                    <Ionicons color={Colors.error} name="trash-outline" size={14} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.84}
                  onPress={() => {
                    setPickerRowKey(row.key);
                    setPickerSearch("");
                  }}
                  style={styles.servicePicker}
                >
                  <Ionicons color={Colors.text2} name="cut-outline" size={17} />
                  <Text numberOfLines={1} style={[styles.servicePickerText, !row.name && styles.placeholderText]}>
                    {row.name || "Choose a service"}
                  </Text>
                  <Ionicons color={Colors.text2} name="chevron-down" size={15} />
                </TouchableOpacity>

                <View style={styles.rowFields}>
                  <View style={styles.rowField}>
                    <Field
                      disabled={serviceBasedExpiry}
                      hint={serviceBasedExpiry ? "Locked to 1 — service-based expiry is on." : undefined}
                      keyboardType="number-pad"
                      label="Sessions"
                      onChangeText={(value) => setSessions(row, value.replace(/\D/g, ""))}
                      placeholder="1"
                      value={row.sessionsStr}
                    />
                  </View>
                  <View style={styles.rowField}>
                    <Field
                      keyboardType="decimal-pad"
                      label="Price"
                      onChangeText={(value) =>
                        patchRow(row.key, {
                          price: parseFloat(value) || 0,
                          priceManual: true,
                          priceStr: value,
                        })
                      }
                      placeholder="0"
                      prefix={symbol}
                      value={row.priceStr}
                    />
                  </View>
                </View>
              </View>
            ))}

            {namedRows.length > 0 ? (
              <>
                <Toggle
                  label="Enable service-based expiry"
                  onPress={() => enableServiceBasedExpiry(!serviceBasedExpiry)}
                  value={serviceBasedExpiry}
                />
                <Text translate style={styles.hint}>
                  Locks every service to 1 session each and closes the package after a set number of services are
                  used, instead of tracking sessions per service.
                </Text>

                {serviceBasedExpiry ? (
                  <View style={styles.capField}>
                    <Field
                      error={expireAfterServicesError ?? undefined}
                      hint="Closes the package once this many services (across all rows, 1 session each) have been used — required while this is on."
                      icon="flag-outline"
                      keyboardType="number-pad"
                      label="Expires after this many services"
                      onChangeText={(value) => setExpireAfterServicesStr(value.replace(/\D/g, ""))}
                      placeholder="e.g. 5"
                      ref={(input) => {
                        fieldRefs.current.expireAfterServices = input;
                      }}
                      value={expireAfterServicesStr}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </View>

          {/* 3 — Pricing. */}
          <View style={styles.card}>
            <Text translate style={styles.cardTitle}>Pricing</Text>

            <Field
              hint="Starts from the services total; type your own to override it."
              keyboardType="decimal-pad"
              label="Package price"
              onChangeText={(value) => {
                setPackagePriceStr(value);
                setPackagePrice(parseFloat(value) || 0);
                setPackagePriceManual(true);
              }}
              placeholder="0"
              prefix={symbol}
              required
              value={packagePriceStr}
            />

            <View style={styles.group}>
              <Text translate style={styles.label}>Discount</Text>
              <View style={styles.discountRow}>
                <View style={styles.discountInput}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.prefix}>{discountType === "percent" ? "%" : symbol}</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={(value) => {
                        setDiscountStr(value);
                        setDiscount(parseFloat(value) || 0);
                      }}
                      placeholder="0"
                      placeholderTextColor={Colors.placeholder}
                      style={styles.textInput}
                      value={discountStr}
                    />
                  </View>
                </View>
                <View style={styles.discountToggle}>
                  {(["flat", "percent"] as const).map((type) => {
                    const active = discountType === type;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.84}
                        key={type}
                        onPress={() => setDiscountType(type)}
                        style={[styles.segment, active && styles.segmentActive]}
                      >
                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                          {type === "percent" ? "%" : symbol}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.priceBox}>
              <View style={styles.priceRow}>
                <Text translate style={styles.priceLabel}>Package price</Text>
                <Text style={styles.priceValue}>{formatCurrency(packagePrice)}</Text>
              </View>
              {discountValue > 0 ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    {discountType === "percent"
                      ? `Discount (${Math.min(Math.max(discount, 0), 100)}%)`
                      : "Discount"}
                  </Text>
                  <Text style={styles.priceDiscount}>{`− ${formatCurrency(discountValue)}`}</Text>
                </View>
              ) : null}
              <View style={[styles.priceRow, styles.priceRowTotal]}>
                <Text translate style={styles.priceTotalLabel}>Total amount</Text>
                <Text style={styles.priceTotalValue}>{formatCurrency(totalAmount)}</Text>
              </View>
            </View>
          </View>
        </StickyFooterLayout>

        <BottomSheet
          onClose={() => {
            setPickerRowKey(null);
            setPickerSearch("");
          }}
          pearlStyle
          centered={false}
          title="Choose a service"
          visible={pickerRowKey !== null}
        >
          <View style={styles.searchWrap}>
            <Ionicons color={Colors.text2} name="search-outline" size={17} />
            <TextInput
              autoCorrect={false}
              onChangeText={setPickerSearch}
              placeholder="Search services"
              placeholderTextColor={Colors.placeholder}
              style={styles.searchInput}
              value={pickerSearch}
            />
          </View>

          {servicesLoading && catalogServices.length === 0 ? (
            <View style={styles.pickerState}>
              <ActivityIndicator color={pearl.accentDeep} size="small" />
            </View>
          ) : pickerResults.length === 0 ? (
            <Text translate style={styles.pickerEmpty}>No services found.</Text>
          ) : (
            pickerResults.map((service) => (
              <TouchableOpacity
                activeOpacity={0.84}
                key={service.id}
                onPress={() => pickService(service)}
                style={styles.pickerRow}
              >
                <View style={styles.pickerCopy}>
                  <Text numberOfLines={1} style={styles.pickerName}>{service.name}</Text>
                  <Text numberOfLines={1} style={styles.pickerMeta}>
                    {[service.category, service.durationMinutes ? `${service.durationMinutes} min` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
                <Text style={styles.pickerPrice}>{formatCurrency(service.price)}</Text>
              </TouchableOpacity>
            ))
          )}
        </BottomSheet>
      </SafeAreaView>
    </PearlBackground>
  );
}

function Toggle({ label, onPress, value }: { label: string; onPress: () => void; value: boolean }) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <TouchableOpacity activeOpacity={0.84} onPress={onPress} style={styles.toggleRow}>
      <Text translate style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleActive]}>
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </View>
    </TouchableOpacity>
  );
}

type FieldProps = {
  disabled?: boolean;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  prefix?: string;
  required?: boolean;
} & React.ComponentProps<typeof TextInput>;

const Field = forwardRef<TextInput, FieldProps>(function Field(
  { disabled, error, hint, icon, label, prefix, required, ...props },
  ref,
) {
  const Colors = usePearlColors();
  const styles = useMemo(() => createStyles(Colors), [Colors]);

  return (
    <View style={styles.group}>
      {label ? (
        <Text style={styles.label}>
          <Text translate style={styles.label}>{label}</Text>
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.inputContainer,
          props.multiline && styles.inputContainerMultiline,
          error && styles.inputContainerError,
          disabled && styles.disabled,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        {icon ? <Ionicons color={error ? Colors.error : Colors.text2} name={icon} size={18} /> : null}
        <TextInput
          editable={!disabled}
          placeholderTextColor={Colors.placeholder}
          ref={ref}
          style={[styles.textInput, props.multiline && styles.textArea]}
          {...props}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text translate style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const createStyles = (Colors: ThemeColors) => StyleSheet.create({
  safeArea: { flex: 1 },
  centered: { alignItems: "center", flex: 1, justifyContent: "center" },
  content: { paddingBottom: Spacing.lg, paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  headerWrap: { paddingHorizontal: AppLayout.contentHorizontalPadding, paddingTop: Spacing.sm },
  headerRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  headerSpacer: { width: AppLayout.headerActionSize },
  headerTitle: { color: Colors.heading, flex: 1, fontSize: 20, fontWeight: "800", textAlign: "center" },
  card: { backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: 28, borderWidth: 1, marginBottom: Spacing.md, padding: AppLayout.cardPadding },
  cardHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md },
  cardTitle: { color: Colors.heading, fontSize: 14, fontWeight: "800", marginBottom: Spacing.md },
  /** The header row already spaces the card below it. */
  cardTitleInline: { marginBottom: 0 },
  group: { marginBottom: Spacing.lg },
  label: { color: Colors.text2, fontSize: 13, fontWeight: "800", marginBottom: Spacing.sm },
  required: { color: Colors.error, fontSize: 13, fontWeight: "800" },
  hint: { color: Colors.text2, fontSize: 11, fontWeight: "600", marginTop: 6 },
  errorText: { color: Colors.error, fontSize: 12, fontWeight: "700", marginTop: 6 },
  inlineError: { backgroundColor: Colors.errorBg, borderRadius: AppRadius.control, color: Colors.error, fontSize: 12, fontWeight: "700", marginBottom: Spacing.sm, padding: Spacing.sm },
  inputContainer: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, minHeight: 52, paddingHorizontal: Spacing.md },
  inputContainerError: { borderColor: Colors.error, borderWidth: 1.5 },
  inputContainerMultiline: { alignItems: "flex-start", paddingTop: 14 },
  prefix: { color: Colors.text2, fontSize: 14, fontWeight: "800" },
  textInput: { color: Colors.heading, flex: 1, fontSize: 15, minHeight: 50 },
  textArea: { minHeight: 86, textAlignVertical: "top" },
  addRowButton: { alignItems: "center", borderColor: Colors.primary, borderRadius: AppRadius.pill, borderWidth: 1, flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
  addRowText: { color: Colors.primaryText, fontSize: 12, fontWeight: "800" },
  serviceRow: { backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, marginBottom: Spacing.md, padding: Spacing.md },
  serviceRowHead: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.sm },
  serviceRowIndex: { color: Colors.text2, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  rowRemove: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: Radius.md, height: 30, justifyContent: "center", width: 30 },
  servicePicker: { alignItems: "center", backgroundColor: Colors.card, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md, minHeight: 50, paddingHorizontal: Spacing.md },
  servicePickerText: { color: Colors.heading, flex: 1, fontSize: 14, fontWeight: "700" },
  placeholderText: { color: Colors.placeholder, fontWeight: "600" },
  rowFields: { flexDirection: "row", gap: Spacing.sm },
  rowField: { flex: 1 },
  capField: { marginTop: Spacing.md },
  toggleRow: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing.md, minHeight: 52, paddingHorizontal: Spacing.md },
  toggleLabel: { color: Colors.heading, fontSize: 14, fontWeight: "800" },
  toggle: { backgroundColor: Colors.border, borderRadius: Radius.full, height: 28, justifyContent: "center", padding: 3, width: 52 },
  toggleActive: { backgroundColor: Colors.primary },
  toggleKnob: { backgroundColor: Colors.card, borderRadius: Radius.full, height: 22, width: 22 },
  toggleKnobActive: { alignSelf: "flex-end" },
  discountRow: { flexDirection: "row", gap: Spacing.sm },
  discountInput: { flex: 1 },
  discountToggle: { backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: Radius.md, justifyContent: "center", minHeight: 42, paddingHorizontal: 14 },
  segmentActive: { backgroundColor: Colors.primary },
  segmentText: { color: Colors.text2, fontSize: 13, fontWeight: "800" },
  segmentTextActive: { color: Colors.onPrimary },
  priceBox: { backgroundColor: Colors.backgroundSelected, borderRadius: AppRadius.control, gap: 8, padding: Spacing.md },
  priceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  priceRowTotal: { borderTopColor: Colors.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  priceLabel: { color: Colors.text2, fontSize: 12, fontWeight: "700" },
  priceValue: { color: Colors.heading, fontSize: 13, fontWeight: "700" },
  priceDiscount: { color: Colors.primaryText, fontSize: 13, fontWeight: "800" },
  priceTotalLabel: { color: Colors.primaryText, fontSize: 13, fontWeight: "800" },
  priceTotalValue: { color: Colors.heading, fontSize: 16, fontWeight: "800" },
  searchWrap: { alignItems: "center", backgroundColor: Colors.bg, borderColor: Colors.border, borderRadius: AppRadius.control, borderWidth: 1, flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.md, minHeight: 48, paddingHorizontal: Spacing.md },
  searchInput: { color: Colors.heading, flex: 1, fontSize: 14, minHeight: 46 },
  pickerState: { alignItems: "center", paddingVertical: Spacing.lg },
  pickerEmpty: { color: Colors.text2, fontSize: 13, fontWeight: "600", paddingVertical: Spacing.lg, textAlign: "center" },
  pickerRow: { alignItems: "center", borderBottomColor: Colors.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: Spacing.sm, paddingVertical: 12 },
  pickerCopy: { flex: 1 },
  pickerName: { color: Colors.heading, fontSize: 14, fontWeight: "700" },
  pickerMeta: { color: Colors.text2, fontSize: 11, fontWeight: "600", marginTop: 2 },
  pickerPrice: { color: Colors.primaryText, fontSize: 13, fontWeight: "800" },
  messageError: { alignItems: "center", backgroundColor: Colors.errorBg, borderRadius: AppRadius.control, flexDirection: "row", marginBottom: Spacing.md, padding: Spacing.md },
  messageErrorText: { color: Colors.error, flex: 1, fontSize: 13, fontWeight: "700", marginLeft: Spacing.sm },
  messageSuccess: { alignItems: "center", backgroundColor: Colors.successBg, borderRadius: AppRadius.control, flexDirection: "row", marginBottom: Spacing.md, padding: Spacing.md },
  messageSuccessText: { color: Colors.success, flex: 1, fontSize: 13, fontWeight: "700", marginLeft: Spacing.sm },
  cancelButton: { alignItems: "center", backgroundColor: pearl.glass, borderColor: "rgba(126,120,176,0.45)", borderRadius: 16, borderWidth: 1, justifyContent: "center", minHeight: 50, paddingHorizontal: 20 },
  cancelText: { color: pearl.accentDeep, fontSize: 14, fontWeight: "700" },
  saveButton: { alignItems: "center", borderRadius: 16, flex: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 50, overflow: "hidden" },
  saveText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.65 },
});
