import { HttpError } from "../../errors/http-error";
import { addActivity, createId, isoDate, store } from "../../store/store";

export function listReferrals() {
  return store.referrals;
}

interface RequestReferralPayload {
  targetCompany?: string;
  targetRole?: string;
  referrer?: string;
  referrerTitle?: string;
  message?: string;
}

export function createReferralRequest(payload: RequestReferralPayload) {
  if (!payload.targetCompany || !payload.targetRole || !payload.referrer || !payload.message) {
    throw new HttpError(
      400,
      "Missing required fields: targetCompany, targetRole, referrer, message",
    );
  }

  const referral = {
    id: createId("r"),
    targetCompany: payload.targetCompany,
    targetRole: payload.targetRole,
    referrer: payload.referrer,
    referrerTitle: payload.referrerTitle || "Connection",
    status: "sent" as const,
    dateSent: isoDate(),
    message: payload.message,
  };

  store.referrals.unshift(referral);

  addActivity(
    "referral",
    `Referral request sent to ${payload.referrer} (${payload.targetCompany})`,
    "userCheck",
  );

  return referral;
}
