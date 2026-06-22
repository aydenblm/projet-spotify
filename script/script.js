// Spoti'stat — statistiques et visualisations d'une playlist Spotify

// Graphiques Chart.js en cours d'affichage (détruits avant chaque nouveau rendu)
let chartsActifs = [];

const VERT_SPOTIFY = "#1db954";
const PALETTE = [
    "#1db954", "#1e90ff", "#e74c3c", "#f1c40f", "#9b59b6",
    "#e67e22", "#1abc9c", "#ff6b9d", "#95a5a6", "#34495e",
];

/* ---------- Fonctions utilitaires ---------- */

/** Durée d'un titre au format "M:SS". */
function formaterDuree(ms) {
    const totalSecondes = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSecondes / 60);
    const secondes = totalSecondes % 60;
    return `${minutes}:${String(secondes).padStart(2, "0")}`;
}

/** Durée cumulée au format "Xh Ymin". */
function formaterDureeTotale(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const heures = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return heures > 0 ? `${heures}h ${minutes}min` : `${minutes} min`;
}

/** Nombre formaté avec séparateur de milliers (ex : 1 234 567). */
function formaterNombre(n) {
    return n.toLocaleString("fr-FR");
}

/** Compte les occurrences de chaque clé produite par `extraire(track)` (tableau de clés). */
function compterOccurrences(tracks, extraire) {
    const compteur = new Map();
    for (const track of tracks) {
        for (const cle of extraire(track)) {
            compteur.set(cle, (compteur.get(cle) ?? 0) + 1);
        }
    }
    return [...compteur.entries()].sort((a, b) => b[1] - a[1]);
}

/* ---------- Statistiques générales ---------- */

function afficherStats(tracks) {
    const conteneur = document.getElementById("stats-cards");
    const template = document.getElementById("template-stat");

    const dureeTotale = tracks.reduce((somme, t) => somme + t.duration_ms, 0);
    const artistes = new Set(tracks.flatMap((t) => t.artists.map((a) => a.id)));
    const popMoyenne = Math.round(
        tracks.reduce((somme, t) => somme + t.popularity, 0) / tracks.length
    );

    const stats = [
        { valeur: tracks.length, label: "titres" },
        { valeur: formaterDureeTotale(dureeTotale), label: "d'écoute" },
        { valeur: artistes.size, label: "artistes" },
        { valeur: `${popMoyenne}/100`, label: "popularité moyenne" },
    ];

    for (const stat of stats) {
        const clone = template.content.cloneNode(true);
        clone.querySelector(".stat-valeur").textContent = stat.valeur;
        clone.querySelector(".stat-label").textContent = stat.label;
        conteneur.appendChild(clone);
    }
}

/* ---------- Graphiques Chart.js ---------- */

function configurerChartJs() {
    // Couleurs lisibles sur le thème clair (contraste WCAG)
    Chart.defaults.color = "#212529";
    Chart.defaults.borderColor = "rgba(0, 0, 0, 0.1)";
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
}

/** Barres : nombre de titres par artiste (top 10). */
function graphArtistes(tracks) {
    const top = compterOccurrences(tracks, (t) => t.artists.map((a) => a.name)).slice(0, 10);

    chartsActifs.push(new Chart(document.getElementById("graph-artistes"), {
        type: "bar",
        data: {
            labels: top.map(([nom]) => nom),
            datasets: [{
                label: "Nombre de titres",
                data: top.map(([, nb]) => nb),
                backgroundColor: "#5b9bd5",
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
    }));
}

/** Camembert : répartition des genres (8 premiers + "Autres"). */
function graphGenres(tracks) {
    const occurrences = compterOccurrences(tracks, (t) =>
        [...new Set(t.artists.flatMap((a) => a.genres))]
    );
    const principaux = occurrences.slice(0, 8);
    const autres = occurrences.slice(8).reduce((somme, [, nb]) => somme + nb, 0);
    if (autres > 0) {
        principaux.push(["Autres", autres]);
    }

    chartsActifs.push(new Chart(document.getElementById("graph-genres"), {
        type: "pie",
        data: {
            labels: principaux.map(([genre]) => genre),
            datasets: [{
                data: principaux.map(([, nb]) => nb),
                backgroundColor: PALETTE.slice(0, principaux.length),
                borderWidth: 0,
            }],
        },
        options: {
            plugins: { legend: { position: "right" } },
        },
    }));
}

/** Barres : nombre de titres par décennie de sortie. */
function graphAnnees(tracks) {
    const parDecennie = compterOccurrences(tracks, (t) => {
        const annee = parseInt(t.album.release_date.slice(0, 4), 10);
        return [`${Math.floor(annee / 10) * 10}s`];
    }).sort((a, b) => a[0].localeCompare(b[0]));

    chartsActifs.push(new Chart(document.getElementById("graph-annees"), {
        type: "bar",
        data: {
            labels: parDecennie.map(([decennie]) => decennie),
            datasets: [{
                label: "Nombre de titres",
                data: parDecennie.map(([, nb]) => nb),
                backgroundColor: "#1e90ff",
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
    }));
}

/** Barres horizontales : les 10 titres les plus populaires. */
function graphPopularite(tracks) {
    const top = [...tracks]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 10);

    chartsActifs.push(new Chart(document.getElementById("graph-popularite"), {
        type: "bar",
        data: {
            labels: top.map((t) => t.name),
            datasets: [{
                label: "Popularité",
                data: top.map((t) => t.popularity),
                backgroundColor: VERT_SPOTIFY,
            }],
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: { x: { min: 0, max: 100 } },
        },
    }));
}

/* ---------- Top artistes ---------- */

function afficherArtistes(tracks) {
    const conteneur = document.getElementById("liste-artistes");
    const template = document.getElementById("template-artiste");

    // Artistes triés par nombre d'apparitions dans la playlist
    const occurrences = compterOccurrences(tracks, (t) => t.artists.map((a) => a.id));
    const artistesParId = new Map(
        tracks.flatMap((t) => t.artists.map((a) => [a.id, a]))
    );

    for (const [id, nb] of occurrences.slice(0, 6)) {
        const artiste = artistesParId.get(id);
        const clone = template.content.cloneNode(true);

        const photo = clone.querySelector(".photo");
        photo.src = artiste.images?.[1]?.url ?? artiste.images?.[0]?.url ?? "";
        photo.alt = `Photo de ${artiste.name}`;

        clone.querySelector(".nom").textContent = artiste.name;
        clone.querySelector(".nb-titres small").textContent =
            `${nb} titre${nb > 1 ? "s" : ""}`;
        clone.querySelector(".followers small").textContent =
            `${formaterNombre(artiste.followers.total)} followers`;

        conteneur.appendChild(clone);
    }
}

/* ---------- Albums populaires ---------- */

function afficherAlbums(tracks) {
    const conteneur = document.getElementById("liste-albums");
    const template = document.getElementById("template-album");

    // Albums uniques (par nom + artiste), triés par popularité
    const parAlbum = new Map();
    for (const t of tracks) {
        const cle = `${t.album.name}|${t.artists[0]?.name ?? ""}`;
        const existant = parAlbum.get(cle);
        if (!existant || t.popularity > existant.popularity) {
            parAlbum.set(cle, t);
        }
    }
    const albums = [...parAlbum.values()]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 6);

    for (const t of albums) {
        const clone = template.content.cloneNode(true);

        const cover = clone.querySelector(".cover");
        cover.src = t.album.images?.[0]?.url ?? t.album.images?.[1]?.url ?? "";
        cover.alt = `Pochette de l'album ${t.album.name}`;

        clone.querySelector(".nom").textContent = t.album.name;
        clone.querySelector(".artiste").textContent = t.artists.map((a) => a.name).join(", ");
        clone.querySelector(".date").textContent = t.album.release_date || "";
        clone.querySelector(".popularite").textContent = `Popularité ${t.popularity}`;

        conteneur.appendChild(clone);
    }
}

/* ---------- Liste des titres (paginée) ---------- */

const BATCH_TITRES = 48;       // nombre de titres ajoutés par lot
let titresCourants = [];       // tous les titres de la vue
let titresFiltres = [];        // titres après recherche
let titresRendus = 0;          // combien sont déjà affichés

/** Crée la carte DOM d'un titre et branche son lecteur audio. */
function creerCarteTitre(track) {
    const template = document.getElementById("template-titre");
    const clone = template.content.cloneNode(true);

    const cover = clone.querySelector(".cover");
    cover.src = track.album.images[1]?.url ?? track.album.images[0]?.url ?? "";
    cover.alt = `Pochette de l'album ${track.album.name}`;

    clone.querySelector(".nom").textContent = track.name;
    clone.querySelector(".artistes").textContent = track.artists.map((a) => a.name).join(", ");
    clone.querySelector(".album small").textContent =
        `${track.album.name} (${track.album.release_date.slice(0, 4)})`;
    clone.querySelector(".duree").textContent = formaterDuree(track.duration_ms);
    clone.querySelector(".popularite").textContent = `Popularité ${track.popularity}`;

    if (track.explicit) {
        clone.querySelector(".explicit").classList.remove("d-none");
    }

    // id numérique = identifiant Deezer (recherche directe) ; sinon recherche titre + artiste.
    const audio = clone.querySelector(".apercu");
    audio.dataset.deezerId = /^\d+$/.test(String(track.id)) ? track.id : "";
    audio.dataset.query = `${track.artists.map((a) => a.name).join(" ")} ${track.name}`;
    audio.setAttribute("aria-label", `Aperçu audio de ${track.name}`);
    wirerAudio(audio);

    return clone;
}

/** Ajoute le lot de titres suivant et met à jour le bouton « Voir plus ». */
function rendreLotTitres() {
    const conteneur = document.getElementById("liste-titres");
    const fin = Math.min(titresRendus + BATCH_TITRES, titresFiltres.length);

    const fragment = document.createDocumentFragment();
    for (let i = titresRendus; i < fin; i++) {
        fragment.appendChild(creerCarteTitre(titresFiltres[i]));
    }
    conteneur.appendChild(fragment);
    titresRendus = fin;

    document.getElementById("btn-voir-plus")
        .classList.toggle("d-none", titresRendus >= titresFiltres.length);
}

/** Affiche une liste de titres depuis zéro (premier lot seulement). */
function afficherListeTitres(tracks) {
    titresFiltres = tracks;
    titresRendus = 0;
    document.getElementById("liste-titres").innerHTML = "";
    document.getElementById("aucun-resultat").classList.toggle("d-none", tracks.length > 0);
    mettreAJourCompteur(tracks.length);
    rendreLotTitres();
}

function afficherTitres(tracks) {
    titresCourants = tracks;
    afficherListeTitres(tracks);
}

/** Filtre les titres de la vue courante sur le texte de recherche. */
function filtrerTitres(requete) {
    if (!requete) return titresCourants;
    return titresCourants.filter((t) => {
        const texte = `${t.name} ${t.artists.map((a) => a.name).join(" ")} ${t.album.name}`;
        return texte.toLowerCase().includes(requete);
    });
}

function mettreAJourCompteur(nb) {
    document.getElementById("compteur-titres").textContent = nb;
}

/* ---------- Barre de recherche ---------- */

function initRecherche() {
    const champ = document.getElementById("recherche");

    document.getElementById("form-recherche").addEventListener("submit", (e) => {
        e.preventDefault();
    });

    champ.addEventListener("input", () => {
        const requete = champ.value.trim().toLowerCase();

        // Sur l'accueil : filtre les cartes de playlists
        if (!document.getElementById("vue-accueil").classList.contains("d-none")) {
            let visibles = 0;
            for (const carte of document.querySelectorAll(".col-playlist")) {
                const ok = carte.dataset.recherche.includes(requete);
                carte.classList.toggle("d-none", !ok);
                if (ok) visibles++;
            }
            document.getElementById("aucune-playlist").classList.toggle("d-none", visibles > 0);
            return;
        }

        // Dans une playlist : filtre les titres (sur la liste complète, puis repagine)
        afficherListeTitres(filtrerTitres(requete));
    });

    // Bouton « Voir plus » : ajoute le lot suivant
    document.getElementById("btn-voir-plus").addEventListener("click", rendreLotTitres);
}

/* ---------- Lecture audio (aperçus Deezer) ---------- */

// Mémorise les URLs déjà récupérées pour ne pas réinterroger l'API.
const cachePreviews = new Map();

/**
 * Appelle l'API Deezer en JSONP (injection de <script>) pour contourner CORS.
 * Renvoie l'objet JSON renvoyé par l'API.
 */
function deezerJsonp(url) {
    return new Promise((resolve, reject) => {
        const callback = `deezerCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const script = document.createElement("script");

        const minuterie = setTimeout(() => {
            nettoyer();
            reject(new Error("Délai dépassé"));
        }, 8000);

        function nettoyer() {
            clearTimeout(minuterie);
            delete window[callback];
            script.remove();
        }

        window[callback] = (donnees) => {
            nettoyer();
            resolve(donnees);
        };
        script.onerror = () => {
            nettoyer();
            reject(new Error("Erreur réseau"));
        };

        const separateur = url.includes("?") ? "&" : "?";
        script.src = `${url}${separateur}output=jsonp&callback=${callback}`;
        document.body.appendChild(script);
    });
}

/** Aperçu d'un titre via son identifiant Deezer. */
async function chargerPreviewDeezer(trackId) {
    const cle = `id:${trackId}`;
    if (cachePreviews.has(cle)) {
        return cachePreviews.get(cle);
    }
    const donnees = await deezerJsonp(`https://api.deezer.com/track/${trackId}`);
    if (!donnees || !donnees.preview) {
        throw new Error("Aucun aperçu disponible");
    }
    cachePreviews.set(cle, donnees.preview);
    return donnees.preview;
}

/** Aperçu d'un titre via une recherche Deezer "artiste titre" (titres venant de Spotify). */
async function chargerPreviewParRecherche(requete) {
    const cle = `q:${requete}`;
    if (cachePreviews.has(cle)) {
        return cachePreviews.get(cle);
    }
    const donnees = await deezerJsonp(
        `https://api.deezer.com/search?limit=1&q=${encodeURIComponent(requete)}`
    );
    const preview = donnees?.data?.[0]?.preview;
    if (!preview) {
        throw new Error("Aucun aperçu disponible");
    }
    cachePreviews.set(cle, preview);
    return preview;
}

/** Trouve un aperçu : par id Deezer si disponible, sinon par recherche titre + artiste. */
async function obtenirPreview(audio) {
    if (audio.dataset.deezerId) {
        try {
            return await chargerPreviewDeezer(audio.dataset.deezerId);
        } catch {
            // bascule sur la recherche ci-dessous
        }
    }
    return chargerPreviewParRecherche(audio.dataset.query);
}

// Observateur unique réutilisé pour tous les lecteurs (chargement paresseux).
let observateurAudio = null;

/** Charge l'aperçu d'un titre (une seule fois) quand sa carte devient visible. */
function chargerApercu(audio) {
    if (audio.dataset.chargement) {
        return;
    }
    audio.dataset.chargement = "1";
    obtenirPreview(audio)
        .then((url) => {
            audio.src = url;
            audio.preload = "metadata";
        })
        .catch((erreur) => {
            console.warn(`Aperçu indisponible (${audio.dataset.query})`, erreur);
            const message = document.createElement("p");
            message.className = "text-body-secondary mb-0 small";
            message.textContent = "Aperçu indisponible";
            audio.replaceWith(message);
        });
}

/**
 * Branche un lecteur audio :
 *  - met en pause les autres titres quand on le lance ;
 *  - charge son aperçu quand sa carte devient visible (observateur partagé).
 */
function wirerAudio(audio) {
    audio.addEventListener("play", () => {
        for (const autre of document.querySelectorAll(".apercu")) {
            if (autre !== audio) autre.pause();
        }
    });

    if (!observateurAudio && "IntersectionObserver" in window) {
        observateurAudio = new IntersectionObserver((entrees, obs) => {
            for (const entree of entrees) {
                if (entree.isIntersecting) {
                    chargerApercu(entree.target);
                    obs.unobserve(entree.target);
                }
            }
        }, { rootMargin: "200px" });
    }

    if (observateurAudio) {
        observateurAudio.observe(audio);
    } else {
        chargerApercu(audio); // repli si IntersectionObserver indisponible
    }
}

/* ---------- Rendu d'une playlist ---------- */

/**
 * (Re)construit toute la page à partir d'un tableau de titres.
 * Vide les conteneurs et détruit les anciens graphiques au préalable,
 * pour pouvoir afficher une nouvelle playlist importée.
 */
function rendreTout(tracks) {
    // Nettoyage du rendu précédent
    for (const graphique of chartsActifs) {
        graphique.destroy();
    }
    chartsActifs = [];
    cachePreviews.clear();

    for (const id of ["stats-cards", "liste-artistes", "liste-albums", "liste-titres"]) {
        document.getElementById(id).innerHTML = "";
    }

    // Nouveau rendu
    afficherStats(tracks);

    configurerChartJs();
    graphArtistes(tracks);
    graphGenres(tracks);
    graphAnnees(tracks);
    graphPopularite(tracks);

    afficherArtistes(tracks);
    afficherAlbums(tracks);
    afficherTitres(tracks);
}

/* ---------- Playlists & navigation ---------- */

let indexPlaylists = [];                 // contenu de playlists.json
const cachePlaylists = new Map();        // slug -> Track[] déjà chargés

/** Playlists affichées = celles non marquées "hidden": true dans playlists.json. */
function playlistsVisibles() {
    return indexPlaylists.filter((p) => !p.hidden);
}

function afficherErreur(message) {
    const alerte = document.getElementById("alerte");
    alerte.textContent = message;
    alerte.classList.remove("d-none");
}

/** Affiche la grille des cartes de playlists (accueil). */
function afficherPlaylists() {
    const conteneur = document.getElementById("liste-playlists");
    const template = document.getElementById("template-playlist");
    conteneur.innerHTML = "";

    for (const pl of playlistsVisibles()) {
        const clone = template.content.cloneNode(true);

        clone.querySelector(".lien-playlist").href = `#/playlist/${pl.slug}`;
        clone.querySelector(".nom").textContent = pl.name;
        clone.querySelector(".meta").textContent =
            `${pl.count} titres · ${formaterDureeTotale(pl.duration_ms)}`;

        // Mosaïque de pochettes 2×2 (grille Bootstrap + ratio carré)
        const mosaique = clone.querySelector(".mosaique");
        const covers = (pl.covers && pl.covers.length) ? pl.covers : [];
        for (let i = 0; i < 4; i++) {
            const col = document.createElement("div");
            col.className = "col";
            const ratio = document.createElement("div");
            ratio.className = "ratio ratio-1x1";
            const img = document.createElement("img");
            img.src = covers.length ? covers[i % covers.length] : "";
            img.alt = "";
            img.loading = "lazy";
            img.className = "object-fit-cover";
            ratio.appendChild(img);
            col.appendChild(ratio);
            mosaique.appendChild(col);
        }

        const carte = clone.querySelector(".col-playlist");
        carte.dataset.recherche = pl.name.toLowerCase();

        conteneur.appendChild(clone);
    }
}

/** Charge (et met en cache) les titres d'une playlist. */
async function chargerPlaylist(slug) {
    if (cachePlaylists.has(slug)) {
        return cachePlaylists.get(slug);
    }
    const meta = indexPlaylists.find((p) => p.slug === slug);
    if (!meta) {
        throw new Error("Playlist introuvable");
    }
    const reponse = await fetch(meta.file);
    if (!reponse.ok) {
        throw new Error(`Erreur HTTP ${reponse.status}`);
    }
    const tracks = await reponse.json();
    cachePlaylists.set(slug, tracks);
    return tracks;
}

/** Charge toutes les playlists et concatène leurs titres (vue « Tous les titres »). */
async function chargerTout() {
    const listes = await Promise.all(playlistsVisibles().map((p) => chargerPlaylist(p.slug)));
    return listes.flat();
}

/* ---------- Routeur (navigation par #) ---------- */

function montrerVue(nom) {
    document.getElementById("vue-accueil").classList.toggle("d-none", nom !== "accueil");
    document.getElementById("vue-playlist").classList.toggle("d-none", nom !== "playlist");
}

async function routeur() {
    const champRecherche = document.getElementById("recherche");
    champRecherche.value = "";
    document.getElementById("alerte").classList.add("d-none");

    const hash = window.location.hash;
    const matchPlaylist = hash.match(/^#\/playlist\/(.+)$/);

    try {
        if (hash === "#/all") {
            montrerVue("playlist");
            document.getElementById("titre-playlist").textContent = "Tous les titres";
            const tracks = await chargerTout();
            document.getElementById("sous-titre-playlist").textContent =
                `${tracks.length} titres · ${playlistsVisibles().length} playlists`;
            rendreTout(tracks);
            window.scrollTo({ top: 0 });
        } else if (matchPlaylist) {
            const slug = decodeURIComponent(matchPlaylist[1]);
            const meta = indexPlaylists.find((p) => p.slug === slug);
            montrerVue("playlist");
            document.getElementById("titre-playlist").textContent = meta ? meta.name : "Playlist";
            const tracks = await chargerPlaylist(slug);
            document.getElementById("sous-titre-playlist").textContent =
                `${tracks.length} titres · ${formaterDureeTotale(meta.duration_ms)}`;
            rendreTout(tracks);
            window.scrollTo({ top: 0 });
        } else {
            montrerVue("accueil");
        }
    } catch (erreur) {
        console.error(erreur);
        afficherErreur("Impossible de charger cette playlist.");
    }
}

/* ---------- Point d'entrée ---------- */

async function init() {
    initRecherche();

    try {
        const reponse = await fetch("data/playlists.json");
        if (!reponse.ok) {
            throw new Error(`Erreur HTTP ${reponse.status}`);
        }
        indexPlaylists = await reponse.json();
        afficherPlaylists();
    } catch (erreur) {
        console.error("Impossible de charger l'index des playlists :", erreur);
        afficherErreur("Impossible de charger la liste des playlists.");
    }

    window.addEventListener("hashchange", routeur);
    routeur();
}

init();
