import { createDAVClient, DAVCalendar }   from "tsdav";
import { AuthMethod, DefaultAccountType } from "../enums/caldav.enums";
import * as xml_js_types                  from "xml-js";

export type DAVClient = Awaited<ReturnType<typeof createDAVClient>>;

export type CalendarEvent = {
	summary: string;
	startDate: Date;
	endDate: Date;
	location?: string;
	description?: string;
};

export type DavClientParamSettings = {
	serverUrl: string,
	credentials: {
		username: string,
		password: string,
	},
	authMethod: AuthMethod.Basic,
	defaultAccountType: DefaultAccountType.CALDAV,
}

export type FetchCalendarObjectsParams = {
	calendar: DAVCalendar;
	objectUrls?: string[];
	filters?: xml_js_types.ElementCompact;
	timeRange?: {
		start: string;
		end: string;
	};
	expand?: boolean;
	urlFilter?: (url: string) => boolean;
	headers?: Record<string, string>;
	headersToExclude?: string[];
	useMultiGet?: boolean;
	fetchOptions?: RequestInit;
}

