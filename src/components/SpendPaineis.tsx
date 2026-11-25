import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { Bot, Coins, Cpu, Folder, MessageSquare, Phone, RotateCcw, Server, User, Wallet } from 'lucide-react';
import { Button } from './ui/Button';
import { BotaoLink } from './ui/BotaoLink';
import { useQuery } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import {
  getMyWorkspaceSpend,
  getProjectSpendTeam,
  getProjectsSummary,
  getWorkspaceSpendReport,
  listModelCatalog,
  listProjects,
} from '../lib/api-client';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../lib/query-policy';
import { numberFmt } from '../lib/currency';
import {
  abreviarTokens,
  custoMedioPorChamada,
  diasDoMesUtc,
  janelaDesdeOInicio,
  linhasParaCsv,
  primeiroDiaComGasto,
  diaCurto,
  rotuloDoAtor,
  type SpendPorDia,
} from '../lib/spend';
import { comoRanking, rotuloDoProvider } from '../lib/spend-ranking';
import { AGENTS, type AgentKey } from '../lib/agents';
import { SegmentedControl } from './ui/SegmentedControl';
import { Shimmer } from './ui/Shimmer';
import { GastoPorDia, GastoPorDiaEAgente } from './GastoPorDia';
import { Ranking } from './SpendCharts';
import { useRotuloDaSessao } from '../lib/use-rotulo-da-sessao';
import { CabecalhoDePagina } from './shadcn/cabecalho-de-pagina';
import { SectionCards } from './shadcn/section-cards';
import { CredentialSpendSection } from './CredentialSpendSection';
import { formatarCustoMedio, formatarUsd } from './CredentialSpendSection.helpers';
import styles from '../routes/ProjectSpendTab.module.css';

export function SeletorDeJanela({
  dias,
  onChange,
  inicio,
  desdeInicio,
}: {
  dias: number;
  onChange: (dias: number, desdeInicio?: boolean) => void;
  /** Dias de vida do gasto quando ele tem menos de 30: ganha "Desde o início · N dias" (AT-973). */
  inicio?: number | null;
  desdeInicio?: boolean;
}) {
  const { t } = useTranslation('spend');
  // "Mês" = dias do mês corrente em UTC; se coincidir com 7 ou 30, a opção já existe.
  const mes = diasDoMesUtc();
  const opcoes = [
    { valor: '7', rotulo: t('window.option', { n: 7 }) },
    { valor: '30', rotulo: t('window.option', { n: 30 }) },
    ...(mes === 7 || mes === 30 ? [] : [{ valor: String(mes), rotulo: t('window.month') }]),
    ...(inicio ? [{ valor: 'inicio', rotulo: t('window.sinceStart', { n: inicio }) }] : []),
  ];
  return (
    <SegmentedControl
      rotulo={t('window.label')}
      opcoes={opcoes}
      valor={desdeInicio ? 'inicio' : String(dias)}
      onChange={(v) => (v === 'inicio' && inicio ? onChange(inicio, true) : onChange(Number(v)))}
    />
  );
}

/**
 * Modelos marcados `subscription` (nome → verdadeiro). Lê o catálogo do
 * workspace, que o owner já alcança; erro ou carga = sem marca, e a linha
 * volta ao US$ (nunca inventa "assinatura").
 */
function useModelosDeAssinatura(workspaceId: string | undefined) {
  const catalogo = useQuery({
    queryKey: ['model-catalog', workspaceId],
    queryFn: () => listModelCatalog(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const nomes = new Set<string>();
  for (const porProvider of Object.values(catalogo.data ?? {})) {
    for (const modelos of Object.values(porProvider)) {
      for (const m of modelos) if (m.billing === 'subscription') nomes.add(m.name);
    }
  }
  return nomes;
}

/** Exporta a série por dia que a tela já tem, no cliente. */
function ExportarCsv({ serie }: { serie: SpendPorDia[] }) {
  const { t } = useTranslation('spend');
  const baixar = () => {
    const csv = linhasParaCsv(
      ['dia', 'costMicros', 'chamadas'],
      serie.map((d) => [d.dia, d.costMicros, d.chamadas]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gastos.csv';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button variant="secondary" onClick={baixar}>
      {t('shared.exportCsv')}
    </Button>
  );
}

function Estado({
  q,
  carregando,
  erro,
}: {
  q: { isLoading: boolean; isError: boolean; refetch: () => unknown };
  carregando: string;
  erro: string;
}) {
  const { t } = useTranslation('spend');
  return (
    <>
      {q.isLoading && (
        <div className={styles.estado}>
          <Shimmer>{carregando}</Shimmer>
        </div>
      )}
      {q.isError && (
        <div className={styles.estadoErro} role="alert">
          <span>{erro}</span>
          <Button variant="ghost" legenda={t('shared.retry')} onClick={() => void q.refetch()}>
            <RotateCcw aria-hidden="true" />
          </Button>
        </div>
      )}
    </>
  );
}

/** "12,3 mi entrada · 4,1 mi saída", com os inteiros no `title` (RN-1451). */
export function DetalheDeTokens({ entrada, saida }: { entrada: number; saida: number }) {
  const { t } = useTranslation('spend');
  return (
    <span
      title={t('shared.tokensDetail', { input: numberFmt.format(entrada), output: numberFmt.format(saida) })}
    >
      {t('shared.tokensDetail', { input: abreviarTokens(entrada), output: abreviarTokens(saida) })}
    </span>
  );
}

function DestaquesDoTotal({
  total,
  assinatura,
  chamadas,
  entrada,
  saida,
  rotuloTotal,
  modelo,
  desde,
  modeloDeChamadas,
}: {
  total: number;
  assinatura?: number;
  chamadas: number;
  entrada: number;
  saida: number;
  rotuloTotal: string;
  /** Modelo de maior gasto, quando o relatório o traz. */
  modelo?: string;
  /** Primeiro dia com gasto (`YYYY-MM-DD`), da série densa; sem ele, o Total fica sem nota. */
  desde?: string | null;
  /** Modelo com mais chamadas e a fatia, só quando a aba já leu o gasto por modelo. */
  modeloDeChamadas?: { modelo: string; pct: number } | null;
}) {
  const { t } = useTranslation('spend');
  const media = custoMedioPorChamada(total, chamadas);
  return (
    <SectionCards
      metricas={[
        {
          icone: <Wallet aria-hidden="true" size={12} />,
          rotulo: rotuloTotal,
          valor: formatarUsd(total),
          nota: desde ? t('shared.sinceDay', { dia: diaCurto(desde) }) : undefined,
        },
        {
          icone: <Phone aria-hidden="true" size={12} />,
          rotulo: t('shared.callsLabel'),
          valor: numberFmt.format(chamadas),
          nota: modeloDeChamadas
            ? t('shared.topModelCalls', { modelo: modeloDeChamadas.modelo, pct: modeloDeChamadas.pct })
            : undefined,
        },
        {
          icone: <Coins aria-hidden="true" size={12} />,
          rotulo: t('workspace.tokensLabel'),
          valor: <span title={numberFmt.format(entrada + saida)}>{abreviarTokens(entrada + saida)}</span>,
          nota: <DetalheDeTokens entrada={entrada} saida={saida} />,
        },
        {
          rotulo: t('shared.avgCallLabel'),
          valor: media === null ? '—' : formatarCustoMedio(media),
          nota: modelo,
        },
        ...((assinatura ?? 0) > 0
          ? [
              {
                rotulo: t('subscription.label'),
                valor: formatarUsd(assinatura!),
                nota: t('subscription.detail'),
              },
            ]
          : []),
      ]}
    />
  );
}

/** O modelo com mais chamadas e a sua fatia (%); `null` sem leitura por modelo. */
function modeloDeChamadas(linhas: { chave: string; chamadas: number }[], total: number) {
  const topo = [...linhas].sort((a, b) => b.chamadas - a.chamadas)[0];
  return topo && total > 0 ? { modelo: topo.chave, pct: Math.round((topo.chamadas / total) * 100) } : null;
}

/**
 * A audiência do OWNER. Sem `projectId` é o workspace inteiro (página global);
 * com ele, só aquele projeto (aba do projeto) e a quebra por sessão.
 */
export function GastoDoWorkspace({
  workspaceId,
  projectId,
  teto,
}: {
  workspaceId: string | undefined;
  projectId?: string;
  /** O cartão do teto do mês, à direita dos indicadores (AT-973). */
  teto?: ReactNode;
}) {
  const { t } = useTranslation('spend');
  // Padrão "Desde o início" quando o gasto tem menos de 30 dias; senão, 30.
  const [escolha, setEscolha] = useState<number | 'inicio'>('inicio');
  const consulta = escolha === 'inicio' ? 30 : escolha;
  const buscar = (d: number) => ({
    queryKey: projectId
      ? ['workspace-spend', workspaceId, d, projectId]
      : ['workspace-spend', workspaceId, d],
    queryFn: () => getWorkspaceSpendReport(workspaceId!, d, projectId),
    enabled: Boolean(workspaceId),
  });
  const base = useQuery(buscar(30));
  const outra = useQuery({ ...buscar(consulta), enabled: Boolean(workspaceId) && consulta !== 30 });
  const relatorio = consulta === 30 ? base : outra;
  const inicio = janelaDesdeOInicio(base.data?.porDia ?? []);
  const desdeInicio = escolha === 'inicio' && inicio !== null;
  const dias = desdeInicio ? inicio : consulta;
  // O eixo começa no primeiro dia com gasto: a série densa de 30 dias perde o prefixo vazio.
  const r =
    relatorio.data && desdeInicio
      ? { ...relatorio.data, porDia: relatorio.data.porDia.slice(-dias) }
      : relatorio.data;
  const assinaturas = useModelosDeAssinatura(workspaceId);
  const rotuloDaSessaoNoRanking = useRotuloDaSessao(projectId);

  return (
    <>
      <CabecalhoDePagina
        nivel="h2"
        titulo={projectId ? t('project.ownerTitle') : t('workspace.title')}
        descricao={projectId ? (
            t('project.ownerSubtitle', { dias })
          ) : (
            <Trans
              i18nKey="workspace.subtitle"
              ns="spend"
              values={{ dias }}
              components={{ strong: <strong /> }}
            />
          )}
        acoes={
          <>
            <SeletorDeJanela
              dias={dias}
              inicio={inicio}
              desdeInicio={desdeInicio}
              onChange={(d, i) => setEscolha(i ? 'inicio' : d)}
            />
            {r && <ExportarCsv serie={r.porDia} />}
          </>
        }
      />

      <Estado
        q={relatorio}
        carregando={t('shared.summing')}
        erro={t('workspace.error')}
      />

      {r && (
        <DestaquesDoTotal
          total={r.totalMicros}
          assinatura={r.assinaturaMicros}
          chamadas={r.chamadas}
          entrada={r.inputTokens}
          saida={r.outputTokens}
          rotuloTotal={t('workspace.totalLabel', { dias })}
          modelo={r.porModelo[0]?.chave}
          desde={primeiroDiaComGasto(base.data?.porDia ?? [])}
          modeloDeChamadas={modeloDeChamadas(r.porModelo, r.chamadas)}
        />
      )}

      {/* O teto é o destino de `?tab=spend#teto`: fica numa posição estável (não
          remonta quando o relatório chega) e não some se ele falhar. O gráfico
          ocupa a coluna ao lado dele (AT-1005, L08); sem teto, o gráfico é a faixa. */}
      {(teto || r) && (
        <div className={teto ? styles.comTeto : styles.faixa}>
          <div className={styles.colunaDosIndicadores}>
            {r && (
              <GastoPorDiaEAgente linhas={r.porDiaEAgente ?? []} dias={dias} titulo={t('workspace.dailySpendTitle')} />
            )}
          </div>
          {teto}
        </div>
      )}

      {r && (
        <>
          {r.totalMicros === 0 && r.chamadas === 0 ? (
            <p className={styles.nota}>{t('workspace.whereEmpty')}</p>
          ) : (
          <div className={styles.grade}>
            <Ranking
              icone={<Cpu aria-hidden="true" size={12} />}
titulo={t('workspace.byModelTitle')}
              linhas={comoRanking(r.porModelo, (l) => l.chave, t, assinaturas)}
              vazio={t('workspace.byModelEmpty')}
            />
            <Ranking
              icone={<Server aria-hidden="true" size={12} />}
titulo={t('workspace.byProviderTitle')}
              linhas={comoRanking(r.porProvider, rotuloDoProvider, t)}
              vazio={t('workspace.byProviderEmpty')}
            />
            {projectId ? (
              <Ranking
                icone={<MessageSquare aria-hidden="true" size={12} />}
titulo={t('project.bySessionTitle')}
                linhas={comoRanking(r.porSessao ?? [], (l) => rotuloDaSessaoNoRanking(l.chave), t)}
                vazio={t('project.bySessionEmpty')}
              />
            ) : (
              <Ranking
                icone={<Folder aria-hidden="true" size={12} />}
titulo={t('workspace.byProjectTitle')}
                linhas={comoRanking(r.porProjeto, (l) => l.rotulo ?? l.chave, t).map((l) => ({
                  ...l,
                  rotuloNo: (
                    <Link to="/projects/$projectId" params={{ projectId: l.chave }} search={{ tab: 'spend' }}>
                      {l.rotulo}
                    </Link>
                  ),
                }))}
                vazio={t('workspace.byProjectEmpty')}
              />
            )}
            <Ranking
              icone={<User aria-hidden="true" size={12} />}
titulo={t('workspace.byActorTitle')}
              linhas={comoRanking(r.porAtor, rotuloDoAtor, t)}
              vazio={t('workspace.byActorEmpty')}
            />
          </div>
          )}
        </>
      )}

      {/* A pergunta da FATURA: por credencial, global e só do owner (RN-060). */}
      {!projectId && workspaceId && <CredentialSpendSection workspaceId={workspaceId} />}
    </>
  );
}

/** Orçamentos de todos os projetos — a leitura global do owner. */
export function OrcamentosDosProjetos({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('spend');
  const resumo = useQuery({
    queryKey: ['projects-summary', workspaceId],
    queryFn: () => getProjectsSummary(workspaceId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const projetos = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => listProjects(workspaceId),
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const orcamentos = new Map(
    (resumo.data ?? []).map((s) => [s.projectId, s.budget] as const),
  );

  return (
    <section className={styles.grade} aria-label={t('global.budgetsTitle')}>
      <h3 className={styles.titulo}>{t('global.budgetsTitle')}</h3>
      {(resumo.isError || projetos.isError) && (
        <p className={styles.nota} role="alert">
          {t('global.budgetsError')}
        </p>
      )}
      {projetos.data?.length === 0 && <p className={styles.nota}>{t('global.budgetsEmpty')}</p>}
      <ul>
        {(projetos.data ?? []).map((p) => {
          const b = orcamentos.get(p.id);
          return (
            <li key={p.id}>
              <Link to="/projects/$projectId" params={{ projectId: p.id }} search={{ tab: 'spend' }}>
                {p.name}
              </Link>{' '}
              —{' '}
              {b
                ? t('global.budgetOf', {
                    gasto: formatarUsd(b.spentMicros),
                    limite: formatarUsd(b.limitMicros),
                  })
                : t('global.budgetNone')}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** O NÃO-owner na página global: o PRÓPRIO consumo, por projeto (RN-953). */
export function MeuConsumoNoWorkspace({ workspaceId }: { workspaceId: string }) {
  const { t } = useTranslation('spend');
  const [dias, setDias] = useState<number>(30);
  const meu = useQuery({
    queryKey: ['workspace-spend', workspaceId, dias, 'me'],
    queryFn: () => getMyWorkspaceSpend(workspaceId, dias),
  });
  const d = meu.data;

  return (
    <>
      <CabecalhoDePagina
        nivel="h2"
        titulo={t('global.memberTitle')}
        descricao={t('global.memberSubtitle')}
        acoes={<><SeletorDeJanela dias={dias} onChange={setDias} />{d && <ExportarCsv serie={d.porDia} />}</>}
      />
      <Estado q={meu} carregando={t('shared.summing')} erro={t('global.memberError')} />
      {d && (
        <>
          <DestaquesDoTotal
            total={d.totalMicros}
            assinatura={d.assinaturaMicros}
            chamadas={d.chamadas}
            entrada={d.inputTokens}
            saida={d.outputTokens}
            rotuloTotal={t('global.memberTotal', { dias })}
          />
          <div className={styles.faixa}>
            <GastoPorDia serie={d.porDia} titulo={t('global.memberDaily')} tokens={{ entrada: d.inputTokens, saida: d.outputTokens }} />
          </div>
          <Ranking
            titulo={t('global.memberByProject')}
            linhas={comoRanking(d.porProjeto, (l) => l.rotulo ?? l.chave, t)}
            vazio={t('global.memberByProjectEmpty')}
          />
        </>
      )}
    </>
  );
}

/**
 * O MEMBRO na aba do projeto: o total do projeto e o custo por agente e por
 * área (ADR 0233) — sem provider nem credencial. O consumo próprio vem logo
 * abaixo, no `MeuConsumo` da aba.
 */
export function GastoDoTimeNoProjeto({ projectId }: { projectId: string }) {
  const { t } = useTranslation('spend');
  const [dias, setDias] = useState<number>(30);
  const time = useQuery({
    queryKey: ['project-spend-team', projectId, dias],
    queryFn: () => getProjectSpendTeam(projectId, dias),
  });
  const d = time.data;
  const rotuloDaSessaoNoRanking = useRotuloDaSessao(projectId);
  const [todosOsAgentes, setTodosOsAgentes] = useState(false);
  const agentes = d ? comoRanking(d.porAgente, (l) => l.chave, t).map((l) => ({
    ...l,
    cor: AGENTS[l.chave as AgentKey]?.color,
  })) : [];

  return (
    <>
      <CabecalhoDePagina
        nivel="h2"
        titulo={t('team.title')}
        descricao={t('team.subtitle', { dias })}
        acoes={<SeletorDeJanela dias={dias} onChange={setDias} />}
      />
      <Estado q={time} carregando={t('shared.summing')} erro={t('team.error')} />
      {d && (
        <>
          <DestaquesDoTotal
            total={d.totalMicros}
            assinatura={d.assinaturaMicros}
            chamadas={d.chamadas}
            entrada={d.inputTokens}
            saida={d.outputTokens}
            rotuloTotal={t('team.totalLabel', { dias })}
            modelo={d.porModelo?.[0]?.chave}
          />
          <div className={styles.faixa}>
            <GastoPorDiaEAgente
              linhas={d.porDiaEAgente ?? []}
              dias={dias}
              titulo={t('workspace.dailySpendTitle')}
            />
          </div>
          <div className={styles.grade}>
            <Ranking
              icone={<Bot aria-hidden="true" size={12} />}
titulo={t('team.byAgentTitle')}
              linhas={todosOsAgentes ? agentes : agentes.slice(0, 3)}
              vazio={t('team.byAgentEmpty')}
              rodape={
                agentes.length > 3 && (
                  <BotaoLink onClick={() => setTodosOsAgentes((v) => !v)}>
                    {todosOsAgentes ? t('team.showTop') : t('team.showAll', { n: agentes.length })}
                  </BotaoLink>
                )
              }
            />
            <Ranking
              titulo={t('team.byAreaTitle')}
              linhas={comoRanking(
                d.porArea,
                (l) => (l.chave === 'sem-area' ? t('team.noArea') : l.chave),
                t,
              )}
              vazio={t('team.byAreaEmpty')}
            />
            <Ranking
              icone={<Cpu aria-hidden="true" size={12} />}
              titulo={t('workspace.byModelTitle')}
              linhas={comoRanking(d.porModelo ?? [], (l) => l.chave, t)}
              vazio={t('workspace.byModelEmpty')}
            />
            <Ranking
              icone={<MessageSquare aria-hidden="true" size={12} />}
              titulo={t('team.bySessionTitle')}
              linhas={comoRanking(d.porSessao ?? [], (l) => rotuloDaSessaoNoRanking(l.chave), t)}
              vazio={t('project.bySessionEmpty')}
            />
          </div>
        </>
      )}
    </>
  );
}
