export type SpotlightStatus = "draft" | "published" | "archived";

export type TargetAudience = "owner" | "manager" | "staff" | "all";

export interface SpotlightImage {
  imageDataUrl: string;
  description?: string;
}

export interface SpotlightFeature {
  id: string;
  featureName: string;
  module: string;
  moduleRoute?: string;
  shortDescription: string;
  whatIsThis: string;
  howItWorks: string;
  benefits: string;
  /** @deprecated kept for backward compatibility with older seed/localStorage data — use `images` instead. */
  imageDataUrl?: string;
  images?: SpotlightImage[];
  videoDataUrl?: string;
  releaseDate: string;
  targetAudience: TargetAudience[];
  status: SpotlightStatus;
  createdAt: string;
  updatedAt: string;
}

export type SpotlightCreatePayload = Omit<SpotlightFeature, "id" | "createdAt" | "updatedAt">;
export type SpotlightUpdatePayload = Partial<SpotlightCreatePayload>;

export const TARGET_AUDIENCE_OPTIONS: { value: TargetAudience; label: string }[] = [
  { value: "all", label: "All Users" },
  { value: "owner", label: "Salon Owner" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];
