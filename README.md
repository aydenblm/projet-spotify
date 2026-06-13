# Spoti'stat

Projet R212 — Mise en forme de données issues de Spotify.

Site statique qui analyse une playlist de 50 titres (fichier `data/data.json`) et en présente
les statistiques : artistes, genres, popularité, décennies de sortie, avec aperçu audio des titres.

## Fonctionnalités

- **Statistiques générales** : nombre de titres, durée totale d'écoute, nombre d'artistes, popularité moyenne
- **4 graphiques Chart.js** : artistes les plus présents, répartition des genres, titres par décennie, top popularité
- **Top artistes** : photo, nombre de titres dans la playlist, followers
- **Liste des titres** : pochette, artistes, album, durée, popularité, badge explicite, **aperçu audio jouable (30 s)**
  - L'URL d'aperçu est récupérée à la volée via l'API Deezer (`api.deezer.com/track/{id}`, en JSONP),
    car les `preview_url` du `data.json` sont signées et expirent au bout de quelques jours.
  - Chargement paresseux (au défilement) et un seul titre joué à la fois.
- **Barre de recherche** (bonus) : filtre en direct sur le titre, l'artiste ou l'album
- **Responsive** : grille Bootstrap (1 colonne mobile → 3 colonnes desktop)
- **Accessibilité (WCAG)** : lien d'évitement, structure de titres cohérente, alternatives textuelles
  (`alt`, `aria-label` sur les graphiques), focus visible, `prefers-reduced-motion` respecté

## Avancement

- [x] Structure du projet (HTML / CSS / JS / données)
- [x] Intégration de Bootstrap 5
- [x] Chargement du fichier `data.json` (fetch)
- [x] Affichage des statistiques générales (templates)
- [x] Affichage de la liste des titres (templates)
- [x] Graphiques avec Chart.js
- [x] Top artistes
- [x] Aperçu audio des titres
- [x] Barre de recherche
- [x] Finitions responsive / accessibilité

## Lancer le projet

Le fichier `data.json` étant chargé en `fetch`, il faut servir le site via un petit serveur local, par exemple :

```bash
npx serve .
```

ou avec l'extension **Live Server** de VS Code.

## Technologies

- HTML / CSS / JavaScript (vanilla, templates HTML natifs)
- [Bootstrap 5](https://getbootstrap.com/) — mise en page et composants
- [Chart.js 4](https://www.chartjs.org/) — graphiques

## Structure

```
├── index.html          # Page unique du site
├── data/data.json      # Données de la playlist (Track[])
├── script/script.js    # Chargement des données, stats, graphiques, recherche
└── style/style.css     # Styles personnalisés complémentaires à Bootstrap
```
