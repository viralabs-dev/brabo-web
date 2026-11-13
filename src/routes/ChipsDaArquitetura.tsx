import { useTranslation } from 'react-i18next';
import { useArchitecture } from '../lib/hooks';
import { Badge } from '../components/ui/Badge';
import styles from './ProjectArchitectureTab.module.css';

// Arquivo à parte: a moldura importa estático, e a aba da Arquitetura é lazy (project-tabs.ts).
/** Chips do cabeçalho (v9, P16): mesma chave de `useArchitecture` da aba, então o cache é um só. */
export function ChipsDaArquitetura({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation('overview');
  const { data } = useArchitecture(projectId);
  const mapa = data?.moduleMap;
  return (
    <span className={styles.chips}>
      {mapa && (
        <Badge square size="md">
          {t('architectureTab.header.modules', { version: mapa.version })}
        </Badge>
      )}
      {data?.c4Diagram.status === 'gerado' && (
        <Badge square size="md">
          {t('architectureTab.header.c4')}
        </Badge>
      )}
      {mapa && (
        <span>
          {t('architectureTab.header.byArchitect', {
            hora: new Date(mapa.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' }),
          })}
        </span>
      )}
    </span>
  );
}
