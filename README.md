# CareerCraft: Job Match Agent
Team <number> | PS6 | SRM Agentic AI Hackathon

## The problem
Final-year students (logged-in user: **S001 Divya K**) apply to jobs that do not match their skills or eligibility, and miss the ones that fit them well.
They have no quick way to see which jobs they qualify for, why, and what to learn next.

## What our app does
- **Job search chat**: the student asks in plain English. A Gemini agent reads the profile, searches open jobs, scores each one and saves the best to a shortlist.
- **Explainable match score (0-100)**: 70% required skills + 20% nice-to-have skills + 10% preferred city. Every job shows matched and missing skills.
- **Eligibility rule in code**: jobs where CGPA < `min_cgpa`, the branch is not eligible or `apply_by` has passed are skipped and cannot be shortlisted.
- **Skill ROI plan (unique)**: ranks missing skills by how many eligible jobs each one would unlock. A **what-if simulator** shows the score change *before* the student learns a skill.
- **Application tracker (unique)**: shortlist with status (saved → applied → interviewing → offer / rejected), deadline countdown, and AI cover notes saved per job.

## Live demo
- Vercel link: <link>
- Passcode: <passcode>
- Try this prompt: "Find jobs in Chennai that match my skills and save the top 3."

More prompts:
- "Which skills am I missing for data analyst roles?"
- "I just learned Docker, add it to my profile and search again."
- "What if I learn React and Power BI? How do my matches change?"
- "Write a cover note for my best shortlisted job and save it."
- "I applied to the top job in my shortlist, update its status."
- Wrong or unclear request: "Save that one" / "Save job 9999" / "Find jobs in Mars"

## Agent tools
| Tool | What it does | Reads or writes |
| --- | --- | --- |
| getMyProfile | Student's branch, CGPA, cities and skills | Reads |
| searchJobs | Filters open jobs (city, role, type, mode), applies the eligibility rule, scores and ranks them | Reads |
| scoreJobMatch | Deep dive on one job: score breakdown, missing skills, eligibility reasons | Reads |
| getSkillGapPlan | Skill ROI: which missing skills unlock the most jobs (optionally for a role) | Reads |
| whatIfLearnSkill | Simulates new skills and shows the score changes, without saving | Reads |
| getMyShortlist | Saved jobs with status, deadlines and cover note flag | Reads |
| saveToShortlist | Saves 1-5 jobs; refuses ineligible jobs and duplicates | Writes |
| updateMySkills | Adds or removes skills; returns strong matches before vs after | Writes |
| updateApplicationStatus | Moves a shortlisted job to applied / interviewing / offer / rejected | Writes |
| saveCoverNote | Saves the cover note the agent wrote for a shortlisted job | Writes |

Every tool's arguments are checked with Zod before it runs (`lib/agent/runAgent.ts`). Gemini picks the tools itself; the code never routes on the user's words.

## Database tables
- `profiles`: students (branch, CGPA, preferred cities, skills)
- `jobs`: openings with min CGPA, eligible branches, required / nice-to-have skills, salary, apply-by date
- `shortlists`: saved jobs per student with match score, reason, **status** and **cover_note** (added by `seed/ps6_careermatch_extras.sql`)

## Pages
| Page | What it shows |
| --- | --- |
| `/` Job Chat | Agent chat with every tool call shown + live shortlist + headline stats |
| `/jobs` | All open jobs scored for the student, filters, eligibility reasons, save button |
| `/shortlist` | Application tracker: status pipeline, deadlines, cover notes |
| `/profile` | Profile, skill editor, Skill ROI plan with "I learned it" |

## REST API
`GET /api/profile`, `PATCH /api/profile`, `GET /api/jobs?city=&q=&job_type=&work_mode=`, `GET|POST|PATCH|DELETE /api/shortlist`, `GET /api/insights`, `POST /api/agent`, `GET /api/health`

## Tech stack
Next.js, React, TypeScript, Tailwind CSS, Supabase, Gemini API (function calling), Zod, Vercel

LLM provider: if `GROQ_API_KEY` is set the agent runs on Groq (`lib/agent/runAgentGroq.ts`, OpenAI-compatible tool calling); otherwise it uses Gemini (`lib/agent/runAgent.ts`). Both share the same tools and Zod checks (`lib/agent/runTool.ts`).

## Team
| Name | Role |
| --- | --- |
| <name> | Team Lead |
| <name> | Frontend |
| <name> | Backend / API |
| <name> | Database |
| <name> | AI / Agent |

## Run it locally
1. `npm install`
2. In Supabase SQL Editor run `seed/00_starter_example.sql`, then `seed/ps6_job_match.sql`, then `seed/ps6_careermatch_extras.sql`
3. Copy `.env.example` to `.env.local` and fill in the keys (`GROQ_API_KEY` or `GEMINI_API_KEY`)
4. `npm run dev` and open http://localhost:3000

## Folder guide
```
app/                 pages (/, /jobs, /shortlist, /profile, /login) and API routes (app/api/*)
components/          AgentChat, NavBar, ShortlistPanel, StatsStrip, ui helpers
lib/careermatch.ts   scoring, eligibility rule, Skill ROI (shared by agent + APIs)
lib/shortlist.ts     shortlist / tracker / skills writes
lib/agent/           Gemini tools, system prompt, agent loop
seed/                SQL seed files
```
