import '@xyflow/react/dist/style.css';

import { useTranslation } from 'react-i18next';
import { Background, Controls, ReactFlow } from '@xyflow/react';

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
  if (modulos.length === 0) return <p data-slot="ai-canvas-vazio">{t('grafo.vazio')}</p>;
  const { nos, arestas } = grafoDe(modulos);
  return (
    <div data-slot="ai-canvas" className="h-96 w-full overflow-hidden rounded-lg border bg-card" style={CONTROLES}>
      <ReactFlow nodes={nos} edges={arestas} nodesConnectable={false} fitView proOptions={{ hideAttribution: true }}>
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
