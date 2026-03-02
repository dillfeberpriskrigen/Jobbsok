import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  account,
  keywords,
  locations,
  municipalities,
  regions,
  savedJobs,
  session,
  user,
  verification,
} from "./authSchema";

export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;

export type Keyword = InferSelectModel<typeof keywords>;
export type NewKeyword = InferInsertModel<typeof keywords>;

export type SavedJob = InferSelectModel<typeof savedJobs>;
export type NewSavedJob = InferInsertModel<typeof savedJobs>;

export type Region = InferSelectModel<typeof regions>;
export type NewRegion = InferInsertModel<typeof regions>;

export type Municipality = InferSelectModel<typeof municipalities>;
export type NewMunicipality = InferInsertModel<typeof municipalities>;

export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;

export type UserWithRelations = User & {
  sessions?: Session[];
  accounts?: Account[];
};

export type SessionWithUser = Session & {
  user?: User;
};

export type AccountWithUser = Account & {
  user?: User;
};

export type KeywordWithUser = Keyword & {
  user?: User;
};

export type RegionWithMunicipalities = Region & {
  municipalities?: Municipality[];
};

export type MunicipalityWithRegion = Municipality & {
  region?: Region;
};

export type LocationWithRelations = Location & {
  user?: User;
  region?: Region;
  municipality?: Municipality;
};
