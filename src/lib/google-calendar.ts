import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const PROMPT_VAULT_TAG = '[prompt-vault]';

function getAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  return oauth2Client;
}

export function isCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
}

export function getAuthUrl(): string {
  const oauth2Client = getAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

export async function exchangeCodeForTokens(code: string): Promise<{ refreshToken: string }> {
  const oauth2Client = getAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned. Revoke app access in Google account and try again.');
  }
  return { refreshToken: tokens.refresh_token };
}

export function writeRefreshTokenToEnv(refreshToken: string): void {
  const envPath = path.join(process.cwd(), '.env');
  let content = '';

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf-8');
  }

  if (content.includes('GOOGLE_REFRESH_TOKEN=')) {
    content = content.replace(/^GOOGLE_REFRESH_TOKEN=.*$/m, `GOOGLE_REFRESH_TOKEN=${refreshToken}`);
  } else {
    content = content.trimEnd() + `\nGOOGLE_REFRESH_TOKEN=${refreshToken}\n`;
  }

  fs.writeFileSync(envPath, content, 'utf-8');
  process.env.GOOGLE_REFRESH_TOKEN = refreshToken;
}

interface PromptForCalendar {
  id: string;
  title: string;
  description?: string | null;
  scheduledAt: Date;
}

function buildEventBody(prompt: PromptForCalendar) {
  const startTime = new Date(prompt.scheduledAt);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

  return {
    summary: prompt.title,
    description: `${prompt.description || ''}\n\n${PROMPT_VAULT_TAG} promptId:${prompt.id}`,
    start: { dateTime: startTime.toISOString(), timeZone: 'UTC' },
    end: { dateTime: endTime.toISOString(), timeZone: 'UTC' },
  };
}

export async function createCalendarEvent(prompt: PromptForCalendar): Promise<string> {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: buildEventBody(prompt),
  });

  return response.data.id!;
}

export async function updateCalendarEvent(eventId: string, prompt: PromptForCalendar): Promise<void> {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.patch({
    calendarId: 'primary',
    eventId,
    requestBody: buildEventBody(prompt),
  });
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    await calendar.events.delete({ calendarId: 'primary', eventId });
  } catch {
    // Already deleted — ignore
  }
}

export interface CalendarEventInfo {
  id: string;
  summary: string;
  start: string;
  promptId: string | null;
}

export async function getCalendarEvent(eventId: string): Promise<{ startTime: Date; deleted: boolean }> {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  try {
    const response = await calendar.events.get({ calendarId: 'primary', eventId });
    const event = response.data;

    if (event.status === 'cancelled') {
      return { startTime: new Date(), deleted: true };
    }

    const startRaw = event.start?.dateTime || event.start?.date;
    return { startTime: new Date(startRaw!), deleted: false };
  } catch (err: unknown) {
    const httpErr = err as { code?: number };
    if (httpErr?.code === 404) {
      return { startTime: new Date(), deleted: true };
    }
    throw err;
  }
}

export async function listUpcomingEvents(maxResults = 20): Promise<CalendarEventInfo[]> {
  const auth = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
    q: PROMPT_VAULT_TAG,
  });

  return (response.data.items || []).map((event) => {
    const desc = event.description || '';
    const match = desc.match(/promptId:([^\s\n]+)/);
    return {
      id: event.id!,
      summary: event.summary || '(no title)',
      start: event.start?.dateTime || event.start?.date || '',
      promptId: match ? match[1] : null,
    };
  });
}
