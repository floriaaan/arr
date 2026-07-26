# ADR-0008 — Signature du proxy d'images

## Statut
Accepté.

## Contexte
La spec exige que le navigateur ne parle jamais directement à TMDB/Fanart/etc., et
que l'endpoint `/api/images` ne devienne pas une SSRF ouverte.

## Décision
- `PosterRef` (domaine) porte l'URL distante brute résolue par le lookup `*arr`.
- À la sérialisation HTTP (`presentation/catalog`), l'URL brute est transformée en
  référence signée : `base64url(JSON.stringify({ url, exp }))` + HMAC-SHA256 sur ce
  payload avec `APP_KEY` (réutilise `Encryption`/`Hash` d'Adonis, pas de nouvelle
  primitive crypto maison). `exp` = TTL court (24h) — au-delà, le lien expire même
  si le fichier est toujours en cache disque, ce qui force un rafraîchissement de
  la recherche/detail plutôt que de garder un lien signé valable indéfiniment.
- `GET /api/images?ref=...` : vérifie la signature, vérifie que le host de `url`
  appartient à une **allowlist de domaines** (`image.tmdb.org`, `assets.fanart.tv`,
  `thetvdb.com`, plus les hosts des instances `*arr` configurées elles-mêmes pour
  l'artwork auto-hébergé), sinon `403` sans tenter la moindre requête sortante.
- Cache disque : clé = SHA-256 de l'URL distante (pas de la ref signée, pour que
  deux refs signées différentes pointant vers la même image partagent le cache),
  TTL de cache plus long que le TTL de signature (7 jours) — une signature expirée
  invalide juste le lien, pas le fichier déjà en cache, qui sera réutilisé dès
  qu'une nouvelle ref signée pointera vers la même URL.

## Conséquences
- Aucune URL externe ne transite jamais vers le navigateur en clair.
- Le TTL de signature (24h) implique que les `posterRef` ne doivent pas être
  mis en cache côté frontend au-delà de cette fenêtre sans revalidation — cohérent
  avec le `staleTime` de 60s prévu pour `searchMediaQuery`.
