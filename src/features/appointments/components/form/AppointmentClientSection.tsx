import { Text } from "@/components/ui/AppTypography";
import { ClientDatesSheet } from "@/features/quickSale/components/ClientDatesSheet";
import { ClientPickerSheet } from "@/features/quickSale/components/ClientPickerSheet";
import { ClientSearchField } from "@/features/quickSale/components/ClientSearchField";
import { ClientSummaryCard } from "@/features/quickSale/components/ClientSummaryCard";
import { s, Section } from "@/features/quickSale/components/QuickSaleForm";
import type { ClientListItem } from "@/types/client";
import { router, type Href } from "expo-router";
import { useState } from "react";

/** The Quick Sale "Client" card, driven by the booking form's client state. */
export function AppointmentClientSection({
  clientId,
  error,
  fallbackName,
  onClear,
  onSelect,
  renderInline = false,
  selectedClient,
}: {
  clientId: string;
  error?: string;
  // Edit mode only knows the client's name until the record is loaded.
  fallbackName?: string;
  onClear: () => void;
  onSelect: (client: ClientListItem) => void;
  // Inside the Calendar pop-up, where the client profile can't open on top.
  renderInline?: boolean;
  selectedClient: ClientListItem | undefined;
}) {
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isDatesVisible, setIsDatesVisible] = useState(false);
  const name = selectedClient?.fullName ?? fallbackName ?? "";

  return (
    <>
      <Section title="Client">
        {clientId ? (
          <ClientSummaryCard
            clientId={clientId}
            initials={selectedClient?.initials}
            membership={selectedClient?.membership}
            name={name}
            onChange={onClear}
            onEditDates={() => setIsDatesVisible(true)}
            onViewHistory={renderInline ? undefined : () => router.push(`/clients/${clientId}` as Href)}
            phone={selectedClient?.phone}
          />
        ) : (
          <ClientSearchField onAddClient={() => setIsPickerVisible(true)} onSelect={onSelect} />
        )}
        {error ? <Text style={s.error}>{error}</Text> : null}
      </Section>
      <ClientPickerSheet
        onClose={() => setIsPickerVisible(false)}
        onSelect={(client) => { if (client) onSelect(client); }}
        renderInline={renderInline}
        selectedClientId={clientId || null}
        startInCreateMode
        visible={isPickerVisible}
      />
      {clientId ? (
        <ClientDatesSheet
          clientId={clientId}
          clientName={name}
          onClose={() => setIsDatesVisible(false)}
          renderInline={renderInline}
          visible={isDatesVisible}
        />
      ) : null}
    </>
  );
}
