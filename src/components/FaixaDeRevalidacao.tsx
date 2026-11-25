import { useSyncExternalStore } from 'react';
import { useQueryClient, type Query } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../lib/api-client';
import { Button } from './ui/Button';
import styles from './FaixaDeRevalidacao.module.css';

/**
 * Faixa de uma linha no topo da página do projeto quando a revalidação falhou
 * mas há dado em cache: a tela MANTÉM o dado e diz que ele pode estar velho
 * (AT-965, RN-088). Lê só o cache do TanStack Query, sem requisição nova;
 * "Tentar agora" refaz exatamente as consultas que falharam.
 *
 * Sem contagem regressiva: o cliente não sabe quando a próxima tentativa roda,
 * e a tela não afirma o que não leu (EP-020).
 */
function falhouComDado(q: Query, projectId: string) {
  return q.state.status === 'error' && q.state.data !== undefined && q.queryKey.includes(projectId);
}

export function FaixaDeRevalidacao({ projectId }: { projectId: string }) {
  const { t } = useTranslation('ui');
  const qc = useQueryClient();
  // Snapshot estável (string): "<quantas>:<alguma 429>".
  const estado = useSyncExternalStore(
    (aoMudar) => qc.getQueryCache().subscribe(aoMudar),
    () => {
      const falhas = qc.getQueryCache().findAll({ predicate: (q) => falhouComDado(q, projectId) });
      const limite = falhas.some((q) => q.state.error instanceof ApiError && q.state.error.status === 429);
      return `${falhas.length}:${limite}`;
    },
  );
  const [qtd, limite] = estado.split(':');
  if (qtd === '0') return null;
  return (
    <div className={styles.faixa} role="status" data-testid="faixa-de-revalidacao">
      <span>{limite === 'true' ? t('erroDeCarregamento.faixa429') : t('erroDeCarregamento.faixaGenerica')}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => void qc.refetchQueries({ predicate: (q) => falhouComDado(q, projectId) })}
      >
        {t('erroDeCarregamento.tentarAgora')}
      </Button>
    </div>
  );
}
