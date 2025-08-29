import { env } from "../config/env";

// расширенный доступ берём из .env
export const PRIVILEGED_USER_IDS: number[] = env.PRIVILEGED_USER_IDS;
export const FOURTH_BUTTON_USER_IDS: number[] = env.FOURTH_BUTTON_USER_IDS;
