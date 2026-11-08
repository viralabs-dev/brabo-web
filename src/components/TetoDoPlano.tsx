import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Wallet } from 'lucide-react';
import { getProjectBudget, listAgentAreas, mensagemDaApi, setAreaBudget } from '../lib/api-client';
import { useCurrentWorkspaceWithRole } from '../lib/hooks';
import { roleAtLeast } from '../lib/roles';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../lib/query-policy';
import { microsParaUsd } from '../lib/currency';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { estimativaPassaDoTeto } from './TetoDoPlano.helpers';
import styles from './TetoDoPlano.module.css';

interface Props {
  projectId: string;
  /** O custo esperado do plano (teto por tarefa × tarefas), em micro-USD. */
  estimativaMicros: number;
}

/** As áreas que o plano do Dev Lead gasta (RN-1062). */
const AREAS_DO_PLANO = ['dev', 'qa'] as const;

/**
 * O teto do projeto e o das áreas dev/qa, ao lado do custo esperado do plano
 * (AT-808, RN-1062). Lê as mesmas chaves de cache de `ProjectSpendTab` e
 * `BudgetSection` (sem rota nova); o teto do projeto some para quem tem papel
 * abaixo de `maintainer` (a api devolve 403). O aviso NÃO trava o Aprovar: a
 * estimativa é teto por tarefa, não preço. Só o teto da área `dev` se ajusta
 * aqui; o do projeto tem política e fica em Configurações (RN-980).
 */
export function TetoDoPlano({ projectId, estimativaMicros }: Props) {
  const { t, i18n } = useTranslation('approvals');
  const queryClient = useQueryClient();
  const dolar = new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD' });
  const usd = (micros: number) => dolar.format(microsParaUsd(micros));

  const orcamento = useQuery({
    queryKey: ['budget', projectId],
    queryFn: () => getProjectBudget(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
    retry: false,
  });
  const areas = useQuery({
    queryKey: ['agent-areas', projectId],
    queryFn: () => listAgentAreas(projectId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
    retry: false,
  });
  const { data: workspace } = useCurrentWorkspaceWithRole();
  const podeAjustar = roleAtLeast(workspace?.role, 'maintainer');

  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const projeto = orcamento.isSuccess ? orcamento.data : undefined;
  const areaDev = areas.data?.find((a) => a.key === 'dev');

  const partes: string[] = [];
  if (orcamento.isSuccess) {
    partes.push(
      projeto
        ? t('approvalCard.plan.teto.projeto', { limite: usd(projeto.limitMicros), gasto: usd(projeto.spentMicros) })
        : t('approvalCard.plan.teto.semTeto', { quem: t('approvalCard.plan.teto.quemProjeto') }),
    );
  }
  for (const key of AREAS_DO_PLANO) {
    const area = areas.data?.find((a) => a.key === key);
    if (!area) continue;
    partes.push(
      area.budgetMicros === null
        ? t('approvalCard.plan.teto.semTeto', { quem: key })
        : t('approvalCard.plan.teto.area', { area: key, limite: usd(area.budgetMicros), gasto: usd(area.spentMicros) }),
    );
  }
  if (partes.length === 0) return null;

  const acima = estimativaPassaDoTeto(estimativaMicros, projeto, areaDev);

  function abrir() {
    setTexto(areaDev && areaDev.budgetMicros !== null ? String(microsParaUsd(areaDev.budgetMicros)) : '');
    setErro(null);
    setEditando(true);
  }

  async function salvar() {
    // Vazio é "sem teto", a mesma leitura da `BudgetSection`.
    const numero = texto.trim() === '' ? null : Number(texto);
    if (numero !== null && (!Number.isFinite(numero) || numero < 0)) {
      setErro(t('approvalCard.plan.teto.invalido'));
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      await setAreaBudget(projectId, 'dev', numero);
      await queryClient.invalidateQueries({ queryKey: ['agent-areas', projectId] });
      setEditando(false);
    } catch (e) {
      setErro(mensagemDaApi(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className={styles.teto}>
      <p className={styles.linha} data-testid="teto-do-plano">
        <span>{t('approvalCard.plan.teto.linha', { partes: partes.join(' · ') })}</span>
        {areaDev && !editando && (
          <Button variant="secondary" disabled={!podeAjustar} onClick={abrir}>
            <Wallet aria-hidden="true" />
            {t('approvalCard.plan.teto.ajustar')}
          </Button>
        )}
        <a
          href={`/projects/${projectId}?section=budget`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('approvalCard.plan.teto.outros')}
        </a>
      </p>
      {areaDev && !podeAjustar && (
        <span className={styles.nota} data-testid="teto-sem-papel">
          {t('approvalCard.plan.teto.semPapel')}
        </span>
      )}
      {editando && (
        <div className={styles.ajuste} data-testid="teto-ajuste">
          <div className={styles.campo}>
            <Input
              mono
              type="number"
              min={0}
              step="any"
              placeholder={t('approvalCard.plan.teto.placeholder')}
              aria-label={t('approvalCard.plan.teto.campo')}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <Button loading={salvando} onClick={() => void salvar()}>
            {t('approvalCard.plan.teto.salvar')}
          </Button>
          <Button variant="secondary" disabled={salvando} onClick={() => setEditando(false)}>
            {t('approvalCard.plan.teto.cancelar')}
          </Button>
          {erro && (
            <span className={styles.erro} role="alert">
              {erro}
            </span>
          )}
        </div>
      )}
      {acima && (
        <Alert tone="warning" role="status">
          <span data-testid="estimativa-acima-do-teto">
            {t('approvalCard.plan.teto.aviso', {
              estimativa: usd(estimativaMicros),
              onde:
                acima.onde === 'projeto'
                  ? t('approvalCard.plan.teto.ondeProjeto')
                  : t('approvalCard.plan.teto.ondeArea', { area: 'dev' }),
              resta: usd(acima.restaMicros),
            })}
          </span>
        </Alert>
      )}
    </div>
  );
}
