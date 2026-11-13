import { useState } from 'react';
import { Route } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ajuda } from '@/components/ui/Ajuda';
import { Item } from '@/components/shadcn/item';
import { Badge } from '../../components/ui/Badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/shadcn/toggle-group';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import { getWorkspaceToolRouter, mensagemDaApi, setWorkspaceToolRouter } from '../../lib/api-client';
import type { RoteadorDeFerramentas } from '../../lib/api-types';
import { useCurrentWorkspaceWithRole } from '../../lib/hooks';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../../lib/query-policy';
import { roleAtLeast } from '../../lib/roles';
import styles from '../ProjectSettingsTab.module.css';
import { SecaoDeConfiguracoes } from './SecaoDeConfiguracoes';

const OPCOES: RoteadorDeFerramentas[] = ['jev', 'laya', 'desligado'];
const MOTIVOS_COM_TEXTO = [
  'sem_gpu',
  'vram_insuficiente',
  'p95_acima_do_teto',
  'sonda_em_andamento',
  'sonda_falhou',
];

/**
 * Quem escolhe a ferramenta de cada passo do agente (AT-626, ADR 0290): Jev
 * (padrão), Laya (GPU local) ou nenhum. É do WORKSPACE e grava na hora; só o
 * `owner` troca. O Laya só ativa com `proficiente`; fora disso a seção diz o
 * estado NOMEADO e "visto assim desde" (o `desde` é de quando a api percebeu,
 * não da queda), sem bolinha verde. Com `laya` escolhido e o serviço fora, o
 * turno não falha: cada passo usa o catálogo inteiro (RN-1302).
 */
export function RoteadorDeFerramentasSection(_: { projectId: string }) {
  const { t, i18n } = useTranslation('settings');
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const papel = useCurrentWorkspaceWithRole();
  const wsId = papel.data?.workspace?.id;
  const chave = ['workspace-tool-router', wsId];
  const { data } = useQuery({
    queryKey: chave,
    queryFn: () => getWorkspaceToolRouter(wsId!),
    enabled: !!wsId,
    staleTime: FRESCOR_DA_CONFIGURACAO_MS,
  });
  const [saving, setSaving] = useState(false);

  async function gravar(roteador: RoteadorDeFerramentas) {
    if (!wsId || roteador === data?.roteador) return;
    setSaving(true);
    try {
      await setWorkspaceToolRouter(wsId, roteador);
      showToast({ title: t('toolRouter.toast.saved'), tone: 'success' });
    } catch (e) {
      showToast({ title: mensagemDaApi(e, t('toolRouter.toast.error')), tone: 'danger' });
    } finally {
      // O 409 quer dizer que o estado mudou entre a leitura e o clique: relê sempre.
      await queryClient.invalidateQueries({ queryKey: chave });
      setSaving(false);
    }
  }

  if (!data) return null;

  const { roteador, laya } = data;
  const podeTrocar = roleAtLeast(papel.data?.role, 'owner');
  const proficiente = laya.estado === 'proficiente';
  const desde = new Date(laya.desde).toLocaleString(i18n.language);
  const motivo = laya.motivo;
  const conhecido = !!motivo && MOTIVOS_COM_TEXTO.includes(motivo);
  // O texto do estado: o do motivo quando o conhecemos, o do estado senão.
  const textoDoEstado =
    laya.estado === 'proficiente'
      ? t('toolRouter.estado.proficiente', { ms: laya.p95Ms ?? '?', mib: laya.vramLivreMiB ?? '?' })
      : conhecido && (laya.estado === 'sem_gpu' || laya.estado === 'lento')
        ? t(`toolRouter.motivo.${motivo}`, {
            dispositivo: laya.dispositivo ?? '?',
            mib: laya.vramLivreMiB ?? '?',
            ms: laya.p95Ms ?? '?',
          })
        : t(`toolRouter.estado.${laya.estado}`);
  const codigoBruto = laya.estado !== 'proficiente' && laya.estado !== 'nao_configurado' && !conhecido ? motivo : null;
  const quedaParaCatalogo = roteador === 'laya' && !proficiente;

  return (
    <SecaoDeConfiguracoes chave="tool-router">
      <div className={styles.sectionHead}>
        <h2 className={styles.title}><Route aria-hidden="true" className={styles.tituloIcone} />{t('toolRouter.title')}</h2>
        <Ajuda assunto={t('toolRouter.title')}>{t('toolRouter.subtitle')}</Ajuda>
        <span className={styles.eyebrow}>{t('toolRouter.eyebrow')}</span>
      </div>

      <Item variant="outline" className={`${styles.ajusteCard} ${styles.roteadorCard}`}>
        <div className={styles.roteadorLinha}>
          <div className={styles.ajusteInfo}>
            <div className={styles.ajusteTitulo}>{t('toolRouter.card.title')}</div>
            <div className={styles.ajusteHint}>{t('toolRouter.card.hint')}</div>
            <div className={styles.ajusteHint}>{t(`toolRouter.opcao.${roteador}.hint`)}</div>
            {!podeTrocar && (
              <div className={styles.ajusteHint} data-testid="roteador-motivo">{t('toolRouter.reason.owner')}</div>
            )}
          </div>
          <div className={styles.ajusteControle}>
            <ToggleGroup
              variant="chip"
              size="chip"
              value={[roteador]}
              disabled={!podeTrocar || saving}
              aria-label={t('toolRouter.selectAria')}
              onValueChange={(v) => v.length > 0 && void gravar(v[0] as RoteadorDeFerramentas)}
            >
              {OPCOES.map((o) => (
                <ToggleGroupItem key={o} value={o} disabled={o === 'laya' && !proficiente && roteador !== 'laya'}>
                  {t(`toolRouter.opcao.${o}.label`)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>

        <div className={styles.roteadorLaya}>
          <div className={styles.ajusteTitulo}>
            {t('toolRouter.laya.title')}
            <Badge tone={proficiente ? 'success' : laya.estado === 'nao_configurado' ? 'muted' : 'danger'}>
              {t(`toolRouter.nome.${laya.estado}`)}
            </Badge>
          </div>
          <div className={styles.ajusteHint} data-testid="roteador-laya-estado">{textoDoEstado}</div>
          {codigoBruto && <code data-testid="roteador-codigo">{codigoBruto}</code>}
          {laya.estado !== 'nao_configurado' && (
            <div className={styles.ajusteHint}>{t('toolRouter.desde', { quando: desde })}</div>
          )}
        </div>
      </Item>

      {quedaParaCatalogo && (
        <div role="alert" className={styles.ajusteHint} data-testid="roteador-queda">
          {t('toolRouter.queda', { estado: t(`toolRouter.nome.${laya.estado}`), quando: desde })}
        </div>
      )}
    </SecaoDeConfiguracoes>
  );
}
