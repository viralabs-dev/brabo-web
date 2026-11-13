import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18next from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import authEn from '../locales/en/auth.json';
import authPtBR from '../locales/pt-BR/auth.json';
import { LoginPage } from './LoginPage';

/**
 * A coluna de identidade e ambiente do login.
 *
 * `LoginPage.test.tsx` guarda o que a tela diz sobre a CREDENCIAL (o 401
 * uniforme, o aviso de migração); este arquivo guarda o que ela diz sobre o
 * AMBIENTE — e, sobretudo, o que ela continua fazendo quando o ambiente não
 * responde.
 *
 * O risco desta mudança tem nome: a primeira tela do produto passou a fazer
 * uma chamada de rede que ela não fazia. Se essa chamada puder atrasar,
 * esconder ou travar o formulário, a tela de login inteira fica refém do
 * `/health` — e o `/health` da api caindo é exatamente o momento em que
 * alguém mais precisa que a tela ao menos ABRA para poder ler que caiu. Os
 * dois casos abaixo (sonda que rejeita, sonda que nunca volta) são a prova de
 * que ela não fica.
 */
function novaInstanciaI18n() {
  const instancia = i18next.createInstance();
  void instancia.use(initReactI18next).init({
    resources: { en: { auth: authEn }, 'pt-BR': { auth: authPtBR } },
    lng: 'pt-BR',
    fallbackLng: 'pt-BR',
    defaultNS: 'auth',
    ns: ['auth'],
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instancia;
}

function montar(onEntrar = vi.fn().mockResolvedValue({ ok: true })) {
  const irPara = vi.fn();
  const r = render(
    <I18nextProvider i18n={novaInstanciaI18n()}>
      <LoginPage onEntrar={onEntrar} irPara={irPara} />
    </I18nextProvider>,
  );
  return { ...r, onEntrar, irPara };
}

function esperarFormulario() {
  expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
  expect(screen.getByLabelText('Senha')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('LoginPage — coluna de identidade e ambiente', () => {
  it('mostra a identidade do produto ao lado do formulário, sem virar cabeçalho', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    montar();

    // A frase de identidade e o bloco de ambiente: as DUAS metades da coluna
    // da esquerda.
    expect(
      screen.getByText(/Um time de agentes conduz sua aplicação do brief ao deploy/i),
    ).toBeInTheDocument();
    expect(screen.getByText('verificando api e engine…')).toBeInTheDocument();

    // E o formulário, do outro lado.
    esperarFormulario();

    // Um `<h1>` só continua sendo a regra da moldura: nada da coluna nova
    // entrou como cabeçalho (senão a lista do leitor de tela passaria a
    // começar por "Ambiente" em vez de "Entrar").
    const cabecalhos = screen.getAllByRole('heading');
    expect(cabecalhos).toHaveLength(1);
    expect(cabecalhos[0]).toHaveTextContent('Entrar');
  });

  it('a versão continua com UMA fonte: o rodapé, não o bloco de ambiente', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    montar();

    // `getByText` (não `getAllByText`) é a asserção: duas cópias fariam este
    // teste falhar, que é o ponto — duas renderizações da mesma
    // `runtimeConfig.version` é como uma delas envelhece.
    expect(screen.getByText('dev')).toBeInTheDocument();
  });

  it('com a api fora do ar, o formulário renderiza e continua submetível', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    );

    const { onEntrar, irPara } = montar();

    // A sonda falha nos dois serviços — e diz isso.
    await waitFor(() => {
      expect(screen.getByText('api e engine sem resposta')).toBeInTheDocument();
    });

    // O formulário não foi afetado: o login é uma requisição INDEPENDENTE, e
    // quem sabe se ele funcionou é o `POST /auth/login`, não o `/health`.
    esperarFormulario();
    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'fulano@brabo.dev' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'uma senha comprida' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => {
      expect(onEntrar).toHaveBeenCalledWith(
        'fulano@brabo.dev',
        'uma senha comprida',
      );
    });
    expect(irPara).toHaveBeenCalledWith('/');
  });

  it('com a sonda pendurada, o formulário aparece na hora — sem esperar por ela', async () => {
    // Uma api que ACEITA a conexão e nunca responde é o pior caso: sem
    // rejeição para o `.catch` pegar, um formulário que dependesse do estado
    // da sonda ficaria em branco indefinidamente.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const { onEntrar } = montar();

    esperarFormulario();
    expect(screen.getByText('verificando api e engine…')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('E-mail'), {
      target: { value: 'fulano@brabo.dev' },
    });
    fireEvent.change(screen.getByLabelText('Senha'), {
      target: { value: 'uma senha comprida' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(onEntrar).toHaveBeenCalled());
  });

  it('com api e engine respondendo, diz numa linha só que estão no ar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify({ status: 'ok' }), { status: 200 })),
      ),
    );

    const { container } = montar();

    await waitFor(() => {
      expect(screen.getByText('api e engine no ar')).toBeInTheDocument();
    });
    // Antes da identidade não há runner nem modelos locais para afirmar.
    expect(container.textContent).not.toMatch(/Ollama|runner/i);
  });

  it('mostra um chip por papel de topo, com a inicial', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {})),
    );

    const { container } = montar();

    const chips = [...container.querySelectorAll('ul[aria-hidden] li')].map((l) => l.textContent);
    expect(chips).toEqual(['C', 'P', 'A', 'D', 'Q', 'S', 'I']);
  });
});
