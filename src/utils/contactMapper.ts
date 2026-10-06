import type * as Contacts from "expo-contacts";
import { parsePhoneNumber } from "libphonenumber-js";

import { isValidEmail } from "@/utils/validation";

export type NormalizedImportContact = {
  deviceContactId: string;
  displayName: string;
  email?: string;
  firstName: string;
  lastName?: string;
  phoneCountryCode: string;
  phoneDisplay: string;
  phoneNumber: string;
};

const splitContactName = (contact: Contacts.ExistingContact, fallback: string) => {
  const firstName = contact.firstName?.trim();

  if (firstName) {
    return { firstName, lastName: contact.lastName?.trim() || undefined };
  }

  const parts = (contact.name || "").trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || fallback,
    lastName: parts.slice(1).join(" ") || undefined,
  };
};

export const normalizeContactForImport = (
  contact: Contacts.ExistingContact,
): NormalizedImportContact | null => {
  const rawPhone = contact.phoneNumbers?.find((entry) => entry.number?.trim())?.number?.trim();

  if (!rawPhone) {
    return null;
  }

  let phoneCountryCode: string;
  let phoneNumber: string;

  try {
    const parsed = parsePhoneNumber(rawPhone, "IN");

    if (!parsed.isValid()) {
      return null;
    }

    phoneCountryCode = `+${parsed.countryCallingCode}`;
    phoneNumber = parsed.nationalNumber;
  } catch {
    return null;
  }

  const { firstName, lastName } = splitContactName(contact, rawPhone);
  const emailCandidate = contact.emails?.find((entry) => entry.email?.trim())?.email?.trim();
  const email = emailCandidate && isValidEmail(emailCandidate) ? emailCandidate : undefined;

  return {
    deviceContactId: contact.id,
    displayName: contact.name?.trim() || firstName,
    email,
    firstName,
    lastName,
    phoneCountryCode,
    phoneDisplay: `${phoneCountryCode} ${phoneNumber}`,
    phoneNumber,
  };
};
