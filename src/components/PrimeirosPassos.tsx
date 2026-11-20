import type { ComponentProps } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DESTINO_DO_PASSO } from '../lib/primeiros-passos';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/Button';
import { ComecarIdeacao } from './ComecarIdeacao';
import { useModeloDoTime, usePrimeirosPassos } from './PrimeirosPassos.helpers';
import { setProjectModelBinding } from '../lib/api-client';
import { invalidarBindingsResolvidos } from '../lib/bindings-resolvidos';
import { useCurrentWorkspaceWithRole } from '../lib/hooks';
import { roleAtLeast } from '../lib/roles';
import { Card } from '@/components/shadcn/card';
import { Item, ItemActions, ItemContent, ItemGroup, ItemMedia, ItemTitle, ItemDescription } from '@/components/shadcn/item';
import styles from './PrimeirosPassos.module.css';

/**
 * O cartão de primeiros passos da Visão geral (RN-708, AT-372).
 *
 * Diz o que falta para o projeto novo andar — credencial de LLM, modelo
 * aplicado ao time, primeira ideação —, cada passo com o link para o lugar
 * exato onde se faz. Some quando os três estão feitos.
 *
 * As leituras são as que já existiam: `['credentials']` (a da seção de
 * Credenciais, configuração: frescor de um minuto, sem poll — RN-645), o lote
 * de bindings resolvidos (RN-654, a mesma `queryKey` de Configurações) e a
 * lista de sessões que a página já polla (`temSessao`, vindo de quem chama).
 */
export function PrimeirosPassos({
  projectId,
  temSessao,
  integrado = false,
}: {
  projectId: string;
  /** `undefined` enquanto a lista de sessões não chegou. */
  temSessao: boolean | undefined;
  /** AT-975 (RN-1480): sem o cartão próprio, dentro do "Próximo passo". */
  integrado?: boolean;
}) {
  const { t } = useTranslation('overview');
  const passos = usePrimeirosPassos(projectId, temSessao);
  const { local, nomeLocal, haiku } = useModeloDoTime(projectId);
  const queryClient = useQueryClient();
  const { data: comPapel } = useCurrentWorkspaceWithRole();
  // RN-1395: grava o modelo do PROJETO (`maintainer`); o Haiku precisa estar ativo no catálogo (RN-043).
  const aplicar = useMutation({
    mutationFn: () => setProjectModelBinding(projectId, haiku!.id),
    onSuccess: () => invalidarBindingsResolvidos(queryClient, projectId),
  });
  const motivoDoAplicar = !roleAtLeast(comPapel?.role, 'maintainer')
    ? t('primeirosPassos.modelo.aplicarSemPapel')
    : !haiku
      ? t('primeirosPassos.modelo.aplicarSemHaiku')
      : null;
  if (!passos) return null;

  const feitos = passos.filter((p) => p.feito).length;
  const atual = passos.find((p) => !p.feito)?.chave;
  const Raiz = integrado ? IntegradoRaiz : Card;

  return (
    <Raiz role="region" className={integrado ? styles.integrado : styles.cartao} data-testid="primeiros-passos" aria-label={t('primeirosPassos.title')}>
      <div className={styles.cabecalho}>
        <h2 className={styles.titulo}>{t('primeirosPassos.title')}</h2>
        <span className={styles.contagem}>
          {t('primeirosPassos.progresso', { feitos, total: passos.length })}
        </span>
      </div>
      <ItemGroup className={styles.lista}>
        {passos.map((passo) => {
          const alvo = DESTINO_DO_PASSO[passo.chave];
          const rotulo = t(`primeirosPassos.${passo.chave}.link`);
          return (
            <Item
              key={passo.chave}
              size="xs"
              role="listitem"
              className={[styles.passo, passo.feito && styles.feito, passo.chave === atual && styles.atual].filter(Boolean).join(' ')}
              data-passo={passo.chave}
              data-feito={passo.feito ? 'sim' : 'nao'}
              data-atual={passo.chave === atual ? 'sim' : 'nao'}
            >
              <ItemMedia className={styles.marca} aria-hidden="true">
                {passo.feito ? '✓' : '○'}
              </ItemMedia>
              <ItemContent className={styles.texto}>
                <ItemTitle className={styles.nome}>{t(`primeirosPassos.${passo.chave}.titulo`)}</ItemTitle>
                <ItemDescription className={styles.estado}>
                  {passo.feito
                    ? t('primeirosPassos.feito')
                    : passo.chave === 'modelo' && local
                      ? t('primeirosPassos.modelo.pendenteLocal', { modelo: nomeLocal })
                      : t(`primeirosPassos.${passo.chave}.pendente`)}
                </ItemDescription>
                {passo.chave === 'modelo' && !passo.feito && local && motivoDoAplicar && (
                  <ItemDescription className={styles.estado} role="note">
                    {motivoDoAplicar}
                  </ItemDescription>
                )}
                {aplicar.isError && passo.chave === 'modelo' && (
                  <ItemDescription className={styles.estado} role="alert">
                    {t('primeirosPassos.modelo.aplicarFalhou')}
                  </ItemDescription>
                )}
              </ItemContent>
              {!passo.feito && (
                <ItemActions>
                  {passo.chave === 'ideacao' ? (
                    <ComecarIdeacao projectId={projectId} className={styles.link} />
                  ) : alvo === 'providers' ? (
                    <Link to="/providers" className={styles.link}>
                      {rotulo}
                    </Link>
                  ) : (
                    <Link to="/projects/$projectId" params={{ projectId }} search={alvo} className={styles.link}>
                      {rotulo}
                    </Link>
                  )}
                  {passo.chave === 'modelo' && local && (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={aplicar.isPending}
                      disabled={motivoDoAplicar !== null || aplicar.isPending}
                      onClick={() => aplicar.mutate()}
                    >
                      {t('primeirosPassos.modelo.aplicar', { modelo: haiku?.displayName ?? 'Claude Haiku 5.5' })}
                    </Button>
                  )}
                </ItemActions>
              )}
            </Item>
          );
        })}
      </ItemGroup>
    </Raiz>
  );
}

function IntegradoRaiz(props: ComponentProps<'div'>) {
  return <div {...props} />;
}
