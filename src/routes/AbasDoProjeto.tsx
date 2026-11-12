import { useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  Code2, LayoutDashboard, Layers, ListTodo, MessagesSquare, Settings, ShieldCheck, Wallet,
  type LucideIcon,
} from 'lucide-react';
import styles from './AbasDoProjeto.module.css';

// Um ícone por seção (prévia P10).
const ICONES: Record<string, LucideIcon> = {
  overview: LayoutDashboard, sessoes: MessagesSquare, trabalho: ListTodo, codigo: Code2,
  decisoes: ShieldCheck, arquitetura: Layers, spend: Wallet, settings: Settings,
};

/** Um item da lista: uma SEÇÃO. `key` é a primeira sub-aba (o destino do link). */
export interface FolhaDaLista {
  key: string;
  /** A chave da seção (ícone). */
  secao: string;
  label: string;
  /** Todas as sub-abas da seção: o item é o ativo quando `active` é uma delas. */
  chaves: string[];
  /** Só quando UMA fila alimenta a seção; nunca soma de filas (RN-467). */
  count?: number;
  /** Ponto de presença: seção alimentada por mais de uma fila. */
  presenca?: boolean;
}

export type ItemDaLista = FolhaDaLista;

interface AbasDoProjetoProps {
  projectId: string;
  /** Nomeia a lista para a tecnologia assistiva — há uma por projeto aberto. */
  nomeDoProjeto: string;
  itens: ItemDaLista[];
  /** A aba selecionada agora, ou `undefined` quando este projeto não está aberto. */
  active: string | undefined;
  onChange: (key: string) => void;
}

const TECLAS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

/**
 * As abas do projeto na SIDEBAR — a única navegação do projeto desde o ADR
 * 0211, que tirou o trilho vertical (ADR 0126) e trouxe para cá tudo o que só
 * ele tinha: os três grupos abertos, a aba ativa marcada, os cinco contadores
 * (Insights, PRs, Aprovações, Backlog, Arquitetura) SEPARADOS — o cabeçalho do
 * grupo nunca soma as filhas —, e o teclado.
 *
 * ## Teclado
 *
 * `ArrowDown`/`ArrowUp`/`Home`/`End` com volta (wrap), atravessando a
 * fronteira de grupo: a mesma régua do trilho. A seta MOVE o foco e troca de
 * aba, como a seleção automática de um `tablist`.
 *
 * ## Endereço
 *
 * Cada aba é link de verdade (`/projects/<id>?tab=<chave>`, AT-394): o botão
 * do meio/Ctrl abre noutra aba do navegador; o clique simples chama
 * `onChange`, que navega no lugar.
 */
export function AbasDoProjeto({ projectId, nomeDoProjeto, itens, active, onChange }: AbasDoProjetoProps) {
  const { t } = useTranslation('shell');
  const refs = useRef(new Map<string, HTMLAnchorElement | null>());

  const folhas = useMemo<FolhaDaLista[]>(
    () => itens,
    [itens],
  );

  // A ativa é trazida para dentro da área visível da sidebar — a lista de
  // projetos rola, e a aba aberta pode nascer abaixo da dobra.
  // `scrollIntoView` opcional porque o jsdom não o implementa.
  useEffect(() => {
    if (!active) return;
    refs.current.get(active)?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  function aoTeclar(e: KeyboardEvent<HTMLElement>) {
    if (!TECLAS.includes(e.key) || folhas.length === 0) return;
    const focado = folhas.findIndex((f) => refs.current.get(f.key) === document.activeElement);
    const ancora =
      focado === -1 ? Math.max(0, folhas.findIndex((f) => active !== undefined && f.chaves.includes(active))) : focado;
    let proximo = ancora;
    if (e.key === 'Home') proximo = 0;
    else if (e.key === 'End') proximo = folhas.length - 1;
    else proximo = (ancora + (e.key === 'ArrowDown' ? 1 : -1) + folhas.length) % folhas.length;
    e.preventDefault();
    const alvo = folhas[proximo];
    if (!alvo) return;
    refs.current.get(alvo.key)?.focus();
    onChange(alvo.key);
  }

  function folha(item: FolhaDaLista) {
    const ativo = active !== undefined && item.chaves.includes(active);
    return (
      <a
        key={item.key}
        ref={(el) => {
          refs.current.set(item.key, el);
        }}
        href={`/projects/${encodeURIComponent(projectId)}?tab=${encodeURIComponent(item.key)}`}
        role="tab"
        aria-selected={ativo}
        // Roving tabindex: um ponto de parada por lista no Tab, e as setas
        // andam dentro dela. Sem ativa (projeto fechado), a primeira recebe.
        tabIndex={ativo || (!active && item.key === folhas[0]?.key) ? 0 : -1}
        className={[styles.item, ativo && styles.itemAtivo].filter(Boolean).join(' ')}
        onClick={(e) => {
          if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault();
          onChange(item.key);
        }}
      >
        {(() => {
          const Icone = ICONES[item.secao];
          return Icone ? <Icone size={16} aria-hidden="true" className={styles.itemIcone} /> : null;
        })()}
        <span className={styles.itemLabel}>{item.label}</span>
        {item.count !== undefined && item.count > 0 && (
          <span className={styles.contador}>{item.count}</span>
        )}
        {item.presenca && <span className={styles.presenca} aria-hidden="true" />}
      </a>
    );
  }

  return (
    // `role="presentation"` nos invólucros: um `tablist` só POSSUI `tab`s, e é
    // o que mantém as 12 abas filhas diretas da lista para a tecnologia
    // assistiva mesmo agrupadas visualmente.
    <div
      className={styles.lista}
      role="tablist"
      aria-orientation="vertical"
      aria-label={t('sidebar.projects.tabsAriaLabel', { name: nomeDoProjeto })}
      onKeyDown={aoTeclar}
    >
      {itens.map(folha)}
    </div>
  );
}
