import { LegalPage, Todo } from '@/components/shop/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de confidentialité | INSTINCT' };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="à compléter">
      <p>
        Cette page explique quelles données personnelles sont collectées lorsque vous commandez sur le site, pourquoi, et
        quels sont vos droits. Responsable du traitement : <Todo>nom de la structure</Todo> (contact :{' '}
        <Todo>adresse email</Todo>).
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>Identité et contact : prénom, nom, adresse email, numéro de téléphone.</li>
        <li>Livraison : adresse postale ou point relais choisi.</li>
        <li>
          Position (uniquement si vous cliquez sur « Autour de moi » ou acceptez la localisation) : utilisée une seule
          fois pour trouver les points relais proches, convertie en code postal par un service public (Géoplateforme de
          l’IGN), jamais enregistrée.
        </li>
        <li>Commande : articles, montants, statut, historique.</li>
        <li>Paiement : géré par Stripe, nous ne voyons ni ne conservons votre numéro de carte.</li>
      </ul>

      <h2>Pourquoi et sur quelle base</h2>
      <ul>
        <li>Traiter, livrer et suivre votre commande, vous envoyer les emails liés (exécution du contrat).</li>
        <li>Respecter nos obligations comptables et légales (obligation légale).</li>
        <li>Prévenir la fraude et sécuriser le site (intérêt légitime).</li>
      </ul>
      <p>Vos données ne sont jamais vendues ni utilisées à des fins de prospection commerciale sans votre accord.</p>

      <h2>Qui y a accès</h2>
      <ul>
        <li>Les membres du groupe en charge des commandes.</li>
        <li>Stripe (paiement), Boxtal et le transporteur choisi (livraison, notifications de suivi), notre prestataire d’envoi d’emails <Todo>Brevo ou autre</Todo>, et nos hébergeurs.</li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Les données de commande sont conservées <Todo>durée, par exemple 10 ans pour les pièces comptables</Todo>, puis
        supprimées ou anonymisées. Les commandes dont le paiement n’a pas abouti sont supprimées sous <Todo>durée</Todo>.
      </p>

      <h2>Cookies et stockage local</h2>
      <p>
        Le site utilise uniquement le stockage de votre navigateur nécessaire à son fonctionnement : votre panier, et la
        progression de votre commande. Aucun cookie publicitaire ou de mesure d’audience n’est déposé.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès, la rectification, l’effacement, la limitation ou la portabilité de vos données, et
        vous opposer à leur traitement, en écrivant à <Todo>adresse email</Todo>. Vous pouvez aussi introduire une
        réclamation auprès de la CNIL (<a href="https://www.cnil.fr">cnil.fr</a>).
      </p>
    </LegalPage>
  );
}
