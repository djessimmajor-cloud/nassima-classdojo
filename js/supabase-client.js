// supabase-client.js — initialise le client Supabase partagé par toute l'appli.
// Projet Supabase déjà hébergé : comptes/classes/élèves/points vivent côté serveur
// (Postgres + Auth), donc visibles depuis n'importe quel appareil une fois connecté.
const SUPABASE_URL = 'https://rgypzerzlrapzigmuafp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJneXB6ZXJ6bHJhcHppZ211YWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzOTQ0NjYsImV4cCI6MjA5OTk3MDQ2Nn0.30iiP6jrYUzTMvSvkAWh1qrg0QHNy_p4_LJ9vOabiQw';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

// Petit utilitaire : transforme une erreur Supabase/réseau en message lisible pour le prof.
function friendlyError(err) {
  if (!err) return 'Erreur inconnue.';
  const msg = err.message || String(err);
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch failed')) {
    return "Impossible de contacter le serveur (connexion Internet ou serveur indisponible). Réessayez dans un instant.";
  }
  if (msg.includes('Invalid login credentials')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.';
  return msg;
}
