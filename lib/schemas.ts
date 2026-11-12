import { z } from "zod";
import { APPLICATION_STATUSES, JOB_TYPES, WORK_MODES } from "./constants";

/** Request schemas for the REST API and the agent endpoint. Every route validates input with these. */

const MAX_MESSAGE_CHARS = 4000;
const MAX_HISTORY = 30;

export const chatMessageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().min(1).max(MAX_MESSAGE_CHARS),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const agentRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(MAX_HISTORY),
});

export const loginSchema = z.object({ passcode: z.string().min(1).max(100) });

const skill = z.string().trim().min(1).max(40);
const city = z.string().trim().min(1).max(40);
const jobId = z.coerce.number().int().positive();

export const updateProfileSchema = z
  .object({
    skills: z.array(skill).max(40).optional(),
    preferred_cities: z.array(city).min(1).max(6).optional(),
    interests: z.string().trim().max(300).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Send at least one field to update");

export const shortlistAddSchema = z.object({
  job_id: z.number().int().positive(),
  reason: z.string().trim().max(300).optional(),
});

export const shortlistUpdateSchema = z
  .object({
    job_id: z.number().int().positive(),
    status: z.enum(APPLICATION_STATUSES).optional(),
    cover_note: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.status !== undefined || v.cover_note !== undefined, "Send status or cover_note");

export const shortlistDeleteQuerySchema = z.object({ job_id: jobId });

export const jobQuerySchema = z.object({
  city: z.string().trim().max(40).optional(),
  q: z.string().trim().max(60).optional(),
  job_type: z.enum(JOB_TYPES).optional(),
  work_mode: z.enum(WORK_MODES).optional(),
});
