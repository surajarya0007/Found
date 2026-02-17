import { mergeAiSettings, store } from "../../store/store";
import type { AiSettings } from "../../types/domain";

export function getProfilePayload() {
  return {
    profile: store.profile,
    aiSettings: store.aiSettings,
  };
}

export function saveProfileAiSettings(payload: Partial<AiSettings>) {
  return mergeAiSettings(payload);
}
