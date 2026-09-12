# Renover

Oppussingsbudsjett for hjemmet, med norske kroner og opptil to personer i samme prosjekt.

[Åpne publisert app](https://d4yrdmtsj9-source.github.io/budsjett/). Endringer på en utviklingsgren vises først der når de er slått sammen til `main` og GitHub Pages-jobben er ferdig.

## Funksjoner

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
