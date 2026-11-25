import { Shimmer } from '../../components/ui/Shimmer';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RotateCcw } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getCodeDiff,
  getCodePullRequests,
  isContainerImageGateError,
  mensagemDaApi,
} from '../../lib/api-client';
import {
  ContainerImageGateNotice,
  type SuperficieDoPortao,
} from '../../components/ContainerImageGate';
import { Input } from '@/components/shadcn/input';
import { Button as BotaoDoKit } from '@/components/shadcn/button';
import { Badge as SeloDoKit } from '@/components/shadcn/badge';
import { Disclosure } from '../../components/ui/Disclosure';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { PrIcon } from '../../components/ui/icons';
import type { CodeDiffFile, CodePullRequestState, CodePullRequestSummary } from '../../lib/api-types';
import styles from './CodeDiffPanel.module.css';

const CHAVE_STATUS: Record<CodeDiffFile['status'], string> = {
  added: 'diff.fileStatus.added',
  modified: 'diff.fileStatus.modified',
  removed: 'diff.fileStatus.removed',
  renamed: 'diff.fileStatus.renamed',
};

const CHAVE_ESTADO_PR: Record<CodePullRequestState, string> = {
  open: 'diff.prState.open',
  merged: 'diff.prState.merged',
  closed: 'diff.prState.closed',
};

const FILTROS: Array<{ chave: CodePullRequestState | 'all'; chaveRotulo: string }> = [
  { chave: 'open', chaveRotulo: 'diff.filters.open' },
  { chave: 'merged', chaveRotulo: 'diff.filters.merged' },
  { chave: 'closed', chaveRotulo: 'diff.filters.closed' },
  { chave: 'all', chaveRotulo: 'diff.filters.all' },
];

export interface PrListAndDiffProps {
  projectId: string;
  /**
   * Conteúdo extra por ITEM da lista — o botão "Merge" e o card de decisão
   * inline que a aba PRs (Onda 2) precisa. `undefined` mantém este
   * componente pixel a pixel igual ao que `CodeDiffPanel` (o painel inferior
   * da aba Código) sempre mostrou: SEM merge, sem cruzamento com
   * `proposed_action`, só listagem + diff.
   *
   * Renderizado como IRMÃO do botão que abre o diff, nunca dentro dele — um
   * `<button>` de Merge aninhado no `<button>` da linha seria HTML inválido
   * (e um clique nele também dispararia o clique da linha).
   */
  renderItemExtra?: (pr: CodePullRequestSummary) => ReactNode;
  /** Os portões da PR em linha (AT-971, RN-1474), entre o título e o selo de estado. */
  renderItemPortoes?: (pr: CodePullRequestSummary) => ReactNode;
  /** Uma frase sob o título (o motivo do bloqueio, em cor de erro). `null` não ocupa linha. */
  renderItemMotivo?: (pr: CodePullRequestSummary) => ReactNode;
  /** As próximas ações do vazio (AT-895): só a aba PRs as passa; Código segue igual. */
  vazioExtra?: ReactNode;
  /**
   * De qual aba este componente é consumido — decide o TEXTO do bloqueio do
   * portão da imagem (AT-323, RN-646). Ausente é a aba Código, o
   * comportamento de sempre; a aba PRs passa `'prs'`.
   */
  superficie?: SuperficieDoPortao;
}

/**
 * Lista navegável de PRs (FASE seguinte à 26b) por cima do diff já
 * existente. `GET /projects/:id/code/pull-requests` via `getCodePullRequests`
 * resolve id/título/autor/estado/branches; clicar num item abre o mesmo fluxo
 * de diff por ID que já funcionava (`getCodeDiff`). Quem já sabe o id (ex.:
 * veio de Aprovações) pode colar direto, sem passar pela lista.
 *
 * Extraído de `CodeDiffPanel.tsx` (Onda 2 do programa de abas agrupadas):
 * este é o componente com a lógica de verdade; `CodeDiffPanel` virou um
 * wrapper fino no mesmo lugar de sempre (painel inferior da aba Código), e a
 * aba PRs nova o consome com `renderItemExtra` para o botão de merge.
 *
 * ## O gate do container (RN-105) não é erro transitório (achado de uso)
 *
 * `getCodePullRequests`/`getCodeDiff` passam pelo MESMO funil que a árvore e
 * o arquivo (`ReadProjectCodeUseCase.alvo`) e por isso podem devolver o
 * mesmo 409 enquanto o Arquiteto não decide a imagem do container — mas,
 * diferente da aba Code (que PERGUNTA antes, em `ProjectCodeTab.tsx`), este
 * componente também é consumido de dentro da aba PRs (project-wide,
 * sem gate pré-checado) e portanto só descobre o bloqueio quando a query
 * já falhou. `isContainerImageGateError` (`lib/api-client.ts`) distingue
 * esse 409 de um erro de verdade e troca o banner genérico de "Tentar de
 * novo" pela MESMA apresentação que a aba Code usa
 * (`ContainerImageGateNotice`) — retentativa é a afordância errada para um
 * estado que só se resolve quando o Arquiteto decide, nunca clicando de
 * novo.
 */
export function PrListAndDiff({
  projectId,
  renderItemExtra,
  renderItemPortoes,
  renderItemMotivo,
  vazioExtra,
  superficie = 'code',
}: PrListAndDiffProps) {
  const { t } = useTranslation('code');
  const [filtro, setFiltro] = useState<CodePullRequestState | 'all'>('open');
  // O campo é a busca da lista (AT-971, RN-1474); Enter sem PR que combine abre o diff pelo id digitado.
  const [busca, setBusca] = useState('');
  const [selecionada, setSelecionada] = useState<CodePullRequestSummary | null>(null);
  const [prIdManual, setPrIdManual] = useState<string | null>(null);

  const prId = selecionada?.id ?? prIdManual;

  const listaQuery = useQuery({
    queryKey: ['code-pull-requests', projectId, filtro],
    queryFn: () => getCodePullRequests(projectId, filtro === 'all' ? {} : { state: filtro }),
    enabled: !prId,
  });

  const termo = busca.trim().replace(/^#/, '').toLowerCase();
  const itens = (listaQuery.data?.items ?? []).filter(
    (pr) =>
      !termo ||
      [String(pr.number), pr.title, pr.sourceBranch, pr.author ?? ''].some((c) => c.toLowerCase().includes(termo)),
  );

  const diffQuery = useQuery({
    queryKey: ['code-diff', projectId, prId],
    queryFn: () => getCodeDiff(projectId, prId!),
    enabled: Boolean(prId),
  });

  function voltarParaLista() {
    setSelecionada(null);
    setPrIdManual(null);
    setBusca('');
  }

  if (prId) {
    return (
      <div className={styles.painel}>
        <div className={styles.cabecalhoDiff}>
          <Button type="button" variant="ghost" legenda={t('diff.backToList')} onClick={voltarParaLista}>
            <ArrowLeft aria-hidden="true" />
          </Button>
          {selecionada && (
            <span className={styles.tituloDiff}>
              <span className={styles.tituloDiffTexto}>
                #{selecionada.number} {selecionada.title}
              </span>
              <span className={styles.branches}>
                {selecionada.sourceBranch} → {selecionada.targetBranch}
              </span>
            </span>
          )}
        </div>

        {diffQuery.isLoading && <div className={styles.estado}><Shimmer>{t('diff.loadingDiff')}</Shimmer></div>}

        {diffQuery.isError &&
          (isContainerImageGateError(diffQuery.error) ? (
            <ContainerImageGateNotice superficie={superficie} />
          ) : (
            <div className={styles.estadoErro} role="alert">
              <span>{mensagemDaApi(diffQuery.error, t('diff.diffErrorFallback'))}</span>
              <Button type="button" variant="secondary" size="sm" legenda={t('shared.retry')} onClick={() => void diffQuery.refetch()}>
<RotateCcw aria-hidden="true" />
</Button>
            </div>
          ))}

        {diffQuery.data && diffQuery.data.files.length === 0 && (
          <div className={styles.estado}>{t('diff.noFiles')}</div>
        )}

        {diffQuery.data && diffQuery.data.files.length > 0 && (
          <div className={styles.lista}>
            {diffQuery.data.files.map((arquivo) => (
              <Disclosure
                key={`${arquivo.path}:${arquivo.status}`}
                titulo={
                  <span className={styles.tituloArquivo}>
                    <span className={styles.caminho}>{arquivo.path}</span>
                    <SeloDoKit variant="outline" className={styles.selo}>{t(CHAVE_STATUS[arquivo.status])}</SeloDoKit>
                  </span>
                }
                trailing={
                  <span className={styles.contadores}>
                    <span className={styles.add}>+{arquivo.additions}</span>{' '}
                    <span className={styles.del}>−{arquivo.deletions}</span>
                  </span>
                }
              >
                <ConteudoDoPatch arquivo={arquivo} />
              </Disclosure>
            ))}
            {diffQuery.data.truncated && (
              <div className={styles.truncado}>{t('diff.truncatedFiles')}</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.painel}>
      {/* AT-327: o mesmo controle segmentado das abas Criativo e Chat. Antes
          eram abas retangulares com `role="tab"` sem painel que controlassem. */}
      <div className={styles.barra}>
        <SegmentedControl
          className={styles.filtros}
          rotulo={t('diff.filtersAriaLabel')}
          opcoes={FILTROS.map((f) => ({ valor: f.chave, rotulo: t(f.chaveRotulo) }))}
          valor={filtro}
          onChange={setFiltro}
        />
        <form
          className={styles.busca}
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            if (busca.trim() && itens.length === 0) setPrIdManual(busca.trim().replace(/^#/, ''));
          }}
        >
          <Input
            id="diff-pr-busca"
            data-mono=""
            className={styles.input}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            aria-label={t('diff.searchLabel')}
            placeholder={t('diff.searchPlaceholder')}
          />
        </form>
      </div>

      {listaQuery.isLoading && <div className={styles.estado}><Shimmer>{t('diff.loadingPrs')}</Shimmer></div>}

      {listaQuery.isError &&
        (isContainerImageGateError(listaQuery.error) ? (
          <ContainerImageGateNotice superficie={superficie} />
        ) : (
          <div className={styles.estadoErro} role="alert">
            <span>{mensagemDaApi(listaQuery.error, t('diff.prListErrorFallback'))}</span>
            <Button type="button" variant="secondary" size="sm" legenda={t('shared.retry')} onClick={() => void listaQuery.refetch()}>
<RotateCcw aria-hidden="true" />
</Button>
          </div>
        ))}

      {listaQuery.data && listaQuery.data.items.length > 0 && itens.length === 0 && (
        <div className={styles.estado}>{t('diff.noPrsMatchSearch', { query: busca.trim() })}</div>
      )}

      {listaQuery.data && listaQuery.data.items.length === 0 && (
        <div className={styles.estado}>
          {filtro !== 'all'
            ? t('diff.noPrsWithState', { state: t(CHAVE_ESTADO_PR[filtro]) })
            : t('diff.noPrsAny')}
          {vazioExtra}
        </div>
      )}

      {itens.length > 0 && (
        <ul className={styles.listaPr}>
          {itens.map((pr) => (
            <li key={pr.id}>
              <div className={styles.itemPrLinha}>
                <BotaoDoKit
                  type="button"
                  variant="ghost"
                  className={styles.itemPr}
                  aria-label={t('diff.openPrAriaLabel', { number: pr.number, title: pr.title })}
                  onClick={() => setSelecionada(pr)}
                >
                  <PrIcon size={15} className={styles[`estadoIcone_${pr.state}`]} />
                  <span className={styles.itemPrCorpo}>
                    <span className={styles.itemPrTitulo}>
                      <span className={styles.itemPrNumero}>#{pr.number}</span> {pr.title}
                    </span>
                    <span className={styles.itemPrMeta}>
                      {pr.author ?? t('diff.unknownAuthor')} · {pr.sourceBranch} → {pr.targetBranch}
                      {pr.updatedAt && ` · ${new Date(pr.updatedAt).toLocaleDateString('pt-BR')}`}
                    </span>
                  </span>
                </BotaoDoKit>
                {renderItemPortoes?.(pr)}
                <SeloDoKit variant="outline" className={[styles.itemPrEstado, styles[`estadoSelo_${pr.state}`]].join(' ')}>
                  {t(CHAVE_ESTADO_PR[pr.state])}
                </SeloDoKit>
                <div className={styles.itemPrExtra}>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setSelecionada(pr)}>
                    {t('diff.viewDiff')}
                  </Button>
                  {renderItemExtra?.(pr)}
                </div>
              </div>
              {renderItemMotivo?.(pr)}
            </li>
          ))}
        </ul>
      )}

      {listaQuery.data?.truncated && (
        <div className={styles.truncado}>{t('diff.truncatedList')}</div>
      )}

    </div>
  );
}

function ConteudoDoPatch({ arquivo }: { arquivo: CodeDiffFile }) {
  const { t } = useTranslation('code');
  // `null` é "o provider não entregou o texto" (binário, ou patch grande
  // demais) — distinto de `''`, que é "veio vazio" de verdade. Tratar os
  // dois igual faria a tela dizer "sem mudanças" num binário alterado.
  if (arquivo.patch === null) {
    return <div className={styles.semTexto}>{t('diff.noPatchText')}</div>;
  }
  if (arquivo.patch === '') {
    return <div className={styles.semTexto}>{t('diff.emptyPatchText')}</div>;
  }
  return (
    <pre className={styles.patch}>
      {arquivo.patch.split('\n').map((linha, i) => (
        <div
          key={i}
          className={[
            styles.linhaPatch,
            linha.startsWith('+') && !linha.startsWith('+++') && styles.linhaAdd,
            linha.startsWith('-') && !linha.startsWith('---') && styles.linhaDel,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {linha || ' '}
        </div>
      ))}
    </pre>
  );
}
