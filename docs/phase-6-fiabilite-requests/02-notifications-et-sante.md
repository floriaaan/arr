# Phase 6 — Addendum : notifications & santé des instances

Un seul lot pour les deux : ils passent par le même bus d'événements, et
« une instance est tombée » *est* une notification.

## 1. Rebrancher le bus d'événements

### État actuel

Le domaine émet déjà `MediaRequested`, `RequestSubmitted`, `RequestProgressed`,
`RequestCompleted`, `RequestFailed`, `RequestCancelled`, `InstanceConnected`,
`InstanceHealthCheckFailed`. `AggregateRoot.pullDomainEvents()` existe.
`InMemoryEventBus` existe, avec `publish` **et** `subscribe`.

Et pourtant `publish(` n'est appelé **nulle part** en dehors de sa propre
définition et de son test : `pullDomainEvents()` n'est jamais invoqué. Tous ces
événements sont du code mort depuis le début. `docs/adr/0007` supposait déjà un
abonné logger et nommait « un futur hook de notification » — ni l'un ni l'autre
n'existe.

### Décisions

1. **Publier après la sauvegarde, dans le use case.** `publish(aggregate.pullDomainEvents())`
   juste après `repository.save(...)`, dans `CreateRequest`, `CancelRequest`,
   `ReconcileProgress` et `SaveInstance`. C'est exactement ce que décrit
   ADR-0007 (dispatch synchrone, en mémoire, sans outbox) : on ne change pas la
   décision, on l'applique.

2. **Les abonnements sont câblés dans `providers/`, pas dans le domaine.**
   Un `notifications_provider.ts` s'abonne au démarrage. Les use cases ne
   connaissent que le port `EventBus`.

3. **Un abonné ne peut pas faire échouer un use case.** Le dispatch est
   synchrone : si un webhook est injoignable, la requête ne doit pas échouer
   pour autant. Les erreurs des abonnés sont avalées et loguées. Contrepartie
   assumée, déjà documentée par ADR-0007 : aucune garantie de livraison.

## 2. Notifications

### Décisions

1. **Un webhook générique d'abord, pas trois intégrations.** Une seule URL,
   une charge utile JSON qui satisfait les trois cibles courantes du
   self-hosted en même temps : `content` (Discord), `title` + `message`
   (ntfy, Gotify). Un seul adapter couvre donc Discord, ntfy et Gotify sans
   code par service. Pas de SMTP : ça ajouterait `@adonisjs/mail`, absent
   aujourd'hui, pour un canal que personne n'a demandé.

2. **Trois interrupteurs, pas un flux d'événements brut.** L'utilisateur
   choisit ce qu'il veut recevoir : requête disponible, requête en échec,
   instance injoignable. `RequestProgressed` n'est **jamais** notifié — ça
   enverrait un message toutes les 10 secondes.

3. **Table `notification_settings` à ligne unique**, même mécanique que
   `auth_settings` : un id fixe qui est la clé primaire, et c'est toute
   l'application de la contrainte.

4. **L'URL de webhook est un secret** — elle est chiffrée en base via
   `encryptSecret`, comme le client secret OIDC, et n'est **jamais** renvoyée
   au client : le DTO expose `hasWebhookUrl: boolean`, comme
   `ServarrInstanceDto.hasApiKey`. Une URL de webhook Discord est un jeton
   d'écriture, pas une adresse publique.

### Modèle

```ts
// domain/notifications/notification.vo.ts
type NotificationLevel = 'info' | 'success' | 'error'
interface Notification { title: string; body: string; level: NotificationLevel }

// domain/notifications/interfaces/notifier.interface.ts
interface Notifier { notify(notification: Notification): Promise<Result<void, NotificationError>> }

// domain/notifications/notification-settings.aggregate.ts
interface NotificationSettingsProps {
  webhookUrl: Url | null
  onRequestAvailable: boolean
  onRequestFailed: boolean
  onInstanceUnreachable: boolean
}
```

### Endpoints

| Méthode | Route | Garde |
|---|---|---|
| `GET` | `/api/settings/notifications` | `adminOnly` |
| `PUT` | `/api/settings/notifications` | `adminOnly` |
| `POST` | `/api/settings/notifications/test` | `adminOnly` |

`NotificationSettingsDto = { hasWebhookUrl, onRequestAvailable, onRequestFailed, onInstanceUnreachable }`.

## 3. Santé des instances

### État actuel

`HealthCheckResult` est riche (date, version, erreur typée), persisté sur cinq
colonnes, et l'agrégat désactive l'instance en cas d'échec. Mais
`instance.dto.ts` n'en sérialise **aucun**, et `lastHealthCheck` n'apparaît
nulle part dans le frontend : le seul vocabulaire UI est `Enabled`/`Disabled`.
Impossible de distinguer « un admin l'a coupée » de « Radarr est injoignable
depuis une semaine ». Et le check n'a lieu **qu'à la sauvegarde**.

### Décisions

1. **Exposer ce qui est déjà stocké** : `lastCheckedAt`, `healthy`,
   `detectedVersion`, `lastError` s'ajoutent au DTO. Aucune migration — les
   colonnes existent depuis le début.

2. **Un worker périodique calqué sur `requests:reconcile`.** Même forme
   (`staysAlive`, boucle avec `sleep`, son propre service compose), parce que
   c'est le pattern déjà en place et validé par ADR-0003 — pas de dépendance
   scheduler. Intervalle : 5 minutes.

3. **Le worker ne réactive jamais une instance.** `recordHealthCheck` désactive
   sur échec ; le retour à `enabled` reste une action admin explicite. Un
   worker qui rallume tout seul une instance que quelqu'un a désactivée
   volontairement serait un piège.

4. **Notification sur transition, pas sur état.** Le worker ne notifie que
   quand la santé **change** (saine → en échec), sinon un check toutes les
   5 minutes enverrait un message toutes les 5 minutes tant que l'instance est
   down. C'est l'agrégat qui porte l'information : il n'émet
   `InstanceHealthCheckFailed` qu'en enregistrant le résultat, et le worker
   compare avec l'état précédent avant de sauvegarder.

## Hors périmètre

- SMTP / e-mail, intégrations natives par service.
- Notifications par utilisateur (le webhook est global à l'instance).
- Outbox / garanties de livraison (ADR-0007 inchangée).
- Historique des notifications envoyées, réessais.
- Health check des serveurs média Plex/Jellyfin/Emby (phase 5 les a
  volontairement laissés sans appel API).
