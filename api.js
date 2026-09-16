// Base de l'API - relative par défaut car le frontend est servi par le même
// serveur que l'API. Utile seulement en développement local si le frontend
// est ouvert séparément du backend (voir README).
const API_BASE = window.API_BASE_URL || '/api';

function obtenirToken() {
  return localStorage.getItem('token');
}

function definirSession(token, utilisateur) {
  localStorage.setItem('token', token);
  localStorage.setItem('utilisateur', JSON.stringify(utilisateur));
}

function utilisateurConnecte() {
  const donnees = localStorage.getItem('utilisateur');
  return donnees ? JSON.parse(donnees) : null;
}

function deconnecter() {
  localStorage.removeItem('token');
  localStorage.removeItem('utilisateur');
  window.location.href = 'index.html';
}

async function appelApi(chemin, options = {}) {
  const enTetes = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = obtenirToken();
  if (token) enTetes.Authorization = `Bearer ${token}`;

  const reponse = await fetch(`${API_BASE}${chemin}`, { ...options, headers: enTetes });
  const donnees = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Une erreur est survenue');
  }
  return donnees;
}

// Pour l'envoi de fichiers (FormData) : pas de Content-Type JSON, le
// navigateur fixe lui-même le bon en-tête multipart avec la limite (boundary).
async function envoyerFichier(chemin, formData) {
  const enTetes = {};
  const token = obtenirToken();
  if (token) enTetes.Authorization = `Bearer ${token}`;

  const reponse = await fetch(`${API_BASE}${chemin}`, { method: 'POST', headers: enTetes, body: formData });
  const donnees = await reponse.json().catch(() => ({}));

  if (!reponse.ok) {
    throw new Error(donnees.erreur || 'Une erreur est survenue');
  }
  return donnees;
}

// Protège une page : redirige vers la connexion si aucune session valide
function pageParRole(role) {
  if (role === 'enseignant') return 'enseignant.html';
  if (role === 'admin') return 'gestion.html';
  return 'tableau-de-bord.html';
}

function exigerConnexion(roleAttendu) {
  const utilisateur = utilisateurConnecte();
  if (!obtenirToken() || !utilisateur) {
    window.location.href = 'index.html';
    return null;
  }
  if (roleAttendu && utilisateur.role !== roleAttendu) {
    window.location.href = pageParRole(utilisateur.role);
    return null;
  }
  return utilisateur;
}
