// lib/server/db/authTypes.ts
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import {
	account,
	keywords,
	locations,
	municipalities,
	regions,
	savedJobs,
	session,
	user,
	verification
} from '$lib/server/db/authSchema';

// --- USER ---
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type UserWithRelations = User & {
	sessions?: InferSelectModel<typeof session>[];
	accounts?: InferSelectModel<typeof account>[];
};

// --- SESSION ---
export type Session = InferSelectModel<typeof session>;
export type NewSession = InferInsertModel<typeof session>;

export type SessionWithUser = Session & {
	user?: User;
};

// --- ACCOUNT ---
export type Account = InferSelectModel<typeof account>;
export type NewAccount = InferInsertModel<typeof account>;

export type AccountWithUser = Account & {
	user?: User;
};

// --- VERIFICATION ---
export type Verification = InferSelectModel<typeof verification>;
export type NewVerification = InferInsertModel<typeof verification>;

// --- KEYWORDS ---
export type Keyword = InferSelectModel<typeof keywords>;
export type NewKeyword = InferInsertModel<typeof keywords>;

export type KeywordWithUser = Keyword & {
	user?: User;
};

// --- SAVED JOBS ---
export type SavedJob = InferSelectModel<typeof savedJobs>;
export type NewSavedJob = InferInsertModel<typeof savedJobs>;

// --- REGIONS ---
export type Region = InferSelectModel<typeof regions>;
export type NewRegion = InferInsertModel<typeof regions>;

export type RegionWithMunicipalities = Region & {
	municipalities?: InferSelectModel<typeof municipalities>[];
};

// --- MUNICIPALITIES ---
export type Municipality = InferSelectModel<typeof municipalities>;
export type NewMunicipality = InferInsertModel<typeof municipalities>;

export type MunicipalityWithRegion = Municipality & {
	region?: Region;
};

// --- LOCATIONS ---
export type Location = InferSelectModel<typeof locations>;
export type NewLocation = InferInsertModel<typeof locations>;

export type LocationWithRelations = Location & {
	user?: User;
	region?: Region;
	municipality?: Municipality;
};
