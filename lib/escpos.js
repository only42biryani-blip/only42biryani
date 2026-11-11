// Turns the plain-text bill into raw ESC/POS bytes for thermal receipt printers, and sends them over
// Bluetooth LE with the browser's Web Bluetooth. Only BLE printers can be reached this way; older
// "Classic" Bluetooth printers must be used through the Print button (for example with the RawBT app).

// Printers only understand plain characters: swap anything else for "?" (accents are removed first).
export function asciiOnly(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E\n]/g, '?');
}

// Initialise, print the text with the first line in bold, feed paper, and cut (ignored if the printer has no cutter).
export function escposFromText(text) {
  const lines = asciiOnly(text).split('\n');
  const enc = new TextEncoder();
  const out = [];
  const push = (...b) => out.push(Uint8Array.from(b));
  push(0x1b, 0x40);                       // ESC @   reset
  lines.forEach((line, i) => {
    if (i === 0) push(0x1b, 0x45, 0x01);  // ESC E 1 bold on
    out.push(enc.encode(line));
    push(0x0a);                           // line feed
    if (i === 0) push(0x1b, 0x45, 0x00);  // ESC E 0 bold off
  });
  push(0x0a, 0x0a, 0x0a);                 // feed
  push(0x1d, 0x56, 0x42, 0x00);           // GS V B 0  feed and partial cut
  const total = out.reduce((n, a) => n + a.length, 0);
  const bytes = new Uint8Array(total);
  let o = 0;
  for (const a of out) { bytes.set(a, o); o += a.length; }
  return bytes;
}

// Services that common BLE receipt printers use for writing. Chrome only allows services listed up front.
export const PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000ffe0-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
];

export function bluetoothAvailable() {
  return typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);
}

// Asks the user to pick their printer, finds a writable channel, and sends the bytes in small pieces.
export async function printOverBluetooth(bytes) {
  if (!bluetoothAvailable()) throw new Error('This browser cannot connect to Bluetooth printers. Use Chrome on Android or a computer, or use the Print button.');
  const device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICES });
  const server = await device.gatt.connect();
  let target = null;
  for (const uuid of PRINTER_SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const chars = await service.getCharacteristics();
      const c = chars.find((x) => x.properties.writeWithoutResponse) || chars.find((x) => x.properties.write);
      if (c) { target = c; break; }
    } catch {
      // That service is not on this printer; try the next one.
    }
  }
  if (!target) {
    server.disconnect();
    throw new Error('Connected, but this printer has no channel we can write to. It is probably a "Classic" Bluetooth printer: use the Print button with the RawBT app instead.');
  }
  const CHUNK = 100;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const piece = bytes.slice(i, i + CHUNK);
    if (target.properties.writeWithoutResponse) await target.writeValueWithoutResponse(piece);
    else await target.writeValue(piece);
    await new Promise((r) => setTimeout(r, 30));
  }
  server.disconnect();
}
