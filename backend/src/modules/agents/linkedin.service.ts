import { HttpError } from "../../errors/http-error";
import {
  addActivity,
  createApplicationFromJob,
  createId,
  isoDate,
  mergeLinkedInAgentConfig,
  store,
} from "../../store/store";
import type {
  FollowUp,
  Job,
  LinkedInAgentConfig,
  LinkedInAgentMode,
  LinkedInAgentRun,
  LinkedInAgentStep,
  MessageTone,
  Referral,
} from "../../types/domain";

interface LinkedInAgentActions {
  discoverJobs?: boolean;
  fillApplication?: boolean;
  contactRecruiters?: boolean;
  requestReferrals?: boolean;
}

interface LinkedInAgentApprovals {
  submitApplication?: boolean;
  sendOutreach?: boolean;
  requestReferral?: boolean;
}

interface CreateLinkedInRunPayload {
  jobId?: string;
  searchQuery?: string;
  mode?: string;
  actions?: LinkedInAgentActions;
  approvals?: LinkedInAgentApprovals;
}

interface LinkedInOpportunity {
  job: Job;
  recruiterMatches: number;
  referralMatches: number;
}

function normalizeMode(mode?: string): LinkedInAgentMode {
  return mode === "autopilot" ? "autopilot" : "assist";
}

function resolvePrimaryJob(jobId?: string, searchQuery?: string): Job {
  if (jobId) {
    const exact = store.jobs.find((job) => job.id === jobId);
    if (!exact) {
      throw new HttpError(404, "Job not found");
    }
    return exact;
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    const match = store.jobs
      .filter(
        (job) =>
          job.title.toLowerCase().includes(query) ||
          job.company.toLowerCase().includes(query) ||
          job.skills.some((skill) => skill.toLowerCase().includes(query)),
      )
      .sort((a, b) => b.matchScore - a.matchScore)[0];

    if (match) {
      return match;
    }
  }

  const fallback = [...store.jobs].sort((a, b) => b.matchScore - a.matchScore)[0];

  if (!fallback) {
    throw new HttpError(404, "No jobs available");
  }

  return fallback;
}

function discoverOpportunities(searchQuery?: string, limit = 8): LinkedInOpportunity[] {
  const query = (searchQuery || "").trim().toLowerCase();
  const matches = store.jobs
    .filter((job) => {
      if (!query) {
        return true;
      }

      return (
        job.title.toLowerCase().includes(query) ||
        job.company.toLowerCase().includes(query) ||
        job.skills.some((skill) => skill.toLowerCase().includes(query))
      );
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
    .map((job) => {
      const recruiterMatches = store.connections.filter(
        (connection) =>
          connection.company === job.company &&
          connection.tags.some((tag) => /recruiter|hiring manager|talent/i.test(tag)),
      ).length;

      const referralMatches = store.connections.filter(
        (connection) => connection.company === job.company && connection.status === "connected",
      ).length;

      return {
        job,
        recruiterMatches,
        referralMatches,
      };
    });

  return matches;
}

function buildApplicationChecklist(job: Job) {
  const missingFields = job.skillGap.map((skill) => `proof_of_${skill.toLowerCase().replace(/\s+/g, "_")}`);

  return {
    requiredFields: [
      "full_name",
      "email",
      "location",
      "resume",
      "work_authorization",
      "years_of_experience",
    ],
    missingFields,
    warnings:
      missingFields.length > 0
        ? [`Profile gaps detected for: ${job.skillGap.join(", ")}`]
        : [],
  };
}

function getRecruiterTargets(company: string) {
  const ranked = store.connections
    .filter(
      (connection) =>
        connection.company === company &&
        connection.tags.some((tag) => /recruiter|hiring manager|talent/i.test(tag)),
    )
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  if (ranked.length > 0) {
    return ranked.slice(0, 5);
  }

  return [
    {
      id: `synthetic-${company.toLowerCase()}`,
      name: `${company} Talent Team`,
      headline: `Recruiting at ${company}`,
      company,
      avatar: "",
      mutualConnections: 0,
      relevanceScore: 70,
      status: "suggested" as const,
      tags: ["Recruiter"],
    },
  ];
}

function draftRecruiterMessage(params: {
  name: string;
  company: string;
  role: string;
  tone: MessageTone;
}): string {
  const baseByTone: Record<MessageTone, string> = {
    professional: `Hi ${params.name}, I am exploring the ${params.role} role at ${params.company} and would appreciate your guidance on the current hiring process.`,
    casual: `Hi ${params.name}, I saw the ${params.role} opening at ${params.company} and wanted to connect to learn how the team is hiring right now.`,
    formal: `Hello ${params.name}, I am writing regarding the ${params.role} opportunity at ${params.company}. I would value any direction on next steps in the process.`,
  };

  return `${baseByTone[params.tone]}\n\nBest regards,\n${store.profile.name}`;
}

function createFollowUpMessage(params: {
  contactName: string;
  company: string;
  role: string;
  message: string;
}): FollowUp {
  const followUp: FollowUp = {
    id: createId("f"),
    contactName: params.contactName,
    company: params.company,
    scheduledDate: isoDate(),
    type: `Recruiter Outreach — ${params.role}`,
    aiMessage: params.message,
    status: "pending",
  };

  store.followUps.unshift(followUp);
  store.outreachHistory.unshift({ ...followUp, sentAt: new Date().toISOString() });

  return followUp;
}

function createReferralDraft(params: { targetCompany: string; targetRole: string; referrer: string }) {
  return `Hi ${params.referrer}, I noticed the ${params.targetRole} opening at ${params.targetCompany}. If you are open to it, I would really appreciate a referral or guidance on the best application path.`;
}

function createReferralRequest(params: {
  targetCompany: string;
  targetRole: string;
  referrer: string;
  referrerTitle: string;
  message: string;
}): Referral {
  const referral: Referral = {
    id: createId("r"),
    targetCompany: params.targetCompany,
    targetRole: params.targetRole,
    referrer: params.referrer,
    referrerTitle: params.referrerTitle,
    status: "sent",
    dateSent: isoDate(),
    message: params.message,
  };

  store.referrals.unshift(referral);

  return referral;
}

function shouldWaitForApproval(
  mode: LinkedInAgentMode,
  config: LinkedInAgentConfig,
  approved?: boolean,
): boolean {
  if (mode !== "autopilot") {
    return true;
  }

  return config.requireHumanApproval && approved !== true;
}

export function getLinkedInAgentConfig() {
  return store.linkedInAgentConfig;
}

export function updateLinkedInAgentConfig(payload: Partial<LinkedInAgentConfig>) {
  return mergeLinkedInAgentConfig(payload);
}

export function listLinkedInAgentRuns() {
  return store.linkedInAgentRuns;
}

export function listLinkedInOpportunities(searchQuery?: string, limit = 8) {
  return discoverOpportunities(searchQuery, limit);
}

export function runLinkedInAgent(payload: CreateLinkedInRunPayload) {
  const mode = normalizeMode(payload.mode);
  const actions: Required<LinkedInAgentActions> = {
    discoverJobs: payload.actions?.discoverJobs ?? true,
    fillApplication: payload.actions?.fillApplication ?? true,
    contactRecruiters: payload.actions?.contactRecruiters ?? true,
    requestReferrals: payload.actions?.requestReferrals ?? true,
  };

  const job = resolvePrimaryJob(payload.jobId, payload.searchQuery);
  const opportunities = discoverOpportunities(payload.searchQuery, 8);

  const steps: LinkedInAgentStep[] = [];
  const summary = {
    jobMatchesFound: opportunities.length,
    applicationsSubmitted: 0,
    recruiterMessagesPrepared: 0,
    referralRequestsPrepared: 0,
  };

  if (actions.discoverJobs) {
    steps.push({
      id: "discover_jobs",
      label: "Find matching LinkedIn jobs",
      status: "success",
      detail: `${opportunities.length} opportunities found.`,
      output: {
        topMatches: opportunities.slice(0, 3).map((item) => `${item.job.title} @ ${item.job.company}`),
      },
    });
  } else {
    steps.push({
      id: "discover_jobs",
      label: "Find matching LinkedIn jobs",
      status: "skipped",
      detail: "Skipped by action settings.",
    });
  }

  if (actions.fillApplication) {
    const checklist = buildApplicationChecklist(job);

    if (shouldWaitForApproval(mode, store.linkedInAgentConfig, payload.approvals?.submitApplication)) {
      steps.push({
        id: "fill_application",
        label: "Fill application form",
        status: "pending_approval",
        detail: "Application plan ready. Waiting for explicit approval to submit.",
        output: checklist,
      });
    } else {
      const appliedToday = store.applications.filter((app) => app.appliedDate === isoDate()).length;
      const existing = store.applications.find(
        (app) => app.company === job.company && app.jobTitle === job.title,
      );

      if (existing) {
        steps.push({
          id: "fill_application",
          label: "Fill application form",
          status: "skipped",
          detail: "An application already exists for this role.",
          output: checklist,
        });
      } else if (appliedToday >= store.linkedInAgentConfig.dailyApplicationLimit) {
        steps.push({
          id: "fill_application",
          label: "Fill application form",
          status: "blocked",
          detail: `Daily application limit reached (${store.linkedInAgentConfig.dailyApplicationLimit}).`,
          output: checklist,
        });
      } else {
        createApplicationFromJob(job, "LinkedIn agent");
        summary.applicationsSubmitted += 1;
        steps.push({
          id: "fill_application",
          label: "Fill application form",
          status: "success",
          detail: "Application filled and submitted.",
          output: checklist,
        });
      }
    }
  }

  if (actions.contactRecruiters) {
    const recruiters = getRecruiterTargets(job.company);
    const drafts = recruiters.map((recruiter) => ({
      name: recruiter.name,
      message: draftRecruiterMessage({
        name: recruiter.name,
        company: recruiter.company,
        role: job.title,
        tone: store.linkedInAgentConfig.preferredMessageTone,
      }),
    }));

    summary.recruiterMessagesPrepared = drafts.length;

    if (shouldWaitForApproval(mode, store.linkedInAgentConfig, payload.approvals?.sendOutreach)) {
      steps.push({
        id: "contact_recruiters",
        label: "Request recruiters and hiring managers",
        status: "pending_approval",
        detail: `${drafts.length} recruiter messages drafted and ready for review.`,
        output: { recruiters: drafts.map((draft) => draft.name) },
      });
    } else {
      const sentToday = store.followUps.filter((item) => item.scheduledDate === isoDate()).length;
      const remaining = Math.max(0, store.linkedInAgentConfig.dailyOutreachLimit - sentToday);
      const toSend = drafts.slice(0, remaining);

      toSend.forEach((draft) => {
        createFollowUpMessage({
          contactName: draft.name,
          company: job.company,
          role: job.title,
          message: draft.message,
        });
      });

      if (toSend.length === 0) {
        steps.push({
          id: "contact_recruiters",
          label: "Request recruiters and hiring managers",
          status: "blocked",
          detail: `Daily outreach limit reached (${store.linkedInAgentConfig.dailyOutreachLimit}).`,
        });
      } else {
        steps.push({
          id: "contact_recruiters",
          label: "Request recruiters and hiring managers",
          status: "success",
          detail: `Queued ${toSend.length} recruiter messages${toSend.length < drafts.length ? " (limited by daily cap)." : "."}`,
          output: { recruiters: toSend.map((draft) => draft.name) },
        });
      }
    }
  }

  if (actions.requestReferrals) {
    const referralCandidates = store.connections
      .filter((connection) => connection.company === job.company && connection.status === "connected")
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 3);

    if (referralCandidates.length === 0) {
      steps.push({
        id: "request_referrals",
        label: "Request referral from network",
        status: "skipped",
        detail: `No connected referrals found at ${job.company}.`,
      });
    } else if (shouldWaitForApproval(mode, store.linkedInAgentConfig, payload.approvals?.requestReferral)) {
      summary.referralRequestsPrepared = referralCandidates.length;
      steps.push({
        id: "request_referrals",
        label: "Request referral from network",
        status: "pending_approval",
        detail: `${referralCandidates.length} referral drafts prepared for review.`,
        output: {
          candidates: referralCandidates.map((candidate) => candidate.name),
        },
      });
    } else {
      const created = referralCandidates.map((candidate) =>
        createReferralRequest({
          targetCompany: job.company,
          targetRole: job.title,
          referrer: candidate.name,
          referrerTitle: candidate.headline,
          message: createReferralDraft({
            targetCompany: job.company,
            targetRole: job.title,
            referrer: candidate.name,
          }),
        }),
      );

      summary.referralRequestsPrepared = created.length;

      steps.push({
        id: "request_referrals",
        label: "Request referral from network",
        status: "success",
        detail: `${created.length} referral requests prepared and logged.`,
        output: {
          candidates: created.map((item) => item.referrer),
        },
      });
    }
  }

  const hasError = steps.some((step) => step.status === "error");
  const hasPartial = steps.some(
    (step) => step.status === "blocked" || step.status === "pending_approval",
  );

  const run: LinkedInAgentRun = {
    id: createId("lnrun"),
    mode,
    jobId: job.id,
    company: job.company,
    role: job.title,
    createdAt: new Date().toISOString(),
    status: hasError ? "error" : hasPartial ? "partial" : "success",
    summary,
    steps,
  };

  store.linkedInAgentRuns.unshift(run);

  addActivity(
    "network",
    `LinkedIn agent ${run.status} for ${run.role} at ${run.company}`,
    "sparkles",
  );

  return run;
}
