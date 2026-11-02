import "server-only";
import { DEFAULT_TIME_ZONE, resolveTimeZone } from "./time";

/** Time zone that sets the ranking's yearly period (Jan 1 to Dec 31). */
export const APP_TIME_ZONE = resolveTimeZone(process.env.APP_TIME_ZONE, DEFAULT_TIME_ZONE);
