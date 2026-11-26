import { describe, expect, it } from 'vitest';
import enSessao from '../locales/en/sessionPage.json';
import ptSessao from '../locales/pt-BR/sessionPage.json';
import ruSessao from '../locales/ru/sessionPage.json';
import zhSessao from '../locales/zh-Hans/sessionPage.json';

// Fonte: `defp catalogo` de `lib/engine/dev/explicacao_do_bloqueio.ex` do brabo-engine (dev, AT-1021,
// RN-1529): os 25 códigos do catálogo e as causas pt-BR, letra a letra; os ids de ação do mesmo arquivo
// são `tentar_de_novo` e `aumentar_o_teto`. Catálogo novo no engine pede entrada aqui e nas 4 línguas.
const CAUSAS_PT: Record<string, string> = {
  reinicio_do_engine: 'O sistema foi reiniciado enquanto a tarefa estava em andamento.',
  falha_de_contexto: 'Não foi possível reunir as informações da tarefa para o agente continuar.',
  push_nao_aprovado: 'O envio do trabalho ao repositório não foi aprovado, então a tarefa parou.',
  push_falhou: 'Não foi possível enviar o trabalho ao repositório do projeto.',
  commit_recusado: 'O commit ou o envio da correção foi recusado, então a tarefa parou.',
  pr_nao_aberta: 'A PR não foi aberta porque as ações de git da tarefa não foram aprovadas.',
  retomada_da_branch: 'Não foi possível retomar a branch da PR que está em conflito.',
  conflito_de_integracao: 'O trabalho entrou em conflito com a versão mais nova do projeto e o agente não o resolveu.',
  conflito_de_merge: 'A PR ficou em conflito com a versão mais nova do projeto e nenhum agente pôde resolvê-lo.',
  credencial_de_git: 'A chave de acesso ao repositório não pode ser usada nesta máquina de execução.',
  falha_no_worktree: 'Não foi possível preparar a pasta de trabalho da tarefa.',
  worktree_diverge: 'A pasta de trabalho e a branch publicada estão em versões diferentes.',
  orcamento_excedido: 'O limite de gasto desta tarefa foi atingido, e só você pode liberar mais.',
  limite_de_iteracoes: 'O agente usou todas as tentativas da tarefa sem conseguir concluir.',
  limite_de_iteracoes_correcao: 'O agente usou todas as tentativas da correção sem conseguir concluí-la.',
  credito_do_provedor: 'O crédito do provedor do modelo acabou, então o agente parou.',
  limite_de_uso: 'O provedor do modelo atingiu o limite de uso e o agente precisou parar.',
  falha_de_rede: 'A conexão com o provedor do modelo caiu; a tarefa volta sozinha em alguns minutos.',
  resposta_cortada: 'O modelo gastou todo o espaço da resposta pensando e não chegou a agir.',
  parada_sem_sinal: 'O agente parou sem concluir a tarefa e sem dizer o motivo.',
  qa_instancia_indisponivel: 'A QA de Automação não conseguiu subir o ambiente de teste.',
  qa_espera_esgotada: 'O ambiente de teste demorou demais para ficar pronto.',
  gate_bloqueado: 'A verificação da tarefa parou antes de dar o parecer.',
  sessao_encerrada: 'A sessão de execução foi encerrada com a tarefa em andamento.',
  generico: 'O agente parou e precisa de você para continuar.',
};
const ACOES = ['tentar_de_novo', 'aumentar_o_teto'];
const LINGUAS = { 'pt-BR': ptSessao, en: enSessao, ru: ruSessao, 'zh-Hans': zhSessao };

describe('catálogo de bloqueios no i18n (AT-1021)', () => {
  it('a lista fixada tem os 25 códigos do catálogo do engine', () => {
    expect(Object.keys(CAUSAS_PT)).toHaveLength(25);
  });

  for (const [lingua, json] of Object.entries(LINGUAS)) {
    const b = json.pendencias.bloqueadas as { causas: Record<string, string>; acoes: Record<string, string> };
    it(`${lingua}: todo código tem causa e toda ação tem rótulo`, () => {
      for (const codigo of Object.keys(CAUSAS_PT)) expect(b.causas[codigo], `${lingua} sem causa de ${codigo}`).toBeTruthy();
      for (const id of ACOES) expect(b.acoes[id], `${lingua} sem rótulo de ${id}`).toBeTruthy();
    });
  }

  it('pt-BR é igual, letra a letra, à frase do catálogo do engine', () => {
    expect(ptSessao.pendencias.bloqueadas.causas).toEqual(CAUSAS_PT);
  });
});
