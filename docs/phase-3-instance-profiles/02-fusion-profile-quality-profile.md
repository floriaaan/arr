# Phase 3 — Addendum : fusion `InstanceProfile` / Quality Profile natif

Suite à retour : du point de vue utilisateur, « Saved presets » (`InstanceProfile`,
décrit dans `00-overview-et-decisions.md`) et « Quality profiles » (CRUD natif
décrit dans `01-live-quality-profiles.md`) sont **la même chose** — un seul
écran, un seul formulaire. Ce document remplace la coexistence des deux
écrans décrite dans `01-live-quality-profiles.md` (qui reste comme historique
des décisions sur le passthrough, toujours valables) par un concept unique.

## Décision

Un `InstanceProfile` est désormais **le** profil : il porte toujours root
folder, langue/metadata, series type, minimum availability, `isDefault` —
mais son ancien simple `qualityProfileId` de référence est remplacé par la
gestion complète du Quality Profile natif correspondant. Créer / modifier /
supprimer un `InstanceProfile` crée / modifie / supprime le Quality Profile
*arr associé :

- **Création** : le formulaire part du template renvoyé par
  `GET .../qualityprofile/schema`, l'utilisateur ajuste qualités
  autorisées/cutoff/upgrade, la sauvegarde crée le Quality Profile *arr
  (`POST .../qualityprofile`) puis l'`InstanceProfile` local avec l'id réel
  obtenu en retour.
- **Modification** : le formulaire part du Quality Profile existant
  (`GET .../qualityprofile/:id`, résolu via la liste déjà chargée), la
  sauvegarde fait un `PUT .../qualityprofile/:id` (même id, nouveau contenu)
  puis met à jour l'`InstanceProfile` local.
- **Suppression** : supprime d'abord le Quality Profile *arr
  (`DELETE .../qualityprofile/:id`) ; la ligne locale n'est retirée que si
  cette suppression réussit — sinon l'erreur remonte sans rien supprimer
  localement (pas d'état incohérent entre l'app et l'*arr).

Le passthrough (décision 1 de `01-live-quality-profiles.md`) est conservé :
tout champ *arr non modélisé (formatItems, minFormatScore, language…) est
repris tel quel dans les payloads de création/modification, jamais perdu.

## Ce qui disparaît

- L'écran « Quality profiles » séparé (`quality-profiles-section.tsx`,
  `quality-profile-form-dialog.tsx`) et ses mutations dédiées
  (`create/update/delete-quality-profile.mutation.ts`).
- Les use cases `Create/Update/DeleteQualityProfile` et le validator associé
  côté backend, ainsi que les routes `POST/PUT/DELETE
  /instances/:kind/quality-profiles[...]`.

## Ce qui reste

- `list-quality-profiles.use-case.ts` / `get-quality-profile-schema.use-case.ts`
  et leurs routes `GET` : toujours nécessaires pour peupler le formulaire
  unifié (liste pour préremplir en édition, schema pour le template de
  création).
- `ServarrQualityProfileManager` (port + implémentation HTTP) : maintenant
  injecté dans `CreateInstanceProfile`, `UpdateInstanceProfile`,
  `DeleteInstanceProfile` plutôt que dans des use cases dédiés.
