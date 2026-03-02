export type RegionOption = {
  id: string;
  name: string;
};

export type MunicipalityOption = {
  id: string;
  name: string;
  regionId: string;
};

export type LocationSelection = {
  id: string;
  label: string;
  type: "region" | "municipality";
};
