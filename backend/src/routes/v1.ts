import { Router } from "express";
import { applicationsRouter } from "../modules/applications/applications.routes";
import { linkedInAgentRouter } from "../modules/agents/linkedin.routes";
import { automationRouter } from "../modules/automation/automation.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";
import { integrationsRouter } from "../modules/integrations/jobs-connectors.routes";
import { jobsRouter } from "../modules/jobs/jobs.routes";
import { networkRouter } from "../modules/network/network.routes";
import { profileRouter } from "../modules/profile/profile.routes";
import { referralsRouter } from "../modules/referrals/referrals.routes";

export const v1Router = Router();

v1Router.use(dashboardRouter);
v1Router.use(jobsRouter);
v1Router.use(integrationsRouter);
v1Router.use(applicationsRouter);
v1Router.use(networkRouter);
v1Router.use(referralsRouter);
v1Router.use(profileRouter);
v1Router.use(automationRouter);
v1Router.use(linkedInAgentRouter);
