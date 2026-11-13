import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHAVE_ABA_ATIVA,
  CHAVE_COLAPSADO,
  CHAVE_PROJETO_ATIVO,
  corDoProjeto,
  gravarAbaAtiva,
  gravarColapsado,
  gravarProjetoAtivo,
  lerAbaAtiva,
  lerColapsado,
  lerProjetoAtivo,
} from './sidebar-state';

/**
 * Persistência da sidebar (PROGRAMA 28, Onda 2 — RN-195..201).
 *
 * As chaves são as do handoff, ao pé da letra
 * (`design_handoff_brabo/CHECKLIST-CONFRONTO.md`, seção 1) — os testes de
 * chave literal são o que impede uma delas de ser renomeada por engano numa
 * refatoração futura.
 */

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sidebar-state — chaves exatas do handoff', () => {
  it('usa os literais documentados, não variações', () => {
    expect(CHAVE_COLAPSADO).toBe('brabo.sidebar.collapsed');
    expect(CHAVE_PROJETO_ATIVO).toBe('brabo.project');
    expect(CHAVE_ABA_ATIVA).toBe('brabo.tab');
  });
});

describe('colapso — caminho feliz', () => {
  it('sem nada gravado, começa expandido', () => {
    expect(lerColapsado()).toBe(false);
  });

  it('gravar e ler o mesmo valor, nos dois sentidos', () => {
    gravarColapsado(true);
    expect(lerColapsado()).toBe(true);
    expect(window.localStorage.getItem(CHAVE_COLAPSADO)).toBe('1');

    gravarColapsado(false);
    expect(lerColapsado()).toBe(false);
    expect(window.localStorage.getItem(CHAVE_COLAPSADO)).toBe('0');
  });
});

describe('localStorage que lança', () => {
  it('não derruba leitura nem escrita', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });

    expect(lerColapsado()).toBe(false);
    expect(() => gravarColapsado(true)).not.toThrow();
  });
});

describe('projeto e aba ativos — caminho feliz', () => {
  it('sem nada gravado, null', () => {
    expect(lerProjetoAtivo()).toBeNull();
    expect(lerAbaAtiva()).toBeNull();
  });

  it('gravar e reler', () => {
    gravarProjetoAtivo('project-1');
    expect(lerProjetoAtivo()).toBe('project-1');

    gravarAbaAtiva('code');
    expect(lerAbaAtiva()).toBe('code');
  });
});

describe('corDoProjeto', () => {
  it('é estável — o MESMO id sempre devolve a MESMA cor', () => {
    expect(corDoProjeto('project-abc')).toBe(corDoProjeto('project-abc'));
  });

  it('ids diferentes tendem a cores diferentes (paleta com mais de uma cor)', () => {
    const cores = new Set(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map(corDoProjeto));
    // Não é garantia de bijeção (hash pode colidir) — só que a função não
    // devolve a MESMA cor sempre, o que tornaria a "identidade" inútil.
    expect(cores.size).toBeGreaterThan(1);
  });

  it('sempre devolve um token CSS var(--...)', () => {
    expect(corDoProjeto('qualquer-id')).toMatch(/^var\(--[\w-]+\)$/);
  });
});
