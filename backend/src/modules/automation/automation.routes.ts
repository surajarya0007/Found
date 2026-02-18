import { Router } from "express";
import { createAutomationRun, listAutomationRuns } from "./automation.service";
import { automationBus } from "../../events/automation-bus";
import { listLinkedInAgentRuns } from "../agents/linkedin.service";
import { listLinkedInBrowserRuns } from "../agents/linkedin-browser.service";
import { store } from "../../store/store";

export const automationRouter = Router();

automationRouter.get("/automation/runs", (_req, res) => {
  res.json({ runs: listAutomationRuns() });
});

automationRouter.post("/automation/runs", (req, res) => {
  const payload = createAutomationRun(req.body ?? {});
  res.status(201).json(payload);
});

automationRouter.get("/automation/stream", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders?.();

  const send = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send initial snapshot.
  send({
    agents: listLinkedInAgentRuns(),
    browsers: listLinkedInBrowserRuns(),
    applications: store.applications.length,
  });

  const handler = (payload: unknown) => send(payload);
  automationBus.on("automation:update", handler);

  const keepAlive = setInterval(() => res.write(": keep-alive\n\n"), 20000);

  req.on("close", () => {
    automationBus.off("automation:update", handler);
    clearInterval(keepAlive);
    res.end();
  });
});
