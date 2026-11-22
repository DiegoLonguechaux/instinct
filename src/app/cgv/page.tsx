import { LegalPage } from '@/components/shop/LegalPage';
import { CGV_VERSION, formatCgvVersion } from '@/lib/legal-config';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Conditions générales de vente | INSTINCT' };

export default function Page() {
  return (
    <LegalPage title="Conditions générales de vente" label="Version du" updatedAt={formatCgvVersion(CGV_VERSION)}>
      <h2>Vendeur</h2>
      <p>Les présentes conditions régissent les ventes réalisées sur le site instinctofficial.fr par :</p>
      <p>
        <strong>
          INSTINCT HARDCORE
        </strong>
        , association régie par la loi du 1er juillet 1901
        <br />
        Siège : 24 Boulevard des Girondins, 33380 Marcheprime, France
        <br />
        RNA : W336008118 – SIRET : 99037440700015
        <br />
        Email : contact@instinctofficial.fr – Téléphone : 06 59 77 82 58
        <br />
        (ci-après « le vendeur »)
      </p>
      <p>
        Elles s’appliquent aux ventes de produits dérivés du groupe Instinct (vêtements, supports musicaux, accessoires)
        à des consommateurs. Toute commande implique leur acceptation, matérialisée par une case à cocher au moment du
        paiement. La version applicable est celle en vigueur à la date de la commande.
      </p>

      <h2>1. Produits et prix</h2>
      <p>
        Les caractéristiques essentielles des produits sont présentées sur leur fiche. Les photographies sont aussi
        fidèles que possible mais n’ont pas de valeur contractuelle pour les nuances de couleur.
      </p>
      <p>
        Les prix sont indiqués en euros.{' '}
          TVA non applicable, article 261-7-1° b du CGI
        . Les frais de livraison sont indiqués en plus, avant la validation du paiement.
      </p>
      <p>Les offres sont valables dans la limite des stocks disponibles.</p>

      <h2>2. Commande</h2>
      <p>
        La commande est définitive une fois le paiement confirmé. Un email de confirmation récapitulant la commande est
        alors envoyé au client.
      </p>
      <p>
        Si un produit se révèle indisponible après la commande, ou en cas d’erreur manifeste sur le prix, le vendeur en
        informe le client par email et le rembourse des sommes correspondantes dans un délai de 14 jours.
      </p>

      <h2>3. Paiement</h2>
      <p>
        Le paiement s’effectue en ligne, au moment de la commande, par carte bancaire ou par les autres moyens proposés
        sur la page de paiement, via la plateforme sécurisée Stripe. Le vendeur n’a jamais accès aux données bancaires du
        client.
      </p>

      <h2>4. Livraison</h2>
      <p>
        <strong>Zone de livraison</strong> : France métropolitaine, Corse comprise.
      </p>
      <p>
        <strong>Modes de livraison</strong> : en point relais et/ou à domicile, selon les options proposées
        lors de la commande, via le transporteur choisi par l’intermédiaire de la plateforme Boxtal. Les frais de
        livraison sont indiqués avant le paiement.
      </p>
      <p>
        <strong>Délais</strong> : les commandes sont préparées sous{' '}
        3 à 5 jours ouvrés. Un email contenant le lien de suivi est envoyé au moment de
        l’expédition. Les délais de transport sont donnés à titre indicatif. À défaut d’autre date indiquée, la livraison
        intervient au plus tard 30 jours après la commande. En cas de retard, le client peut, après avoir demandé au
        vendeur de livrer dans un délai raisonnable, annuler la commande si la livraison n’a pas eu lieu dans ce délai, et
        être remboursé.
      </p>
      <p>
        <strong>Colis perdu ou endommagé</strong> : les risques de perte ou d’endommagement restent à la charge du
        vendeur jusqu’à ce que le client (ou la personne qu’il a désignée) prenne possession du colis. En cas de perte ou
        de détérioration pendant le transport, le vendeur procède, au choix du client, à un nouvel envoi ou au
        remboursement. En cas de colis endommagé, le client est invité à émettre des réserves auprès du transporteur ou du
        point relais et à prévenir le vendeur rapidement, photos à l’appui.
      </p>
      <p>
        <strong>Colis non retiré</strong> : en point relais, le colis est conservé pendant la durée fixée par le
        transporteur. S’il n’est pas retiré et revient au vendeur, celui-ci contacte le client pour lui proposer un
        nouvel envoi (frais de livraison à la charge du client) ou le remboursement des produits.
      </p>

      <h2>5. Droit de rétractation</h2>
      <p>
        <strong>Délai</strong> : le client dispose de 14 jours à compter de la réception de sa commande pour se
        rétracter, sans avoir à se justifier.
      </p>
      <p>
        <strong>Comment</strong> : en adressant au vendeur, avant l’expiration de ce délai, une déclaration claire de sa
        décision, par email à contact@instinctofficial.fr. Le client peut utiliser le formulaire type de rétractation
        figurant en annexe, sans que ce soit obligatoire.
      </p>
      <p>
        <strong>Retour des produits</strong> : le client renvoie les produits au plus tard 14 jours après avoir
        communiqué sa décision, à l’adresse suivante : 24 Boulevard des Girondins, 33380 Marcheprime, France. Les frais de retour sont à la
        charge du client.
      </p>
      <p>
        <strong>État des produits</strong> : le client peut manipuler les produits comme il le ferait en magasin, pour en
        vérifier la nature, les caractéristiques et le bon fonctionnement (essayer un vêtement, par exemple). Sa
        responsabilité peut être engagée en cas de dépréciation résultant d’autres manipulations (vêtement porté, lavé ou
        abîmé), et le remboursement réduit en conséquence.
      </p>
      <p>
        <strong>Remboursement</strong> : le vendeur rembourse la totalité des sommes versées, y compris les frais de
        livraison initiaux (dans la limite du tarif de livraison standard le moins cher proposé), au plus tard 14 jours à
        compter de la réception de la décision de rétractation. Il peut différer le remboursement jusqu’à la réception des
        produits ou jusqu’à ce que le client ait fourni une preuve de leur expédition, la date retenue étant celle du
        premier de ces faits. Le remboursement est effectué avec le même moyen de paiement que celui utilisé pour la
        commande.
      </p>
      <p>
        <strong>Exception</strong> : conformément à l’article L.221-28 du Code de la consommation, le droit de
        rétractation ne s’applique pas aux enregistrements audio ou vidéo (CD, vinyles, cassettes…) qui ont été descellés
        par le client après la livraison.
      </p>

      <h2>6. Garanties légales</h2>
      <p>
        Le vendeur est tenu de la garantie légale de conformité (articles L.217-3 et suivants du Code de la consommation)
        et de la garantie des vices cachés (articles 1641 et suivants du Code civil). En cas de produit défectueux ou non
        conforme, le client contacte le vendeur à contact@instinctofficial.fr.
      </p>
      <div className="space-y-2 border-l-2 border-instinct-purple/50 pl-4 text-sm">
        <p>
          <strong>Garantie légale de conformité</strong>
        </p>
        <p>
          Le consommateur dispose d’un délai de deux ans à compter de la délivrance du bien pour obtenir la mise en œuvre
          de la garantie légale de conformité en cas d’apparition d’un défaut de conformité. Durant ce délai, le
          consommateur n’est tenu d’établir que l’existence du défaut de conformité et non la date d’apparition de
          celui-ci.
        </p>
        <p>
          La garantie légale de conformité emporte obligation pour le professionnel, le cas échéant, de fournir toutes les
          mises à jour nécessaires au maintien de la conformité du bien.
        </p>
        <p>
          La garantie légale de conformité donne au consommateur droit à la réparation ou au remplacement du bien dans un
          délai de trente jours suivant sa demande, sans frais et sans inconvénient majeur pour lui.
        </p>
        <p>
          Si le bien est réparé dans le cadre de la garantie légale de conformité, le consommateur bénéficie d’une
          extension de six mois de la garantie initiale.
        </p>
        <p>
          Si le consommateur demande la réparation du bien, mais que le vendeur impose le remplacement, la garantie légale
          de conformité est renouvelée pour une période de deux ans à compter de la date de remplacement du bien.
        </p>
        <p>
          Le consommateur peut obtenir une réduction du prix d’achat en conservant le bien ou mettre fin au contrat en se
          faisant rembourser intégralement contre restitution du bien, si :
        </p>
        <ul>
          <li>1° Le professionnel refuse de réparer ou de remplacer le bien ;</li>
          <li>2° La réparation ou le remplacement du bien intervient après un délai de trente jours ;</li>
          <li>
            3° La réparation ou le remplacement du bien occasionne un inconvénient majeur pour le consommateur, notamment
            lorsque le consommateur supporte définitivement les frais de reprise ou d’enlèvement du bien non conforme, ou
            s’il supporte les frais d’installation du bien réparé ou de remplacement ;
          </li>
          <li>
            4° La non-conformité du bien persiste en dépit de la tentative de mise en conformité du vendeur restée
            infructueuse.
          </li>
        </ul>
        <p>
          Le consommateur a également droit à une réduction du prix du bien ou à la résolution du contrat lorsque le
          défaut de conformité est si grave qu’il justifie que la réduction du prix ou la résolution du contrat soit
          immédiate. Le consommateur n’est alors pas tenu de demander la réparation ou le remplacement du bien au
          préalable.
        </p>
        <p>Le consommateur n’a pas droit à la résolution de la vente si le défaut de conformité est mineur.</p>
        <p>
          Toute période d’immobilisation du bien en vue de sa réparation ou de son remplacement suspend la garantie qui
          restait à courir jusqu’à la délivrance du bien remis en état.
        </p>
        <p>
          Les droits mentionnés ci-dessus résultent de l’application des articles L. 217-1 à L. 217-32 du code de la
          consommation.
        </p>
        <p>
          Le vendeur qui fait obstacle de mauvaise foi à la mise en œuvre de la garantie légale de conformité encourt une
          amende civile d’un montant maximal de 300 000 euros, qui peut être porté jusqu’à 10 % du chiffre d’affaires
          moyen annuel (article L. 241-5 du code de la consommation).
        </p>
        <p>
          Le consommateur bénéficie également de la garantie légale des vices cachés en application des articles 1641 à
          1649 du code civil, pendant une durée de deux ans à compter de la découverte du défaut. Cette garantie donne
          droit à une réduction de prix si le bien est conservé ou à un remboursement intégral contre restitution du bien.
        </p>
      </div>

      <h2>7. Réclamations</h2>
      <p>
        Pour toute réclamation, le client écrit à contact@instinctofficial.fr.
      </p>

      <h2>8. Données personnelles</h2>
      <p>
        Les données collectées lors de la commande sont traitées conformément à la{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>9. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français.</p>

      <h2>Annexe : formulaire de rétractation</h2>
      <p>
        <em>(Veuillez compléter et renvoyer le présent formulaire uniquement si vous souhaitez vous rétracter du contrat.)</em>
      </p>
      <p>
        À l’attention de INSTINCT HARDCORE, 24 Boulevard des Girondins, 33380 Marcheprime, France, contact@instinctofficial.fr :
      </p>
      <p>
        Je/Nous (*) vous notifie/notifions (*) par la présente ma/notre (*) rétractation du contrat portant sur la vente du
        bien (*) ci-dessous :
      </p>
      <ul>
        <li>Commandé le (*) / reçu le (*) :</li>
        <li>Numéro de commande :</li>
        <li>Nom du (des) consommateur(s) :</li>
        <li>Adresse du (des) consommateur(s) :</li>
        <li>
          Signature du (des) consommateur(s) (uniquement en cas de notification du présent formulaire sur papier) :
        </li>
        <li>Date :</li>
      </ul>
      <p>(*) Rayez la mention inutile.</p>
    </LegalPage>
  );
}
