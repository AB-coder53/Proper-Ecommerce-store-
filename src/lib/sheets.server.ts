import "server-only";

const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4/spreadsheets";

function headers() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connKey) throw new Error("Google Sheets connection is not configured");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connKey,
    "Content-Type": "application/json",
  };
}

export function spreadsheetId() {
  const id = process.env["RESERVATIONS_SHEET_ID"];
  if (!id) throw new Error("RESERVATIONS_SHEET_ID is not set");
  return id;
}

async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: headers() });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[sheets] ${init?.method ?? "GET"} ${url} failed [${res.status}]: ${body}`);
    throw new Error(`Google Sheets request failed [${res.status}]`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

export async function getValues(range: string): Promise<string[][]> {
  const data = await request(`${GATEWAY}/${spreadsheetId()}/values/${range}`);
  return (data["values"] as string[][] | undefined) ?? [];
}

export async function appendValues(range: string, values: (string | number)[][]) {
  await request(
    `${GATEWAY}/${spreadsheetId()}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values }) },
  );
}
