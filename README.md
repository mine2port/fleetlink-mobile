# Mine2Port — État de Lieu de Camion

> Application Android (Capacitor + React + TypeScript) permettant de réaliser **l'état de lieu** d'un camion benne (HOWO T400 et autres modèles), de générer un PDF officiel cacheté, puis de le partager sur WhatsApp.
>
> Cette app est **séparée** de la plateforme Mine2Port. Elle expose un lien direct vers `https://www.mine2port.eu` depuis l'écran d'accueil.

---

## 1. Concept

L'app accompagne le contrôleur **écran par écran** sur le terrain :

1. **Accueil** : démarrer / reprendre / archives + lien plateforme Mine2Port
2. **Identification** : entreprise **expéditrice**, entreprise **réceptrice**, camion
3. → 7 écrans d'inspection (Carrosserie · Pneumatiques · Mécanique moteur · Freinage · Éclairage · Benne hydraulique · Outillage)
4. **Photos** : 12 vues d'état des lieux obligatoires
5. **Bilan & signature** : verdict APTE / RÉSERVES / IMMOBILISÉ + nom contrôleur + signature tactile
6. **Récap & export PDF** : aperçu, partage WhatsApp, archivage local

Caractéristiques :
- 🛜 **Hors-ligne** : tout fonctionne sans connexion (stockage local Capacitor Preferences).
- 📸 **Appareil photo natif** : photos compressées (max 900 px, qualité 0.7).
- 📝 **Signature tactile** au doigt.
- 📄 **PDF** : en-tête bleu acier + logo Mine2Port + bandeau attestation + 2 blocs entreprises + identification camion + tableau couleurs par section + bloc bas avec **3 cadres signatures** (Expéditrice, Réceptrice, Cachet officiel) + page photos.
- 📲 **Partage natif Android** (WhatsApp et autres).
- 💾 **Archive locale** des 30 dernières fiches, renvoi possible.

---

## 2. Stack

| Couche | Choix |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite |
| Mobile | Capacitor 6 (WebView Android) |
| Plugins natifs | `@capacitor/camera`, `@capacitor/share`, `@capacitor/filesystem`, `@capacitor/preferences`, `@capacitor/app`, `@capacitor/status-bar` |
| PDF | `jsPDF` (embarqué dans l'APK, marche hors-ligne) |

**App ID** : `com.mine2port.etatdelieu` · **Nom** : `Mine2Port - État de Lieu`

---

## 3. Prérequis

| Outil | Version recommandée | Pourquoi |
|---|---|---|
| **Node.js** | 18 ou 20 (LTS) | Lancer Vite + Capacitor CLI |
| **Java JDK** | 17 | Compiler le projet Android |
| **Android Studio** | dernière stable | Builder l'APK + SDK + Gradle |
| (Android SDK) | API 33+ | Géré par Android Studio |

Installation rapide (Windows) :
- Node : https://nodejs.org (LTS)
- JDK 17 : https://adoptium.net/ (Temurin)
- Android Studio : https://developer.android.com/studio (cocher "Android SDK Platform" + "Android SDK Build-Tools" + "Android SDK Platform-Tools" pendant l'install)

---

## 4. Premier lancement (mode développeur / navigateur)

Pour tester rapidement la logique dans le navigateur, **avant même de toucher à Android** :

```bash
npm install
npm run dev
```

Ouvre `http://localhost:5173` dans Chrome. La capture photo et le partage tomberont en mode fallback navigateur (input file + téléchargement PDF), mais TOUT le reste fonctionne.

---

## 5. Builder l'APK Android (méthode Android Studio — recommandée)

### 5.1 Initialisation du dossier Android (à faire une seule fois)

```bash
npm install
npm run build               # génère dist/
npm run android:init        # crée le dossier android/ (Capacitor scaffold)
npm run android:sync        # copie dist/ vers android/ + sync plugins
```

> Si `android:init` demande quelque chose : laisse les valeurs par défaut.

### 5.2 Ouvrir le projet dans Android Studio

```bash
npm run android:open
```

Android Studio s'ouvre sur le dossier `android/`. À la première ouverture, Gradle télécharge ses dépendances (5-15 min).

### 5.3 Générer l'APK de **test**

Dans Android Studio :
- Menu **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
- Quand Gradle a fini : clic sur **"locate"** dans la notification (en bas à droite)
- L'APK est dans : `android/app/build/outputs/apk/debug/app-debug.apk`

Copie ce `.apk` sur le téléphone (USB ou WhatsApp/email/Drive) et installe-le. Sur Android, autoriser "Installer depuis des sources inconnues" pour la première installation.

### 5.4 Générer un APK signé (pour distribution **terrain** ou Play Store)

Dans Android Studio : **Build** → **Generate Signed Bundle / APK** → **APK** → suivre l'assistant (créer une keystore au passage, à conserver précieusement).

> Si tu veux publier sur le Play Store, choisis **Android App Bundle (.aab)** au lieu de APK.

---

## 6. Builder l'APK **sans Android Studio** (ligne de commande)

Si Android Studio est installé (donc SDK présent) mais que tu préfères la ligne de commande :

```bash
npm install
npm run build
npx cap add android       # une seule fois
npx cap sync android
cd android
./gradlew assembleDebug   # Linux/Mac
gradlew.bat assembleDebug # Windows
```

APK généré : `android/app/build/outputs/apk/debug/app-debug.apk`.

---

## 7. Lancer directement sur un téléphone branché en USB

```bash
# Téléphone connecté en USB avec "Débogage USB" activé
npm run android:run
```

Capacitor compile, installe et lance l'app. C'est le mode itératif le plus rapide.

---

## 8. Mettre à jour le contenu (sections, photos, branding)

| Tu veux modifier… | Fichier |
|---|---|
| Liste des points de contrôle | `src/data/sections.ts` |
| Types de réponses (Bon/Moyen/Mauvais…) | `src/data/sections.ts` (objet `ANSWER_TYPES`) |
| Photos obligatoires de la galerie | `src/data/sections.ts` (tableau `GALLERY_PHOTOS`) |
| Logo Mine2Port (écran + PDF) | `public/logo-mine2port.svg` |
| Cachet officiel Mine2Port (PDF) | `public/cachet-mine2port.svg` |
| Mise en page PDF | `src/lib/pdf.ts` |
| Couleurs / palette UI | `src/styles.css` (variables `--navy`, `--orange`, etc.) |
| Lien vers la plateforme | `src/components/AppBar.tsx` (constante `MINE2PORT_WEB_URL`) |

Après modif : `npm run build` puis `npm run android:sync` pour pousser dans le projet Android.

---

## 9. Icônes Android & splash screen

Capacitor crée des icônes par défaut. Pour mettre celles de Mine2Port :

1. Génère les icônes via https://icon.kitchen ou Android Studio (Right-click sur `app/res` → **New → Image Asset** → Image = `public/logo-mine2port.svg`).
2. Le splash screen est défini dans `capacitor.config.ts` (couleur navy `#1F4E79`). Pour personnaliser, ajoute `@capacitor/splash-screen` et un PNG dans `android/app/src/main/res/drawable/`.

Le dossier `android-assets/` est prévu pour recevoir tes futurs PNG d'icônes.

---

## 10. Évolutions prévues

L'architecture est conçue pour, plus tard :
- **Synchroniser** les fiches dans la plateforme Mine2Port (`POST /api/v1/me/etat-de-lieu`). Le modèle `Sheet` (voir `src/lib/types.ts`) est sérialisable en JSON, déjà prêt pour ça.
- **Envoi WhatsApp automatique** via API WhatsApp Business.
- **Multi-modèles** de camions (la structure `SECTIONS` est un simple tableau remplaçable).
- **Rôles** (contrôleur / responsable).

---

## 11. Structure du projet

```
Mine2Port - Etat de Lieu/
├── public/
│   ├── logo-mine2port.svg
│   └── cachet-mine2port.svg
├── src/
│   ├── data/sections.ts           ← logique métier (sections, types réponses)
│   ├── lib/
│   │   ├── types.ts               ← modèles (Sheet, Company…)
│   │   ├── store.tsx              ← état global + sauvegarde locale
│   │   ├── photos.ts              ← capture + compression
│   │   ├── pdf.ts                 ← génération PDF jsPDF
│   │   └── share.ts               ← partage natif Android
│   ├── assets/branding.ts         ← rastérisation logo/cachet pour le PDF
│   ├── components/                ← AppBar, ProgressBar, NavButtons, PhotoPicker, SignaturePad, SectionScreen, Toast
│   ├── screens/                   ← HomeScreen, IdentificationScreen, PhotosScreen, BilanScreen, RecapScreen
│   ├── App.tsx                    ← router (HashRouter, 12 routes)
│   ├── main.tsx                   ← point d'entrée React
│   └── styles.css                 ← CSS global Mine2Port (terrain : gros boutons)
├── docs/proto-reference.html       ← prototype web d'origine (source de vérité)
├── android-assets/                 ← (à venir) icônes/splash personnalisés
├── capacitor.config.ts
├── vite.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

---

## 12. Aide / dépannage rapide

| Symptôme | Solution |
|---|---|
| `npm run android:init` échoue | Vérifier que `npm run build` est passé (le dossier `dist/` doit exister) |
| L'appareil photo ne s'ouvre pas | Permissions Android : Paramètres → App → Mine2Port → Autorisations → Caméra |
| PDF sans logo | Le navigateur a bloqué le `fetch('/logo-mine2port.svg')`. Sur APK ça marche : c'est juste du dev local. |
| WhatsApp ne s'ouvre pas | Le partage natif propose toutes les apps de partage : c'est l'utilisateur qui choisit WhatsApp. Sur le Play Store, le partage par défaut Android est utilisé. |
| Brouillon perdu | Auto-sauvegardé à chaque modif. Si l'utilisateur a tapé "Nouvelle inspection" → vidé volontairement. |

---

## 13. Licence & crédits

Code commenté en français. Couleurs, branding : Mine2Port SAS — Conakry, Guinée.

> Prototype web d'origine : `controle-camion-howo.html` (dans `docs/proto-reference.html`).
