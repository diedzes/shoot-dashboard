import { JWT } from "google-auth-library";

const REVALIDATE_SECONDS = 300;
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

export type ContactRow = {
  id: string;
  contact: string | null;
  type: string | null;
  email: string | null;
  organization: string | null;
  responded: boolean | null;
  quote: string | null;
  quotes: QuoteEntry[];
  packagesSent: string[];
};

export type QuoteEntry = {
  text: string;
  date: string | null;
  packageId: string | null;
};

export type Tracklist = {
  packageId: string;
  available: boolean;
  headers: string[] | null;
  rows: string[][];
};

type SheetValues = string[][];

const normalizeHeader = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

const normalizeCell = (value: unknown) => String(value ?? "").trim();

const isPackageId = (value: string) => /^\d{2}$/.test(value);

const normalizeContactKey = (value: string) =>
  normalizeCell(value).toLowerCase().replace(/\s+/g, " ");

const normalizeYesNo = (value: string): boolean | null => {
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return null;
  if (["ja", "yes", "y", "true"].includes(cleaned)) return true;
  if (["nee", "no", "n", "false"].includes(cleaned)) return false;
  return null;
};

const normalizeQuote = (value: string): string | null => {
  const cleaned = value.trim();
  if (!cleaned) return null;
  if (cleaned === "—" || cleaned === "-") return null;
  return cleaned;
};

const getQuoteTimestamp = (value: string | null) => {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getLatestQuote = (quotes: QuoteEntry[]) =>
  quotes.reduce<QuoteEntry | null>((latest, current) => {
    if (!latest) return current;
    return getQuoteTimestamp(current.date) >= getQuoteTimestamp(latest.date)
      ? current
      : latest;
  }, null);

const parseCsv = (input: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];
    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        current += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }
    if (char === "\"") {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      row.push(current);
      current = "";
      continue;
    }
    if (char === "\n") {
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }
    if (char === "\r") {
      continue;
    }
    current += char;
  }
  row.push(current);
  rows.push(row);
  return rows.filter((line) => line.some((cell) => cell.trim() !== ""));
};

const getServiceAccountClient = () => {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) return null;
  return new JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [SHEETS_SCOPE],
  });
};

const getAccessToken = async () => {
  const client = getServiceAccountClient();
  if (!client) return null;
  const token = await client.getAccessToken();
  return token?.token ?? null;
};

const fetchWithToken = async (url: string) => {
  const token = await getAccessToken();
  if (!token) return null;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!response.ok) {
    throw new Error(`Google Sheets API error: ${response.status}`);
  }
  return response.json();
};

const fetchSheetValuesWithToken = async (
  sheetId: string,
  sheetName: string
): Promise<SheetValues | null> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    sheetName
  )}?valueRenderOption=FORMATTED_VALUE`;
  const data = await fetchWithToken(url);
  if (!data) return null;
  return (data.values as SheetValues | undefined) ?? [];
};

const fetchSheetMetadataWithToken = async (sheetId: string) => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const data = await fetchWithToken(url);
  if (!data) return null;
  return data as {
    sheets?: Array<{ properties?: { title?: string } }>;
  };
};

const fetchSheetValuesFromCsv = async (
  sheetId: string,
  sheetName?: string
): Promise<SheetValues> => {
  const sheetParam = sheetName ? `&sheet=${encodeURIComponent(sheetName)}` : "";
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${sheetParam}`;
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) {
    throw new Error(`CSV fetch failed: ${response.status}`);
  }
  const text = await response.text();
  return parseCsv(text);
};

export const getContactsData = async () => {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) {
    throw new Error("SHEET_ID env var is missing.");
  }

  const metadata = await fetchSheetMetadataWithToken(sheetId);
  const sheetNames =
    metadata?.sheets
      ?.map((sheet) => sheet.properties?.title)
      .filter((title): title is string => Boolean(title)) ?? [];

  const contactSheetName =
    process.env.CONTACTS_SHEET_NAME || sheetNames[0] || "Sheet1";

  const values =
    (await fetchSheetValuesWithToken(sheetId, contactSheetName)) ??
    (await fetchSheetValuesFromCsv(sheetId, contactSheetName));

  const packagesSheetName = process.env.PACKAGES_SHEET_NAME || "Package";
  let packageRows: SheetValues | null = null;
  if (sheetNames.includes(packagesSheetName)) {
    try {
      packageRows =
        (await fetchSheetValuesWithToken(sheetId, packagesSheetName)) ??
        (await fetchSheetValuesFromCsv(sheetId, packagesSheetName));
    } catch (error) {
      console.warn("[Sheets] Packages sheet fetch failed", error);
      packageRows = null;
    }
  }

  const quotesSheetName = process.env.QUOTES_SHEET_NAME || "Quotes";
  let quoteRows: SheetValues | null = null;
  if (sheetNames.includes(quotesSheetName)) {
    try {
      quoteRows =
        (await fetchSheetValuesWithToken(sheetId, quotesSheetName)) ??
        (await fetchSheetValuesFromCsv(sheetId, quotesSheetName));
    } catch (error) {
      console.warn("[Sheets] Quotes sheet fetch failed", error);
      quoteRows = null;
    }
  }

  const headers = values[0] ?? [];
  const normalizedHeaders = headers.map(normalizeHeader);

  console.info("[Sheets] Tabs:", sheetNames);
  console.info("[Sheets] Contact headers:", headers);

  const indexByHeader = (predicate: (header: string) => boolean) =>
    normalizedHeaders.findIndex(predicate);

  const contactIndex = indexByHeader((header) => header.includes("CONTACT"));
  const typeIndex = indexByHeader((header) => header.includes("TYPE"));
  const emailIndex = indexByHeader((header) => header.includes("EMAIL"));
  const orgIndex = indexByHeader(
    (header) =>
      header.includes("ORGANIZATION") ||
      header.includes("ORGANISATION") ||
      header.includes("ORGANISATIE")
  );
  const respondedIndex = indexByHeader(
    (header) =>
      header.includes("TERUG GEMAILD") ||
      header.includes("REAGEERD") ||
      header.includes("RESPONDED") ||
      header.includes("RESPONSE")
  );
  const quoteIndex = indexByHeader((header) => header.includes("QUOTE"));

  const packageIdsFromTabs = sheetNames.filter(isPackageId);
  const packageHeaders = normalizedHeaders
    .map((header, idx) => ({
      header,
      index: idx,
    }))
    .filter(({ header }) => isPackageId(header.replace(/\s+/g, "")));

  const packageIdsFromHeaders = packageHeaders.map(({ header }) =>
    header.replace(/\s+/g, "")
  );

  const packageLabels: Record<string, string> = {};
  if (packageRows && packageRows.length > 1) {
    const packageHeadersRow = packageRows[0] ?? [];
    const normalizedPackageHeaders = packageHeadersRow.map(normalizeHeader);
    const packageIndexByHeader = (predicate: (header: string) => boolean) =>
      normalizedPackageHeaders.findIndex(predicate);
    const packageIdIndex = packageIndexByHeader(
      (header) => header.includes("PACKAGE") && header.includes("ID")
    );
    const packageLabelIndex = packageIndexByHeader(
      (header) => header.includes("LABEL") || header.includes("NAME")
    );

    packageRows.slice(1).forEach((row) => {
      const rawId = normalizeCell(row[packageIdIndex]);
      const packageId = rawId.replace(/\s+/g, "");
      if (!isPackageId(packageId)) return;
      const label = normalizeCell(row[packageLabelIndex]);
      if (!label) return;
      packageLabels[packageId] = label;
    });
  }

  const packageIdsFromLabels = Object.keys(packageLabels);

  const packageIds = Array.from(
    new Set([...packageIdsFromTabs, ...packageIdsFromHeaders, ...packageIdsFromLabels])
  ).sort();

  const quotesByContact = new Map<string, QuoteEntry[]>();
  if (quoteRows && quoteRows.length > 1) {
    const quoteHeaders = quoteRows[0] ?? [];
    const normalizedQuoteHeaders = quoteHeaders.map(normalizeHeader);
    const quoteIndexByHeader = (predicate: (header: string) => boolean) =>
      normalizedQuoteHeaders.findIndex(predicate);
    const quoteContactIndex = quoteIndexByHeader((header) => header.includes("CONTACT"));
    const quoteDateIndex =
      quoteIndexByHeader((header) => header.includes("QUOTE") && header.includes("DATE")) >= 0
        ? quoteIndexByHeader((header) => header.includes("QUOTE") && header.includes("DATE"))
        : quoteIndexByHeader((header) => header.includes("DATE"));
    const quoteTextIndex =
      quoteIndexByHeader((header) => header.includes("QUOTE") && header.includes("TEXT")) >= 0
        ? quoteIndexByHeader((header) => header.includes("QUOTE") && header.includes("TEXT"))
        : quoteIndexByHeader((header) => header === "QUOTE") >= 0
        ? quoteIndexByHeader((header) => header === "QUOTE")
        : quoteIndexByHeader(
            (header) => header.includes("QUOTE") && !header.includes("DATE")
          );
    const quotePackageIndex = quoteIndexByHeader((header) => header.includes("PACKAGE"));

    if (quoteContactIndex < 0 || quoteTextIndex < 0) {
      console.warn("[Sheets] Quotes sheet missing CONTACT or QUOTE_TEXT columns.");
      quoteRows = null;
    }

    quoteRows?.slice(1).forEach((row) => {
      const contactValue = normalizeCell(row[quoteContactIndex]);
      const contactKey = normalizeContactKey(contactValue);
      if (!contactKey) return;
      const text = normalizeQuote(normalizeCell(row[quoteTextIndex]));
      if (!text) return;
      const dateValue = normalizeCell(row[quoteDateIndex]) || null;
      const packageValue = normalizeCell(row[quotePackageIndex]);
      const packageId = packageValue
        ? packageValue.replace(/\s+/g, "")
        : "";
      const normalizedPackageId = isPackageId(packageId) ? packageId : null;
      const entry: QuoteEntry = {
        text,
        date: dateValue,
        packageId: normalizedPackageId,
      };
      const existing = quotesByContact.get(contactKey) ?? [];
      existing.push(entry);
      quotesByContact.set(contactKey, existing);
    });
  }

  const dataRows = values.slice(1).filter((row) =>
    row.some((cell) => normalizeCell(cell) !== "")
  );

  const contacts: ContactRow[] = dataRows.map((row, rowIndex) => {
    const getCell = (index: number) =>
      index >= 0 ? normalizeCell(row[index]) : "";
    const contact = normalizeCell(
      contactIndex >= 0 ? row[contactIndex] : ""
    );
    const type = normalizeCell(typeIndex >= 0 ? row[typeIndex] : "");
    const email = normalizeCell(emailIndex >= 0 ? row[emailIndex] : "");
    const organization = normalizeCell(orgIndex >= 0 ? row[orgIndex] : "");
    const responded = normalizeYesNo(
      normalizeCell(respondedIndex >= 0 ? row[respondedIndex] : "")
    );
    const quote = normalizeQuote(
      normalizeCell(quoteIndex >= 0 ? row[quoteIndex] : "")
    );
    const contactKey = normalizeContactKey(contact);
    const attachedQuotes = quotesByContact.get(contactKey) ?? [];
    const combinedQuotes = quote
      ? [...attachedQuotes, { text: quote, date: null, packageId: null }]
      : attachedQuotes;
    const latestQuote = getLatestQuote(combinedQuotes);

    const packagesSent = packageHeaders
      .filter(({ header, index }) => {
        const columnId = header.replace(/\s+/g, "");
        if (!isPackageId(columnId)) return false;
        const value = normalizeCell(row[index]);
        return value.toLowerCase().includes("x");
      })
      .map(({ header }) => header.replace(/\s+/g, ""));

    return {
      id: `${rowIndex + 1}`,
      contact: contact || null,
      type: type || null,
      email: email || null,
      organization: organization || null,
      responded,
      quote: latestQuote?.text ?? null,
      quotes: combinedQuotes,
      packagesSent,
    };
  });

  const types = Array.from(
    new Set(
      contacts
        .map((contact) => contact.type)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  return {
    contactSheetName,
    contacts,
    packageLabels,
    packageIds,
    sheetNames,
    types,
  };
};

export const getPackageTracklist = async (
  packageId: string
): Promise<Tracklist> => {
  const sheetId = process.env.SHEET_ID;
  if (!sheetId) {
    return {
      packageId,
      available: false,
      headers: null,
      rows: [],
    };
  }

  try {
    const values =
      (await fetchSheetValuesWithToken(sheetId, packageId)) ??
      (await fetchSheetValuesFromCsv(sheetId, packageId));
    if (!values || values.length === 0) {
      return { packageId, available: false, headers: null, rows: [] };
    }
    const headers = values[0]?.map((value) => normalizeCell(value)) ?? [];
    const hasHeaders = headers.some((value) => value.trim() !== "");
    const normalized = headers.map(normalizeHeader);
    const looksLikeContactsSheet =
      normalized.some((header) => header.includes("CONTACT")) ||
      normalized.some((header) => header.includes("EMAIL")) ||
      normalized.some((header) => header.includes("ORGANIZATION"));
    if (looksLikeContactsSheet) {
      return {
        packageId,
        available: false,
        headers: null,
        rows: [],
      };
    }
    const rows = values.slice(1).map((row) =>
      row.map((value) => normalizeCell(value))
    );
    return {
      packageId,
      available: true,
      headers: hasHeaders ? headers : null,
      rows,
    };
  } catch (error) {
    console.warn("[Sheets] Tracklist fetch failed", error);
    return {
      packageId,
      available: false,
      headers: null,
      rows: [],
    };
  }
};
