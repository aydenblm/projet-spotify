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

/* ---------- Graphiques Chart.js ---------- */

function configurerChartJs() {
    // Couleurs lisibles sur le thème clair (contraste WCAG)
    Chart.defaults.color = "#212529";
    Chart.defaults.borderColor = "rgba(0, 0, 0, 0.1)";
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
}

/** Barres horizontales : nombre de titres par artiste (top 10). */
function graphArtistes(tracks) {
    const top = compterOccurrences(tracks, (t) => t.artists.map((a) => a.name)).slice(0, 10);

    chartsActifs.push(new Chart(document.getElementById("graph-artistes"), {
        type: "bar",
        data: {
            labels: top.map(([nom]) => nom),
            datasets: [{
                label: "Nombre de titres",
                data: top.map(([, nb]) => nb),
                backgroundColor: "#0d6efd",
            }],
        },
        options: {
            indexAxis: "y",
            plugins: { legend: { display: false } },
            scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } },
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
        .slice(0, 12);

    for (const t of albums) {
        const clone = template.content.cloneNode(true);

        const cover = clone.querySelector(".cover");
        cover.src = t.album.images?.[1]?.url ?? t.album.images?.[0]?.url ?? "";
        cover.alt = `Pochette de l'album ${t.album.name}`;

        clone.querySelector(".nom").textContent = t.album.name;
        clone.querySelector(".nom").title = t.album.name;
        clone.querySelector(".artiste").textContent = t.artists.map((a) => a.name).join(", ");
        clone.querySelector(".date").textContent =
            t.album.release_date ? t.album.release_date.slice(0, 4) : "";
        clone.querySelector(".popularite").textContent = `${t.popularity}/100`;

        conteneur.appendChild(clone);
    }
}

/* ---------- Liste des titres (tableau) ---------- */

let titresCourants = [];     // titres de la vue courante (base de la recherche)
let modalDetail = null;      // instance Bootstrap Modal réutilisée

function mettreAJourCompteur(nb) {
    document.getElementById("compteur-titres").textContent = nb;
}

/** Crée une ligne <tr> pour un titre, avec son bouton « Détails ». */
function creerLigneTitre(track) {
    const tr = document.createElement("tr");

    const tdTitre = document.createElement("td");
    tdTitre.className = "fw-medium";
    tdTitre.textContent = track.name;

    const tdArtiste = document.createElement("td");
    tdArtiste.className = "text-muted";
    tdArtiste.textContent = track.artists.map((a) => a.name).join(", ");

    const tdAlbum = document.createElement("td");
    tdAlbum.className = "text-muted d-none d-md-table-cell";
    tdAlbum.textContent = track.album.name;

    const tdAction = document.createElement("td");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-primary btn-sm";
    btn.innerHTML = '<i class="bi bi-info-circle me-1" aria-hidden="true"></i>Détails';
    btn.setAttribute("aria-label", `Voir les détails de ${track.name}`);
    btn.addEventListener("click", () => ouvrirModal(track));
    tdAction.appendChild(btn);

    tr.append(tdTitre, tdArtiste, tdAlbum, tdAction);
    return tr;
}

/** Affiche les lignes du tableau (le texte est léger, on rend tout). */
function rendreTableTitres(tracks) {
    const corps = document.getElementById("corps-titres");
    corps.innerHTML = "";

    if (tracks.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = '<td colspan="4" class="text-center text-muted py-4">Aucun morceau trouvé.</td>';
        corps.appendChild(tr);
    } else {
        const fragment = document.createDocumentFragment();
        for (const t of tracks) {
            fragment.appendChild(creerLigneTitre(t));
        }
        corps.appendChild(fragment);
    }
    mettreAJourCompteur(tracks.length);
}

function afficherTitres(tracks) {
    titresCourants = tracks;
    document.getElementById("recherche-titres").value = "";
    rendreTableTitres(tracks);
}

/** Filtre les titres de la vue courante sur le texte de recherche. */
function filtrerTitres(requete) {
    if (!requete) return titresCourants;
    return titresCourants.filter((t) => {
        const texte = `${t.name} ${t.artists.map((a) => a.name).join(" ")} ${t.album.name}`;
        return texte.toLowerCase().includes(requete);
    });
}

/* ---------- Modale de détails d'un morceau ---------- */

function ouvrirModal(track) {
    document.getElementById("modal-cover").src =
        track.album.images?.[1]?.url ?? track.album.images?.[0]?.url ?? "";
    document.getElementById("modal-cover").alt = `Pochette de ${track.album.name}`;
    document.getElementById("modal-album-nom").textContent = track.album.name;
    document.getElementById("modal-album-date").textContent =
        track.album.release_date ? track.album.release_date.slice(0, 4) : "";
    document.getElementById("modal-titre").textContent = track.name;

    document.getElementById("modal-duree").textContent = formaterDuree(track.duration_ms);
    document.getElementById("modal-pop-fill").style.width = `${track.popularity}%`;
    document.getElementById("modal-pop-bar").setAttribute("aria-valuenow", track.popularity);
    document.getElementById("modal-pop-val").textContent = `${track.popularity}/100`;
    const exp = document.getElementById("modal-explicit");
    exp.textContent = track.explicit ? "Oui" : "Non";
    exp.className = `text-end pe-0 fw-semibold ${track.explicit ? "text-danger" : "text-success"}`;

    // Artistes
    const conteneurArtistes = document.getElementById("modal-artistes");
    conteneurArtistes.innerHTML = "";
    for (const a of track.artists) {
        const ligne = document.createElement("div");
        ligne.className = "d-flex align-items-center gap-3";

        const img = document.createElement("img");
        img.src = a.images?.[1]?.url ?? a.images?.[0]?.url ?? "";
        img.alt = "";
        img.className = "rounded-circle flex-shrink-0 object-fit-cover";
        img.width = 44;
        img.height = 44;

        const info = document.createElement("div");
        const nom = document.createElement("div");
        nom.className = "fw-semibold small";
        nom.textContent = a.name;
        const meta = document.createElement("div");
        meta.className = "text-muted small";
        meta.textContent = `${formaterNombre(a.followers?.total ?? 0)} followers`;
        info.append(nom, meta);

        ligne.append(img, info);
        conteneurArtistes.appendChild(ligne);
    }

    // Genres
    const conteneurGenres = document.getElementById("modal-genres");
    const genres = [...new Set(track.artists.flatMap((a) => a.genres))];
    conteneurGenres.innerHTML = "";
    if (genres.length === 0) {
        conteneurGenres.innerHTML = '<span class="text-muted small">N/A</span>';
    } else {
        for (const g of genres) {
            const badge = document.createElement("span");
            badge.className = "badge rounded-pill text-bg-dark";
            badge.textContent = g;
            conteneurGenres.appendChild(badge);
        }
    }

    // Lien Deezer (si identifiant numérique)
    const lien = document.getElementById("modal-deezer");
    if (/^\d+$/.test(String(track.id))) {
        lien.href = `https://www.deezer.com/track/${track.id}`;
        lien.classList.remove("d-none");
    } else {
        lien.classList.add("d-none");
    }

    // Aperçu audio (récupéré via Deezer à l'ouverture)
    const audio = document.getElementById("modal-audio");
    const absent = document.getElementById("modal-audio-absent");
    audio.pause();
    audio.removeAttribute("src");
    audio.classList.remove("d-none");
    absent.classList.add("d-none");
    audio.dataset.deezerId = /^\d+$/.test(String(track.id)) ? track.id : "";
    audio.dataset.query = `${track.artists.map((a) => a.name).join(" ")} ${track.name}`;
    obtenirPreview(audio)
        .then((url) => { audio.src = url; })
        .catch(() => {
            audio.classList.add("d-none");
            absent.classList.remove("d-none");
        });

    if (!modalDetail) {
        const el = document.getElementById("detailModal");
        modalDetail = new bootstrap.Modal(el);
        el.addEventListener("hidden.bs.modal", () => audio.pause());
    }
    modalDetail.show();
}

/* ---------- Barre de recherche ---------- */

function initRecherche() {
    // Recherche de playlists (accueil)
    const champ = document.getElementById("recherche");
    document.getElementById("form-recherche").addEventListener("submit", (e) => e.preventDefault());
    champ.addEventListener("input", () => {
        const requete = champ.value.trim().toLowerCase();
        let visibles = 0;
        for (const carte of document.querySelectorAll(".col-playlist")) {
            const ok = carte.dataset.recherche.includes(requete);
            carte.classList.toggle("d-none", !ok);
            if (ok) visibles++;
        }
        document.getElementById("aucune-playlist").classList.toggle("d-none", visibles > 0);
    });

    // Recherche de titres (dans une playlist)
    document.getElementById("recherche-titres").addEventListener("input", (e) => {
        rendreTableTitres(filtrerTitres(e.target.value.trim().toLowerCase()));
    });
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

    for (const id of ["liste-albums", "corps-titres"]) {
        document.getElementById(id).innerHTML = "";
    }

    // Nouveau rendu
    configurerChartJs();
    graphArtistes(tracks);
    graphGenres(tracks);
    graphAnnees(tracks);
    graphPopularite(tracks);

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
    // La recherche de la navbar ne sert qu'à l'accueil (filtre les playlists)
    document.getElementById("form-recherche").classList.toggle("d-none", nom !== "accueil");
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
