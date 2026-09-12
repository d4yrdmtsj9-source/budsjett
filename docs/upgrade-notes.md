# Oppgradering av Renover

## Hensikt

Gi oversikt over hva hele oppussingen forventes å koste, samtidig som planlegging, kjøp og faktiske betalinger holdes tydelig adskilt. Mobilregistrering har en kort hoveddel og valgfrie detaljer. Oversikten fremhever manglende priser, budsjettavvik og kommende betalinger.

## Beregningsmodell

- Forventet sluttkostnad = netto betalt + ubetalt del av bestilte/kjøpte poster + gjenstående planer − refusjoner til gode.
- En delbetaling reduserer restbeløpet. Den legges ikke oppå kjøpets pris.
- Returbeløpet reduserer forventet kostnad. En faktisk refusjon reduserer netto betalt og tilgodebeløpet.
- Reserven er en del av totalrammen. Ledig beløp før reserve = totalramme − sluttprognose − avsatt reserve.
- Poster uten pris telles og varsles, men får ingen oppdiktet kostnad. Sluttprognosen er derfor ufullstendig til disse har pris.
- Ikke valgte tilbud og slettede poster tas ut av beregningene. Velges ett tilbud i en navngitt gruppe, tas andre uforpliktede tilbud i gruppen ut. Bestilte eller betalte tilbud kan ikke skjules på denne måten.
- Romfordeling gjelder pris, estimat, betalinger og retur. Siste rom får avrundingsresten slik at summer stemmer til øret. Rom med fordelte kjøp må få disse omfordelt før rommet kan fjernes.
- Personoppgjør bruker privat betalt netto og avtalt fordeling, som standard likt. Ukjent betaler og felleskonto er ikke privat innskudd. Appen er ikke en bankavstemming eller kontohistorikk.

## Eksisterende prosjekter

Nye felt er valgfrie i eksisterende JSON-dokumenter. `normalizeProject` setter `schema_version: 2`; ingen separat databasemigrasjon er nødvendig.

Tidligere kjøpte/betalte poster uten betalingsliste behandles som fullt betalt, i samsvar med den tidligere appens beregninger. Poster med nullbeløp markeres som ukjent pris inntil brukeren uttrykkelig setter gratis. Tidligere statusverdier beholdes.

Et historisk estimat som allerede ble overskrevet kan ikke rekonstrueres. Feltet står tomt for slike poster. Ved ny overgang fra kjent planpris til bestilling eller kjøp lagres den tidligere prisen som opprinnelig estimat og beholdes ved videre redigering.

Lokale utgifts-, rom- og kategoriendringer bruker funksjonelle oppdateringer mot nyeste prosjekt. Skyavlesninger flettes med nyeste lokale lagring etter at nettverkskallet er ferdig. Synkronisering bruker fortsatt eksisterende snapshot-arkitektur og tidsstempler. Samtidig redigering av **samme post** på to enheter er fortsatt «siste endring vinner»; dette er ikke en full konfliktløsningsmekanisme.

Ta JSON-sikkerhetskopi før utrulling. Etter publisering bør begge enheter laste appen på nytt før videre redigering, slik at en gammel klient ikke skriver data med gammel logikk.

## Vedlegg og eksport

JPEG, PNG, WebP og PDF kan legges ved lokalt. Maksimal opplastingsstørrelse per fil er 10 MB. Filmetadata lagres i prosjektet, mens filinnhold ligger i en egen IndexedDB-nøkkel. JSON-eksport tar med vedlegg som finnes på den aktuelle enheten. JSON-import aksepterer samme prosjekt; den tilbyr ikke sammenslåing av forskjellige prosjekter.

CSV har UTF-8 BOM, semikolon og escaping av celler som kan tolkes som formler. PDF lages gjennom nettleserens utskriftsdialog. Betalingsoversikten har én neste forfallsdato per post, ikke en full avdragsplan. Det er ikke implementert OCR, bankintegrasjon eller automatisk kvitteringssynkronisering.

## Kontroll utført

- 16 automatiserte tester dekker delbetalinger, reserve, ukjent/gratis pris, gamle data, retur/refusjon, romandeler, oppgjør, materialpakker, ugyldige beløp, øreavrunding, migrering, tilbudsvalg og fletting av romendringer.
- TypeScript og produksjonsbygg med Vite passerer.
- Oxlint kontrollerer `src`; ingen lintfeil. Eksisterende varsler om React-effekter og Fast Refresh gjenstår.
- Supabase lastes dynamisk ved behov. Ingen målt påstand om opplevd hastighet eller Lighthouse-score.

Den lokale nettleserforhåndsvisningen var utilgjengelig i utviklingsmiljøet. Den nye skjermflyten er derfor **ikke visuelt eller ende-til-ende-verifisert**. Ingen reelle prosjektdata eller kvitteringer ble brukt i testene. Synkronisering mellom to virkelige enheter er ikke testet.

## Akseptansetest før publisering

1. Åpne demoen på mobil og skrivebord. Kontroller meny, rulling, kontrast og skjema med skjermtastatur og tastaturnavigasjon.
2. Lagre og rediger en post. Registrer ukjent pris, gratis post, bestilling med delbetaling, retur og mottatt refusjon. Kontroller totalsummene etter omlasting.
3. Velg mellom to tilbud, fordel et kjøp på to rom og kontroller romsummene.
4. Last opp en kvittering, eksporter JSON, importer i samme prosjekt og åpne vedlegget. Kontroller CSV og utskrift.
5. Test et separat prøveprosjekt på to enheter: første gangs tilkobling, offline endring, tilkobling igjen og samtidige endringer i forskjellige poster.

## Utrulling

Arbeidet leveres på en egen gren. GitHub Pages-workflowen publiserer ved push til `main`, så sammenslåing er også publisering. Workflowen og eksisterende skykonfigurasjon er ikke endret i denne oppgraderingen.
