import type { Href } from "expo-router";

export const getStaffDetailsPath = (staffId: string) => `/team/${staffId}` as Href;
