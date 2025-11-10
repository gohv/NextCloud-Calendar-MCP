import { createDAVClient, DAVCalendar, DAVCalendarObject } from 'tsdav';
import { getConfig } from './config.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;

export async function getCalDAVClient() {
  if (client) {
    return client;
  }

  const config = getConfig();
  const { serverUrl, username, password } = config.nextcloud;

  client = await createDAVClient({
    serverUrl,
    credentials: {
      username,
      password,
    },
    authMethod: 'Basic',
    defaultAccountType: 'caldav',
  });

  return client;
}

export interface CalendarInfo {
  displayName: string;
  url: string;
  description?: string;
  ctag?: string;
}

export interface EventInfo {
  id: string;
  url: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  status?: string;
  etag?: string;
}

export async function listCalendars(): Promise<CalendarInfo[]> {
  const client = await getCalDAVClient();
  const calendars = await client.fetchCalendars();

  return calendars.map((cal: DAVCalendar) => ({
    displayName: typeof cal.displayName === 'string' ? cal.displayName : 'Unnamed Calendar',
    url: cal.url,
    description: cal.description,
    ctag: cal.ctag,
  }));
}

export async function getEvents(
  calendarUrl: string,
  startDate?: string,
  endDate?: string
): Promise<EventInfo[]> {
  const client = await getCalDAVClient();

  const timeRange = startDate && endDate ? {
    start: startDate,
    end: endDate,
  } : undefined;

  const calendarObjects = await client.fetchCalendarObjects({
    calendar: { url: calendarUrl } as DAVCalendar,
    timeRange,
  });

  return calendarObjects.map((obj: DAVCalendarObject) => {
    const event = parseICalendar(obj.data);
    return {
      id: obj.url?.split('/').pop()?.replace('.ics', '') || '',
      url: obj.url || '',
      summary: event.summary || 'Untitled Event',
      description: event.description,
      start: event.start || '',
      end: event.end || '',
      location: event.location,
      status: event.status,
      etag: obj.etag,
    };
  });
}

export async function createEvent(
  calendarUrl: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
  }
): Promise<string> {
  const client = await getCalDAVClient();

  const iCalString = createICalendar(event);
  const filename = `${generateUID()}.ics`;

  const result = await client.createCalendarObject({
    calendar: { url: calendarUrl } as DAVCalendar,
    filename,
    iCalString,
  });

  return result.url || filename;
}

export async function updateEvent(
  eventUrl: string,
  etag: string,
  event: {
    summary: string;
    description?: string;
    start: string;
    end: string;
    location?: string;
    status?: string;
  }
): Promise<void> {
  const client = await getCalDAVClient();

  const iCalString = createICalendar(event);

  await client.updateCalendarObject({
    calendarObject: {
      url: eventUrl,
      data: iCalString,
      etag,
    } as DAVCalendarObject,
  });
}

export async function deleteEvent(eventUrl: string, etag: string): Promise<void> {
  const client = await getCalDAVClient();

  await client.deleteCalendarObject({
    calendarObject: {
      url: eventUrl,
      etag,
    } as DAVCalendarObject,
  });
}

// Helper functions for iCalendar format
function parseICalendar(icalData: string): Partial<EventInfo> {
  const lines = icalData.split('\n');
  const event: Partial<EventInfo> = {};

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('SUMMARY:')) {
      event.summary = trimmedLine.substring(8);
    } else if (trimmedLine.startsWith('DESCRIPTION:')) {
      event.description = trimmedLine.substring(12);
    } else if (trimmedLine.startsWith('DTSTART')) {
      const match = trimmedLine.match(/DTSTART[^:]*:(.+)/);
      if (match) {
        event.start = parseICalDate(match[1]);
      }
    } else if (trimmedLine.startsWith('DTEND')) {
      const match = trimmedLine.match(/DTEND[^:]*:(.+)/);
      if (match) {
        event.end = parseICalDate(match[1]);
      }
    } else if (trimmedLine.startsWith('LOCATION:')) {
      event.location = trimmedLine.substring(9);
    } else if (trimmedLine.startsWith('STATUS:')) {
      event.status = trimmedLine.substring(7);
    }
  }

  return event;
}

function parseICalDate(dateStr: string): string {
  // iCalendar date format: 20231225T120000Z or 20231225T120000
  const cleanDate = dateStr.replace(/[TZ]/g, '');

  if (cleanDate.length >= 8) {
    const year = cleanDate.substring(0, 4);
    const month = cleanDate.substring(4, 6);
    const day = cleanDate.substring(6, 8);
    const hour = cleanDate.substring(8, 10) || '00';
    const minute = cleanDate.substring(10, 12) || '00';
    const second = cleanDate.substring(12, 14) || '00';

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return dateStr;
}

function createICalendar(event: {
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  status?: string;
}): string {
  const uid = generateUID();
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const startDate = formatICalDate(event.start);
  const endDate = formatICalDate(event.end);

  let ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nextcloud Calendar MCP//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${startDate}`,
    `DTEND:${endDate}`,
    `SUMMARY:${event.summary}`,
  ];

  if (event.description) {
    ical.push(`DESCRIPTION:${event.description}`);
  }

  if (event.location) {
    ical.push(`LOCATION:${event.location}`);
  }

  if (event.status) {
    ical.push(`STATUS:${event.status}`);
  }

  ical.push('END:VEVENT', 'END:VCALENDAR');

  return ical.join('\r\n');
}

function formatICalDate(dateStr: string): string {
  // Convert ISO date to iCalendar format
  const date = new Date(dateStr);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');
  const minute = String(date.getUTCMinutes()).padStart(2, '0');
  const second = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

function generateUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}
