import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Disclosure } from '../../components/ui/Disclosure';
import { Button } from '../../components/ui/Button';
import { AGENT_LIST } from '../../lib/agents';
import { useCatalogoDeAgentes } from '../../lib/agent-catalog-queries';
import styles from '../ProjectSettingsTab.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';
import { useTrocaDeGrupo } from './secao-inicial';

/**
 * Instruções e ferramentas de cada agente, SÓ LEITURA (AT-937, RN-1270). Saíram
 * do `AgentCard`; o endpoint (`GET .../agent-catalog`) é `viewer`, então a seção
 * não tem controle de escrita nem `disabled` por papel (RN-102). A leitura só
 * liga ao abrir um agente (RN-645) e compartilha a `queryKey` do composer.
 */
export function AgentCatalogSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('settings');
  const [lida, setLida] = useState(false);
  const catalogo = useCatalogoDeAgentes(projectId, lida);
  const irParaAvancado = useTrocaDeGrupo();
  const slugs = catalogo.data?.agentes.map((a) => a.agente) ?? AGENT_LIST.map((a) => a.key);

  return (
    <SecaoDeConfiguracoes chave="agent-catalog">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}>
          <BookOpen aria-hidden="true" className={styles.tituloIcone} />
          {t('agentCatalog.title')}
        </h2>
        <span className={styles.eyebrow}>{t('agentCatalog.eyebrow')}</span>
      </div>
      <div className={styles.subtitle} style={{ marginBottom: 12 }}>
        {t('agentCatalog.subtitle')}
      </div>
      <Button type="button" variant="ghost" onClick={() => irParaAvancado('avancado')}>
        {t('agentCatalog.history')}
      </Button>
      {slugs.map((slug) => (
        <div key={slug} className={styles.agentBlock}>
          <Disclosure
            titulo={AGENT_LIST.find((a) => a.key === slug)?.name ?? slug}
            onAlternar={(aberto) => aberto && setLida(true)}
          >
            <CatalogoDoAgente slug={slug} query={catalogo} />
          </Disclosure>
        </div>
      ))}
    </SecaoDeConfiguracoes>
  );
}

function CatalogoDoAgente({
  slug,
  query,
}: {
  slug: string;
  query: ReturnType<typeof useCatalogoDeAgentes>;
}) {
  const { t } = useTranslation('settings');
  if (query.isError) return <p>{t('agentCatalog.catalog.error')}</p>;
  if (!query.data) return <p aria-busy="true">{t('agentCatalog.catalog.loading')}</p>;
  const a = query.data.agentes.find((x) => x.agente === slug);
  const ins = a?.instrucoesDoProjeto;
  return (
    <>
      <h3>{t('agentCatalog.catalog.instructions')}</h3>
      {a?.identidade ? (
        <p>{a.identidade}</p>
      ) : a ? (
        <p>{t('agentCatalog.catalog.instructionsUnavailable')}</p>
      ) : null}
      {ins ? (
        <>
          <p>{t('agentCatalog.catalog.projectInstruction', { versao: ins.versao })}</p>
          <pre style={{ maxHeight: 160, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{ins.conteudo}</pre>
          {ins.conteudoTotal !== undefined && (
            <p>{t('agentCatalog.catalog.missing', { count: ins.conteudoTotal - ins.conteudo.length })}</p>
          )}
        </>
      ) : (
        <p>{t('agentCatalog.catalog.noProjectInstruction')}</p>
      )}
      <h3>{t('agentCatalog.catalog.tools')}</h3>
      {!a?.ferramentas ? (
        <p>{t('agentCatalog.catalog.toolsUnavailable')}</p>
      ) : a.ferramentas.length === 0 ? (
        <p>{t('agentCatalog.catalog.noTools')}</p>
      ) : (
        <>
          <p>
            {t('agentCatalog.catalog.toolCount', { count: a.ferramentas.length })}.{' '}
            {t('agentCatalog.catalog.note')}
          </p>
          <ul>
            {a.ferramentas.map((f) => (
              <li key={f.nome}>
                <code>{f.nome}</code> {f.descricao}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
