# Spoti'stat

Projet R212 — Mise en forme de données issues de Spotify.

Site statique qui analyse plusieurs playlists Spotify et en présente les statistiques :
artistes, genres, popularité, décennies de sortie, avec aperçu audio des titres.

## Fonctionnalités

- **Accueil = grille de playlists** : chaque playlist est une carte cliquable (mosaïque de pochettes,
  nom, nombre de titres, durée totale).
- **Vue d'une playlist** : au clic, affichage de ses statistiques, graphiques, top artistes et titres.
- **Vue « Tous les titres »** : agrège les titres de toutes les playlists dans une seule vue.
- **Navigation par ancre (#)** : routeur côté client (`#/`, `#/playlist/<slug>`, `#/all`),
  chargement de chaque playlist à la demande.
- **Statistiques générales** : nombre de titres, durée totale, nombre d'artistes, popularité moyenne.
- **4 graphiques Chart.js** : artistes les plus présents, répartition des genres, titres par décennie, top popularité.
- **Top artistes** : photo, nombre de titres, followers.
- **Liste des titres** : pochette, artistes, album, durée, popularité, badge explicite, **aperçu audio (30 s)**.
  - L'URL d'aperçu est récupérée à la volée via l'API Deezer (par id, ou par recherche « artiste + titre »),
    car les `preview_url` exportés expirent vite. Chargement paresseux et un seul titre joué à la fois.
- **Barre de recherche** : filtre les playlists sur l'accueil, les titres dans une playlist.
- **Responsive** : grille Bootstrap (mobile → desktop).
- **Accessibilité (WCAG)** : lien d'évitement, hiérarchie de titres, alternatives textuelles
  (`alt`, `aria-label` sur les graphiques), focus visible, `prefers-reduced-motion` respecté.

## Lancer le projet

Les données étant chargées en `fetch`, il faut servir le site via un petit serveur local :

```bash
npx serve .
```

ou avec l'extension **Live Server** de VS Code.

## Données

Les données proviennent d'exports CSV [Exportify](https://exportify.net) des playlists Spotify,
convertis au format du site et enrichis (pochettes, photos d'artistes, followers, aperçus) via
l'API publique Deezer. Le script `build-all-playlists.ps1` (à la racine du dépôt) génère :

```
data/playlists.json          # Index : nom, fichier, nb titres, durée, pochettes de chaque playlist
data/playlists/<slug>.json   # Les titres (Track[]) de chaque playlist
```

## Technologies

- HTML / CSS / JavaScript (vanilla, templates HTML natifs)
- [Bootstrap 5](https://getbootstrap.com/) — mise en page et composants
- [Chart.js 4](https://www.chartjs.org/) — graphiques

## Structure

```
├── index.html              # Page unique (SPA) : accueil + vue playlist
├── data/playlists.json     # Index des playlists
├── data/playlists/*.json   # Titres de chaque playlist
├── script/script.js        # Routeur, grille, stats, graphiques, recherche, lecteur audio
└── style/style.css         # Styles personnalisés complémentaires à Bootstrap
```
