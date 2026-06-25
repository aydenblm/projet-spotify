# Spoti'stat

Projet R212 — Mise en forme de données issues de Spotify.

Site **statique** qui analyse plusieurs playlists Spotify et en présente les statistiques :
artistes, genres, popularité, albums populaires, avec détail et aperçu audio de chaque morceau.
La mise en page suit la maquette du sujet (thème clair, en-tête héro, cartes à bandeaux colorés,
tableau de morceaux avec fenêtre de détails).

## Fonctionnalités

- **Accueil = grille de playlists** : chaque playlist est une carte cliquable (mosaïque de
  4 pochettes, nom, nombre de titres, durée totale).
- **Vue d'une playlist** : en-tête héro (nom + nombre de titres + durée), puis :
  - **Graphiques Chart.js** à bandeaux colorés + icônes : « Top 10 des Artistes » (barres
    horizontales), « Distribution des Genres » (camembert), « Titres par décennie »,
    « Titres les plus populaires ».
  - **Liste des morceaux** sous forme de **tableau** (Titre / Artiste / Album / Action), avec
    recherche intégrée et un bouton **« Détails »** par ligne.
  - **Section « Albums populaires »** : vignette, nom, artiste, année, badge de popularité.
- **Fenêtre de détails (modale Bootstrap)** : pochette, **aperçu audio (30 s)**, durée,
  popularité (barre de progression), caractère explicite, artistes (photo + followers),
  genres, et lien « Ouvrir dans Deezer ».
- **Vue « Tous les titres »** : agrège les titres de toutes les playlists visibles.
- **Navigation par ancre (#)** : routeur côté client (`#/`, `#/playlist/<slug>`, `#/all`),
  chaque playlist étant chargée à la demande puis mise en cache.
- **Recherche** : filtre les playlists sur l'accueil, les morceaux dans une playlist.

## Aperçu audio

Les `preview_url` exportés de Spotify expirent vite : l'aperçu est donc récupéré à la volée via
l'**API publique Deezer** (par identifiant, ou par recherche « artiste + titre ») au moment où
l'on ouvre la fenêtre de détails. Appels en JSONP pour contourner les restrictions CORS.

## Personnaliser les playlists

Tout se règle dans `data/playlists.json`, sans toucher au code :

- **Renommer** une playlist : modifier son champ `"name"`.
- **Masquer** une playlist : passer `"hidden"` à `true` (elle disparaît de la grille
  **et** de la vue « Tous les titres »).
- **Réordonner** : déplacer les blocs dans le tableau (l'ordre du fichier = l'ordre d'affichage).

## Style & accessibilité

- **Style géré par Bootstrap 5** (thème clair, cartes, bandeaux `bg-primary`/`bg-success`/
  `bg-info`/`bg-warning`, grilles, ratios d'images, badges, tableau, modale). Le CSS personnalisé
  se limite au fond décoratif animé et aux effets de survol.
- **Bootstrap Icons** pour les icônes des en-têtes de cartes.
- **WCAG** : lien d'évitement, hiérarchie de titres, alternatives textuelles (`alt`, `aria-label`
  sur les graphiques), focus visible, contrastes suffisants, `prefers-reduced-motion` respecté
  (animations du fond désactivées).

## Lancer le projet

Les données étant chargées en `fetch`, il faut servir le site via un petit serveur local
(l'ouverture directe du fichier en `file://` ne fonctionne pas) :

```bash
npx serve .
```

ou, sous Windows avec Python :

```powershell
python -m http.server 8123
```

puis ouvrir http://localhost:8123. (Alternative : extension **Live Server** de VS Code.)

## Données

Les données proviennent d'exports CSV [Exportify](https://exportify.net) des playlists Spotify,
convertis au format du site et enrichis (pochettes, photos d'artistes, followers) via l'API
publique Deezer, puis allégés pour le web. Deux scripts PowerShell, à la racine du dépôt, servent
uniquement à (re)générer les données :

- `build-all-playlists.ps1` — lit les CSV et produit l'index + un fichier par playlist.
- `trim-playlists.ps1` — allège les JSON (champs et images inutiles retirés).

```
data/playlists.json          # Index : nom, slug, fichier, nb titres, durée, pochettes, hidden
data/playlists/<slug>.json   # Les titres (Track[]) de chaque playlist
```

## Technologies

- HTML / CSS / JavaScript (vanilla, templates HTML natifs)
- [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/)
- [Chart.js 4](https://www.chartjs.org/) — graphiques

## Structure

```
├── index.html              # Page unique (SPA) : accueil + vue playlist + modale détails
├── spotify.ico             # Favicon
├── data/playlists.json     # Index des playlists
├── data/playlists/*.json   # Titres de chaque playlist
├── script/script.js        # Routeur, grille, graphiques, tableau, modale, albums, recherche
└── style/style.css         # Fond animé + effets de survol (le reste vient de Bootstrap)
```
