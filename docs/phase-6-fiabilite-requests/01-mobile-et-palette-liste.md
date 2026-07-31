# Phase 6 — Addendum : mobile & palette en vue liste

Deux chantiers d'interface, sans backend.

## 1. Rendre l'app utilisable sur mobile

### État actuel

`app-shell.tsx` était `flex h-screen` + `aside w-60 shrink-0`, sans aucun
breakpoint, sans menu. Sur 390 px il restait **~100 px** de contenu utile :
tous les écrans authentifiés étaient inutilisables, pas seulement dégradés.
Seuls 6 composants applicatifs portaient un préfixe responsive.

### Décisions

1. **La sidebar est rendue deux fois, pas repositionnée en CSS.** Colonne fixe
   à partir de `md`, `Sheet` en dessous. Une seule instance déplacée en CSS
   garderait le piège de focus du drawer sur desktop, où il n'a rien à faire.
   Le contenu est extrait en une variable partagée, donc les deux rendus ne
   peuvent pas diverger.

2. **`presentation/ui/sheet.tsx` créé** (aucun `Sheet` n'existait), sur la même
   primitive Radix `Dialog` que `dialog.tsx` — c'est un dialogue avec une autre
   géométrie, pas un composant neuf.

3. **`h-dvh` et non `h-screen`** : `vh` ignore la barre d'adresse rétractable
   des navigateurs mobiles, ce qui rognait le bas de la mise en page.

4. **Le calendrier bascule sur sa timeline sous `md`.** `grid-cols-7` est
   indéfendable à 390 px (7 colonnes de ~14 px) ; la timeline verticale de la
   phase 5 *est* déjà la bonne vue mobile. La grille est simplement masquée,
   pas réimplémentée — et son squelette de chargement avec elle.

5. **Les entrées de nav admin passent en tableau.** Elles étaient quatre blocs
   `{isAdmin ? <Link …/> : null}` copiés-collés avec la même classe répétée
   cinq fois ; devoir les dupliquer une seconde fois pour le drawer rendait le
   coût évident. Un `NAV_ITEMS` + `ADMIN_NAV_ITEMS` concaténés.

6. Correctifs ponctuels : `grid-cols-2` non préfixés dans
   `service-instance-form.tsx` et `instance-profile-form-dialog.tsx`, champ de
   recherche de la bibliothèque en pleine largeur sous `sm`, raccourci `⌘K`
   masqué sous `sm` (il n'y a pas de clavier).

### Hors périmètre

- Grilles de posters : déjà en `grid-cols-2` à la base, rien à faire.
- Dialogues : déjà bornés à `max-w-[calc(100%-2rem)]`.
- Navigation par gestes, bottom bar, PWA.

## 2. Palette de recherche en vue liste

La palette rendait une grille de posters. Sur une liste **mélangée** (films,
séries, albums depuis l'unification de la phase 5), des lignes se lisent mieux
qu'une grille : le titre est lisible en entier, le kind tient dans une icône, et
ça survit à un écran de téléphone sans travail supplémentaire.

- `presentation/catalog/search-result-row.tsx`, calqué sur
  `library/library-list-item.tsx` (même géométrie : vignette 2/3 en `w-9`,
  titre, année), adapté à un `MediaItem`.
- **`PosterGrid` et `PosterCard` supprimés** : la palette était leur unique
  appelant (la bibliothèque utilise `LibraryCard`/`LibraryListItem`). Le prop
  `showKind` ajouté en phase 5 disparaît avec eux — il n'existait que pour ce
  cas.
