import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetClose, SheetContent } from '../components/shadcn/sheet';
import { Tabs, TabsContent, TabsCount, TabsList, TabsTrigger } from '../components/shadcn/tabs';
import { Button } from '../components/ui/Button';
import { XIcon } from '../components/ui/icons';
import { PendenciasDeOutrasSessoes } from '../components/PendenciasDeOutrasSessoes';
import { ListaDeExecutores } from './ListaDeExecutores';
import sessionStyles from './SessionPage.module.css';
import styles from './PainelDaSessao.module.css';

export type AbaDoPainel = 'contexto' | 'executores' | 'pendencias';

interface Props {
  projectId: string;
  sessionId: string;
  aberto: boolean;
  /** Abaixo de 1024px o painel é o Sheet do chat compacto (AT-957); acima, uma coluna ao lado do fio. */
  emSheet: boolean;
  aoFechar: () => void;
  aba: AbaDoPainel;
  aoMudarAba: (aba: AbaDoPainel) => void;
  /** Só a sessão criativa tem execução para listar (a aba Executores só existe nela). */
  comExecutores: boolean;
  podeDecidir: boolean;
  totalDePendencias: number;
  aoContarPendencias: (total: number) => void;
  /** O `ContextAside`: montado só com o painel aberto. */
  contexto: ReactNode;
}

/**
 * AT-957 (RN-1303, RN-626): o painel ÚNICO da sessão, com Tabs: Contexto · Executores · Pendências
 * (o contador fica na aba; RN-467 — as filas seguem separadas dentro dela).
 *
 * Fica SEMPRE montado, recolhido ou não (`hidden` no desktop, `keepMounted` no Sheet): a aba
 * Pendências mantém os ouvintes de `brabo:abrir-fila`/`abrir-perguntas`, o contador do cabeçalho e o
 * registro do cartão de merge no fio (RN-843). Contexto e Executores só montam com o painel aberto
 * (nenhuma leitura nova na rede com ele fechado).
 */
export function PainelDaSessao(p: Props) {
  const { t } = useTranslation('sessionPage');
  const abas = (
    <Tabs
      value={p.aba}
      onValueChange={(v) => p.aoMudarAba(v as AbaDoPainel)}
      className={styles.tabs}
      data-testid="painel-da-sessao-abas"
    >
      <TabsList variant="casa" aria-label={t('painel.abas')} className={p.emSheet ? styles.abasNoSheet : undefined}>
        <TabsTrigger variant="casa" value="contexto">
          {t('painel.contexto')}
        </TabsTrigger>
        {p.comExecutores && (
          <TabsTrigger variant="casa" value="executores">
            {t('painel.executores')}
          </TabsTrigger>
        )}
        <TabsTrigger variant="casa" value="pendencias">
          {t('painel.pendencias')}
          {p.totalDePendencias > 0 && <TabsCount>{p.totalDePendencias}</TabsCount>}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="contexto" className={styles.aba}>
        {p.aberto && p.contexto}
      </TabsContent>
      {p.comExecutores && (
        <TabsContent value="executores" className={styles.aba}>
          {p.aberto && <ListaDeExecutores projectId={p.projectId} sessionId={p.sessionId} />}
        </TabsContent>
      )}
      <TabsContent value="pendencias" keepMounted className={styles.aba}>
        {p.totalDePendencias === 0 && <p className={styles.vazio}>{t('painel.pendenciasVazio')}</p>}
        <PendenciasDeOutrasSessoes
          modo="painel"
          projectId={p.projectId}
          sessionId={p.sessionId}
          podeDecidir={p.podeDecidir}
          aoMudarAberto={(o) => o && p.aoMudarAba('pendencias')}
          aoContar={p.aoContarPendencias}
        />
      </TabsContent>
    </Tabs>
  );

  if (p.emSheet)
    return (
      <Sheet open={p.aberto} onOpenChange={(o) => !o && p.aoFechar()}>
        <SheetContent
          side="right"
          showCloseButton={false}
          keepMounted
          className={sessionStyles.gavetaDoContexto}
          aria-label={t('painel.titulo')}
          aria-modal="true"
          data-testid="painel-da-sessao"
          data-modo="sheet"
        >
          <SheetClose
            render={<Button icon variant="ghost" className={sessionStyles.fecharGavetaDoContexto} />}
            aria-label={t('topbar.fecharPainel')}
          >
            <XIcon size={17} />
          </SheetClose>
          {abas}
        </SheetContent>
      </Sheet>
    );

  return (
    <div className={styles.painel} hidden={!p.aberto} data-testid="painel-da-sessao" data-modo="aba">
      {abas}
    </div>
  );
}
