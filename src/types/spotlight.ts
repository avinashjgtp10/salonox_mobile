export type SpotlightFeature = {
  featureName: string;
  id: string;
  moduleRoute: string | null;
  module: string;
  releaseDate: string | null;
  shortDescription: string;
};

export type SpotlightList = {
  features: SpotlightFeature[];
  readIds: string[];
};
