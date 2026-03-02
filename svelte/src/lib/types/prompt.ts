export const promptKinds = [
  { value: "interview_general", label: "General Interview" },
  { value: "interview_behavioral", label: "Behavioral Interview" },
  { value: "interview_technical", label: "Technical Interview" },
  { value: "cover_letter", label: "Cover Letter" },
  { value: "company_research", label: "Company Research" },
  { value: "salary_negotiation", label: "Salary Negotiation" },
  { value: "custom", label: "Custom" }
] as const;

export type PromptKind = (typeof promptKinds)[number]["value"];

export type UserPrompt = {
  id: string;
  label: string;
  kind: PromptKind | string;
  content: string;
  userId: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
