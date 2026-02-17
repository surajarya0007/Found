import { seedData } from "../data/seed";
import { loadPersistedState, savePersistedState } from "./persistence";
import type {
  Activity,
  ActivityType,
  AiSettings,
  Application,
  Job,
  LinkedInAgentConfig,
  StoreState,
} from "../types/domain";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

export function isoDate(value: Date = new Date()): string {
  return value.toISOString().slice(0, 10);
}

function createDefaultState(): StoreState {
  return {
    profile: clone(seedData.userProfile),
    aiSettings: {
      aggressiveMatching: true,
      autoNetworking: true,
      weeklyDigest: true,
      messageTone: "professional",
      matchThreshold: 80,
      networkingFrequency: "daily",
    },
    linkedInAgentConfig: {
      dailyApplicationLimit: 8,
      dailyOutreachLimit: 20,
      requireHumanApproval: true,
      preferredMessageTone: "professional",
    },
    jobs: clone(seedData.jobListings),
    connections: clone(seedData.connections),
    followUps: clone(seedData.followUps),
    referrals: clone(seedData.referrals),
    applications: clone(seedData.applications),
    activityFeed: clone(seedData.activityFeed),
    networkGrowthData: clone(seedData.networkGrowthData),
    automationRuns: [],
    linkedInAgentRuns: [],
    linkedInBrowserRuns: [],
    outreachHistory: [],
  };
}

function hydrateState(raw: Partial<StoreState>): StoreState {
  const defaults = createDefaultState();

  return {
    ...defaults,
    ...raw,
    aiSettings: {
      ...defaults.aiSettings,
      ...(raw.aiSettings ?? {}),
    },
    linkedInAgentConfig: {
      ...defaults.linkedInAgentConfig,
      ...(raw.linkedInAgentConfig ?? {}),
    },
    jobs: raw.jobs ?? defaults.jobs,
    connections: raw.connections ?? defaults.connections,
    followUps: raw.followUps ?? defaults.followUps,
    referrals: raw.referrals ?? defaults.referrals,
    applications: raw.applications ?? defaults.applications,
    activityFeed: raw.activityFeed ?? defaults.activityFeed,
    networkGrowthData: raw.networkGrowthData ?? defaults.networkGrowthData,
    automationRuns: raw.automationRuns ?? defaults.automationRuns,
    linkedInAgentRuns: raw.linkedInAgentRuns ?? defaults.linkedInAgentRuns,
    linkedInBrowserRuns: raw.linkedInBrowserRuns ?? defaults.linkedInBrowserRuns,
    outreachHistory: raw.outreachHistory ?? defaults.outreachHistory,
  };
}

export let store: StoreState = createDefaultState();

export function initializeStore(): { source: "database" | "seed" } {
  const persisted = loadPersistedState();

  if (persisted) {
    store = hydrateState(persisted);
    return { source: "database" };
  }

  store = createDefaultState();
  savePersistedState(store);
  return { source: "seed" };
}

export function persistStore(): void {
  savePersistedState(store);
}

export function addActivity(
  type: ActivityType,
  title: string,
  icon: string,
  shouldPersist = true,
): Activity {
  const activity: Activity = {
    id: createId("act"),
    type,
    title,
    icon,
    time: "just now",
  };

  store.activityFeed.unshift(activity);

  if (store.activityFeed.length > 30) {
    store.activityFeed = store.activityFeed.slice(0, 30);
  }

  if (shouldPersist) {
    persistStore();
  }

  return activity;
}

export function createApplicationFromJob(
  job: Job,
  source: string,
  type: "manual" | "automation" = "manual",
  automationRunId?: string,
): Application {
  const newApplication: Application = {
    id: createId("a"),
    jobTitle: job.title,
    company: job.company,
    logo: job.logo,
    status: "applied",
    appliedDate: isoDate(),
    lastUpdate: isoDate(),
    nextStep: "Awaiting response",
    notes: `Submitted via ${source}.`,
    matchScore: job.matchScore,
    source: type,
    automationRunId,
  };

  store.applications.unshift(newApplication);
  addActivity("application", `Applied to ${job.title} at ${job.company}`, "send", false);
  persistStore();

  return newApplication;
}

export function updateFollowUp(
  id: string,
  payload: { aiMessage?: string; status?: import("../types/domain").FollowUpStatus },
) {
  const followUp = store.followUps.find((f) => f.id === id);
  if (!followUp) return null;

  if (payload.aiMessage !== undefined) followUp.aiMessage = payload.aiMessage;
  if (payload.status !== undefined) followUp.status = payload.status;

  persistStore();
  return followUp;
}

export function mergeAiSettings(payload: Partial<AiSettings>): AiSettings {
  store.aiSettings = {
    ...store.aiSettings,
    ...payload,
  };

  persistStore();
  return store.aiSettings;
}

export function mergeLinkedInAgentConfig(
  payload: Partial<LinkedInAgentConfig>,
): LinkedInAgentConfig {
  store.linkedInAgentConfig = {
    ...store.linkedInAgentConfig,
    ...payload,
  };

  persistStore();
  return store.linkedInAgentConfig;
}
