# Phase 5 — Addendum : discovery d'instances & palette de recherche unifiée

Deux ajouts de suivi à
[la phase 5](./00-overview-et-decisions.md), demandés après la première
livraison :

1. **Discovery** — trouver les instances Radarr/Sonarr/Lidarr et
   Plex/Jellyfin/Emby du réseau, plutôt que d'obliger l'utilisateur à taper
   une URL de mémoire.
2. **Palette de recherche unifiée** — supprimer les onglets
   Movies/Series/Albums et chercher les trois d'un coup.

---

## 1. Discovery d'instances

### Décisions

1. **Sondage HTTP de triplets (hôte, port, kind), pas de protocole de
   découverte natif.** Plex (GDM, UDP 32414) et Jellyfin/Emby (broadcast UDP
   7359) exposent bien des protocoles de découverte, mais les trois *arr n'ont
   aucun équivalent — il faudrait de toute façon sonder en HTTP pour eux, et
   le broadcast UDP est le plus souvent avalé par le réseau bridge de Docker,
   là où cette app tourne. Un seul mécanisme pour les six services, donc.

2. **Trois sources de candidats, cumulatives** :
   - **Hôtes connus** : `localhost`, `127.0.0.1`, `host.docker.internal`, et
     les noms de service Docker usuels (`radarr`, `sonarr`, `lidarr`, `plex`,
     `jellyfin`, `emby`) — couvre le cas « tout tourne dans le même
     `compose.yml` », le plus fréquent.
   - **Hôte saisi** par l'utilisateur (optionnel) — un NAS, une autre machine.
   - **Balayage du sous-réseau** (optionnel, décoché par défaut) : le /24 de
     chaque interface IPv4 non-loopback du backend, soit 254 adresses.

3. **Filtrage TCP avant tout HTTP.** Un balayage /24 sur 7 ports fait ~1 800
   candidats ; les sonder en HTTP serait long et bruyant. Chaque candidat
   passe donc d'abord par une **connexion TCP brute** (`node:net`, timeout
   court), et seuls les ports effectivement ouverts reçoivent une requête HTTP
   d'identification. En pratique un /24 ordinaire laisse passer une poignée de
   candidats.

4. **Budgets explicites, jamais illimités** : timeout TCP 300 ms, timeout HTTP
   1 500 ms, 64 sondes concurrentes, et un budget global de 20 s au-delà
   duquel le scan rend ce qu'il a déjà trouvé plutôt que de faire attendre.
   Ces valeurs sont des constantes de l'adapter, pas des réglages exposés.

5. **Identification par endpoint non authentifié, un par famille** :

   | Kind | Ports sondés | Endpoint | Signal retenu |
   |---|---|---|---|
   | radarr | 7878 | `GET /ping` puis `GET /` | `{"status":"OK"}` + `<title>Radarr</title>` |
   | sonarr | 8989 | idem | `<title>Sonarr</title>` |
   | lidarr | 8686 | idem | `<title>Lidarr</title>` |
   | plex | 32400 | `GET /identity` | XML `<MediaContainer … version="…">` |
   | jellyfin | 8096, 8920 | `GET /System/Info/Public` | JSON, `ProductName` contenant « Jellyfin » |
   | emby | 8096, 8920 | `GET /System/Info/Public` | JSON, `ProductName` absent ou contenant « Emby » |

   `/ping` prouve qu'on parle à un *arr mais pas *lequel* ; le `<title>` de la
   page de login le dit sans authentification. Quand le titre est illisible
   (reverse proxy qui réécrit le HTML, page blanche), on retombe sur le kind
   déduit du port, en marquant le résultat `confidence: 'port'` plutôt que
   `'confirmed'` pour que l'UI puisse le signaler.

   Jellyfin et Emby partagent le port 8096 et la même route héritée
   `/System/Info/Public` : seul `ProductName` les sépare (Jellyfin le renvoie
   depuis la 10.x). Un serveur qui ne le renvoie pas est classé `emby`.

6. **L'URL, jamais la clé d'API.** Un *arr dont l'authentification est
   désactivée expose sa clé en clair sur `/initialize.js` ; on **ne la lit
   pas**. Le discovery ne pré-remplit que l'URL de base, la clé reste saisie à
   la main. Le parsing du `<title>` (décision 5) touche `GET /`, pas
   `/initialize.js` — aucun secret ne transite par ce chemin.

7. **Admin uniquement, jamais automatique.** Le scan part d'un clic explicite
   ("Scan the network"), depuis l'onboarding ou les settings. Aucun scan au
   démarrage, aucun scan périodique : c'est un outil de saisie, pas une
   fonction de supervision. Rien n'est persisté — le résultat vit le temps de
   la boîte de dialogue.

8. **Un résultat = une proposition d'URL, pas un enregistrement.** Choisir un
   résultat remplit le champ « Base URL » du formulaire déjà en place ; c'est
   le `Test connection` / `Save` existant qui décide de la suite. Le discovery
   n'écrit jamais en base.

### Modèle de domaine (backend)

```ts
// domain/settings/discovered-instance.vo.ts
export type DiscoverableKind = ServarrKind | MediaServerKind
export type DiscoveryConfidence = 'confirmed' | 'port'

export interface DiscoveredInstance {
  kind: DiscoverableKind
  baseUrl: string
  detectedVersion: string | null
  serverName: string | null   // Jellyfin/Emby uniquement ; null ailleurs
  confidence: DiscoveryConfidence
}

// domain/settings/interfaces/instance-discovery.interface.ts
export interface DiscoveryScope {
  extraHost: string | null
  scanSubnet: boolean
}

export interface InstanceDiscovery {
  scan(scope: DiscoveryScope): Promise<DiscoveredInstance[]>
}
```

Implémentation `infrastructure/discovery/network-instance-discovery.ts` :
énumération des candidats, filtre TCP, sondes HTTP, dédoublonnage par
`(kind, baseUrl)`, tri `kind` puis `baseUrl`. La construction de la liste de
candidats est isolée dans une fonction **pure**
(`buildCandidates(scope, localIpv4s): Candidate[]`) pour être testable sans
réseau.

### Use case & endpoints

| Use case | Entrée | Sortie |
|---|---|---|
| `DiscoverInstances` | `{ extraHost?: string; scanSubnet: boolean }` | `DiscoveredInstance[]` |

| Méthode | Route | Garde |
|---|---|---|
| `POST` | `/api/settings/discovery` | `adminOnly` |
| `POST` | `/api/onboarding/discovery` | `onboardingGuard` |

Body `{ extraHost?: string; scanSubnet?: boolean }`, réponse
`{ instances: DiscoveredInstanceDto[] }`. POST plutôt que GET par cohérence
avec `/instances/test` : c'est une action, pas une lecture de ressource.

DI : `settings.instanceDiscovery`.

### Frontend

- `domain/settings/discovered-instance.ts` (types miroir) et deux méthodes de
  connecteur, `discoverInstances` / `discoverOnboardingInstances`, sur le
  modèle du couple `testSavedInstanceConnection` / `testInstanceConnection`.
- `application/settings/discover-instances.mutation.ts`.
- `presentation/settings/discovery-dialog.tsx` — un composant partagé,
  paramétré par le kind attendu : bouton « Scan », champ hôte optionnel,
  switch « Also scan my local subnet », liste de résultats (badge de version,
  nom de serveur, mention « detected by port » quand
  `confidence === 'port'`), et un bouton « Use » par résultat. Les services
  d'un autre kind trouvés au passage sont listés dans une section repliée
  « Other services found », en lecture seule.
- Branché dans `ServiceInstanceForm` et `MediaServerForm`, à côté du champ
  Base URL.

### Hors périmètre

- Découverte UDP native (GDM Plex, broadcast Jellyfin/Emby).
- Découverte via le compte plex.tv (`https://plex.tv/api/resources`), qui
  demanderait un token Plex — exclu par la décision 1 de la phase 5.
- Scan de plages autres que le /24 des interfaces locales (pas de CIDR
  arbitraire saisi par l'utilisateur).
- Récupération automatique de la clé d'API (décision 6).
- Persistance ou rafraîchissement périodique des résultats.

---

## 2. Palette de recherche unifiée

### État actuel

`CommandPalette` impose de choisir un onglet (Movies / Series / Albums)
**avant** de taper : chercher « severance » avec l'onglet Movies actif ne
donne rien, sans indiquer que la série existe sous l'onglet d'à côté. Le
`MediaDetailDrawer` ouvert derrière prend son `kind` de l'onglet, pas du
résultat cliqué.

### Décisions

1. **Suppression des onglets.** Un seul champ, les trois kinds interrogés en
   parallèle (trois `useSearchMedia` — les clés de cache `['catalog',
   'search', kind, term]` existantes restent valables, donc aucun changement
   côté `application/` ni côté backend).

2. **Le kind vient du résultat, plus de l'onglet.** `onSelect(item)` propage
   `item.kind` au drawer, ce qui corrige au passage le cas « ouvrir une série
   depuis l'onglet Movies ».

3. **Classement par pertinence, fonction pure et testée.**
   `rankSearchResults(term, groups)` (`domain/catalog/rank-search-results.ts`)
   fusionne les trois listes et trie par :
   1. qualité de correspondance du titre — égal, puis commence par, puis
      contient, puis le reste ;
   2. année décroissante à égalité de rang (le récent d'abord) ;
   3. ordre d'origine, kind par kind, pour rester déterministe.

   Sans ce tri, une simple concaténation mettrait systématiquement les films
   devant, et une série cherchée par son titre exact se retrouverait sous cinq
   films sans rapport.

4. **Un badge de kind sur chaque poster.** `PosterCard` gagne un prop
   `showKind` (désactivé par défaut, donc `/library` et le reste ne bougent
   pas) qui rend la même pastille d'icône que `LibraryCard` — sans elle, une
   liste mélangée ne dit plus ce qu'on regarde.

5. **Les états vides/chargement sont agrégés.** Squelette tant qu'au moins une
   des trois requêtes charge ; « No results » seulement quand les trois ont
   répondu vide ; erreur seulement si les trois échouent (une seule instance
   en panne ne doit pas masquer les résultats des deux autres) — même logique
   d'agrégation partielle que `GET /api/calendar`.

### Hors périmètre

- Filtres de kind post-recherche (chips) — on assume la liste unifiée.
- Recherche de personnes/collections, historique de recherche, suggestions.
- Pagination : la palette reste sur ce que renvoie `searchMedia`.
