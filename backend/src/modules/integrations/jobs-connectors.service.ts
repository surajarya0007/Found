import { env } from "../../config/env";
import { HttpError } from "../../errors/http-error";
import { addActivity, createId, persistStore, store } from "../../store/store";
import type { ExternalJobOpportunity, Job } from "../../types/domain";

interface GreenhouseJobItem {
  id: number;
  title: string;
  absolute_url: string;
  updated_at: string;
  location?: { name?: string };
  content?: string;
}

interface LeverJobItem {
  id: string;
  text: string;
  hostedUrl: string;
  createdAt?: number;
  descriptionPlain?: string;
  categories?: {
    location?: string;
    commitment?: string;
    team?: string;
  };
  company?: string;
}

interface DiscoverExternalJobsOptions {
  query?: string;
  company?: string;
  limit?: number;
}

function parseList(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function normalizeCompanyName(value: string): string {
  return value
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function plainTextSnippet(input: string | undefined, max = 220): string {
  if (!input) {
    return "No description snippet available from source feed.";
  }

  const stripped = input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripped.length > max ? `${stripped.slice(0, max)}...` : stripped;
}

function inferLevel(title: string): string {
  const lowered = title.toLowerCase();

  if (lowered.includes("principal")) {
    return "Principal";
  }
  if (lowered.includes("staff")) {
    return "Staff";
  }
  if (lowered.includes("manager")) {
    return "Manager";
  }
  if (lowered.includes("lead")) {
    return "Lead";
  }
  if (lowered.includes("senior")) {
    return "Senior";
  }

  return "Senior";
}

function inferJobType(commitment?: string): string {
  if (!commitment) {
    return "Full-time";
  }

  const lowered = commitment.toLowerCase();

  if (lowered.includes("part")) {
    return "Part-time";
  }

  if (lowered.includes("contract")) {
    return "Contract";
  }

  return "Full-time";
}

function computeMatchScore(title: string, company: string): number {
  const preferredCompanyBoost = store.profile.careerGoals.preferredCompanies
    .map((name) => name.toLowerCase())
    .includes(company.toLowerCase())
    ? 12
    : 0;

  const preferredRoleBoost = store.profile.careerGoals.targetRoles.some((role) =>
    title.toLowerCase().includes(role.toLowerCase().split(" ")[0]),
  )
    ? 8
    : 0;

  const base = 72;
  return Math.min(98, base + preferredCompanyBoost + preferredRoleBoost);
}

async function fetchGreenhouseJobs(
  boards: string[],
  query?: string,
): Promise<ExternalJobOpportunity[]> {
  const opportunities: ExternalJobOpportunity[] = [];

  await Promise.all(
    boards.map(async (board) => {
      const endpoint = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs`;

      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(9000) });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { jobs?: GreenhouseJobItem[] };
        const jobs = payload.jobs || [];

        jobs.forEach((job) => {
          const company = normalizeCompanyName(board);
          const title = job.title || "Untitled role";
          const location = job.location?.name || "Unspecified";

          const matchesQuery =
            !query ||
            `${title} ${company} ${location}`.toLowerCase().includes(query.toLowerCase());

          if (!matchesQuery) {
            return;
          }

          opportunities.push({
            id: `gh-${board}-${job.id}`,
            source: "greenhouse",
            externalId: String(job.id),
            title,
            company,
            location,
            url: job.absolute_url,
            postedAt: job.updated_at || null,
            descriptionSnippet: plainTextSnippet(job.content),
          });
        });
      } catch {
        // Ignore feed-level failures; connector is best effort.
      }
    }),
  );

  return opportunities;
}

async function fetchLeverJobs(
  sites: string[],
  query?: string,
): Promise<ExternalJobOpportunity[]> {
  const opportunities: ExternalJobOpportunity[] = [];

  await Promise.all(
    sites.map(async (site) => {
      const endpoint = `https://api.lever.co/v0/postings/${site}?mode=json`;

      try {
        const response = await fetch(endpoint, { signal: AbortSignal.timeout(9000) });

        if (!response.ok) {
          return;
        }

        const jobs = (await response.json()) as LeverJobItem[];

        jobs.forEach((job) => {
          const company = normalizeCompanyName(site);
          const title = job.text || "Untitled role";
          const location = job.categories?.location || "Unspecified";

          const matchesQuery =
            !query ||
            `${title} ${company} ${location}`.toLowerCase().includes(query.toLowerCase());

          if (!matchesQuery) {
            return;
          }

          opportunities.push({
            id: `lev-${site}-${job.id}`,
            source: "lever",
            externalId: String(job.id),
            title,
            company,
            location,
            url: job.hostedUrl,
            postedAt: job.createdAt ? new Date(job.createdAt).toISOString() : null,
            descriptionSnippet: plainTextSnippet(job.descriptionPlain),
          });
        });
      } catch {
        // Ignore feed-level failures; connector is best effort.
      }
    }),
  );

  return opportunities;
}

export async function discoverExternalJobs(
  options: DiscoverExternalJobsOptions = {},
): Promise<{
  jobs: ExternalJobOpportunity[];
  sources: {
    greenhouseBoards: string[];
    leverSites: string[];
  };
}> {
  const boards = parseList(env.greenHouseBoards);
  const sites = parseList(env.leverSites);

  const [greenhouseJobs, leverJobs] = await Promise.all([
    fetchGreenhouseJobs(boards, options.query),
    fetchLeverJobs(sites, options.query),
  ]);

  const companyFilter = options.company?.toLowerCase();

  const combined = [...greenhouseJobs, ...leverJobs]
    .filter((job) => !companyFilter || job.company.toLowerCase().includes(companyFilter))
    .sort((a, b) => {
      const aDate = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const bDate = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      return bDate - aDate;
    });

  return {
    jobs: combined.slice(0, options.limit ?? 60),
    sources: {
      greenhouseBoards: boards,
      leverSites: sites,
    },
  };
}

function toInternalJob(external: ExternalJobOpportunity): Job {
  const title = external.title;
  const company = external.company;

  return {
    id: createId("extjob"),
    title,
    company,
    logo: company.slice(0, 2).toUpperCase(),
    location: external.location,
    salary: "Not disclosed",
    matchScore: computeMatchScore(title, company),
    type: "Full-time",
    level: inferLevel(title),
    posted: external.postedAt
      ? new Date(external.postedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : "Recently",
    skills: [],
    matchReasons: [
      "Imported from external ATS feed",
      `Source: ${external.source}`,
      "AI can generate a tailored application package",
    ],
    description: `${external.descriptionSnippet}\n\nApply: ${external.url}`,
    skillGap: [],
  };
}

export async function importExternalJobs(
  options: DiscoverExternalJobsOptions = {},
): Promise<{
  imported: number;
  skipped: number;
  jobs: ExternalJobOpportunity[];
}> {
  const discovered = await discoverExternalJobs(options);

  if (discovered.jobs.length === 0) {
    return {
      imported: 0,
      skipped: 0,
      jobs: [],
    };
  }

  let imported = 0;
  let skipped = 0;

  discovered.jobs.forEach((external) => {
    const exists = store.jobs.some(
      (job) =>
        job.title.toLowerCase() === external.title.toLowerCase() &&
        job.company.toLowerCase() === external.company.toLowerCase(),
    );

    if (exists) {
      skipped += 1;
      return;
    }

    store.jobs.unshift(toInternalJob(external));
    imported += 1;
  });

  if (imported > 0) {
    addActivity("match", `Imported ${imported} jobs from external connectors`, "sparkles", false);
    persistStore();
  }

  return {
    imported,
    skipped,
    jobs: discovered.jobs,
  };
}

export function requireExternalConnectorAvailability() {
  const hasBoards = parseList(env.greenHouseBoards).length > 0;
  const hasLeverSites = parseList(env.leverSites).length > 0;

  if (!hasBoards && !hasLeverSites) {
    throw new HttpError(
      400,
      "No external job connectors configured. Set GREENHOUSE_BOARDS and/or LEVER_SITES.",
    );
  }
}
