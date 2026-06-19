# FleetLink Mobile

**App terrain Android (Capacitor + React + TypeScript) pour les agents qui réalisent les états des lieux DÉPART et RETOUR sur les contrats de location FleetLink.**

> Fork rebrandé de [Mine2Port - État de Lieu](../../Mine2Port%20-%20Etat%20de%20Lieu) (société sœur Mine2Port SAS) — décision actée dans le CDC FleetLink v1.1.
> Plateforme web compagnon : [fleetlink.mine2port.fr](https://fleetlink.mine2port.fr).

## Ce que fait l'app

- **EDL DÉPART** : remise du camion au locataire (état initial qui sert de référence).
- **EDL RETOUR** : restitution du camion, avec **comparatif visuel** point par point vs DÉPART, verdict OK / Diff / Dommage.
- 7 sections d'inspection, ~60 points de contrôle (carrosserie, pneumatiques, moteur, freinage, éclairage, benne, outillage).
- Galerie 12 photos guidées + photos additionnelles par item.
- Signature tactile + génération PDF locale (jsPDF, hors-ligne).
- Partage natif (WhatsApp / Email / Drive).
- **Offline-first** : tout fonctionne sans réseau. La couche cloud (sync vers la plateforme web FleetLink) est optionnelle et non bloquante.

## Architecture

```
src/
├── App.tsx                  # Router HashRouter + auto-sync au démarrage
├── lib/
│   ├── types.ts             # Sheet (kind DEPART/RETOUR, compare, snapshot)
│   ├── store.tsx            # Contexte React + persistance Capacitor Preferences
│   ├── pdf.ts               # Génération PDF jsPDF (palette FleetLink + page comparative)
│   ├── photos.ts            # Caméra native + compression
│   ├── share.ts             # Partage natif Android
│   ├── api.ts               # NEW Client HTTP FleetLink (auth, magic-login dev, upload)
│   └── sync-queue.ts        # NEW File de sync hors-ligne -> flush au retour de réseau
├── screens/
│   ├── HomeScreen.tsx       # Accueil + 2 onglets À FAIRE / TERMINÉS + sync badge
│   ├── LoginScreen.tsx      # NEW Login + accès rapide (mode test /dev/accounts)
│   ├── IdentificationScreen.tsx  # Sélecteur kind + sociétés + camion
│   ├── PhotosScreen.tsx     # 12 photos obligatoires
│   ├── BilanScreen.tsx      # Bilan + signature
│   └── RecapScreen.tsx      # Récap + export PDF + enqueue upload cloud
├── components/
│   ├── SectionScreen.tsx    # Écran générique avec bloc comparatif RETOUR
│   ├── SignaturePad.tsx     # Canvas tactile
│   └── ...
├── data/sections.ts         # 7 sections × ~60 points (référence métier)
└── assets/
    ├── branding.ts          # Rasterise SVG -> PNG dataURL pour le PDF
    ├── logo-fleetlink.svg   # Logo temporaire (à remplacer par charte officielle)
    └── cachet-fleetlink.svg # Cachet temporaire
```

## Palette FleetLink

| Rôle | Couleur |
|---|---|
| Principal | `#0F5E5E` vert pétrole |
| Principal foncé | `#0a4444` |
| Accent | `#B85C00` ambre |
| Accent clair | `#E8A857` |
| Success / Warn / Error | `#10B981` / `#E8A23C` / `#DC2626` |

## Couche cloud (optionnelle)

L'app reste pleinement fonctionnelle hors-ligne. Quand l'agent se connecte :

1. **Login** : `POST /api/v1/auth/login` → tokens stockés dans Capacitor Preferences.
2. **Mode test** : si l'API expose `/api/v1/dev/accounts`, le panneau « Accès rapide » s'affiche → magic-login en 1 clic.
3. **Upload** : à chaque fiche finalisée, un job est mis en file (`sync-queue`). `flushQueue()` est appelé automatiquement au retour de connexion (`window.online`).
4. **Statuts par fiche** : `cloudStatus` peut être `PENDING`, `SENT` ou `ERROR` (badge dans la liste).

Endpoints attendus côté API FleetLink (à exposer par les agents back FleetLink) :
- `POST /auth/login` `{email, password}` → `{accessToken, refreshToken, user}`
- `POST /auth/refresh` `{refreshToken}` → `{accessToken, refreshToken?}`
- `GET /dev/accounts` → `[{email, role, fullName}]` (MODE TEST)
- `POST /dev/magic-login` `{email}` → `{accessToken, refreshToken, user}` (MODE TEST)
- `GET /me/sheets/assigned` → `[AssignedSheet]`
- `POST /me/sheets` (multipart : `payload` JSON + `pdf`) → `{id, pdfUrl}`

## Workflow EDL RETOUR

1. L'agent termine un EDL DÉPART → archivé localement.
2. Sur l'écran d'accueil, onglet **À faire**, section « ↩ Faire un EDL RETOUR » → choisit l'EDL DÉPART correspondant.
3. Le store appelle `startReturnFromDepart(departSheet)` qui pré-remplit :
   - Sociétés (propriétaire + locataire)
   - Camion (matricule, parc, chauffeur)
   - `contractId` et `relatedSheetId`
   - `departSnapshot` (snapshot des réponses du DÉPART)
   - `compare` initialisé vide pour chaque item.
4. Sur chaque section, une zone **comparatif** apparaît au-dessus de la liste d'items : verdict OK / Diff / Dommage par point.
5. Lors de l'export PDF, une **page comparative dédiée** liste uniquement les différences et dommages.

## Identité Android

| Param | Valeur |
|---|---|
| `appId` | `com.fleetlink.mobile` |
| `appName` | `FleetLink Terrain` |
| Splash | `#0F5E5E` vert pétrole |
| Theme color | `#0F5E5E` |
| Package Java | `com.fleetlink.mobile` |

## Build

### Pré-requis

- Node 20+, npm 10+
- Android Studio (Giraffe ou plus récent) + SDK 34
- JDK 17

### Dev

```bash
npm install
npm run dev                # vite preview navigateur
```

### Build production + APK debug

```bash
npm install
npm run build              # tsc + vite build -> dist/
npx cap sync android       # copie dist/ -> android/app/src/main/assets/public/
cd android && ./gradlew assembleDebug
# APK : android/app/build/outputs/apk/debug/app-debug.apk
```

ATTENTION : si Gradle plante à cause du sync OneDrive (espaces dans le chemin ou fichiers verrouillés), copie le projet dans `C:\src\fleetlink-mobile\` pour builder, comme on l'a fait pour la base Mine2Port avec `C:\src\m2p-eedl\`.

### Install sur device

```bash
adb -s <device-id> install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s <device-id> shell monkey -p com.fleetlink.mobile -c android.intent.category.LAUNCHER 1
```

## Roadmap

### V0.1 (ce fork)
- Fork rebrandé
- Workflow DÉPART/RETOUR
- Couche cloud (api.ts + sync-queue.ts)
- Écran login + quick-access mode test

### V0.2 (à venir)
- Synchro initiale des EDL assignés (`/me/sheets/assigned`) sur l'écran d'accueil
- Logo + cachet officiels FleetLink (après immatriculation société)
- Réception push FCM pour nouvelles assignations
- Signature électronique du locataire (canvas tactile sur écran déjà en place, mais à exposer dans le workflow propriétaire / locataire)

## Liens

- Plateforme web : [fleetlink.mine2port.fr](https://fleetlink.mine2port.fr)
- CDC FleetLink v1.2 : `01-cahier-des-charges/CDC_FleetLink_v1.2.docx`
- Repo parent (référence) : `../../Mine2Port - Etat de Lieu/`
- Société sœur : Mine2Port SAS
- Repo GitHub (à créer) : `github.com/mine2port/fleetlink-mobile`

---

*Fork initial réalisé le 19/06/2026 par Syrine (agent Mobile FleetLink) sous charte Mine2Port v3.*
