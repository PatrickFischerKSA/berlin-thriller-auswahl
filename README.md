# Berlin-Thriller-Auswahl

Auswahlformular für **Topographie des Verbrechens - Berlin-Thriller**.

Der Auftrag ist als **Webspecial mit einem in Berlin vor Ort gedrehten Video** angelegt. Pro Text sind in der Regel zwei Leser*innen vorgesehen; ein dritter Platz ist nur nach Absprache möglich. Ab drei Einträgen wird ein Text serverseitig gesperrt.

## Start

```bash
npm start
```

Danach läuft die App lokal unter `http://localhost:3000`.

## Speicherung

Die Einträge werden serverseitig gespeichert. Für Render Free ist Supabase vorgesehen, damit keine kostenpflichtige Render-Disk nötig ist.

Wenn `SUPABASE_URL` und `SUPABASE_SECRET_KEY` gesetzt sind, speichert die App in Supabase. Ohne diese Variablen nutzt sie lokal `data/entries.json`, praktisch für Tests auf dem eigenen Rechner.

Bestehende Einträge werden nicht durch neue Einsendungen überschrieben:

- derselbe Name kann nur einmal eingetragen werden
- ein Text wird nach drei Personen blockiert
- der dritte Platz muss im Formular bewusst bestätigt werden

`data/entries.json` steht in `.gitignore`, damit lokale Klassendaten nicht versehentlich veröffentlicht werden.

## Supabase kostenlos einrichten

1. Auf Supabase ein Free-Projekt erstellen.
2. Im SQL Editor den Inhalt von `supabase/schema.sql` ausführen.
3. In Render diese Environment Variables setzen:
   - `SUPABASE_URL`: Project URL aus Supabase
   - `SUPABASE_SECRET_KEY`: Secret Key aus Supabase

Den Secret Key nie ins Repository committen. Er gehört nur in die Render-Umgebungsvariablen.

## Deployment

Das Projekt ist GitHub-fähig und kann als kostenloser Render Web Service deployed werden. Die `render.yaml` enthält keine persistente Render-Disk mehr, damit Render nicht auf einen bezahlten Service wechseln muss.

## Pflege der Texte

Die Textliste liegt in `data/texts.json`. Dort können Titel, Kurzbeschreibung, Videoquelle und Materiallink angepasst werden. Die aktuellen Materiallinks stammen aus den eingebetteten YouTube-Karten der Craft-Vorlage.
