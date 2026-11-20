import { Field, FieldLabel } from '@/components/shadcn/field';
import { Save } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertTexto } from './shadcn/alert';
import { Card } from './shadcn/card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TokenMeter } from './TokenMeter';
import { formatarUsd } from './CredentialSpendSection.helpers';
import { FRESCOR_DA_CONFIGURACAO_MS } from '../lib/query-policy';
import { alertaDeOrcamento, viradaDoMesLocal } from '../lib/spend';
import type { Budget, BudgetPolicy } from '../lib/api-types';
import styles from '../routes/ProjectSpendTab.module.css';

/** Destino de `?tab=spend#teto`: rola até o cartão quando ele monta com a âncora no endereço (AT-973). */
function rolarSeForAncora(el: HTMLElement | null) {
  if (el && window.location.hash === '#teto') el.scrollIntoView?.({ block: 'start' });
}

function CartaoDoTeto({ children }: { children: React.ReactNode }) {
  return (
    <Card id="teto" ref={rolarSeForAncora} className={styles.cartaoDoTeto}>
      {children}
    </Card>
  );
}

type Gravar = (input: { limitUsd: number; policy: BudgetPolicy }) => Promise<Budget>;

/**
 * O teto MENSAL (RN-1200): medidor, dias restantes, previsão e legenda da virada
 * (em UTC, só a legenda vai para a hora local), mais o editor. Serve ao projeto
 * (`maintainer`) e ao workspace (`owner`); quem não pode vê o valor e o motivo
 * em texto. Sem teto, a api responde `null`. Erro é silencioso para quem não
 * edita (403 de papel, mesma régua da RN-060).
 */
export function TetoDoMes({
  escopo,
  queryKey,
  ler,
  gravar,
  podeEditar,
}: {
  escopo: 'projeto' | 'workspace';
  queryKey: readonly unknown[];
  ler: () => Promise<Budget | null>;
  gravar: Gravar;
  podeEditar: boolean;
}) {
  const { t, i18n } = useTranslation('spend');
  const [editando, setEditando] = useState(false);
  const budget = useQuery({ queryKey, queryFn: ler, staleTime: FRESCOR_DA_CONFIGURACAO_MS });
  const editor = (
    <EditorDoTeto
      escopo={escopo}
      queryKey={queryKey}
      gravar={gravar}
      podeEditar={podeEditar}
      atual={budget.data ?? null}
    />
  );
  // "Editar"/"Definir" abre o formulário DENTRO do cartão (sem Popover): a âncora `#teto` segue caindo nele.
  const abrir = (rotulo: string) =>
    podeEditar ? (
      <Button type="button" variant="secondary" size="sm" aria-expanded={editando} onClick={() => setEditando((v) => !v)}>
        {rotulo}
      </Button>
    ) : (
      <p className={styles.nota}>{t(`teto.${escopo}.semPapel`)}</p>
    );

  if (budget.isLoading) return null;
  if (budget.isError) return podeEditar ? <CartaoDoTeto>{editor}</CartaoDoTeto> : null;
  if (!budget.data) {
    return (
      <CartaoDoTeto>
        <div className={styles.linhaDoTeto}>
          <p className={styles.nota}>{t('teto.cartao.semTeto')}</p>
          {abrir(t('teto.cartao.definir'))}
        </div>
        {podeEditar && editando && editor}
      </CartaoDoTeto>
    );
  }

  const b = budget.data;
  const alerta = alertaDeOrcamento(b);
  return (
    <CartaoDoTeto>
      <div className={styles.linhaDoTeto}>
        <p className={styles.nota}>{t(`teto.${escopo}.titulo`)}</p>
        {podeEditar && abrir(t('teto.cartao.editar'))}
      </div>
      <TokenMeter
        variant="compact"
        unitLabel="USD"
        used={b.spentMicros / 1_000_000}
        limit={b.limitMicros / 1_000_000}
        costBRL={0}
        costUSD={b.spentMicros / 1_000_000}
      />
      {b.periodo && (
        <p
          className={`${styles.nota} ${styles.resumoDoTeto}`}
          data-testid="periodo-do-teto"
          title={`${t('teto.restantes', { count: b.periodo.diasRestantes })} ${t('teto.previsao', { valor: formatarUsd(b.periodo.previsaoMicros) })} ${t('teto.virada', { quando: viradaDoMesLocal(b.periodo.fim, i18n.language) })}`}
        >
          <span className="sr-only">{t('teto.restantes', { count: b.periodo.diasRestantes })} </span>
          {t('teto.resumo', {
            valor: formatarUsd(b.periodo.previsaoMicros),
            quando: viradaDoMesLocal(b.periodo.fim, i18n.language),
          })}
        </p>
      )}
      {alerta && (
        <Alert variant={alerta.nivel === 'danger' ? 'danger' : 'warning'} role="alert">
          <AlertTexto>{alerta.mensagem}</AlertTexto>
        </Alert>
      )}
      {!podeEditar && <p className={styles.nota}>{t(`teto.${escopo}.semPapel`)}</p>}
      {podeEditar && editando && editor}
    </CartaoDoTeto>
  );
}

function EditorDoTeto({
  escopo,
  queryKey,
  gravar,
  podeEditar,
  atual,
}: {
  escopo: 'projeto' | 'workspace';
  queryKey: readonly unknown[];
  gravar: Gravar;
  podeEditar: boolean;
  atual: { limitMicros: number; policy: BudgetPolicy } | null;
}) {
  const { t } = useTranslation('spend');
  const qc = useQueryClient();
  const [limite, setLimite] = useState(atual ? String(atual.limitMicros / 1_000_000) : '');
  const [politica, setPolitica] = useState<BudgetPolicy>(atual?.policy ?? 'block');
  const [invalido, setInvalido] = useState(false);
  const salvar = useMutation({
    mutationFn: (limitUsd: number) => gravar({ limitUsd, policy: politica }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey });
      void qc.invalidateQueries({ queryKey: ['projects-summary'] });
    },
  });

  return (
    <form
      className={styles.formulario}
      aria-label={t(`teto.${escopo}.editor`)}
      onSubmit={(e) => {
        e.preventDefault();
        const valor = Number(limite.replace(',', '.'));
        if (!Number.isFinite(valor) || valor <= 0) {
          setInvalido(true);
          return;
        }
        setInvalido(false);
        salvar.mutate(valor);
      }}
    >
      <Input
        label={t('budgetEditor.limitLabel')}
        inputMode="decimal"
        value={limite}
        disabled={!podeEditar}
        onChange={(e) => setLimite(e.target.value)}
      />
      <div className={styles.grupoTeto}>
        <Field>
          <FieldLabel htmlFor={`politica-do-teto-${escopo}`}>{t('budgetEditor.policyLabel')}</FieldLabel>
          <Select
            id={`politica-do-teto-${escopo}`}
            value={politica}
            disabled={!podeEditar}
            onChange={(e) => setPolitica(e.target.value as BudgetPolicy)}
          >
            <option value="block">{t('budgetEditor.block')}</option>
            <option value="allow">{t('budgetEditor.allow')}</option>
          </Select>
        </Field>
        <div className={styles.acoes}>
          <Button type="submit" disabled={!podeEditar || salvar.isPending}>
            <Save aria-hidden="true" />
            {salvar.isPending ? t('budgetEditor.saving') : t('budgetEditor.save')}
          </Button>
        </div>
      </div>
      {!podeEditar && <p className={styles.nota}>{t(`teto.${escopo}.semPapel`)}</p>}
      {invalido && <Alert variant="danger" role="alert"><AlertTexto>{t('budgetEditor.invalid')}</AlertTexto></Alert>}
      {salvar.isError && <Alert variant="danger" role="alert"><AlertTexto>{t('budgetEditor.error')}</AlertTexto></Alert>}
      {salvar.isSuccess && <p className={styles.nota} role="status">{t('budgetEditor.saved')}</p>}
    </form>
  );
}
