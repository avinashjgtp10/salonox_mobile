import { Text } from "@/components/ui/AppTypography";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { StaffPickerSheet } from "@/features/quickSale/components/StaffPickerSheet";
import { itemTimeLabel, localItemTime } from "@/features/quickSale/utils/itemTime";
import { useState } from "react";
import { useClientPrivacy } from "@/hooks/useClientPrivacy";
import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { AppointmentDateField } from "@/features/appointments/components/form/AppointmentDateField";
import { AppointmentReviewSummary } from "@/features/appointments/components/form/AppointmentReviewSummary";
import { AppointmentStatusDropdown } from "@/features/appointments/components/form/AppointmentStatusDropdown";
import { AppointmentClientSection } from "@/features/appointments/components/form/AppointmentClientSection";
import { AppointmentItemsSection } from "@/features/appointments/components/form/AppointmentItemsSection";
import { BookingSection } from "@/features/appointments/components/form/BookingSection";
import { SelectField } from "@/features/appointments/components/form/SelectField";
import { ServiceCatalogPicker, type PickerTab } from "@/features/appointments/components/form/ServiceCatalogPicker";
import { TextField } from "@/features/appointments/components/form/TextField";
import { TimeSlotSelector } from "@/features/appointments/components/form/TimeSlotSelector";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { PAYMENT_METHODS } from "@/features/appointments/constants/appointmentConstants";
import { getSelectedServiceCatalogId } from "@/features/appointments/utils/appointmentForm";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookingBottomBar } from '../components/form/BookingBottomBar';
import { useAppointmentForm, type AppointmentFormSlot } from '../hooks/useAppointmentForm';

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) =>
  `${String(Math.floor(index / 4)).padStart(2, "0")}:${String((index % 4) * 15).padStart(2, "0")}`);

type Props = {
  mode: 'create' | 'edit';
  // Set when opened inside the Calendar's slot-tap modal.
  initialSlot?: AppointmentFormSlot;
  onRequestClose?: () => void;
};

export function AppointmentFormScreen({ mode, initialSlot, onRequestClose }: Props) {
  const embedded = initialSlot && onRequestClose ? { initialSlot, onRequestClose } : undefined;
  const { clientName } = useClientPrivacy();
  const {
    styles,
    activeBranchId,
    handleToggleCatalogItem,
    serviceCatalogError,
    serviceCatalogLoading,
    setServicePickerVisible,
    handleServicePickerContinue,
    handleSelectService,
    handleSelectStaff,
    handleSetItemStaff,
    handleSetItemTime,
    form,
    selectedServices,
    errors,
    staffMembers,
    serviceCatalog,
    servicePickerVisible,
    scrollViewRef,
    clientDropdownOpen,
    serviceDropdownOpen,
    dismissClientDropdown,
    dismissServiceDropdown,
    setFieldRef,
    clientBookingMode,
    handleClientSearchChange,
    handleSelectClient,
    clientSearch,
    selectedClient,
    updateForm,
    slotDisabledReason,
    schedulerLoading,
    handleSelectSlot,
    availableSlots,
    Colors,
    handleRemoveSelectedService,
    servicePricingTotals,
    totalServiceDuration,
    totalServicePrice,
    selectedStaff,
    setSendAppointmentSms,
    sendAppointmentSms,
    setSendAppointmentEmail,
    sendAppointmentEmail,
    formSubmitError,
    mutationError,
    mutating,
    handleSubmit,
  } = useAppointmentForm(mode, embedded);
  const [staffItemId, setStaffItemId] = useState<string | null>(null);
  const [timeItemId, setTimeItemId] = useState<string | null>(null);
  const [pickerTab, setPickerTab] = useState<PickerTab>("service");
  const staffItem = selectedServices.find((item) => item.id === staffItemId);
  const timeItem = selectedServices.find((item) => item.id === timeItemId);
  const selectedItemTime = localItemTime(timeItem?.startTime) ?? localItemTime(form.startTime);
  const timeOptions = selectedItemTime && !TIME_OPTIONS.includes(selectedItemTime)
    ? [...TIME_OPTIONS, selectedItemTime].sort()
    : TIME_OPTIONS;
  return (
    <SafeAreaView edges={embedded ? [] : ["top"]} style={[styles.safeArea, styles.bookingScreen]}>
      {embedded ? null : <AppStatusBar backgroundColor={Colors.appointmentBackground} />}
      <ServiceCatalogPicker
        error={serviceCatalogError}
        initialTab={pickerTab}
        loading={serviceCatalogLoading}
        onClose={() => setServicePickerVisible(false)}
        onContinue={handleServicePickerContinue}
        onSelect={handleSelectService}
        onSelectStaff={handleSelectStaff}
        selectedStaffId={form.staffId}
        clientId={form.clientId}
        onToggleItem={handleToggleCatalogItem}
        salonId={activeBranchId}
        selectedItems={selectedServices.filter((service) => service.itemKind)}
        selectedServiceIds={selectedServices.filter((service) => !service.itemKind).map(getSelectedServiceCatalogId)}
        staffError={errors.staffId}
        staffMembers={staffMembers}
        services={serviceCatalog}
        visible={servicePickerVisible}
      />
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        contentContainerStyle={[styles.content, styles.bookingContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={[styles.flex, styles.bookingScreen]}
      >
        <View style={styles.headerRow}>
          <AppBackButton fallbackHref="/bookings" onPress={embedded?.onRequestClose} />
          <View style={styles.appointmentHeaderCopy}>
            <Text style={styles.headerTitle}>{mode === "create" ? "New Appointment" : "Edit Appointment"}</Text>
            <Text style={styles.appointmentHeaderSubtitle}>
              {mode === "create"
                ? "Create a booking for your next client."
                : "Update the appointment details below."}
            </Text>
          </View>
        </View>

        <View style={styles.bookingFlow}>
          {clientDropdownOpen || serviceDropdownOpen ? (
            <Pressable
              accessibilityLabel="Close open picker"
              onPress={() => {
                dismissClientDropdown();
                dismissServiceDropdown();
              }}
              style={styles.formDismissOverlay}
            />
          ) : null}

          {/* Client and items sections are Quick Sale's own cards. */}
          <View ref={(view) => setFieldRef("clientId", view)}>
            <AppointmentClientSection
              clientId={form.clientId}
              error={errors.clientId}
              fallbackName={mode === "edit" ? clientSearch : undefined}
              onClear={() => handleClientSearchChange("")}
              onSelect={handleSelectClient}
              renderInline={Boolean(embedded)}
              selectedClient={selectedClient}
            />
          </View>

          <View
            ref={(view) => {
              setFieldRef("serviceName", view);
              setFieldRef("staffId", view);
              setFieldRef("duration", view);
            }}
          >
            <AppointmentItemsSection
              defaultStaffName={selectedStaff?.name}
              defaultTime={form.startTime}
              error={errors.serviceName ?? errors.staffId ?? errors.duration}
              onAdd={(tab) => {
                setPickerTab(tab);
                setServicePickerVisible(true);
              }}
              onPickStaff={setStaffItemId}
              onPickTime={setTimeItemId}
              onRemove={handleRemoveSelectedService}
              services={selectedServices}
            />
          </View>

          <BookingSection icon="calendar-outline" title="Date & time" subtitle="Choose when your client will visit.">
            <View style={styles.bookingScheduleRow}>
              <View ref={(view) => setFieldRef("date", view)} style={styles.bookingScheduleField}>
                <AppointmentDateField error={errors.date} onChange={(value) => updateForm("date", value)} value={form.date} />
              </View>
              <View ref={(view) => setFieldRef("startTime", view)} style={styles.bookingScheduleField}>
                <TimeSlotSelector disabledReason={slotDisabledReason} error={errors.startTime} loading={schedulerLoading} onSelect={handleSelectSlot} selectedTime={form.startTime} slots={availableSlots} />
              </View>
            </View>
            <View ref={(view) => setFieldRef("status", view)}>
              <AppointmentStatusDropdown error={errors.status} onSelect={(value) => updateForm("status", value)} value={form.status} />
            </View>
          </BookingSection>

          {mode === "edit" ? (
            <>
              <View ref={(view) => setFieldRef("discount", view)}>
                <TextField
                  error={errors.discount}
                  keyboardType="decimal-pad"
                  label="Discount"
                  onChangeText={(value) => updateForm("discount", value)}
                  placeholder="0"
                  value={form.discount}
                />
              </View>
              <View ref={(view) => setFieldRef("paymentMethod", view)}>
                <SelectField
                  error={errors.paymentMethod}
                  label="Payment Method"
                  onSelect={(value) => updateForm("paymentMethod", value)}
                  options={PAYMENT_METHODS.map((method) => ({ label: method, value: method }))}
                  value={form.paymentMethod}
                />
              </View>
            </>
          ) : null}

          <BookingSection icon="receipt-outline" title="Booking summary" subtitle="Review the details before confirming.">
            <AppointmentReviewSummary
              clientLabel={
                clientBookingMode === "walkIn"
                  ? "Walk-in Client"
                  : selectedClient ? clientName(selectedClient.fullName) : "No client selected"
              }
              date={form.date}
              pricingTotals={servicePricingTotals}
              selectedStaff={selectedStaff}
              services={selectedServices}
              startTime={form.startTime}
              totalDuration={totalServiceDuration}
            />
          </BookingSection>

          <View style={styles.appointmentDeliverySection}>
            <View style={styles.appointmentDeliveryTitleRow}>
              <Ionicons name="document-text-outline" size={17} color={Colors.appointmentTextSecondary} />
              <Text style={styles.appointmentDeliveryTitle}>Send appointment details on</Text>
            </View>
            <View style={styles.appointmentDeliveryOptions}>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sendAppointmentSms }}
                activeOpacity={0.82}
                onPress={() => setSendAppointmentSms((selected) => !selected)}
                style={styles.appointmentDeliveryOption}
              >
                <Ionicons
                  name={sendAppointmentSms ? "checkbox" : "square-outline"}
                  size={20}
                  color={sendAppointmentSms ? Colors.primaryText : Colors.appointmentMuted}
                />
                <Text style={styles.appointmentDeliveryOptionText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sendAppointmentEmail }}
                activeOpacity={0.82}
                onPress={() => setSendAppointmentEmail((selected) => !selected)}
                style={styles.appointmentDeliveryOption}
              >
                <Ionicons
                  name={sendAppointmentEmail ? "checkbox" : "square-outline"}
                  size={20}
                  color={sendAppointmentEmail ? Colors.primaryText : Colors.appointmentMuted}
                />
                <Text style={styles.appointmentDeliveryOptionText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View ref={(view) => setFieldRef("notes", view)}>
            <BookingSection icon="create-outline" title="Notes">
            <TextField
              error={errors.notes}
              label="Optional appointment notes"
              multiline
              onChangeText={(value) => updateForm("notes", value)}
              placeholder="Preferences or anything the team should know"
              value={form.notes}
            />
            </BookingSection>
          </View>

          {formSubmitError || mutationError ? (
            <View style={styles.inlineAlert}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
              <Text style={styles.inlineAlertText}>{formSubmitError ?? mutationError}</Text>
            </View>
          ) : null}
        </View>
      </KeyboardAwareScrollView>
      <BookingBottomBar serviceCount={selectedServices.length} totalServiceDuration={totalServiceDuration} totalServicePrice={totalServicePrice} mutating={mutating} mode={mode} onSubmit={handleSubmit} />
      <AppointmentSnackbar />
      <StaffPickerSheet
        onClose={() => setStaffItemId(null)}
        onSelect={(staffId, staffName) => {
          if (staffItemId) handleSetItemStaff(staffItemId, staffId, staffName);
          setStaffItemId(null);
        }}
        renderInline={Boolean(embedded)}
        selectedStaffId={staffItem ? staffItem.staffId || form.staffId || null : null}
        staff={staffMembers}
        subtitle={staffItem?.name}
        title="Select staff for this item"
        visible={Boolean(staffItem)}
      />
      <BottomSheet onClose={() => setTimeItemId(null)} renderInline={Boolean(embedded)} scrollable={false} subtitle={timeItem?.name} title="Select time" visible={Boolean(timeItem)}>
        <FlatList
          data={timeOptions}
          getItemLayout={(_, index) => ({ index, length: 48, offset: 48 * index })}
          initialScrollIndex={Math.max(0, timeOptions.indexOf(selectedItemTime ?? "") - 2)}
          keyExtractor={(time) => time}
          renderItem={({ item: time }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: time === selectedItemTime }}
              onPress={() => {
                if (timeItemId) handleSetItemTime(timeItemId, time);
                setTimeItemId(null);
              }}
              style={[timeStyles.row, time === selectedItemTime && { backgroundColor: Colors.bg2 }]}
            >
              <Text style={[timeStyles.text, { color: Colors.heading }]}>{itemTimeLabel(time)}</Text>
              {time === selectedItemTime ? <Ionicons name="checkmark" size={20} color={Colors.primaryText} /> : null}
            </Pressable>
          )}
          style={{ height: 320 }}
        />
      </BottomSheet>
    </SafeAreaView>
  );
}

const timeStyles = StyleSheet.create({
  row: { alignItems: "center", borderRadius: 10, flexDirection: "row", height: 48, justifyContent: "space-between", paddingHorizontal: 16 },
  text: { fontSize: 15, fontWeight: "600" },
});
