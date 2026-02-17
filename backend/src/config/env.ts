import path from "node:path";

export const env = {
  port: Number(process.env.PORT || 4000),
  databasePath: process.env.DATABASE_PATH || path.join(process.cwd(), "data", "found.db"),
  linkedInEmail: process.env.LINKEDIN_EMAIL || "",
  linkedInPassword: process.env.LINKEDIN_PASSWORD || "",
  linkedInStorageStatePath:
    process.env.LINKEDIN_STORAGE_STATE_PATH ||
    path.join(process.cwd(), "data", "linkedin-storage-state.json"),
  linkedInBrowserHeadless: process.env.LINKEDIN_BROWSER_HEADLESS !== "false",
  linkedInBrowserChannel: process.env.LINKEDIN_BROWSER_CHANNEL || "chrome",
  chromiumExecutablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "",
  linkedInAllowAutoSubmit: process.env.LINKEDIN_ALLOW_AUTO_SUBMIT === "true",
  greenHouseBoards:
    process.env.GREENHOUSE_BOARDS ||
    "stripe,figma,datadog,airbnb,notion,asana,coinbase,vercel,linear",
  leverSites:
    process.env.LEVER_SITES || "netflix,shopify,segment,tripactions,postman,atlassian,udemy",
};
