import '@xyflow/react/dist/style.css';
import type { CSSProperties } from 'react';

import { MarkerType, Position, type Edge, type Node } from '@xyflow/react';

import type { ModuloDoGrafo } from './canvas';

export function camadas(modulos: ModuloDoGrafo[]): Map<string, number> {
  const porNome = new Map(modulos.map((m) => [m.name, m]));
  const memo = new Map<string, number>();
  const visitar = (nome: string, pilha: Set<string>): number => {
    const feito = memo.get(nome);
    if (feito !== undefined) return feito;
    if (pilha.has(nome)) return 0;
    pilha.add(nome);
    const deps = (porNome.get(nome)?.dependsOn ?? []).filter((d) => porNome.has(d));
    const camada = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((d) => visitar(d, pilha)));
    pilha.delete(nome);
    memo.set(nome, camada);
    return camada;
  };
  modulos.forEach((m) => visitar(m.name, new Set()));
  return memo;
}

/* AT-972 (RN-1475): o texto dos nós nunca fica abaixo disto no zoom inicial (que é 1). */
export const FONTE_MIN_DO_NO = 12.5;

export const CONTROLES = {
  '--xy-controls-button-background-color': 'var(--surface-2)',
  '--xy-controls-button-background-color-hover': 'var(--surface-2)',
  '--xy-controls-button-color': 'var(--text-primary)',
  '--xy-controls-button-border-color': 'var(--border-strong)',
} as CSSProperties;

export function grafoDe(modulos: ModuloDoGrafo[]): { nos: Node[]; arestas: Edge[] } {
  const camada = camadas(modulos);
  const porCamada = new Map<number, number>();
  for (const c of camada.values()) porCamada.set(c, (porCamada.get(c) ?? 0) + 1);
  const topo = Math.max(0, ...camada.values());
  const contagem = new Map<number, number>();
  const nos: Node[] = modulos.map((m) => {
    const c = camada.get(m.name) ?? 0;
    const i = contagem.get(c) ?? 0;
    contagem.set(c, i + 1);
    return {
      id: m.name,
      // v11 (AT-972): fluxo da esquerda para a direita; quem não depende de ninguém fica à direita, cada camada centrada em y=0.
      position: { x: (topo - c) * 260, y: (i - ((porCamada.get(c) ?? 1) - 1) / 2) * 84 },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: {
        label: (
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
            <div title={m.stack} style={{ fontSize: FONTE_MIN_DO_NO, opacity: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.stack}
            </div>
          </div>
        ),
      },
      style: {
        background: 'var(--surface-2)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 8,
        fontSize: FONTE_MIN_DO_NO,
        width: 200,
      },
    };
  });
  const nomes = new Set(modulos.map((m) => m.name));
  const arestas: Edge[] = modulos.flatMap((m) =>
    m.dependsOn
      .filter((d) => nomes.has(d))
      .map((d) => ({
        id: `${m.name}->${d}`,
        source: m.name,
        target: d,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: 'var(--border-strong)' },
      })),
  );

  return { nos, arestas };
}
