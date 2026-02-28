// lib/server/db/types.ts
import type{
  InferSelectModel,
  InferInsertModel,
} from "drizzle-orm";
import type {
  User,
  Session,
  account,
  verification,
  keywords,
  savedJobs,
  regions,
  municipalities,
  locations,
  userRelations,
  sessionRelations,
  accountRelations,
  keywordsRelations,
  regionsRelations,
  municipalitiesRelations,
} from "$lib/server/db/authTypes.ts";

// --- USER ---
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

// Include relations
export type UserWithRelations = User & {
  sessions?: InferSelectModel<typeof session>[];
  accounts?: InferSelectModel<typeof account>[];
};

// --- SESSION ---
export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

// Include relations
export type SessionWithUser = Session & {
  user?: User;
};

// --- ACCOUNT ---
export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

// Include relations
export type AccountWithUser = Account & {
  user?: User;
};

// --- VERIFICATION ---
export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;

// --- KEYWORDS ---
export type Keyword = InferSelectModel<typeof keywords>;
export type NewKeyword = InferInsertModel<typeof keywords>;

// Include relations
export type KeywordWithUser = Keyword & {
  user?: User;
};

// --- SAVED JOBS ---
export type SavedJob = InferSelectModel<typeof savedJobs>;
export type NewSavedJob = InferInsertModel<typeof savedJobs>;

// --- REGIONS ---
export type Region = InferSelectModel<typeof regions>;
export type NewRegion = InferInsertModel<typeof regions>;

// Include relations
export type RegionWithMunicipalities = Region & {
  municipalities?: InferSelectModel<typeof municipalities>[];
};

// --- MUNICIPALITIES ---
export type Municipality = InferSelectModel<typeof municipalities>;
export type NewMunicipality = InferInsertModel<typeof municipalities>;

// Include relations
export type MunicipalityWithRegion = Municipality & {
  region?: Region;
};

// --- LOCATIONS ---
export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;

// Include relations (user, region, municipality if needed)
export type LocationWithRelations = Location & {
  user?: User;
  region?: Region;
  municipality?: Municipality;
};