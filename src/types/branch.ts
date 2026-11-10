export type Branch = {
  id: string;
  name: string;
  city: string;
  isActive: boolean;
  isMain?: boolean;
  timezone?: string;
  country?: string;
  countryCode?: string;
};
