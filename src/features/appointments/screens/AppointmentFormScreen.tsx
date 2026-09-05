import { AppBackButton } from "@/components/ui/AppBackButton";
import { AppStatusBar } from "@/components/ui/AppStatusBar";
import { KeyboardAwareScrollView } from "@/components/ui/KeyboardAwareScrollView";
import { AppointmentDateField } from "@/features/appointments/components/form/AppointmentDateField";
import { AppointmentReviewSummary } from "@/features/appointments/components/form/AppointmentReviewSummary";
import { AppointmentStatusDropdown } from "@/features/appointments/components/form/AppointmentStatusDropdown";
import { BookingSection } from "@/features/appointments/components/form/BookingSection";
import { SearchableClientField } from "@/features/appointments/components/form/SearchableClientField";
import { SelectedServicesPanel } from "@/features/appointments/components/form/SelectedServicesPanel";
import { SelectField } from "@/features/appointments/components/form/SelectField";
import { ServiceCatalogPicker } from "@/features/appointments/components/form/ServiceCatalogPicker";
import { TextField } from "@/features/appointments/components/form/TextField";
import { TimeSlotSelector } from "@/features/appointments/components/form/TimeSlotSelector";
import { AppointmentSnackbar } from "@/features/appointments/components/shared/AppointmentSnackbar";
import { PAYMENT_METHODS } from "@/features/appointments/constants/appointmentConstants";
import { getSelectedServiceCatalogId } from "@/features/appointments/utils/appointmentForm";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BookingBottomBar } from '../components/form/BookingBottomBar';
import { useAppointmentForm } from '../hooks/useAppointmentForm';

export function AppointmentFormScreen({ mode }: { mode: 'create' | 'edit' }) {
  const {
    styles,
    serviceCatalogError,
    serviceCatalogLoading,
    setServicePickerVisible,
    handleServicePickerContinue,
    handleSelectService,
    handleSelectStaff,
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
    handleNewClient,
    handleClientSearchChange,
    handleSelectClient,
    handleSelectExistingClientMode,
    handleSelectWalkInClient,
    clientResults,
    clientResultsError,
    clientResultsLoading,
    clientSearch,
    clientSearchInputRef,
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
  } = useAppointmentForm(mode);
  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <AppStatusBar />
      <ServiceCatalogPicker
        error={serviceCatalogError}
        loading={serviceCatalogLoading}
        onClose={() => setServicePickerVisible(false)}
        onContinue={handleServicePickerContinue}
        onSelect={handleSelectService}
        onSelectStaff={handleSelectStaff}
        selectedStaffId={form.staffId}
        selectedServiceIds={selectedServices.map(getSelectedServiceCatalogId)}
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
        style={styles.flex}
      >
        <View style={styles.headerRow}>
          <AppBackButton fallbackHref="/bookings" />
          <View style={styles.appointmentHeaderCopy}>
            <Text style={styles.headerTitle}>{mode === "create" ? "New Appointment" : "Edit Appointment"}</Text>
            <Text style={styles.appointmentHeaderSubtitle}>
              {mode === "create"
                ? "Select a client, date, and time to start the booking."
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

          <View ref={(view) => setFieldRef("clientId", view)}>
            <BookingSection stackIndex={clientDropdownOpen ? 40 : 5} title="Client details">
              <SearchableClientField
                bookingMode={clientBookingMode}
                dropdownOpen={clientDropdownOpen}
                error={errors.clientId}
                onDismiss={dismissClientDropdown}
                onNewClient={handleNewClient}
                onSearchChange={handleClientSearchChange}
                onSelectClient={handleSelectClient}
                onSelectExisting={handleSelectExistingClientMode}
                onSelectWalkIn={handleSelectWalkInClient}
                results={clientResults}
                resultsError={clientResultsError}
                resultsLoading={clientResultsLoading}
                search={clientSearch}
                searchInputRef={clientSearchInputRef}
                selectedClient={selectedClient}
                selectedClientId={form.clientId}
              />
            </BookingSection>
          </View>

          <View style={styles.appointmentCoreRow}>
            <View ref={(view) => setFieldRef("date", view)} style={styles.appointmentCoreField}>
              <AppointmentDateField error={errors.date} onChange={(value) => updateForm("date", value)} value={form.date} />
            </View>
            <View ref={(view) => setFieldRef("startTime", view)} style={styles.appointmentCoreField}>
              <TimeSlotSelector disabledReason={slotDisabledReason} error={errors.startTime} loading={schedulerLoading} onSelect={handleSelectSlot} selectedTime={form.startTime} slots={availableSlots} />
            </View>
            <View ref={(view) => setFieldRef("status", view)} style={[styles.appointmentCoreField, styles.compactStatusField]}>
              <AppointmentStatusDropdown
                error={errors.status}
                onSelect={(value) => updateForm("status", value)}
                value={form.status}
              />
            </View>
          </View>

          <View
            ref={(view) => {
              setFieldRef("serviceName", view);
              setFieldRef("staffId", view);
              setFieldRef("duration", view);
            }}
            style={(errors.serviceName || errors.staffId || errors.duration) && styles.validationSectionError}
          >
            <BookingSection
              action={selectedServices.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setServicePickerVisible(true)}
                  style={styles.bookingSectionActionButton}
                >
                  <Ionicons name="add" size={16} color={Colors.appointmentAccent} />
                  <Text style={styles.bookingSectionAction}>Add more services</Text>
                </TouchableOpacity>
              ) : undefined}
              stackIndex={serviceDropdownOpen ? 40 : 4}
              title={selectedServices.length === 0 ? "" : "Appointment services"}
            >
              {selectedServices.length === 0 ? (
                <TouchableOpacity activeOpacity={0.86} onPress={() => setServicePickerVisible(true)} style={styles.emptyAddServicesButton}>
                  <View style={styles.emptyAddServicesIcon}><Ionicons name="add" size={20} color="#FFFFFF" /></View>
                  <Text style={styles.emptyAddServicesText}>Add Services</Text>
                </TouchableOpacity>
              ) : (
                <SelectedServicesPanel
                  onRemove={handleRemoveSelectedService}
                  pricingTotals={servicePricingTotals}
                  services={selectedServices}
                  totalDuration={totalServiceDuration}
                  totalPrice={totalServicePrice}
                />
              )}
            </BookingSection>
            {errors.serviceName ? <Text style={styles.fieldError}>{errors.serviceName}</Text> : null}
            {errors.staffId ? <Text style={styles.fieldError}>{errors.staffId}</Text> : null}
            {errors.duration ? <Text style={styles.fieldError}>{errors.duration}</Text> : null}
          </View>

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

          <BookingSection title="Appointment summary">
            <AppointmentReviewSummary
              clientLabel={
                clientBookingMode === "walkIn"
                  ? "Walk-in Client"
                  : selectedClient?.fullName ?? "No client selected"
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
                activeOpacity={0.82}
                onPress={() => setSendAppointmentSms((selected) => !selected)}
                style={styles.appointmentDeliveryOption}
              >
                <Ionicons
                  name={sendAppointmentSms ? "checkbox" : "square-outline"}
                  size={20}
                  color={sendAppointmentSms ? Colors.appointmentAccent : Colors.appointmentMuted}
                />
                <Text style={styles.appointmentDeliveryOptionText}>SMS</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => setSendAppointmentEmail((selected) => !selected)}
                style={styles.appointmentDeliveryOption}
              >
                <Ionicons
                  name={sendAppointmentEmail ? "checkbox" : "square-outline"}
                  size={20}
                  color={sendAppointmentEmail ? Colors.appointmentAccent : Colors.appointmentMuted}
                />
                <Text style={styles.appointmentDeliveryOptionText}>Email</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View ref={(view) => setFieldRef("notes", view)}>
            <TextField
              error={errors.notes}
              label="Notes"
              multiline
              onChangeText={(value) => updateForm("notes", value)}
              placeholder="Appointment notes"
              value={form.notes}
            />
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
    </SafeAreaView>
  );
}
