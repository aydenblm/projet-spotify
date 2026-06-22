# Spoti'stat

Projet R212 — Mise en forme de données issues de Spotify.

Site **statique** qui analyse plusieurs playlists Spotify et en présente les statistiques :
artistes, genres, popularité, décennies de sortie, albums populaires, avec aperçu audio des titres.
Le design suit la maquette Figma du sujet (thème clair, cartes à bandeaux colorés).

## Fonctionnalités

- **Accueil = grille de playlists** : chaque playlist est une carte cliquable (mosaïque de
  4 pochettes, nom, nombre de titres, durée totale).
- **Vue d'une playlist** : au clic, affichage de ses statistiques, graphiques, top artistes,
  albums populaires et titres.
- **Vue « Tous les titres »** : agrège les titres de toutes les playlists visibles.
- **Navigation par ancre (#)** : routeur côté client (`#/`, `#/playlist/<slug>`, `#/all`),
  chaque playlist étant chargée à la demande puis mise en cache.
- **Statistiques générales** : nombre de titres, durée totale, nombre d'artistes, popularité moyenne.
- **4 graphiques Chart.js** à bandeaux colorés (maquette) : Top 10 des artistes (histogramme),
  répartition des genres (camembert), titres par décennie, titres les plus populaires.
- **Top artistes** : photo, nombre de titres, followers.
- **Albums populaires** : pochette en bannière, nom, artiste, date, badge de popularité.
- **Liste des titres paginée** : pochette, artistes, album, durée, popularité, badge explicite,
  **aperçu audio (30 s)**. Bouton « Voir plus » par lots de 48 pour rester fluide même sur
  les grosses playlists.
  - L'URL d'aperçu est récupérée à la volée via l'API Deezer (par id, ou par recherche
    « artiste + titre »), car les `preview_url` exportés expirent vite. Chargement paresseux
    (au défilement) et un seul titre joué à la fois.
- **Barre de recherche** : filtre les playlists sur l'accueil, les titres dans une playlist
  (sur la liste complète, pas seulement les titres affichés).

## Personnaliser les playlists

Tout se règle dans `data/playlists.json`, sans toucher au code :

- **Renommer** une playlist : modifier son champ `"name"`.
- **Masquer** une playlist (sans la supprimer) : passer son champ `"hidden"` à `true`
  (elle disparaît de la grille **et** de la vue « Tous les titres »).
- **Réordonner** : déplacer les blocs dans le tableau (l'ordre du fichier = l'ordre d'affichage).

## Style & accessibilité

- **Tout le style est géré par Bootstrap 5** (thème clair, cartes, bandeaux `bg-primary`/
  `bg-success`/`bg-info`/`bg-warning`, grilles, ratios d'images, badges). Le fichier
  `style/style.css` ne contient aucune règle personnalisée.
- **WCAG** : lien d'évitement, hiérarchie de titres cohérente, alternatives textuelles
  (`alt`, `aria-label` sur les graphiques), focus visible (`focus-ring`), couleurs à contraste suffisant.

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
convertis au format du site et enrichis (pochettes, photos d'artistes, followers, aperçus) via
l'**API publique Deezer**. Les fichiers sont allégés pour le web (≈ 4–5 Mo au total).
Deux scripts PowerShell, à la racine du dépôt, servent uniquement à (re)générer les données :

- `build-all-playlists.ps1` — lit les CSV et produit l'index + un fichier par playlist.
- `trim-playlists.ps1` — allège les JSON (champs et images inutiles retirés).

```
data/playlists.json          # Index : nom, slug, fichier, nb titres, durée, pochettes, hidden
data/playlists/<slug>.json   # Les titres (Track[]) de chaque playlist
```

## Technologies

- HTML / CSS / JavaScript (vanilla, templates HTML natifs)
- [Bootstrap 5](https://getbootstrap.com/) — mise en page, composants et thème
- [Chart.js 4](https://www.chartjs.org/) — graphiques

## Structure

```
├── index.html              # Page unique (SPA) : accueil + vue playlist
├── spotify.ico             # Favicon
├── data/playlists.json     # Index des playlists
├── data/playlists/*.json   # Titres de chaque playlist
├── script/script.js        # Routeur, grille, stats, graphiques, albums, recherche, lecteur audio
└── style/style.css         # Vide (tout le style vient de Bootstrap)
```
