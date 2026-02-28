import type { InferSelectModel } from 'drizzle-orm';
import { jobs } from './jobSchema.ts';

export type Job = InferSelectModel<typeof jobs>;