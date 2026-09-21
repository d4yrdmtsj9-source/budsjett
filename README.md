# Renover

Oppussingsbudsjett for hjemmet, med norske kroner og opptil to personer i samme prosjekt.

[Åpne publisert app](https://d4yrdmtsj9-source.github.io/budsjett/). Endringer på en utviklingsgren vises først der når de er slått sammen til `main` og GitHub Pages-jobben er ferdig.

## Funksjoner

- Inspo med bilder, fargepaletter, personlige favoritter, før/etter og sammenligning av to ideer.
- Planlegg med oppgaver, ansvarlig person, måldato, milepæler og fremdrift.

- Oversikt over forventet sluttkostnad, netto betalt, bestillinger, planer og reserve.
- Rom med egne budsjetter og prosentvis fordeling av felles kjøp.
- Søk, kategorier, leverandører, statusfiltre og betalingsoversikt etter forfallsmåned.
- Delbetalinger, refusjoner, felleskonto og oppgjør mellom to personer med valgt kostnadsfordeling.
- Alternative tilbud, opprinnelig estimat og tydelig skille mellom ukjent pris og gratis.
- Materialberegning med svinn og hele pakker, produktlenker og vedlegg.
- CSV til Excel, utskriftsvisning for PDF og JSON-sikkerhetskopi med lokale vedlegg.
- Responsiv mobil- og skrivebordsvisning, eksplisitt lagring og lokal demo.

## Kom i gang

1. Skriv navn og opprett prosjekt, eller velg **Prøv med eksempelprosjekt**.
2. Sett totalramme og reserve under **Mer**. Reserven inngår i totalrammen.
3. Legg til rom, planer og kjøp. Kryss av når pris mangler.
4. Velg status og registrer faktiske betalinger. Trykk **Lagre**.

For en annen enhet: del invitasjonskoden under **Mer**, velg **Åpne / bli med**, og fortsett som eksisterende person. Koden gir tilgang til prosjektet; appen har ikke personlig innlogging. Demoen bruker kun oppdiktede data og lagres lokalt.

## Lagring og begrensninger

Prosjektdata lagres i nettleserens IndexedDB. Med eksisterende skykonfigurasjon lagres prosjektsnapshots i Mantle, og Supabase Realtime brukes til direktesynkronisering. Kontroller synkroniseringsstatus og ta sikkerhetskopi før du bytter nettleser eller sletter nettleserdata.

Kvitteringsfiler er **lokale på enheten**. Filnavn og metadata følger prosjektet, men selve filen kommer med til en annen enhet via JSON-sikkerhetskopien. Import er begrenset til samme prosjekt. Vedlegg leses ikke automatisk med OCR.

Betalingsoversikten plasserer hele restbeløpet på neste forfallsdato. Den er ikke en plan for flere fremtidige avdrag. Oppgjøret bygger på registrerte private innbetalinger og refusjoner; felleskonto og ukjent betaler holdes utenfor personoppgjøret.

## Utvikling

Bruk Node.js 22.18 eller nyere i Node 22-serien, eller Node 24.

```bash
npm ci
npm run dev
npm test
npm run lint
npm run build
```

For lokal testing uten skytilkobling, opprett `.env.development.local` med:

```dotenv
VITE_LOCAL_ONLY=true
```

Testskriptet bruker Nodes innebygde testkjører og TypeScript-stripping. Produksjonsbygg kontrolleres av TypeScript og Vite. Ingen nye pakkeavhengigheter er lagt til i denne oppgraderingen.

Se [oppgraderingsnotatene](docs/upgrade-notes.md) for datamodell, beregninger og gjenstående akseptansetester.

### Utseende

Velg Lys, Mørk eller Automatisk under Mer → Utseende.
Automatisk følger systemets fargevalg og er standard. Valget lagres lokalt
på enheten og følger ikke prosjektet til andre deltakere. Bilder og
materialprøver beholder sine originale farger. Tema lastes før React for
å unngå lys oppstart i mørk modus. `public/theme.js` er derfor med hensikt
et vanlig, blokkerende skript som kopieres til produksjonsbygget.

### Slette kategorier

Under Mer → Kategorier og leverandører kan du slette en kategori
med søppelbøtten. Bekreftelsen viser antall berørte kjøp. Kjøpene blir uten
kategori og beholder beløp, betalinger og vedlegg. Kategorien skjules fra
alle kategorivalg. En slettemarkering hindrer at den gjenopprettes ved
synkronisering; alle enheter bør laste inn den oppdaterte appen. En ny
kategori med samme navn kan opprettes uten å koble til de gamle kjøpene.

### Planlegging og økonomi

Menyen er Oversikt, Plan, Økonomi, Rom og Mer. Moodboard er ett bilde inne på
hvert rom. Eldre bilde- og idédata beholdes for kompatibilitet og sikkerhetskopi.

Oppgaver kan ha prioritet, frist, ansvarlig, rekkefølge og avhengigheter til
andre oppgaver og leverte innkjøp. Ferdige oppgaver er samlet i en lukket seksjon.
Betalingsplanen fordeler faktiske nettobetalinger mot de tidligste forfallene;
forfallene øker aldri forventet sluttkostnad. Rest uten plan vises uten dato.
Bestilling, levering og betaling er separate handlinger.

Tidligere rammer vises i innstillinger. Endringshistorikken i en post kan hentes
inn i skjemaet for kontroll før lagring. Historikk begrenses til 100 versjoner
for hele prosjektet og 50 rammeendringer. Slettede poster kan gjenopprettes.

Lokale endringer og innkommende synkronisering køes. Betalinger flettes per ID,
og slettede betalinger beholder slettemarkering. Et åpent skjema avviser lagring
hvis en nyere post allerede er mottatt. Dette er ikke en servertransaksjon:
samtidige skyopplastinger og endringer fra eldre klienter er fortsatt en risiko.
Alle enheter bør oppdateres samtidig.

Kvitteringer og moodboard-filer er fortsatt lokale og inngår i sikkerhetskopien.
Delt fillagring og autentisert tilgang er ikke implementert. Dagens løsning
bruker fortsatt invitasjonskode; det kreves en egen backend-migrering for å erstatte den.

Verifisering: 34 tester, TypeScript/produksjonsbygg og lint uten feil.
Nettleser- og reell testing mellom to enheter gjenstår: lokal Chromium mangler,
og nedlasting er blokkert av nettverksmiljøet. Dette leveres som utkast til PR.
