# Movie Poster Premiere - handleiding voor evenementen

Met deze installatie maken bezoekers via AI een persoonlijke filmposter. De volledige ervaring draait op één portretscherm: uitleg, quiz, live camerabeeld, foto, AI-generatie en QR-code.

## Benodigdheden

- Windows-computer of laptop
- Portretscherm met een verhouding van 1080 x 1920
- Webcam, bijvoorbeeld de Logitech C922 Pro
- Stabiele internetverbinding
- Google Chrome of Microsoft Edge
- Python 3.10 of nieuwer
- Een Portkey API-sleutel
- Ngrok voor een publiek bereikbare QR-link

Sluit de webcam rechtstreeks op de computer aan. Gebruik bij voorkeur geen goedkope USB-hub.

## Eenmalige installatie

### Eerst: nieuwe sleutels aanmaken

De oude `.env` stond eerder in Git en de ngrok-token is gedeeld. Trek daarom voor overdracht zowel de oude **Portkey API-sleutel** als de oude **ngrok-authtoken** in via de bijbehorende dashboards. Maak nieuwe sleutels aan en zet alleen de nieuwe waarden in de lokale `.env`.

Open PowerShell in deze projectmap:

```powershell
cd C:\Users\qmaas\Downloads\NightOfTheNerds2026\NightOfTheNerds2026
```

Dubbelklik op:

```text
SETUP_EVENT.bat
```

Het onderliggende PowerShell-script kan ook handmatig worden gestart:

```powershell
.\setup-event.ps1
```

Vul daarna het aangemaakte `.env`-bestand in:

```env
PORTKEY_API_KEY=VUL_HIER_DE_API_SLEUTEL_IN
PORTKEY_MODEL=google/gemini-1.5-image
PUBLIC_QR_BASE_URL=https://jouw-domein.ngrok-free.app
FAKE_MODE=false
FLASK_DEBUG=false
```

Deel de API-sleutel niet en zet deze niet in een openbare repository.

## Ngrok en QR-code

Installeer ngrok. De eerder gedeelde authtoken moet voor overdracht in het ngrok-dashboard worden ingetrokken en vervangen. Koppel daarna de nieuwe token:

```powershell
ngrok config add-authtoken JOUW_NIEUWE_NGROK_AUTHTOKEN
```

Zet het publieke ngrok-adres in `PUBLIC_QR_BASE_URL` in `.env`. Het startscript gebruikt dit adres automatisch en de QR-code leest dezelfde instelling. Er hoeft niets in `main.js` te worden aangepast.

## App starten

Dubbelklik op:

```text
START_EVENT.bat
```

Het script controleert de configuratie, start Flask, start ngrok en opent Microsoft Edge in kioskmodus. Laat het PowerShell-venster openstaan. Sta cameratoegang toe wanneer de browser daarom vraagt.

## Scherm instellen

1. Zet het fysieke scherm rechtop.
2. Stel Windows in op portretstand.
3. Gebruik bij voorkeur een resolutie van `1080 x 1920`.
4. Open de app in Chrome of Edge.
5. Druk op `F11` voor volledig scherm.
6. Zet Windows-meldingen, slaapstand en schermbeveiliging uit.
7. Controleer dat de browserzoom op `100%` staat.

## Bezoekersflow

1. Druk op **Start**.
2. Bekijk de korte uitleg.
3. Kies het aantal personen, maximaal acht.
4. Beantwoord de filmvragen.
5. Controleer het live camerabeeld.
6. Druk op **Start Countdown**.
7. Na tien seconden wordt automatisch een foto gemaakt.
8. Kies **Yes** om de foto te gebruiken of **No** om opnieuw te fotograferen.
9. Wacht terwijl de AI de filmposter maakt.
10. Scan de QR-code om de poster op een telefoon te openen en op te slaan.
11. Druk op **Next Person** voor de volgende bezoeker.

Bij **Next Person** worden de tijdelijke invoerfoto en het resultaat van de vorige sessie verwijderd.

## Voor opening testen

- Webcambeeld is zichtbaar en loopt soepel.
- De countdown telt zichtbaar van 10 naar 1.
- Een testfoto verschijnt op het bevestigingsscherm.
- **Yes** start de AI-generatie.
- Het resultaat ziet eruit als een filmposter en bevat een filmtitel.
- De QR-code opent op een telefoon via mobiele data.
- De afbeelding kan op iPhone en Android worden opgeslagen.
- **Next Person** brengt de app terug naar het beginscherm.
- Browser en computer gaan niet automatisch in slaapstand.

Test de QR-code ook met wifi uitgeschakeld op de telefoon. Zo weet je zeker dat ngrok extern bereikbaar is.

## Problemen oplossen

### De camera verschijnt niet

- Controleer de cameratoestemming via het slotje naast de browser-URL.
- Sluit Teams, Zoom, OBS en andere programma's die de webcam gebruiken.
- Haal de webcam kort uit de USB-poort en sluit hem opnieuw aan.
- Herlaad de pagina met `Ctrl + R`.
- Gebruik `http://localhost:5000/`; een los geopend HTML-bestand kan cameratoegang blokkeren.

### Het webcambeeld hapert

- Sluit andere zware programma's en browsertabbladen.
- Sluit de webcam rechtstreeks aan op de computer.
- Gebruik een USB 3-poort indien beschikbaar.
- Schakel automatische camera-effecten van Windows of Logitech uit.
- Zorg voor voldoende licht bij de bezoeker.

### De pagina opent niet

Start het eventscript opnieuw:

```powershell
.\start-event.ps1
```

### De QR-code opent niet

- Controleer of ngrok nog draait.
- Controleer of het ngrok-adres overeenkomt met `PUBLIC_QR_BASE_URL` in `.env`.
- Test de ngrok-URL rechtstreeks op een telefoon.
- Herstart `start-event.ps1` nadat het adres is gewijzigd.

### AI-generatie mislukt

- Controleer de internetverbinding.
- Controleer `PORTKEY_API_KEY` en `PORTKEY_MODEL` in `.env`.
- Kijk naar de foutmelding in het Flask-venster.
- Controleer of het Portkey-account nog tegoed en toegang tot het model heeft.

### Testen zonder AI-kosten

Zet tijdelijk in `.env`:

```env
FAKE_MODE=true
```

Herstart Flask. De app gebruikt dan de gemaakte foto als testresultaat en doet geen echte AI-aanroep. Zet dit vóór het evenement terug op:

```env
FAKE_MODE=false
```

## Afsluiten

1. Ga naar het PowerShell-venster van `start-event.ps1`.
2. Druk op Enter om Flask en ngrok te stoppen.
3. Sluit de browser met `Alt + F4`.
4. Controleer zo nodig of `backend\uploads` en `backend\results` leeg zijn.

## Snelle eventchecklist

- [ ] Oude Portkey- en ngrok-sleutels ingetrokken
- [ ] Nieuwe sleutels alleen lokaal in `.env` gezet
- [ ] Computer aan netstroom
- [ ] Scherm in portretstand op 1080 x 1920
- [ ] Webcam aangesloten en getest
- [ ] Flask draait op poort 5000
- [ ] Ngrok draait
- [ ] Browser staat op volledig scherm
- [ ] Cameratoegang toegestaan
- [ ] QR-code getest via mobiele data
- [ ] Eén volledige testsessie uitgevoerd
