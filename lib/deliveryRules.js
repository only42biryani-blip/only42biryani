import { loadSettings } from '@/lib/settingsRow';
import { rulesFromRow, DEFAULT_RULES } from '@/lib/delivery';

// Server only: your delivery range and charges from the settings table (public read).
// If the delivery SQL has not been run yet, the defaults apply (no kitchen pin = no distance check).
// Pass the settings row if you already have it; otherwise it is read here.
export async function deliveryRules(row) {
  const r = row === undefined ? await loadSettings() : row;
  return r ? rulesFromRow(r) : { ...DEFAULT_RULES };
}
