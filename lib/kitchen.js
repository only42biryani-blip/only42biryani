import { loadSettings } from '@/lib/settingsRow';

// Is the kitchen ONLINE right now? You switch it on in /admin ("Go online") and it switches itself off at the
// time you chose, so every day starts offline until you press the button again.
// If the kitchen-switch SQL has not been run yet (or the row cannot be read), we do NOT block anything (true).
export function kitchenOnlineFromRow(row) {
  if (!row || row.online_until === undefined) return true;
  return row.online_until ? new Date(row.online_until).getTime() > Date.now() : false;
}

// Server only. Pass the settings row if you already have it; otherwise it is read here.
export async function kitchenOnline(row) {
  return kitchenOnlineFromRow(row === undefined ? await loadSettings() : row);
}

export const OFFLINE_MESSAGE = 'We are offline right now. Please check back when the kitchen is open.';
