import { useAppSelector } from "@/store/hooks";
import { selectSalonCountry } from "@/store/salon/region.selectors";
import { taxIdLabelForCountry, taxNameForCountry, type TaxName } from "@/utils/taxLabels";

/**
 * "GST" or "VAT" for the active salon's country, reactive to a branch switch.
 * The mobile counterpart of the web's useTaxRegime().
 */
export const useTaxName = (): TaxName => taxNameForCountry(useAppSelector(selectSalonCountry));

/** "GSTIN" or "TRN" — the label for the salon's tax registration number. */
export const useTaxIdLabel = (): string => taxIdLabelForCountry(useAppSelector(selectSalonCountry));
