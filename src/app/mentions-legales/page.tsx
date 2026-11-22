import { LegalPage } from '@/components/shop/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mentions légales | INSTINCT' };

export default function Page() {
  return (
    <LegalPage title="Mentions légales" updatedAt="22 novembre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site instinctofficial.fr est édité par <strong>INSTINCT HARDCORE</strong>, association
        régie par la loi du 1er juillet 1901, déclarée sous le numéro RNA W336008118, SIRET{' '}
        99037440700015.
      </p>
      <p>
        Siège : 24 Boulevard des Girondins, 33380 Marcheprime, France
        <br />
        Email : contact@instinctofficial.fr
        <br />
        Téléphone : 06 59 77 82 58
      </p>
      <p>
        Directeur de la publication : Diego Longuechaux
      </p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France – Téléphone :{' '}
        09 72 10 10 07.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus du site (textes, photographies, visuels, logos, musiques) est la propriété de
        l’association INSTINCT HARDCORE ou de leurs auteurs respectifs, et est utilisé avec leur autorisation. Toute
        reproduction ou représentation, même partielle, sans accord écrit préalable est interdite.
      </p>

      <h2>Liens utiles</h2>
      <p>
        <a href="/cgv">Conditions générales de vente</a> – <a href="/confidentialite">Politique de confidentialité</a>
      </p>
    </LegalPage>
  );
}
