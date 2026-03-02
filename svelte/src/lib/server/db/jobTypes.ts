import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { jobs } from "./jobSchema";

export type Job = InferSelectModel<typeof jobs>;
export type NewJob = InferInsertModel<typeof jobs>;
