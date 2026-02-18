export type ApplicationStatus =
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "error";

export type ConnectionStatus = "suggested" | "connected" | "pending";

export type ReferralStatus = "sent" | "viewed" | "responded" | "referred";

export type FollowUpStatus = "scheduled" | "pending" | "draft" | "sent";

export type MessageTone = "professional" | "casual" | "formal";

export type NetworkingFrequency = "daily" | "weekly" | "biweekly";

export type ActivityType =
  | "application"
  | "referral"
  | "interview"
  | "offer"
  | "connection"
  | "match"
  | "network";

export interface Skill {
  name: string;
  level: number;
}

export interface UserProfile {
  name: string;
  headline: string;
  location: string;
  avatar: string;
  email: string;
  skills: Skill[];
  careerGoals: {
    targetRoles: string[];
    salaryRange: {
      min: number;
      max: number;
    };
    preferredCompanies: string[];
    preferredLocations: string[];
  };
}

export interface Job {
  id: string;
  title: string;
  company: string;
  logo: string;
  location: string;
  salary: string;
  matchScore: number;
  type: string;
  level: string;
  posted: string;
  skills: string[];
  matchReasons: string[];
  description: string;
  skillGap: string[];
}

export interface Connection {
  id: string;
  name: string;
  headline: string;
  company: string;
  avatar: string;
  mutualConnections: number;
  relevanceScore: number;
  status: ConnectionStatus;
  tags: string[];
}

export interface Application {
  id: string;
  jobTitle: string;
  company: string;
  logo: string;
  status: ApplicationStatus;
  appliedDate: string;
  lastUpdate: string;
  nextStep: string;
  notes: string;
  matchScore: number;
  source?: "manual" | "automation";
  automationRunId?: string;
}

export interface Referral {
  id: string;
  targetCompany: string;
  targetRole: string;
  referrer: string;
  referrerTitle: string;
  status: ReferralStatus;
  dateSent: string;
  message: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  time: string;
  icon: string;
}

export interface FollowUp {
  id: string;
  contactName: string;
  company: string;
  scheduledDate: string;
  type: string;
  aiMessage: string;
  status: FollowUpStatus;
}

export interface ChartSeries {
  labels: string[];
  values: number[];
}

export interface ApplicationStatsData extends ChartSeries {
  colors: string[];
}

export interface AiSettings {
  aggressiveMatching: boolean;
  autoNetworking: boolean;
  weeklyDigest: boolean;
  messageTone: MessageTone;
  matchThreshold: number;
  networkingFrequency: NetworkingFrequency;
}

export type AutomationStepStatus = "success" | "error" | "blocked" | "skipped";

export interface AutomationStep {
  id: string;
  label: string;
  status: AutomationStepStatus;
  error?: string;
}

export interface AutomationRun {
  id: string;
  mode: "dry-run" | "live";
  jobId: string;
  company: string;
  role: string;
  createdAt: string;
  status: "success" | "error";
  steps: AutomationStep[];
}

export type LinkedInAgentMode = "assist" | "autopilot";

export type LinkedInAgentStepStatus =
  | "success"
  | "error"
  | "blocked"
  | "pending_approval"
  | "skipped";

export interface LinkedInAgentStep {
  id: string;
  label: string;
  status: LinkedInAgentStepStatus;
  detail: string;
  output?: Record<string, unknown>;
}

export interface LinkedInAgentRun {
  id: string;
  mode: LinkedInAgentMode;
  jobId: string;
  company: string;
  role: string;
  createdAt: string;
  status: "running" | "success" | "partial" | "error";
  summary: {
    jobMatchesFound: number;
    applicationsSubmitted: number;
    recruiterMessagesPrepared: number;
    referralRequestsPrepared: number;
  };
  steps: LinkedInAgentStep[];
}

export interface LinkedInAgentConfig {
  dailyApplicationLimit: number;
  dailyOutreachLimit: number;
  requireHumanApproval: boolean;
  preferredMessageTone: MessageTone;
}

export type ExternalJobSource = "greenhouse" | "lever";

export interface ExternalJobOpportunity {
  id: string;
  source: ExternalJobSource;
  externalId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  postedAt: string | null;
  descriptionSnippet: string;
}

export interface LinkedInBrowserStep {
  id: string;
  label: string;
  status: "success" | "error" | "blocked" | "pending_approval" | "skipped";
  detail: string;
}

export interface LinkedInBrowserRun {
  id: string;
  createdAt: string;
  query: string;
  location: string;
  status: "running" | "success" | "partial" | "error";
  discoveredJobs: Array<{
    title: string;
    company: string;
    url: string;
  }>;
  steps: LinkedInBrowserStep[];
}

export interface DashboardResponse {
  stats: {
    applicationsSent: number;
    interviewsScheduled: number;
    averageMatchScore: string;
    networkGrowth: number;
  };
  topJobs: Job[];
  activityFeed: Activity[];
  networkGrowthData: ChartSeries;
  sourcePerformance: {
    manual: { applications: number; interviews: number; conversionRate: number };
    automation: { applications: number; interviews: number; conversionRate: number };
  };
  queryPerformance: Array<{ query: string; applications: number; jobsFound: number }>;
}

export interface SeedData {
  userProfile: UserProfile;
  jobListings: Job[];
  connections: Connection[];
  applications: Application[];
  referrals: Referral[];
  activityFeed: Activity[];
  networkGrowthData: ChartSeries;
  applicationStatsData: ApplicationStatsData;
  weeklyApplications: ChartSeries;
  followUps: FollowUp[];
}

export interface StoreState {
  profile: UserProfile;
  aiSettings: AiSettings;
  linkedInAgentConfig: LinkedInAgentConfig;
  jobs: Job[];
  connections: Connection[];
  followUps: FollowUp[];
  referrals: Referral[];
  applications: Application[];
  activityFeed: Activity[];
  networkGrowthData: ChartSeries;
  automationRuns: AutomationRun[];
  linkedInAgentRuns: LinkedInAgentRun[];
  linkedInBrowserRuns: LinkedInBrowserRun[];
  outreachHistory: Array<FollowUp & { sentAt: string }>;
}
