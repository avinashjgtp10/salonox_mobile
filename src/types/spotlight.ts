// Mirrors the backend's SpotlightFeature (spotlight.types.ts) for the fields
// the mobile announcement card actually needs. The full web payload also
// carries walkthrough sections, galleries and a video link — those are only
// rendered on the web app, which is where mobile sends people for detail.
export type SpotlightFeature = {
  featureName: string;
  id: string;
  // The web route this feature lives at, used only to build the "open it on
  // the web app" hint — mobile never navigates with it.
  moduleRoute: string | null;
  module: string;
  releaseDate: string | null;
  shortDescription: string;
};

export type SpotlightList = {
  features: SpotlightFeature[];
  // Ids this user has already explored, per-user, tracked backend-side in
  // spotlight_feature_reads (not the shared notifications is_read flag).
  readIds: string[];
};
