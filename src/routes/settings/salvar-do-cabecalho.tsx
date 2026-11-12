import {
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider.helpers';
import { Contexto, ContextoDaBarra, type Resumo, type Secao } from './salvar-do-cabecalho.helpers';
import styles from '../ProjectSettingsTab.module.css';

/**
 * O Salvar do cabeçalho (RN-1265): junta as seções ESCALARES montadas
 * (`useSecaoSalvavel`) e salva as linhas sujas de cada uma em SÉRIE, sem abortar
 * (RN-469). Gestos com confirmação própria (modo de execução, chaves) não se
 * registram aqui.
 */
export function ProvedorDoSalvarDoCabecalho({ children }: { children: ReactNode }) {
  const { t } = useTranslation('settings');
  const { showToast } = useToast();
  const entradas = useRef(new Map<string, { rotulo: string; secao: Secao }>());
  const [resumos, setResumos] = useState<Record<string, Resumo>>({});
  const [salvando, setSalvando] = useState(false);

  const publicar = useCallback((id: string, rotulo: string, secao: Secao) => {
    entradas.current.set(id, { rotulo, secao });
    const novo = { sujas: secao.sujas.length, invalidas: secao.invalidas.length };
    setResumos((r) =>
      r[id]?.sujas === novo.sujas && r[id]?.invalidas === novo.invalidas ? r : { ...r, [id]: novo },
    );
  }, []);
  const retirar = useCallback((id: string) => {
    entradas.current.delete(id);
    setResumos((r) => {
      const resto = { ...r };
      delete resto[id];
      return resto;
    });
  }, []);

  // Estável: um objeto novo a cada render refaria o efeito de `usePublicarNoCabecalho` em laço.
  const registro = useMemo(() => ({ publicar, retirar }), [publicar, retirar]);
  const lista = Object.values(resumos);
  const sujas = lista.reduce((n, r) => n + r.sujas, 0);
  const invalidas = lista.reduce((n, r) => n + r.invalidas, 0);

  async function salvar() {
    setSalvando(true);
    let salvas = 0;
    const falhas: { nome: string; motivo: string }[] = [];
    try {
      for (const { rotulo, secao } of [...entradas.current.values()]) {
        const d = await secao.salvarSecao({ silencioso: true });
        salvas += d.salvas.length;
        for (const f of d.falhas) falhas.push({ nome: `${rotulo}: ${f.chave}`, motivo: f.motivo });
      }
    } finally {
      setSalvando(false);
    }
    const total = salvas + falhas.length;
    if (total === 0) return;
    if (falhas.length === 0) {
      showToast({ title: t('secao.toast.salvas', { count: salvas }), tone: 'success' });
    } else if (salvas === 0) {
      showToast({
        title: falhas[0].motivo,
        message: falhas.map((f) => f.nome).join(', '),
        tone: 'danger',
      });
    } else {
      showToast({
        title: t('secao.toast.parcial', { salvas, total }),
        message: t('secao.toast.parcialDetalhe', {
          itens: falhas.map((f) => f.nome).join(', '),
          motivo: falhas[0].motivo,
        }),
        tone: 'warning',
      });
    }
  }

  function descartar() {
    for (const { secao } of entradas.current.values()) secao.descartar();
  }

  return (
    <Contexto.Provider value={registro}>
      <ContextoDaBarra.Provider
        value={{ sujas, invalidas, salvando, salvar: () => void salvar(), descartar }}
      >
        {children}
      </ContextoDaBarra.Provider>
    </Contexto.Provider>
  );
}

export function BarraDeSalvar() {
  const { t } = useTranslation('settings');
  const { sujas, invalidas, salvando, salvar, descartar } = useContext(ContextoDaBarra);
  if (sujas === 0) return null;
  return (
    <div className={styles.barraDeSalvar} role="status">
      <span>
        {invalidas > 0
          ? t('secao.invalidas', { count: invalidas })
          : t('cabecalho.naoSalvas', { count: sujas })}
      </span>
      <Button variant="ghost" onClick={descartar} disabled={salvando}>
        {t('cabecalho.descartar')}
      </Button>
      <Button onClick={salvar} disabled={salvando || invalidas > 0}>
        {salvando ? t('cabecalho.salvando') : t('cabecalho.salvar')}
      </Button>
    </div>
  );
}
