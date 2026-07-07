import type { Href } from "expo-router";

export const getStaffDetailsPath = (staffId: string) => `/team/${staffId}` as Href;
export const getStaffEditPath = (staffId: string) => `/team/${staffId}/edit` as Href;
export const getStaffAddressPath = (staffId: string) => `/team/${staffId}/address` as Href;
export const getStaffEmergencyContactsPath = (staffId: string) =>
  `/team/${staffId}/emergency-contacts` as Href;
