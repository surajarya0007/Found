import { EventEmitter } from "node:events";

export type AutomationEventPayload = {
  source: "agent" | "browser";
  run: unknown;
};

export const automationBus = new EventEmitter();

automationBus.setMaxListeners(50);

export function emitAutomationUpdate(payload: AutomationEventPayload) {
  automationBus.emit("automation:update", payload);
}
