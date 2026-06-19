# Berlin-Thriller-Auswahl

Auswahlformular für **Topographie des Verbrechens - Berlin-Thriller**.

Der Auftrag ist als **Webspecial mit einem in Berlin vor Ort gedrehten Video** angelegt. Pro Text sind in der Regel zwei Leser*innen vorgesehen; ein dritter Platz ist nur nach Absprache möglich. Ab drei Einträgen wird ein Text serverseitig gesperrt.

## Warum Cloudflare?

Die App ist für **Cloudflare Workers + D1** gebaut. Dadurch gibt es keinen schlafenden Render-Server mehr und keine flüchtige Datei, in der Einträge verschwinden können. Die Daten liegen dauerhaft in Cloudflare D1.

## Lokal starten

```bash
npm install
npm run db:migrate:local
npm run dev
```

Danach zeigt Wrangler die lokale URL im Terminal an.

## Speicherung

Die Einträge werden in **Cloudflare D1** gespeichert. D1 ist eine SQLite-Datenbank im Cloudflare-Free-Tier. Die Schutzregeln liegen zusätzlich als Datenbank-Trigger in `migrations/0001_create_selections.sql`.

Bestehende Einträge werden nicht durch neue Einsendungen überschrieben:

- derselbe Name kann nur einmal eingetragen werden
- ein Text wird nach drei Personen blockiert
- der dritte Platz muss im Formular bewusst bestätigt werden

## Deployment

1. Einmal bei Cloudflare anmelden:

```bash
npx wrangler login
```

2. D1-Datenbank erstellen:

```bash
npm run db:create
```

3. Die von Cloudflare ausgegebene `database_id` in `wrangler.jsonc` eintragen.

4. Migration remote ausführen:

```bash
npm run db:migrate:remote
```

5. Deploy:

```bash
npm run deploy
```

Wrangler gibt danach die öffentliche `workers.dev`-URL aus.

## Pflege der Texte

Die Textliste liegt in `src/texts.mjs`. Dort können Titel, Kurzbeschreibung, Videoquelle und Materiallink angepasst werden. Die aktuellen Materiallinks stammen aus den eingebetteten YouTube-Karten der Craft-Vorlage.
