let chartsActifs = [];
const VERT_SPOTIFY = "#1db954";
const PALETTE = [
    "#1db954", "#1e90ff", "#e74c3c", "#f1c40f", "#9b59b6",
    "#e67e22", "#1abc9c", "#ff6b9d", "#95a5a6", "#34495e",
];
function formaterDuree(ms) {
    const totalSecondes = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSecondes / 60);
    const secondes = totalSecondes % 60;
    return `${minutes}:${String(secondes).padStart(2, "0")}`;
}
function formaterDureeTotale(ms) {
    const totalMinutes = Math.floor(ms / 60000);
    const heures = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return heures > 0 ? `${heures}h ${minutes}min` : `${minutes} min`;
}
function formaterNombre(n) {
    return n.toLocaleString("fr-FR");
}
function compterOccurrences(tracks, extraire) {
    const compteur = new Map();
    for (const track of tracks) {
        for (const cle of extraire(track)) {
            compteur.set(cle, (compteur.get(cle) ?? 0) + 1);
        }
    }
    return [...compteur.entries()].sort((a, b) => b[1] - a[1]);
}
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
function configurerChartJs() {
    Chart.defaults.color = "#c9c9c9";
    Chart.defaults.borderColor = "rgba(255, 255, 255, 0.1)";
    Chart.defaults.font.family = "system-ui, -apple-system, 'Segoe UI', sans-serif";
}
function graphArtistes(tracks) {
    const top = compterOccurrences(tracks, (t) => t.artists.map((a) => a.name)).slice(0, 10);
    chartsActifs.push(new Chart(document.getElementById("graph-artistes"), {
        type: "bar",
        data: {
            labels: top.map(([nom]) => nom),
            datasets: [{
                label: "Nombre de titres",
                data: top.map(([, nb]) => nb),
                backgroundColor: VERT_SPOTIFY,
            }],
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
        },
    }));
}
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
        type: "doughnut",
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
function afficherArtistes(tracks) {
    const conteneur = document.getElementById("liste-artistes");
    const template = document.getElementById("template-artiste");
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
function afficherTitres(tracks) {
    const conteneur = document.getElementById("liste-titres");
    const template = document.getElementById("template-titre");
    for (const track of tracks) {
        const clone = template.content.cloneNode(true);
        const cover = clone.querySelector(".cover");
        cover.src = track.album.images[1]?.url ?? track.album.images[0]?.url ?? "";
        cover.alt = `Pochette de l'album ${track.album.name}`;
        clone.querySelector(".nom").textContent = track.name;
        clone.querySelector(".artistes").textContent = track.artists
            .map((a) => a.name)
            .join(", ");
        clone.querySelector(".album small").textContent =
            `${track.album.name} (${track.album.release_date.slice(0, 4)})`;
        clone.querySelector(".duree").textContent = formaterDuree(track.duration_ms);
        clone.querySelector(".popularite").textContent = `Popularité ${track.popularity}`;
        if (track.explicit) {
            clone.querySelector(".explicit").classList.remove("d-none");
        }
        const audio = clone.querySelector(".apercu");
        audio.dataset.deezerId = /^\d+$/.test(String(track.id)) ? track.id : "";
        audio.dataset.query = `${track.artists.map((a) => a.name).join(" ")} ${track.name}`;
        audio.setAttribute("aria-label", `Aperçu audio de ${track.name}`);
        const carte = clone.querySelector(".col-titre");
        carte.dataset.recherche = [
            track.name,
            ...track.artists.map((a) => a.name),
            track.album.name,
        ].join(" ").toLowerCase();
        conteneur.appendChild(clone);
    }
    mettreAJourCompteur(tracks.length);
}
function mettreAJourCompteur(nb) {
    document.getElementById("compteur-titres").textContent = nb;
}

function initRecherche() {
    const champ = document.getElementById("recherche");
    document.getElementById("form-recherche").addEventListener("submit", (e) => {
        e.preventDefault();
    });
    champ.addEventListener("input", () => {
        const requete = champ.value.trim().toLowerCase();
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
        let visibles = 0;
        for (const carte of document.querySelectorAll(".col-titre")) {
            const ok = carte.dataset.recherche.includes(requete);
            carte.classList.toggle("d-none", !ok);
            if (ok) visibles++;
        }
        document.getElementById("aucun-resultat").classList.toggle("d-none", visibles > 0);
        mettreAJourCompteur(visibles);
    });
}
const cachePreviews = new Map();
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
async function obtenirPreview(audio) {
    if (audio.dataset.deezerId) {
        try {
            return await chargerPreviewDeezer(audio.dataset.deezerId);
        } catch {
        }
    }
    return chargerPreviewParRecherche(audio.dataset.query);
}
function initLecteurs() {
    const lecteurs = document.querySelectorAll(".apercu");
    for (const audio of lecteurs) {
        audio.addEventListener("play", () => {
            for (const autre of lecteurs) {
                if (autre !== audio) {
                    autre.pause();
                }
            }
        });
    }
    const charger = (audio) => {
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
    };
    if ("IntersectionObserver" in window) {
        const observateur = new IntersectionObserver((entrees, obs) => {
            for (const entree of entrees) {
                if (entree.isIntersecting) {
                    charger(entree.target);
                    obs.unobserve(entree.target);
                }
            }
        }, { rootMargin: "200px" });
        for (const audio of lecteurs) {
            observateur.observe(audio);
        }
    } else {
        lecteurs.forEach(charger);
    }
}
function rendreTout(tracks) {
    for (const graphique of chartsActifs) {
        graphique.destroy();
    }
    chartsActifs = [];
    cachePreviews.clear();

    for (const id of ["stats-cards", "liste-artistes", "liste-titres"]) {
        document.getElementById(id).innerHTML = "";
    }
    afficherStats(tracks);
    configurerChartJs();
    graphArtistes(tracks);
    graphGenres(tracks);
    graphAnnees(tracks);
    graphPopularite(tracks);
    afficherArtistes(tracks);
    afficherTitres(tracks);
    initLecteurs();
}
let indexPlaylists = [];
const cachePlaylists = new Map();
function playlistsVisibles() {
    return indexPlaylists.filter((p) => !p.hidden);
}
function afficherErreur(message) {
    const alerte = document.getElementById("alerte");
    alerte.textContent = message;
    alerte.classList.remove("d-none");
}
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
        const mosaique = clone.querySelector(".mosaique");
        const covers = (pl.covers && pl.covers.length) ? pl.covers : [];
        for (let i = 0; i < 4; i++) {
            const img = document.createElement("img");
            img.src = covers[i % covers.length] || "";
            img.alt = "";
            img.loading = "lazy";
            mosaique.appendChild(img);
        }
        const carte = clone.querySelector(".col-playlist");
        carte.dataset.recherche = pl.name.toLowerCase();
        conteneur.appendChild(clone);
    }
}
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
async function chargerTout() {
    const listes = await Promise.all(playlistsVisibles().map((p) => chargerPlaylist(p.slug)));
    return listes.flat();
}
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