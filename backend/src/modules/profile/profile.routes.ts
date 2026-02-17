import { Router } from "express";
import { getProfilePayload, saveProfileAiSettings } from "./profile.service";

export const profileRouter = Router();

profileRouter.get("/profile", (_req, res) => {
  res.json(getProfilePayload());
});

profileRouter.put("/profile/ai-settings", (req, res) => {
  const aiSettings = saveProfileAiSettings(req.body ?? {});
  res.json({ aiSettings });
});
