import { createDAVClient, DAVCalendar, DAVObject } from "tsdav";

export type DAVClient = Awaited<ReturnType<typeof createDAVClient>>;
