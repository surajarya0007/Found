const seed = require("./seedData");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${random}`;
}

const store = {
  profile: clone(seed.userProfile),
  aiSettings: {
    aggressiveMatching: true,
    autoNetworking: true,
    weeklyDigest: true,
    messageTone: "professional",
    matchThreshold: 80,
    networkingFrequency: "daily",
  },
  jobs: clone(seed.jobListings),
  connections: clone(seed.connections),
  followUps: clone(seed.followUps),
  referrals: clone(seed.referrals),
  applications: clone(seed.applications),
  activityFeed: clone(seed.activityFeed),
  networkGrowthData: clone(seed.networkGrowthData),
  automationRuns: [],
  outreachHistory: [],
};

function isoDate(value = new Date()) {
  return value.toISOString().slice(0, 10);
}

function addActivity(type, title, icon) {
  store.activityFeed.unshift({
    id: createId("act"),
    type,
    title,
    icon,
    time: "just now",
  });

  if (store.activityFeed.length > 30) {
    store.activityFeed = store.activityFeed.slice(0, 30);
  }
}

function createApplicationFromJob(job, source) {
  const newApplication = {
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
  };

  store.applications.unshift(newApplication);
  addActivity("application", `Applied to ${job.title} at ${job.company}`, "send");

  return newApplication;
}

module.exports = {
  store,
  createId,
  isoDate,
  addActivity,
  createApplicationFromJob,
};
