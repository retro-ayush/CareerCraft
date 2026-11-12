import { z } from "zod";

/** Shared Zod schemas. Add your own schemas for your problem statement here. */

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
  .describe("Date in YYYY-MM-DD format");

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(4000),
});

export const agentRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(30),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

// ---------- CareerMatch REST API schemas ----------

const skill = z.string().trim().min(1).max(40);

export const updateProfileSchema = z
  .object({
    skills: z.array(skill).max(40).optional(),
    preferred_cities: z.array(z.string().trim().min(1).max(40)).min(1).max(6).optional(),
    interests: z.string().trim().max(300).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Send at least one field to update");

export const shortlistAddSchema = z.object({
  job_id: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
});

export const shortlistUpdateSchema = z.object({
  job_id: z.number().int().positive(),
  status: z.enum(["saved", "applied", "interviewing", "offer", "rejected"]).optional(),
  cover_note: z.string().trim().max(2000).optional(),
});

export const jobQuerySchema = z.object({
  city: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
  job_type: z.enum(["Full-time", "Internship"]).optional(),
  work_mode: z.enum(["Onsite", "Hybrid", "Remote"]).optional(),
});
