export type UserProfileApiItem = {
  address?: string | null;
  address_line?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  business_name?: string | null;
  businessName?: string | null;
  country?: string | null;
  country_code?: string | null;
  countryCode?: string | null;
  date_of_birth?: string | null;
  dateOfBirth?: string | null;
  dob?: string | null;
  email?: string | null;
  first_name?: string | null;
  firstName?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  gender?: string | null;
  id?: string | number | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  isActive?: boolean | null;
  isVerified?: boolean | null;
  last_name?: string | null;
  lastName?: string | null;
  mobile?: string | null;
  name?: string | null;
  phone?: string | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
  salon_name?: string | null;
  sex?: string | null;
  _id?: string | null;
  [key: string]: unknown;
};

export type UserProfileApiData =
  | UserProfileApiItem
  | {
      data?: UserProfileApiItem | null;
      profile?: UserProfileApiItem | null;
      user?: UserProfileApiItem | null;
    };

export type UserProfile = {
  address: string | null;
  avatarUrl: string | null;
  businessName: string | null;
  country: string | null;
  countryCode: string | null;
  dateOfBirth: string | null;
  email: string | null;
  firstName: string | null;
  fullName: string;
  gender: string | null;
  id: string;
  isActive: boolean | null;
  isVerified: boolean | null;
  lastName: string | null;
  phone: string | null;
  role: string | null;
};

export type UpdateProfileRequest = {
  address?: string;
  businessName?: string;
  dateOfBirth?: string;
  fullName?: string;
  gender?: string;
  phone?: string;
};

export type UpdateProfileResponse = {
  message?: string;
  profile: UserProfile;
};

export type AvatarUploadAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

export type UploadAvatarResponse = {
  avatarUrl: string | null;
  message?: string;
  profile: UserProfile | null;
};
