import fs from "node:fs";
import path from "node:path";
import { chromium, type LaunchOptions, type Page } from "playwright-core";
import { env } from "../../config/env";
import { HttpError } from "../../errors/http-error";
import { addActivity, createId, isoDate, persistStore, store } from "../../store/store";
import type { LinkedInBrowserRun, LinkedInBrowserStep } from "../../types/domain";

interface LinkedInBrowserPayload {
  searchQuery?: string;
  location?: string;
  company?: string;
  maxJobs?: number;
  submitApplications?: boolean;
  sendRecruiterMessages?: boolean;
  approvals?: {
    submitApplications?: boolean;
    sendMessages?: boolean;
  };
  dryRun?: boolean;
}

function normalizeQuery(payload: LinkedInBrowserPayload): { query: string; location: string } {
  const roleHint = store.profile.careerGoals.targetRoles[0] || "Software Engineer";
  const query =
    payload.searchQuery?.trim() ||
    `${payload.company ? `${payload.company} ` : ""}${roleHint}`.trim();

  const location = payload.location?.trim() || store.profile.location || "Remote";

  return {
    query,
    location,
  };
}

function pushStep(steps: LinkedInBrowserStep[], step: LinkedInBrowserStep) {
  steps.push(step);
}

function normalizeCompanyFromResult(text: string): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const separators = ["·", "|", "-", " at "];

  for (const separator of separators) {
    if (cleaned.includes(separator)) {
      const parts = cleaned.split(separator).map((part) => part.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return parts[1];
      }
    }
  }

  return "Unknown Company";
}

async function ensureAuthenticated(page: Page, steps: LinkedInBrowserStep[]) {
  const sessionFileExists = fs.existsSync(env.linkedInStorageStatePath);

  if (sessionFileExists) {
    await page.goto("https://www.linkedin.com/feed/", { waitUntil: "domcontentloaded" });

    if (!page.url().includes("/login")) {
      pushStep(steps, {
        id: "linkedin_login",
        label: "Authenticate LinkedIn session",
        status: "success",
        detail: "Reused saved LinkedIn session.",
      });
      return;
    }
  }

  if (!env.linkedInEmail || !env.linkedInPassword) {
    throw new HttpError(
      400,
      "LinkedIn credentials not configured. Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD.",
    );
  }

  await page.goto("https://www.linkedin.com/login", { waitUntil: "domcontentloaded" });
  await page.fill("#username", env.linkedInEmail);
  await page.fill("#password", env.linkedInPassword);
  await page.click('button[type="submit"]');
  await page.waitForLoadState("domcontentloaded");

  if (page.url().includes("/checkpoint") || page.url().includes("/challenge")) {
    throw new HttpError(
      409,
      "LinkedIn checkpoint/challenge triggered. Complete verification manually and retry.",
    );
  }

  if (page.url().includes("/login")) {
    throw new HttpError(401, "LinkedIn login failed. Verify credentials.");
  }

  pushStep(steps, {
    id: "linkedin_login",
    label: "Authenticate LinkedIn session",
    status: "success",
    detail: "Logged in with configured credentials.",
  });
}

async function discoverLinkedInJobs(
  page: Page,
  query: string,
  location: string,
  maxJobs: number,
): Promise<Array<{ title: string; company: string; url: string }>> {
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`;
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  const jobs = await page.$$eval(
    "a[href*='/jobs/view/']",
    (anchors, limit) => {
      const seen = new Set<string>();
      const rows: Array<{ title: string; company: string; url: string }> = [];

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute("href") || "";
        if (!href || seen.has(href)) {
          return;
        }

        const title = (anchor.textContent || "").replace(/\s+/g, " ").trim();
        if (!title) {
          return;
        }

        const card = anchor.closest("li") || anchor.parentElement;
        const cardText = (card?.textContent || "").replace(/\s+/g, " ").trim();

        let company = "Unknown Company";
        const separators = ["·", "|", "-", " at "];
        for (const separator of separators) {
          if (cardText.includes(separator)) {
            const parts = cardText.split(separator).map((part) => part.trim()).filter(Boolean);
            if (parts.length >= 2) {
              company = parts[1];
              break;
            }
          }
        }

        seen.add(href);
        rows.push({
          title,
          company,
          url: href.startsWith("http") ? href : `https://www.linkedin.com${href}`,
        });
      });

      return rows.slice(0, Number(limit) || 5);
    },
    maxJobs,
  );

  return jobs;
}

function shouldAllowSubmit(payload: LinkedInBrowserPayload): boolean {
  return env.linkedInAllowAutoSubmit && payload.approvals?.submitApplications === true;
}

function shouldAllowMessages(payload: LinkedInBrowserPayload): boolean {
  return payload.approvals?.sendMessages === true;
}

function inferStoreJob(title: string, company: string) {
  return store.jobs.find(
    (job) =>
      job.title.toLowerCase() === title.toLowerCase() &&
      job.company.toLowerCase() === company.toLowerCase(),
  );
}

export function listLinkedInBrowserRuns() {
  return store.linkedInBrowserRuns;
}

export async function runLinkedInBrowserAutomation(payload: LinkedInBrowserPayload) {
  const { query, location } = normalizeQuery(payload);
  const steps: LinkedInBrowserStep[] = [];

  if (payload.dryRun) {
    const dryRun: LinkedInBrowserRun = {
      id: createId("lnbrowser"),
      createdAt: new Date().toISOString(),
      query,
      location,
      status: "partial",
      discoveredJobs: [],
      steps: [
        {
          id: "plan",
          label: "Generate browser automation plan",
          status: "success",
          detail:
            "Dry run mode. LinkedIn browser session was not started. Approve and rerun without dryRun.",
        },
      ],
    };

    store.linkedInBrowserRuns.unshift(dryRun);
    persistStore();
    return dryRun;
  }

  const launchOptions: LaunchOptions = {
    headless: env.linkedInBrowserHeadless,
  };

  if (env.chromiumExecutablePath) {
    launchOptions.executablePath = env.chromiumExecutablePath;
  } else {
    launchOptions.channel = env.linkedInBrowserChannel;
  }

  const browser = await chromium.launch(launchOptions);

  try {
    const contextOptions: Parameters<typeof browser.newContext>[0] = {};

    if (fs.existsSync(env.linkedInStorageStatePath)) {
      contextOptions.storageState = env.linkedInStorageStatePath;
    }

    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();

    await ensureAuthenticated(page, steps);

    const maxJobs = payload.maxJobs && payload.maxJobs > 0 ? Math.min(payload.maxJobs, 10) : 5;
    const discoveredJobs = await discoverLinkedInJobs(page, query, location, maxJobs);

    pushStep(steps, {
      id: "discover_jobs",
      label: "Discover jobs on LinkedIn",
      status: discoveredJobs.length > 0 ? "success" : "blocked",
      detail:
        discoveredJobs.length > 0
          ? `Discovered ${discoveredJobs.length} jobs for query \"${query}\".`
          : "No jobs discovered for this query.",
    });

    if (payload.submitApplications) {
      const allowSubmit = shouldAllowSubmit(payload);

      if (!allowSubmit) {
        pushStep(steps, {
          id: "submit_application",
          label: "Submit LinkedIn application",
          status: "pending_approval",
          detail:
            "Submission blocked by approval policy. Set LINKEDIN_ALLOW_AUTO_SUBMIT=true and approvals.submitApplications=true.",
        });
      } else if (!discoveredJobs[0]) {
        pushStep(steps, {
          id: "submit_application",
          label: "Submit LinkedIn application",
          status: "blocked",
          detail: "No discovered jobs to apply against.",
        });
      } else {
        await page.goto(discoveredJobs[0].url, { waitUntil: "domcontentloaded" });
        const easyApply = await page.$(
          "button.jobs-apply-button, button[aria-label*='Easy Apply'], button:has-text('Easy Apply')",
        );

        if (!easyApply) {
          pushStep(steps, {
            id: "submit_application",
            label: "Submit LinkedIn application",
            status: "blocked",
            detail: "Easy Apply button not available on selected role.",
          });
        } else {
          await easyApply.click();
          await page.waitForTimeout(1200);

          const first = discoveredJobs[0];
          const matched = inferStoreJob(first.title, first.company);

          if (matched) {
            const exists = store.applications.some(
              (app) => app.jobTitle.toLowerCase() === matched.title.toLowerCase() && app.company.toLowerCase() === matched.company.toLowerCase(),
            );

            if (!exists) {
              store.applications.unshift({
                id: createId("a"),
                jobTitle: matched.title,
                company: matched.company,
                logo: matched.logo,
                status: "applied",
                appliedDate: isoDate(),
                lastUpdate: isoDate(),
                nextStep: "LinkedIn Easy Apply started",
                notes: "LinkedIn browser automation opened Easy Apply workflow.",
                matchScore: matched.matchScore,
              });
            }
          }

          pushStep(steps, {
            id: "submit_application",
            label: "Submit LinkedIn application",
            status: "success",
            detail:
              "Opened Easy Apply workflow in browser. Final submission may still require additional manual fields.",
          });
        }
      }
    }

    if (payload.sendRecruiterMessages) {
      const allowMessages = shouldAllowMessages(payload);

      if (!allowMessages) {
        pushStep(steps, {
          id: "message_recruiters",
          label: "Message recruiters",
          status: "pending_approval",
          detail: "Messaging requires approvals.sendMessages=true.",
        });
      } else {
        const companyHint =
          payload.company || discoveredJobs[0]?.company || normalizeCompanyFromResult(query);

        const recruiters = store.connections
          .filter(
            (connection) =>
              connection.company.toLowerCase().includes(companyHint.toLowerCase()) &&
              connection.tags.some((tag) => /recruiter|hiring manager|talent/i.test(tag)),
          )
          .slice(0, 5);

        recruiters.forEach((recruiter) => {
          store.followUps.unshift({
            id: createId("f"),
            contactName: recruiter.name,
            company: recruiter.company,
            scheduledDate: isoDate(),
            type: "LinkedIn Recruiter Outreach",
            aiMessage: `Hi ${recruiter.name}, I found a relevant opening and would appreciate guidance on the process.`,
            status: "pending",
          });
        });

        pushStep(steps, {
          id: "message_recruiters",
          label: "Message recruiters",
          status: recruiters.length > 0 ? "success" : "blocked",
          detail:
            recruiters.length > 0
              ? `Prepared ${recruiters.length} recruiter outreach messages.`
              : "No matching recruiter contacts were found in your network.",
        });
      }
    }

    fs.mkdirSync(path.dirname(env.linkedInStorageStatePath), { recursive: true });
    await context.storageState({ path: env.linkedInStorageStatePath });
    await context.close();

    const hasError = steps.some((step) => step.status === "error");
    const hasPartial = steps.some(
      (step) => step.status === "blocked" || step.status === "pending_approval",
    );

    const run: LinkedInBrowserRun = {
      id: createId("lnbrowser"),
      createdAt: new Date().toISOString(),
      query,
      location,
      status: hasError ? "error" : hasPartial ? "partial" : "success",
      discoveredJobs,
      steps,
    };

    store.linkedInBrowserRuns.unshift(run);

    addActivity(
      "network",
      `LinkedIn browser automation ${run.status} (${run.discoveredJobs.length} jobs discovered)`,
      "sparkles",
      false,
    );

    persistStore();

    return run;
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn browser automation failed";

    const failedRun: LinkedInBrowserRun = {
      id: createId("lnbrowser"),
      createdAt: new Date().toISOString(),
      query,
      location,
      status: "error",
      discoveredJobs: [],
      steps: [
        ...steps,
        {
          id: "runtime_error",
          label: "Browser execution",
          status: "error",
          detail: message,
        },
      ],
    };

    store.linkedInBrowserRuns.unshift(failedRun);
    persistStore();

    throw error;
  } finally {
    await browser.close();
  }
}
