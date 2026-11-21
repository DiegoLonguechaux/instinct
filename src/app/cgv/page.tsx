import { LegalPage, Todo } from '@/components/shop/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conditions générales de vente | INSTINCT' };

export default function Page() {
  return (
    <LegalPage title="Conditions générales de vente" updatedAt="à compléter">
      <p>
        Les présentes conditions régissent les ventes de produits dérivés (vêtements, supports musicaux, accessoires)
        réalisées sur ce site par <Todo>nom de la structure, SIRET, adresse</Todo> (« le vendeur »), auprès de
        consommateurs. Passer commande implique leur acceptation.
      </p>

      <h2>1. Produits et prix</h2>
      <p>
        Les produits sont décrits sur leur fiche. Les prix sont indiqués en euros, toutes taxes comprises{' '}
        <Todo>mention de TVA applicable ou « TVA non applicable, art. 293 B du CGI » le cas échéant</Todo>, hors frais de
        livraison, affichés avant la validation de la commande. Les offres sont valables dans la limite des stocks
        disponibles.
      </p>

      <h2>2. Commande</h2>
      <p>
        La commande est définitive une fois le paiement confirmé ; un email de confirmation récapitule la commande. Le
        stock est réservé pendant 30 minutes pendant le paiement. Le vendeur peut annuler et rembourser une commande en
        cas d’erreur manifeste ou d’indisponibilité exceptionnelle.
      </p>

      <h2>3. Paiement</h2>
      <p>
        Le paiement s’effectue en ligne par carte bancaire (et moyens proposés au moment du paiement) via la plateforme
        sécurisée Stripe. Le vendeur n’a jamais accès à vos données bancaires.
      </p>

      <h2>4. Livraison</h2>
      <p>
        Livraison en France métropolitaine <Todo>préciser Corse / DOM-TOM</Todo>, en point relais ou à domicile, au choix
        du client, via le transporteur sélectionné par l’intermédiaire de Boxtal. Les frais de livraison sont indiqués
        avant paiement. Les colis sont préparés sous <Todo>délai de préparation, par exemple 3 à 5 jours ouvrés</Todo> et
        un email de suivi est envoyé à l’expédition. Les délais de transport sont donnés à titre indicatif. En point
        relais, le colis est conservé pendant la durée fixée par le transporteur.
      </p>

      <h2>5. Droit de rétractation</h2>
      <p>
        Vous disposez de 14 jours à compter de la réception de votre commande pour vous rétracter, sans avoir à vous
        justifier, en nous écrivant à <Todo>adresse email</Todo>. Les articles doivent être retournés dans leur état
        d’origine, non portés, non lavés, dans les 14 jours suivant votre demande. Les frais de retour sont à votre
        charge <Todo>ou à celle du vendeur : à préciser</Todo>. Le remboursement, incluant les frais de livraison standard,
        intervient au plus tard 14 jours après réception du retour, par le moyen de paiement utilisé.
      </p>

      <h2>6. Garanties légales</h2>
      <p>
        Le vendeur est tenu de la garantie légale de conformité (articles L.217-3 et suivants du Code de la consommation)
        et de la garantie des vices cachés (articles 1641 et suivants du Code civil). En cas de produit défectueux ou non
        conforme, contactez-nous à <Todo>adresse email</Todo>.
      </p>

      <h2>7. Réclamations et médiation</h2>
      <p>
        Pour toute réclamation, écrivez-nous à <Todo>adresse email</Todo>. En cas de litige non résolu, vous pouvez
        recourir gratuitement à un médiateur de la consommation : <Todo>nom et coordonnées du médiateur choisi</Todo>.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Les données collectées servent à traiter votre commande. Voir la <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français.</p>
    </LegalPage>
  );
}
