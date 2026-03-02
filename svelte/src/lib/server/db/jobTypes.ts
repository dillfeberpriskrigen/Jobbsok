import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { jobs, occupationNames } from "./jobSchema";

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;
export type OccupationName = InferSelectModel<typeof occupationNames>;
export type NewOccupationName = InferInsertModel<typeof occupationNames>;
