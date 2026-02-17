import { Router } from "express";
import {
  createOutreach,
  generateDraftMessage,
  listConnections,
  listFollowUps,
  updateConnectionStatus,
  updateFollowUpItem,
} from "./network.service";

export const networkRouter = Router();

networkRouter.get("/network/connections", (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const connections = listConnections(status);
  res.json({ connections });
});

networkRouter.get("/network/followups", (_req, res) => {
  res.json({ followUps: listFollowUps() });
});

networkRouter.post("/network/messages/draft", (req, res) => {
  const message = generateDraftMessage(req.body ?? {});
  res.json({ message });
});

networkRouter.post("/network/outreach", (req, res) => {
  const followUp = createOutreach(req.body ?? {});
  res.status(201).json({ followUp });
});

networkRouter.patch("/network/connections/:id/status", (req, res) => {
  const connection = updateConnectionStatus(req.params.id, req.body?.status);
  res.json({ connection });
});

networkRouter.patch("/network/followups/:id", (req, res) => {
  const followUp = updateFollowUpItem(req.params.id, req.body ?? {});
  res.json({ followUp });
});
