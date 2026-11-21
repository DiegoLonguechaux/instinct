import { LegalPage, Todo } from '@/components/shop/LegalPage';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mentions légales | INSTINCT' };

export default function Page() {
  return (
    <LegalPage title="Mentions légales" updatedAt="à compléter">
      <h2>Éditeur du site</h2>
      <p>
        Le site est édité par <Todo>nom de l’association ou de la structure, forme juridique</Todo>, dont le siège est situé{' '}
        <Todo>adresse complète</Todo>.
      </p>
      <p>
        Numéro SIRET : <Todo>numéro SIRET</Todo>. Directeur de la publication : <Todo>nom et prénom</Todo>.
      </p>
      <p>Contact : <Todo>adresse email de contact</Todo>.</p>

      <h2>Hébergement</h2>
      <p>
        Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis. Les données sont
        stockées dans une base MongoDB hébergée par <Todo>hébergeur de la base de données et région</Todo>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble des contenus du site (textes, photographies, visuels, logo, musiques) est la propriété du groupe ou
        utilisé avec autorisation. Toute reproduction sans accord écrit préalable est interdite.
      </p>
    </LegalPage>
  );
}
