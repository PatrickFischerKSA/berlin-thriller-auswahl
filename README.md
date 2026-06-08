# Berlin-Thriller-Auswahl

Auswahlformular fuer **Topographie des Verbrechens - Berlin-Thriller**.

Der Auftrag ist als **Webspecial mit einem in Berlin vor Ort gedrehten Video** angelegt. Pro Text sind in der Regel zwei Leser*innen vorgesehen; ein dritter Platz ist nur nach Absprache moeglich. Ab drei Eintraegen wird ein Text serverseitig gesperrt.

## Start

```bash
npm start
```

Danach laeuft die App lokal unter `http://localhost:3000`.

## Speicherung

Die Eintraege werden serverseitig gespeichert. Fuer Render Free ist Supabase vorgesehen, damit keine kostenpflichtige Render-Disk noetig ist.

Wenn `SUPABASE_URL` und `SUPABASE_SECRET_KEY` gesetzt sind, speichert die App in Supabase. Ohne diese Variablen nutzt sie lokal `data/entries.json`, praktisch fuer Tests auf dem eigenen Rechner.

Bestehende Eintraege werden nicht durch neue Einsendungen ueberschrieben:

- derselbe Name kann nur einmal eingetragen werden
- ein Text wird nach drei Personen blockiert
- der dritte Platz muss im Formular bewusst bestaetigt werden

`data/entries.json` steht in `.gitignore`, damit lokale Klassendaten nicht versehentlich veroeffentlicht werden.

## Supabase kostenlos einrichten

1. Auf Supabase ein Free-Projekt erstellen.
2. Im SQL Editor den Inhalt von `supabase/schema.sql` ausfuehren.
3. In Render diese Environment Variables setzen:
   - `SUPABASE_URL`: Project URL aus Supabase
   - `SUPABASE_SECRET_KEY`: Secret Key aus Supabase

Den Secret Key nie ins Repository committen. Er gehoert nur in die Render-Umgebungsvariablen.

## Deployment

Das Projekt ist GitHub-faehig und kann als kostenloser Render Web Service deployed werden. Die `render.yaml` enthaelt keine persistente Render-Disk mehr, damit Render nicht auf einen bezahlten Service wechseln muss.

## Pflege der Texte

Die Textliste liegt in `data/texts.json`. Dort koennen Titel, Kurzbeschreibung und Videoquelle angepasst werden.
