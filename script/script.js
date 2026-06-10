// Spoti'stat — étape 1 : chargement des données et affichage des titres

/**
 * Convertit une durée en millisecondes vers un format lisible "Xh Ymin" ou "Y:SS".
 */
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

/**
 * Affiche les cartes de statistiques générales à partir du template.
 */
function afficherStats(tracks) {
    const conteneur = document.getElementById("stats-cards");
    const template = document.getElementById("template-stat");

    const dureeTotale = tracks.reduce((somme, t) => somme + t.duration_ms, 0);
    const artistes = new Set(tracks.flatMap((t) => t.artists.map((a) => a.id)));

    const stats = [
        { valeur: tracks.length, label: "titres" },
        { valeur: formaterDureeTotale(dureeTotale), label: "d'écoute" },
        { valeur: artistes.size, label: "artistes" },
    ];

    for (const stat of stats) {
        const clone = template.content.cloneNode(true);
        clone.querySelector(".stat-valeur").textContent = stat.valeur;
        clone.querySelector(".stat-label").textContent = stat.label;
        conteneur.appendChild(clone);
    }
}

/**
 * Affiche la liste des titres à partir du template.
 */
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
        clone.querySelector(".album small").textContent = track.album.name;

        conteneur.appendChild(clone);
    }
}

/**
 * Point d'entrée : récupération du fichier data.json puis affichage.
 */
async function init() {
    try {
        const reponse = await fetch("data/data.json");
        if (!reponse.ok) {
            throw new Error(`Erreur HTTP ${reponse.status}`);
        }
        const tracks = await reponse.json();

        afficherStats(tracks);
        afficherTitres(tracks);
    } catch (erreur) {
        console.error("Impossible de charger les données :", erreur);
    }
}

init();
