# Shoot Music NL/BE Dashboard

Dashboard voor Shoot Music NL/BE waarmee je in een oogopslag ziet:
- Wie welk pakket heeft ontvangen (contact + organisatie + e-mail)
- Of er gereageerd is
- Eventuele quotes
- Tracklists per pakket

## Setup

1. Installeer dependencies:
   ```bash
   npm install
   ```
2. Zet de environment variables (zie hieronder).
3. Start de dev server:
   ```bash
   npm run dev
   ```
4. Open `http://localhost:3000`.

## Environment variables

Maak een `.env.local` aan:

```
SHEET_ID=1qXL9woeFlsGmOhuRFDzXC3Ue_rnboG9s3khYjdJFOqM
GOOGLE_SHEETS_CLIENT_EMAIL=...
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
BASIC_AUTH_PASSWORD=your-password
```

Optioneel (handig bij CSV fallback):
```
CONTACTS_SHEET_NAME=Contacten
```

Optioneel (packages tab naam, default is `Package`):
```
PACKAGES_SHEET_NAME=Package
```

Optioneel (quotes tab naam, default is `Quotes`):
```
QUOTES_SHEET_NAME=Quotes
```

Optioneel (voor basic auth gebruikersnaam, default is `admin`):
```
BASIC_AUTH_USERNAME=admin
```

## Service account (aanbevolen)

1. Maak een Google Cloud service account aan.
2. Activeer de Google Sheets API.
3. Download het service-account JSON en zet het e-mailadres in `GOOGLE_SHEETS_CLIENT_EMAIL`.
4. Zet de private key in `GOOGLE_SHEETS_PRIVATE_KEY` (let op de `\n` line breaks).
5. Deel de sheet met het service-account e-mailadres (leesrechten zijn genoeg).

## CSV fallback

Als er geen service-account env vars beschikbaar zijn, gebruikt de app een "published as CSV"
fallback. Publiceer de sheet in Google Sheets via:
`Bestand` → `Delen` → `Publiceren op internet`.

Let op: zonder API-toegang kunnen tabs niet altijd automatisch gedetecteerd worden. Zet in
dat geval `CONTACTS_SHEET_NAME` om de juiste tab te kiezen.

## Packages / tabs herkenning

- Package kolommen worden herkend als kolomnaam die matcht met `/^\d{2}$/`.
- Package tabs worden herkend via tabs met dezelfde naam (bijv. `01`, `02`).
- Alle gevonden IDs worden gecombineerd in de filterlijst.

## Packages tab (labels)

Voeg optioneel een tab `Package` toe met kolommen:

```
PACKAGE_ID,PACKAGE_LABEL
```

Deze labels worden overal in de UI gebruikt.

## Quotes tab (meerdere quotes per contact)

Optioneel kun je een extra tab `Quotes` toevoegen met deze kolommen:

```
CONTACT,QUOTE_DATE,PACKAGE_ID,QUOTE_TEXT
```

- `QUOTE_DATE` bepaalt welke quote als "nieuwste" in de hoofdtabel verschijnt.
- `PACKAGE_ID` (bijv. `01`) koppelt een quote aan een specifiek pakket.

## Data health

Aanbevolen extra kolommen om later automatisch response-meting te doen:
- `date_sent`
- `gmail_thread_id`
- `message_id`

## Scripts

- `npm run dev` start de dev server
- `npm run build` maakt een production build
- `npm run start` start de production server
