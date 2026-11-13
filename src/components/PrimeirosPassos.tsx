import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { DESTINO_DO_PASSO } from '../lib/primeiros-passos';
import { usePrimeirosPassos } from './PrimeirosPassos.helpers';
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
}: {
  projectId: string;
  /** `undefined` enquanto a lista de sessões não chegou. */
  temSessao: boolean | undefined;
}) {
  const { t } = useTranslation('overview');
  const passos = usePrimeirosPassos(projectId, temSessao);
  if (!passos) return null;

  const feitos = passos.filter((p) => p.feito).length;

  return (
    <Card role="region" className={styles.cartao} data-testid="primeiros-passos" aria-label={t('primeirosPassos.title')}>
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
              className={[styles.passo, passo.feito && styles.feito].filter(Boolean).join(' ')}
              data-passo={passo.chave}
              data-feito={passo.feito ? 'sim' : 'nao'}
            >
              <ItemMedia className={styles.marca} aria-hidden="true">
                {passo.feito ? '✓' : '○'}
              </ItemMedia>
              <ItemContent className={styles.texto}>
                <ItemTitle className={styles.nome}>{t(`primeirosPassos.${passo.chave}.titulo`)}</ItemTitle>
                <ItemDescription className={styles.estado}>
                  {passo.feito ? t('primeirosPassos.feito') : t(`primeirosPassos.${passo.chave}.pendente`)}
                </ItemDescription>
              </ItemContent>
              {!passo.feito && (
                <ItemActions>
                  {alvo === 'providers' ? (
                    <Link to="/providers" className={styles.link}>
                      {rotulo}
                    </Link>
                  ) : (
                    <Link to="/projects/$projectId" params={{ projectId }} search={alvo} className={styles.link}>
                      {rotulo}
                    </Link>
                  )}
                </ItemActions>
              )}
            </Item>
          );
        })}
      </ItemGroup>
    </Card>
  );
}
