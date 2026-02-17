import { HttpError } from "../../errors/http-error";
import { addActivity, createId, isoDate, store } from "../../store/store";
import type { ConnectionStatus, FollowUpStatus, MessageTone } from "../../types/domain";

const allowedConnectionStatus: ConnectionStatus[] = ["suggested", "connected", "pending"];

export function listConnections(status?: string) {
  if (!status) {
    return store.connections;
  }

  if (!allowedConnectionStatus.includes(status as ConnectionStatus)) {
    throw new HttpError(400, "Invalid status filter");
  }

  return store.connections.filter((connection) => connection.status === status);
}

export function listFollowUps() {
  return store.followUps;
}

interface DraftMessagePayload {
  name?: string;
  company?: string;
  tone?: MessageTone;
}

export function generateDraftMessage(payload: DraftMessagePayload) {
  const name = payload.name || "there";
  const company = payload.company || "your company";
  const tone = payload.tone || "professional";

  const styles: Record<MessageTone, string> = {
    professional: `Hi ${name},\n\nI hope you're doing well. I am actively exploring software roles at ${company} and would value your perspective on the team and hiring process.`,
    casual: `Hey ${name},\n\nI am looking at openings at ${company} and wanted to quickly connect. If you're open, I'd love to hear how things work on your side.`,
    formal: `Hello ${name},\n\nI am writing to express my interest in opportunities at ${company}. If convenient, I would appreciate any guidance regarding relevant teams or recruiters.`,
  };

  return `${styles[tone]}\n\nBest regards,\n${store.profile.name}`;
}

interface CreateOutreachPayload {
  contactName?: string;
  company?: string;
  message?: string;
  type?: string;
  scheduledDate?: string;
}

export function createOutreach(payload: CreateOutreachPayload) {
  if (!payload.contactName || !payload.company || !payload.message) {
    throw new HttpError(400, "Missing required fields: contactName, company, message");
  }

  const followUp = {
    id: createId("f"),
    contactName: payload.contactName,
    company: payload.company,
    scheduledDate: payload.scheduledDate || isoDate(),
    type: payload.type || "Outreach Follow-up",
    aiMessage: payload.message,
    status: payload.scheduledDate ? "scheduled" : "pending",
  } as const;

  store.followUps.unshift(followUp);
  store.outreachHistory.unshift({ ...followUp, sentAt: new Date().toISOString() });

  addActivity(
    "network",
    `AI prepared outreach for ${payload.contactName} at ${payload.company}`,
    "messageCircle",
  );

  return followUp;
}

export function updateConnectionStatus(connectionId: string, status: ConnectionStatus) {
  if (!allowedConnectionStatus.includes(status)) {
    throw new HttpError(400, "Invalid status value");
  }

  const connection = store.connections.find((conn) => conn.id === connectionId);

  if (!connection) {
    throw new HttpError(404, "Connection not found");
  }

  connection.status = status;
  addActivity("connection", `Updated connection ${connection.name} to ${status}`, "userPlus");

  return connection;
}

export function updateFollowUpItem(
  id: string,
  payload: { aiMessage?: string; status?: FollowUpStatus },
) {
  const followUp = store.followUps.find((fu) => fu.id === id);

  if (!followUp) {
    throw new HttpError(404, "Follow-up not found");
  }

  if (payload.aiMessage !== undefined) followUp.aiMessage = payload.aiMessage;
  if (payload.status !== undefined) followUp.status = payload.status;

  addActivity("network", `Updated follow-up for ${followUp.contactName}`, "messageCircle");
  return followUp;
}
