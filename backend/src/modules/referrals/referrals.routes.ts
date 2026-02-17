import { Router } from "express";
import { createReferralRequest, listReferrals } from "./referrals.service";

export const referralsRouter = Router();

referralsRouter.get("/referrals", (_req, res) => {
  res.json({ referrals: listReferrals() });
});

referralsRouter.post("/referrals/request", (req, res) => {
  const referral = createReferralRequest(req.body ?? {});
  res.status(201).json({ referral });
});
