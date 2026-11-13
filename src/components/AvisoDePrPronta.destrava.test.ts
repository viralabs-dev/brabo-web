import { describe, expect, it } from 'vitest';
import type { Epic, ModuleMap, Task } from '../lib/api-types';
import { tarefasQueODestrava } from './AvisoDePrPronta.helpers';

/** AT-902 (RN-1063): "destrava N" = todo dos módulos dependentes, se a tarefa fecha o módulo. */
const tarefa = (id: string, module: string, status: string) => ({ id, module, status }) as unknown as Task;
const epicos = (tasks: Task[]) => [{ stories: [{ id: 's', tasks }] }] as unknown as Epic[];
const mapa = { modules: [{ name: 'base', dependsOn: [] }, { name: 'api', dependsOn: ['base'] }, { name: 'web', dependsOn: ['api'] }] } as unknown as ModuleMap;

describe('tarefasQueODestrava', () => {
  const fundacao = tarefa('f', 'base', 'in_review');
  const dependentes = [tarefa('a1', 'api', 'todo'), tarefa('a2', 'api', 'todo'), tarefa('a3', 'api', 'in_progress'), tarefa('w1', 'web', 'todo')];

  it('soma as todo dos dependentes diretos quando é a última aberta do módulo', () => {
    expect(tarefasQueODestrava(fundacao, epicos([fundacao, tarefa('f0', 'base', 'done'), ...dependentes]), mapa)).toBe(2);
  });

  it('zero quando o módulo ainda tem outra tarefa aberta', () => {
    expect(tarefasQueODestrava(fundacao, epicos([fundacao, tarefa('f2', 'base', 'todo'), ...dependentes]), mapa)).toBe(0);
  });

  it('zero sem module_map ou sem tarefa', () => {
    expect(tarefasQueODestrava(fundacao, epicos([fundacao, ...dependentes]), null)).toBe(0);
    expect(tarefasQueODestrava(undefined, epicos([]), mapa)).toBe(0);
  });
});
