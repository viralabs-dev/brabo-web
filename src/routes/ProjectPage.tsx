import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getProject, getProjectBudget, getRepository } from '../lib/api-client';
import { useActiveExecutionSession, useCurrentWorkspaceWithRole, useLatestSession } from '../lib/hooks';
import { useCriarSessao } from '../lib/use-criar-sessao';
import { useAtivarExecucao } from '../lib/use-ativar-execucao';
import { roleAtLeast } from '../lib/roles';
import { KIND_PRE_SELECIONADO } from '../lib/session-kind';
import { Button } from '../components/ui/Button';
import type { ReactNode } from 'react';
import type { Role } from '../lib/api-types';
import {
  publicarAbaAtiva,
  ouvirPedidosDeAba,
  useContagensDoProjeto,
} from '../lib/contagens-do-projeto';
import { setLastSeenSeq } from '../lib/read-state';
import { MedidorDeGasto } from '../components/MedidorDeGasto';
import { ErroDeCarregamento } from '../components/ErroDeCarregamento';
import { Skeleton } from '../components/ui/Skeleton';
import { CarregandoRota } from '../components/CarregandoRota';
import { useLayoutMovel } from '../lib/layout-movel';
import { BranchIcon, GitHubIcon, GitLabIcon, LocalRepoIcon } from '../components/ui/icons';
import { ABA_PADRAO, abaPorChave, ehChaveDeAba, secaoDaChave, type ChaveDeAba } from './project-tabs';
import { ContextoDeGrupoInicial, ContextoDeSecaoInicial, ContextoDeTrocaDeGrupo } from './settings/secao-inicial';
import { ContextoDeHistoriaInicial } from '../lib/historia-inicial';
import type { ChaveDeSecao, GrupoDoSumario } from './settings/sumario';
import { FaixaDeSubAbas } from '../components/FaixaDeSubAbas';
import { Badge } from '../components/ui/Badge';
import { CabecalhoDePagina } from '../components/shadcn/cabecalho-de-pagina';
import styles from './ProjectPage.module.css';

const PROVIDER_ICON = { github: GitHubIcon, gitlab: GitLabIcon, local: LocalRepoIcon } as const;

/** O chip ao lado do nome diz o que o repositório É (handoff, seção 4). */
const VISIBILIDADE_KEY = { public: 'visibility.public', private: 'visibility.private' } as const;

function AtivarExecucaoDoCabecalho({
  projectId,
  papel,
}: {
  projectId: string;
  papel: Role | undefined;
}) {
  const { t } = useTranslation('projectPage');
  const { ativar, semRepositorio } = useAtivarExecucao(projectId);
  if (useActiveExecutionSession(projectId).session) return null;
  return (
    <>
      {semRepositorio && <span className={styles.metaStrong}>{t('acao.semRepositorio')}</span>}
      <Button
        variant="primary"
        onClick={() => void ativar()}
        disabled={semRepositorio || !roleAtLeast(papel, 'maintainer')}
      >
        {t('acao.ativarExecucao')}
      </Button>
    </>
  );
}

interface ProjectPageProps {
  projectId: string;
  initialTab?: ChaveDeAba;
  /**
   * A seção de Configurações a que o deep-link `?section=` aponta. Chega por
   * CONTEXTO até a aba, e não por prop do painel: o registro de abas declara
   * um prop só para as doze (`project-tabs.ts`), e alargá-lo por causa de uma
   * faria a moldura voltar a carregar dado específico de uma aba.
   */
  initialSection?: ChaveDeSecao;
  /** RN-980: a página (grupo) de Configurações; `undefined` = Modelos. */
  initialGroup?: GrupoDoSumario;
  /** RN-884: a história que a aba Histórias abre, pelo mesmo caminho. */
  initialStory?: string;
}

export function ProjectPage({ projectId, initialTab, initialSection, initialGroup, initialStory }: ProjectPageProps) {
  const { t } = useTranslation('projectPage');
  const [tab, setTab] = useState<ChaveDeAba>(initialTab ?? ABA_PADRAO);
    // RN-980: o grupo de Configurações é estado local semeado pela URL; trocar escreve `?group=`.
  const [grupo, setGrupo] = useState(initialGroup);
  useEffect(() => setGrupo(initialGroup), [initialGroup]);
  function trocarGrupo(g: GrupoDoSumario) {
    setGrupo(g);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'settings');
      url.searchParams.set('group', g);
      url.searchParams.delete('section');
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // sem `window` (teste/SSR): só a troca local
    }
  }
  // Trocar de sub-aba: estado local + o endereço acompanha (como `trocarGrupo`).
  function trocarSub(chave: ChaveDeAba) {
    setTab(chave);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', chave);
      url.searchParams.delete('section');
      url.searchParams.delete('group');
      window.history.replaceState(window.history.state, '', url);
    } catch {
      // sem `window` (teste/SSR): só a troca local
    }
  }
  // Layout móvel (RN-643): só os respiros encolhem — as abas moram na gaveta
  // da sidebar desde o ADR 0211.
  const movel = useLayoutMovel();

  // `initialTab` só valia no MOUNT (o nome já diz): um link `?tab=` clicado
  // de DENTRO de um `ProjectPage` já montado (ex.: "Ver arquitetura
  // completa" na Visão geral, Onda 3) muda a URL mas não remonta esta
  // página — mesma rota, só a busca muda — e o `useState` acima ignora
  // atualização de valor inicial. Sem este efeito o clique reescrevia a URL
  // e não movia a régua nenhum milímetro. `latestSession`/promoção (efeito
  // logo abaixo) continuam olhando só o `tab` resolvido, não `initialTab`.
  //
  // ADR 0211: a troca de aba vem da sidebar, que navega pelo router — e o
  // link do PROJETO (sem `?tab=`) volta à aba padrão, em vez de deixar a
  // moldura presa na última aba aberta.
  useEffect(() => {
    setTab(initialTab ?? ABA_PADRAO);
  }, [initialTab]);

  // A sidebar marca a aba que ESTA moldura mostra (ADR 0211) — inclusive
  // quando quem trocou foi o painel "precisa de você", sem passar pelo router.
  useEffect(() => {
    publicarAbaAtiva({ projectId, tab });
  }, [projectId, tab]);
  useEffect(() => () => publicarAbaAtiva(null), []);
  // E o inverso: a sidebar PEDE a aba clicada antes de navegar, então o
  // clique na aba que a URL já tem (depois de um salto pelo painel, que não
  // passa pelo router) ainda troca a moldura.
  useEffect(
    () =>
      ouvirPedidosDeAba((pedido) => {
        if (pedido.projectId === projectId && ehChaveDeAba(pedido.tab)) setTab(pedido.tab);
      }),
    [projectId],
  );

  const projectQuery = useQuery({ queryKey: ['project', projectId], queryFn: () => getProject(projectId) });
  const project = projectQuery.data;
  const { data: repository } = useQuery({ queryKey: ['repository', projectId], queryFn: () => getRepository(projectId) });
  const { data: budget } = useQuery({ queryKey: ['budget', projectId], queryFn: () => getProjectBudget(projectId) });

  const { data: workspace } = useCurrentWorkspaceWithRole();
  const papel = workspace?.role;
  const { criar, criando } = useCriarSessao(projectId);

  const { latest: latestSession } = useLatestSession(projectId);
  const filasDoProjeto = useContagensDoProjeto(projectId);
  useEffect(() => {
    // Literal de propósito: quem marca o projeto como lido é a Visão geral —
    // não "a aba padrão, seja ela qual for".
    if (tab === 'overview' && latestSession) {
      setLastSeenSeq(projectId, latestSession.nextSeq - 1);
    }
  }, [tab, latestSession, projectId]);

  // Falha de carga DIZ o que houve, e a frase é a da api (RN-088).
  //
  // Era `if (!project) return null` — uma linha que tratava "a api recusou"
  // igual a "ainda não chegou". Com a api limitando por 429, a tela inteira
  // ficava BRANCA: sem mensagem, sem erro, sem esqueleto, e o motivo só no
  // console. É a RN-059 do outro lado do fio: falha nunca vira vazio.
  if (projectQuery.isError) {
    return (
      <div className={styles.falha}>
        <ErroDeCarregamento
          titulo={t('loadErrorTitle')}
          erro={projectQuery.error}
          onTentarDeNovo={() => void projectQuery.refetch()}
        />
      </div>
    );
  }

  // Só aqui é carregamento de verdade: pediu, não errou, ainda não voltou.
  if (!project) {
    return (
      <div className={styles.falha}>
        <Skeleton width={260} height={20} />
      </div>
    );
  }

  const ProviderIcon = PROVIDER_ICON[repository?.provider ?? 'local'];
  // O painel sai do registro, não de uma cadeia de `&&`: era ali que uma aba
  // nova entrava na régua e no `?tab=` sem nunca renderizar nada.
  const aba = abaPorChave(tab);
  const PainelDaAba = aba.component;

  // A ação primária da seção (AT-888, RN-1210). O papel mínimo é o do endpoint
  // (RN-102): criar sessão `developer`, ativar execução `maintainer`.
  const secaoAtual = secaoDaChave(tab).chave;
  let acaoPrimaria: ReactNode = null;
  if (secaoAtual === 'overview' || secaoAtual === 'sessoes') {
    acaoPrimaria = (
      <Button
        variant="primary"
        onClick={() => void criar(tab === 'chat' ? 'consultiva' : KIND_PRE_SELECIONADO)}
        disabled={criando || !roleAtLeast(papel, 'developer')}
      >
        {t('acao.novaSessao')}
      </Button>
    );
  } else if (secaoAtual === 'trabalho') {
    // Componente à parte: a leitura do resumo só acontece em Trabalho, e o
    // orçamento de requisições das outras abas (RN-632/645) não sobe.
    acaoPrimaria = (
      <AtivarExecucaoDoCabecalho projectId={projectId} papel={papel} />
    );
  }

  return (
    <div className={[styles.wrapper, movel && styles.movel].filter(Boolean).join(' ')}>
      {/* O cabeçalho é uma faixa `surface-1` com uma única divisória embaixo
          (handoff, seção 4), e agora atravessa a largura inteira: a navegação
          saiu de dentro dele (ADR 0126) e mora na sidebar (ADR 0211). */}
      <CabecalhoDePagina
        className={styles.header}
        titulo={`${project.name} / ${secaoDaChave(tab).label}`}
        descricao={
          <span className={styles.meta}>
            <ProviderIcon size={14} />
            {repository && (
              <Badge square size="md" className={styles.repoChip}>
                {repository.provider} · {t(VISIBILIDADE_KEY[repository.visibility])}
              </Badge>
            )}
            {repository ? (
              <>
                <BranchIcon size={13} />
                <span className={styles.metaStrong}>{repository.defaultBranch}</span>
                {/* Fase 12a: adotado é fato permanente do projeto. */}
                {repository.origin === 'adopted' && (
                  <>
                    <span className={styles.metaSep} />
                    <span>{t('adopted')}</span>
                  </>
                )}
              </>
            ) : (
              t('repositoryNotProvisioned')
            )}
          </span>
        }
        acoes={
          <>
            {budget !== undefined && (
              <MedidorDeGasto budget={budget} onDefinir={() => trocarSub('settings')} />
            )}
            {acaoPrimaria}
          </>
        }
      />

      <div className={styles.corpo}>
        {/* Quem manda no respiro é o REGISTRO, não um `tab === 'overview'`
            escrito aqui: a Visão geral desenha as próprias regiões até a borda
            (o feed é um trilho com divisória à esquerda, não um card solto). */}
        <div className={[styles.body, aba.semRespiro && styles.bodyRente].filter(Boolean).join(' ')}>
          <div className={styles.coluna}>
          <ContextoDeSecaoInicial.Provider value={initialSection}>
          <ContextoDeGrupoInicial.Provider value={grupo}>
          <ContextoDeTrocaDeGrupo.Provider value={trocarGrupo}>
          <ContextoDeHistoriaInicial.Provider value={initialStory}>
            {/* Cada painel é um chunk próprio (AT-300): o `Suspense` fica AQUI,
                em volta só do painel, para que trocar de aba nunca apague o
                cabeçalho enquanto o chunk chega. */}
            <FaixaDeSubAbas ativa={tab} contagens={filasDoProjeto.contagens} onChange={trocarSub} />
            <Suspense fallback={<CarregandoRota />}>
              <PainelDaAba projectId={projectId} />
            </Suspense>
          </ContextoDeHistoriaInicial.Provider>
          </ContextoDeTrocaDeGrupo.Provider>
          </ContextoDeGrupoInicial.Provider>
          </ContextoDeSecaoInicial.Provider>
          </div>
        </div>
      </div>
    </div>
  );
}
