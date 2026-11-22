import { LegalPage } from '@/components/shop/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Politique de confidentialité | INSTINCT' };

export default function Page() {
  return (
    <LegalPage title="Politique de confidentialité" updatedAt="22 novembre 2026">
      <p>
        Cette page explique quelles données personnelles sont collectées sur le site instinctofficial.fr, pourquoi, avec
        qui elles sont partagées et quels sont vos droits.
      </p>

      <h2>Responsable du traitement</h2>
      <p>
        INSTINCT HARDCORE, association loi 1901, 24 Boulevard des Girondins, 33380 Marcheprime, France –
        contact@instinctofficial.fr.
      </p>

      <h2>Données collectées</h2>
      <p>Lorsque vous passez commande :</p>
      <ul>
        <li>
          <strong>Identité et contact</strong> : prénom, nom, adresse email, numéro de téléphone (demandé par les
          transporteurs).
        </li>
        <li>
          <strong>Livraison</strong> : adresse postale ou point relais choisi.
        </li>
        <li>
          <strong>Position</strong> (uniquement si vous cliquez sur « Autour de moi » et acceptez la localisation) :
          utilisée une seule fois pour trouver les points relais proches, convertie en code postal par un service public
          (Géoplateforme de l’IGN), jamais enregistrée.
        </li>
        <li>
          <strong>Commande</strong> : articles, montants, statut, historique, acceptation des conditions générales de
          vente.
        </li>
        <li>
          <strong>Paiement</strong> : géré par Stripe. Nous ne voyons ni ne conservons votre numéro de carte.
        </li>
      </ul>

      <h2>Finalités et bases légales</h2>
      <ul>
        <li>
          Traiter, livrer et suivre votre commande, et vous envoyer les emails qui s’y rapportent :{' '}
          <strong>exécution du contrat</strong>.
        </li>
        <li>
          Respecter nos obligations comptables et légales : <strong>obligation légale</strong>.
        </li>
        <li>
          Prévenir la fraude et sécuriser le site : <strong>intérêt légitime</strong>.
        </li>
      </ul>
      <p>
        Vos données ne sont jamais vendues, ni utilisées à des fins de prospection commerciale sans votre accord.
      </p>

      <h2>Destinataires</h2>
      <ul>
        <li>Les membres de l’association habilités à gérer les commandes.</li>
        <li>
          Nos prestataires, chacun pour ce qui le concerne :
          <ul>
            <li>
              <strong>Stripe</strong> (paiement) ; Stripe traite également certaines données pour son propre compte,
              notamment pour la prévention de la fraude (voir sa politique de confidentialité sur stripe.com) ;
            </li>
            <li>
              <strong>Boxtal</strong> et le transporteur choisi (livraison et suivi du colis) ;
            </li>
            <li>
              <strong>Brevo</strong> (envoi des emails) ;
            </li>
            <li>
              <strong>OVH</strong> (hébergement du site et des fichiers, en France) ;
            </li>
            <li>
              <strong>MongoDB</strong> (hébergement de la base de données, région AWS / Paris (eu-west-3)) ;
            </li>
            <li>
              <strong>IGN – Géoplateforme</strong> (conversion de votre position en code postal, uniquement si vous
              utilisez « Autour de moi ») ;
            </li>
            <li>
              <strong>OpenFreeMap</strong> (affichage de la carte des points relais : reçoit votre adresse IP lorsque la
              carte est affichée).
            </li>
          </ul>
        </li>
      </ul>

      <h2>Lieu de stockage et transferts hors de l’Union européenne</h2>
      <p>
        Le site et les fichiers sont hébergés en France (OVH, Gravelines). La base de données est hébergée par MongoDB
        dans la région AWS / Paris (eu-west-3).
      </p>
      <p>
        Certains prestataires, notamment Stripe, peuvent transférer des données hors de l’Union européenne. Ces transferts
        sont encadrés par les garanties prévues par le RGPD (décision d’adéquation, notamment le cadre de protection des
        données UE–États-Unis, ou clauses contractuelles types de la Commission européenne).
      </p>

      <h2>Durées de conservation</h2>
      <ul>
        <li>Factures et pièces comptables : 10 ans (obligation légale).</li>
        <li>
          Données de commande et de livraison : 5 ans après la commande, pour la gestion des réclamations et des garanties
          légales, puis suppression ou anonymisation.
        </li>
        <li>
          Commandes dont le paiement n’a pas abouti : 30 jours.
        </li>
      </ul>

      <h2>Cookies et stockage local</h2>
      <p>
        Le site utilise uniquement le stockage de votre navigateur nécessaire à son fonctionnement : votre panier et la
        progression de votre commande, ainsi qu’un cookie de session pour l’espace d’administration. Aucun cookie
        publicitaire ou de mesure d’audience n’est déposé.
      </p>
      <p>
        La vidéo de la page d’accueil (YouTube, Vimeo ou Dailymotion) n’est chargée qu’après votre clic sur le bouton de
        lecture : la plateforme concernée peut alors déposer ses propres cookies.
      </p>

      <h2>Sécurité</h2>
      <p>
        Les échanges avec le site sont chiffrés (HTTPS). L’accès à l’espace d’administration est protégé par une double
        authentification.
      </p>

      <h2>Vos droits</h2>
      <p>
        Vous pouvez demander l’accès à vos données, leur rectification, leur effacement, la limitation de leur traitement
        ou leur portabilité, vous opposer à leur traitement, et définir des directives relatives à leur sort après votre
        décès, en écrivant à contact@instinctofficial.fr. Nous vous répondons dans un délai d’un mois.
      </p>
      <p>
        Vous pouvez également introduire une réclamation auprès de la CNIL (<a href="https://www.cnil.fr/">cnil.fr</a>).
      </p>
    </LegalPage>
  );
}
