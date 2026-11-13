/**
 * KickStart 2026 — Google Sheets Sync Service
 * Connects registration submissions and payment status directly to Google Sheets
 */

// Deployed Google Apps Script Web App URL
export const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL || 'https://script.google.com/macros/s/AKfycbzg4BDQ-WArUOngDa6oE94DvEvdeHohMEoBrSUJrIpnWT09cjbh-JOoN5sUPZGWIx2H/exec';

export async function sendToGoogleSheets(payload) {
  if (!GOOGLE_SHEETS_URL) {
    console.info('[Google Sheets]: VITE_GOOGLE_SHEETS_URL not set yet. Data prepared:', payload);
    return { success: true, simulated: true };
  }

  try {
    await fetch(GOOGLE_SHEETS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    console.warn('[Google Sheets Sync Error]:', err);
    return { success: false, error: err.message };
  }
}

