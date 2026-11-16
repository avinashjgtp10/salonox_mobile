import { BookingSection } from "./BookingSection";
import { Text } from "@/components/ui/AppTypography";
import { ClientSearchField } from "@/features/quickSale/components/ClientSearchField";
import { ClientSummaryCard } from "@/features/quickSale/components/ClientSummaryCard";
import { s } from "@/features/quickSale/components/QuickSaleForm";
import type { ClientListItem } from "@/types/client";
import { router, type Href } from "expo-router";

/** The Quick Sale "Client" card, driven by the booking form's client state.
 *
 * The picker and dates sheets are deliberately NOT rendered here. Inside the
 * Calendar pop-up they render inline (absolutely filling their parent) rather
 * than through the app-root Portal, so a sheet mounted here would be trapped
 * inside this small card. The screen owns them instead. */
export function AppointmentClientSection({
  clientId,
  error,
  fallbackName,
  onAddClient,
  onClear,
  onEditDates,
  onSelect,
  renderInline = false,
  selectedClient,
}: {
  clientId: string;
  error?: string;
  // Edit mode only knows the client's name until the record is loaded.
  fallbackName?: string;
  // Opens the screen-level picker, carrying whatever was typed in the search box.
  onAddClient: (prefill: string) => void;
  onClear: () => void;
  onEditDates: () => void;
  onSelect: (client: ClientListItem) => void;
  // Inside the Calendar pop-up, where the client profile can't open on top.
  renderInline?: boolean;
  selectedClient: ClientListItem | undefined;
}) {
  const name = selectedClient?.fullName ?? fallbackName ?? "";

  return (
    <BookingSection title="Client">
      {clientId ? (
        <ClientSummaryCard
          clientId={clientId}
          initials={selectedClient?.initials}
          membership={selectedClient?.membership}
          name={name}
          onChange={onClear}
          onEditDates={onEditDates}
          onViewHistory={renderInline ? undefined : () => router.push(`/clients/${clientId}` as Href)}
          phone={selectedClient?.phone}
        />
      ) : (
        <ClientSearchField pearlStyle onAddClient={(prefill) => onAddClient(prefill ?? "")} onSelect={onSelect} />
      )}
      {error ? <Text translate style={s.error}>{error}</Text> : null}
    </BookingSection>
  );
}
