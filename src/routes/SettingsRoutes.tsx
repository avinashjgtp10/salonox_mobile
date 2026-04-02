import { Routes, Route, Navigate } from "react-router-dom"
import SettingsPage from "../features/settings/pages/SettingsPage"
import BusinessSetupPage from "../features/settings/pages/BusinessSetupPage"
import EditBusinessDetailsPage from "../features/settings/pages/EditBusinessDetailsPage"
import AddLocationPage from "../features/settings/pages/AddLocationPage"
import LocationDetailsPage from "../features/settings/pages/LocationDetailsPage"
import EditLocationBasicInfoPage from "../features/settings/pages/EditLocationBasicInfoPage"
import EditLocationBusinessTypePage from "../features/settings/pages/EditLocationBusinessTypePage"
import EditLocationAddressPage from "../features/settings/pages/EditLocationAddressPage"
import EditLocationOpeningHoursPage from "../features/settings/pages/EditLocationOpeningHoursPage"
import EditLocationTaxDefaultsPage from "../features/settings/pages/EditLocationTaxDefaultsPage"
import EditLocationReceiptSequencingPage from "../features/settings/pages/EditLocationReceiptSequencingPage"
import EditLocationTippingPage from "../features/settings/pages/EditLocationTippingPage"
import BillingPage from "../features/settings/pages/BillingPage"
import AddBillingDetailsPage from "../features/settings/pages/AddBillingDetailsPage"
import PlanDetailsPage from "../features/settings/pages/PlanDetailsPage"
import CancelPlanWizardPage from "../features/settings/pages/CancelPlanWizardPage"
import SalesPage from "../features/settings/pages/SalesPage"
import SettingsPaymentsPage from "../features/settings/pages/PaymentsPage"
import AddNewTaxPage from "../features/settings/pages/AddNewTaxPage"
import EditReceiptSettingsPage from "../features/settings/pages/EditReceiptSettingsPage"
import ReceiptSequencingPage from "../features/settings/pages/ReceiptSequencingPage"
import EditDefaultTipValuesPage from "../features/settings/pages/EditDefaultTipValuesPage"
import EditTipCalculationPage from "../features/settings/pages/EditTipCalculationPage"
import AdvancedTippingOptionsPage from "../features/settings/pages/AdvancedTippingOptionsPage"
import AddServiceChargePage from "../features/settings/pages/AddServiceChargePage"
import EditGiftCardSettingsPage from "../features/settings/pages/EditGiftCardSettingsPage"
import SchedulingSettingsPage from "../features/settings/pages/SchedulingSettingsPage"
import EditDateAndTimeSettingsPage from "../features/settings/pages/EditDateAndTimeSettingsPage"
import EditCalendarSettingsPage from "../features/settings/pages/EditCalendarSettingsPage"
import EditOnlineProfileContentPage from "../features/settings/pages/EditOnlineProfileContentPage"
import AddResourcePage from "../features/settings/pages/AddResourcePage"
import TeamSettingsPage from "../features/settings/pages/TeamSettingsPage"
import AddPermissionRolePage from "../features/settings/pages/AddPermissionRolePage"
import AddSalesPaymentMethodPage from "../features/settings/pages/AddSalesPaymentMethodPage"
import EditSalesPaymentMethodPage from "../features/settings/pages/EditSalesPaymentMethodPage"
import AddClosedPeriodPage from "../features/settings/pages/AddClosedPeriodPage"
import EditCancellationReasonPage from "../features/settings/pages/EditCancellationReasonPage"
import ChangeCancellationReasonsOrderPage from "../features/settings/pages/ChangeCancellationReasonsOrderPage"
import EditWaitlistPage from "../features/settings/pages/EditWaitlistPage"
import EditBlockedTimePage from "../features/settings/pages/EditBlockedTimePage"
import AddBlockedTimePage from "../features/settings/pages/AddBlockedTimePage"
import EditAppointmentStatusPage from "../features/settings/pages/EditAppointmentStatusPage"
import ChangePaymentOrderPage from "../features/settings/pages/ChangePaymentOrderPage"
import ClientsPage from "../features/settings/pages/ClientsPage"
import AddClientSourcePage from "../features/settings/pages/AddClientSourcePage"
import ChangeClientSourceOrderPage from "../features/settings/pages/ChangeClientSourceOrderPage"
import CreateClientTagPage from "../features/settings/pages/CreateClientTagPage"
import MessagingActivityPage from "../features/settings/pages/MessagingActivityPage"
import EditBillingAddressPage from "../features/settings/pages/EditBillingAddressPage"
import EditNotificationsPage from "../features/settings/pages/EditNotificationsPage"

export const SettingsRoutes = () => (
    <Routes>
      <Route index element={<SettingsPage />} />
      <Route path="business-setup" element={<BusinessSetupPage />} />
      <Route path="business-setup/business-details/edit" element={<EditBusinessDetailsPage />} />
      <Route path="business-details" element={<Navigate to="/dashboard/settings/business-setup" replace />} />
      <Route path="locations" element={<AddLocationPage />} />
      <Route path="locations/:id" element={<LocationDetailsPage />} />
      <Route path="locations/:id/basic-info/edit" element={<EditLocationBasicInfoPage />} />
      <Route path="locations/:id/business-types/edit" element={<EditLocationBusinessTypePage />} />
      <Route path="locations/:id/address/edit" element={<EditLocationAddressPage />} />
      <Route path="locations/:id/opening-hours/edit" element={<EditLocationOpeningHoursPage />} />
      <Route path="locations/:id/tax-defaults/edit" element={<EditLocationTaxDefaultsPage />} />
      <Route path="locations/:id/receipt-sequencing/edit" element={<EditLocationReceiptSequencingPage />} />
      <Route path="locations/:id/tipping/edit" element={<EditLocationTippingPage />} />
      <Route path="billing" element={<BillingPage />} />
      <Route path="billing/subscriptions/fresha-for-business" element={<PlanDetailsPage />} />
      <Route path="billing/subscriptions/cancel" element={<CancelPlanWizardPage />} />
      <Route path="billing/payment-method/add" element={<AddBillingDetailsPage />} />
      <Route path="billing/messaging/activity" element={<MessagingActivityPage />} />
      <Route path="billing/address/edit" element={<EditBillingAddressPage />} />
      <Route path="sales" element={<SalesPage />} />
      <Route path="sales/payment-methods/create" element={<AddSalesPaymentMethodPage />} />
      <Route path="sales/payment-methods/edit/:id" element={<EditSalesPaymentMethodPage />} />
      <Route path="sales/payment-methods/change-order" element={<ChangePaymentOrderPage />} />
      <Route path="payments" element={<SettingsPaymentsPage />} />
      <Route path="sales/tax-rates/create" element={<AddNewTaxPage />} />
      <Route path="sales/receipts/edit" element={<EditReceiptSettingsPage />} />
      <Route path="sales/receipts/bulk-edit" element={<ReceiptSequencingPage />} />
      <Route path="sales/tipping/edit" element={<EditDefaultTipValuesPage />} />
      <Route path="sales/tipping/tip-calculation" element={<EditTipCalculationPage />} />
      <Route path="sales/tipping/advanced-tipping" element={<AdvancedTippingOptionsPage />} />
      <Route path="sales/service-charges/create" element={<AddServiceChargePage />} />
      <Route path="sales/gift-cards/edit" element={<EditGiftCardSettingsPage />} />
      <Route path="scheduling" element={<SchedulingSettingsPage />} />
      <Route path="scheduling/time-and-calendar/edit" element={<EditDateAndTimeSettingsPage />} />
      <Route path="scheduling/calendar/edit" element={<EditCalendarSettingsPage />} />
      <Route path="scheduling/appointment-statuses/add" element={<EditAppointmentStatusPage />} />
      <Route path="scheduling/appointment-statuses/edit/:id" element={<EditAppointmentStatusPage />} />
      <Route path="scheduling/waitlist/edit" element={<EditWaitlistPage />} />
      <Route path="scheduling/blocked-time-types/edit/:id" element={<EditBlockedTimePage />} />
      <Route path="scheduling/blocked-time-types/add" element={<AddBlockedTimePage />} />
      <Route path="scheduling/resources/add" element={<AddResourcePage />} />
      <Route path="scheduling/cancellation-reasons/add" element={<EditCancellationReasonPage />} />
      <Route path="scheduling/cancellation-reasons/edit/:id" element={<EditCancellationReasonPage />} />
      <Route path="scheduling/cancellation-reasons/order" element={<ChangeCancellationReasonsOrderPage />} />
      <Route path="scheduling/closed-periods/add" element={<AddClosedPeriodPage />} />
      <Route path="online-booking" element={<EditOnlineProfileContentPage />} />
      <Route path="team" element={<TeamSettingsPage />} />
      <Route path="team/permissions/add" element={<AddPermissionRolePage />} />
      <Route path="clients" element={<ClientsPage />} />
      <Route path="clients/client-sources/add" element={<AddClientSourcePage />} />
      <Route path="clients/client-sources/change-order" element={<ChangeClientSourceOrderPage />} />
      <Route path="clients/client-tags/create" element={<CreateClientTagPage />} />
      <Route path="notifications" element={<EditNotificationsPage />} />
    </Routes>
)
