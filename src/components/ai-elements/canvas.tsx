import '@xyflow/react/dist/style.css';

import { useTranslation } from 'react-i18next';
import { useRef } from 'react';
import { Background, Controls, Panel, ReactFlow, useReactFlow, type ReactFlowInstance } from '@xyflow/react';

import { Button } from '@/components/ui/Button';
import { CONTROLES, grafoDe } from './canvas.helpers';
export interface ModuloDoGrafo {
  name: string;
  stack: string;
  dependsOn: string[];
}

/* Camada de cada módulo = 1 + a maior camada das dependências (o corte do ciclo evita laço infinito). */

/* Controles de zoom pelos tokens do tema (a lib traz branco fixo). */

/* Grafo de módulos (AT-684): nós = módulos, arestas = dependsOn, derivados do module_map vigente. */

export function Canvas({ modulos }: { modulos: ModuloDoGrafo[] }) {
  const { t } = useTranslation('overview');
  const area = useRef<HTMLDivElement>(null);
  if (modulos.length === 0) return <p data-slot="ai-canvas-vazio">{t('grafo.vazio')}</p>;
  const { nos, arestas } = grafoDe(modulos);
  return (
    // AT-972 (RN-1475): 300 px de altura, 420 px com altura útil acima de 1000 px.
    <div
      ref={area}
      data-slot="ai-canvas"
      className="h-[300px] w-full overflow-hidden rounded-lg border bg-card [@media(min-height:1000px)]:h-[420px]"
      style={CONTROLES}
    >
      <ReactFlow
        nodes={nos}
        edges={arestas}
        nodesConnectable={false}
        minZoom={0.2}
        onInit={(rf) => zoomInicial(rf, area.current)}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <Panel position="bottom-left" style={{ marginLeft: 56 }}>
          <AjustarALargura />
        </Panel>
      </ReactFlow>
    </div>
  );
}

/* Zoom inicial = 1 (texto de 12,5 px ou mais). Se o grafo não cabe na largura, começa na borda esquerda e se arrasta na horizontal. */
function zoomInicial(rf: ReactFlowInstance, area: HTMLElement | null) {
  const b = rf.getNodesBounds(rf.getNodes());
  const largura = area?.clientWidth ?? 0;
  if (largura && b.width + 48 > largura) {
    void rf.setViewport({ x: 24 - b.x, y: (area?.clientHeight ?? 0) / 2 - (b.y + b.height / 2), zoom: 1 });
  } else {
    void rf.fitView({ minZoom: 1, maxZoom: 1 });
  }
}

function AjustarALargura() {
  const { t } = useTranslation('overview');
  const rf = useReactFlow();
  return (
    <Button variant="secondary" size="sm" onClick={() => void rf.fitView({ padding: 0.1, duration: 0 })}>
      {t('c4.fitWidth')}
    </Button>
  );
}
