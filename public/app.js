/* Gerenciador de Obras - site em JavaScript puro (sem build). */

const $app = document.getElementById('app');
const STATUS_OBRA = ['Planejada', 'Em andamento', 'Concluída', 'Cancelada'];

const estado = {
  token: localStorage.getItem('token'),
  usuario: JSON.parse(localStorage.getItem('usuario') || 'null'),
};

/* ------------------------------- Utilitários ------------------------------- */

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmtData = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-');
const fmtDataHora = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const fmtQtd = (n) => Number(n).toLocaleString('pt-BR');
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '-');
const selo = (status) => `<span class="selo selo-${slug(status)}">${esc(status)}</span>`;
const hojeISO = () => new Date().toISOString().slice(0, 10);

function toast(mensagem, tipo = 'ok') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.setAttribute('role', tipo === 'erro' ? 'alert' : 'status');
  el.textContent = mensagem;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), 4500);
}

async function api(caminho, { metodo = 'GET', corpo, form, blob } = {}) {
  const headers = {};
  if (estado.token) headers.Authorization = `Bearer ${estado.token}`;
  let body;
  if (form) {
    body = form;
  } else if (corpo) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(corpo);
  }
  const r = await fetch(`/api${caminho}`, { method: metodo, headers, body });
  if (r.status === 401 && estado.token) {
    sair();
    throw new Error('Sessão expirada. Entre novamente.');
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.mensagem || 'Algo deu errado. Tente novamente.');
  }
  if (r.status === 204) return null;
  return blob ? r.blob() : r.json();
}

function salvarSessao({ token, usuario }) {
  estado.token = token;
  estado.usuario = usuario;
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function sair() {
  estado.token = null;
  estado.usuario = null;
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  location.hash = '#/login';
}

// Liga um formulário a uma função assíncrona, tratando botão e mensagem de erro.
function aoEnviar(form, fn) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const botao = form.querySelector('button[type=submit]');
    const erro = form.querySelector('.erro-form');
    erro.hidden = true;
    botao.disabled = true;
    try {
      await fn(new FormData(form));
    } catch (err) {
      erro.textContent = err.message;
      erro.hidden = false;
      botao.disabled = false;
    }
  });
}

function casca(html) {
  $app.innerHTML = `
    <div class="fita" aria-hidden="true"></div>
    <header class="topo">
      <a class="marca" href="#/obras">Gerenciador de Obras</a>
      <nav>
        <span class="usuario">${esc(estado.usuario?.nome)}</span>
        <button type="button" class="btn-link" id="sair">Sair</button>
      </nav>
    </header>
    <main class="conteudo">${html}</main>`;
  document.getElementById('sair').onclick = sair;
}

async function baixarPdf(id, nome) {
  try {
    const blob = await api(`/requisicoes/${id}/pdf`, { blob: true });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome}.pdf`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch (e) {
    toast(e.message, 'erro');
  }
}

/* --------------------------- Login e cadastro --------------------------- */

function entrada(titulo, formulario, rodape) {
  $app.innerHTML = `
    <div class="entrada">
      <aside class="entrada-lado">
        <div class="fita" aria-hidden="true"></div>
        <div class="lado-texto">
          <h1>Gerenciador de Obras</h1>
          <p>Cadastre a obra, acompanhe o andamento pelas fotos e registre cada pedido de material com PDF.</p>
        </div>
      </aside>
      <section class="entrada-form">
        <h2>${titulo}</h2>
        ${formulario}
        ${rodape}
      </section>
    </div>`;
}

function telaLogin() {
  entrada(
    'Entrar',
    `<form id="form">
      <label class="campo">E-mail<input name="email" type="email" autocomplete="username" required></label>
      <label class="campo">Senha<input name="senha" type="password" autocomplete="current-password" required></label>
      <p class="erro-form" role="alert" hidden></p>
      <div class="form-acoes"><button class="btn btn-primario" type="submit">Entrar</button></div>
    </form>`,
    `<p class="troca">Ainda não tem conta? <a href="#/cadastro">Criar conta</a></p>
     <div class="teste dica">Conta de teste: carlos@obras.com, senha senha123.
       <button type="button" class="btn-link" id="preencher">Preencher</button></div>`
  );
  const form = document.getElementById('form');
  document.getElementById('preencher').onclick = () => {
    form.email.value = 'carlos@obras.com';
    form.senha.value = 'senha123';
  };
  aoEnviar(form, async (dados) => {
    salvarSessao(await api('/auth/login', { metodo: 'POST', corpo: Object.fromEntries(dados) }));
    location.hash = '#/obras';
  });
}

function telaCadastro() {
  entrada(
    'Criar conta',
    `<form id="form">
      <label class="campo">Nome<input name="nome" autocomplete="name" required></label>
      <label class="campo">E-mail<input name="email" type="email" autocomplete="username" required></label>
      <label class="campo">Senha (mínimo de 6 caracteres)<input name="senha" type="password" minlength="6" autocomplete="new-password" required></label>
      <p class="erro-form" role="alert" hidden></p>
      <div class="form-acoes"><button class="btn btn-primario" type="submit">Criar conta</button></div>
    </form>`,
    `<p class="troca">Já tem conta? <a href="#/login">Entrar</a></p>`
  );
  aoEnviar(document.getElementById('form'), async (dados) => {
    salvarSessao(await api('/auth/cadastro', { metodo: 'POST', corpo: Object.fromEntries(dados) }));
    location.hash = '#/obras';
  });
}

/* ---------------------------------- Obras ---------------------------------- */

function linhaObra(o) {
  return `
    <a class="obra" href="#/obras/${o.id}">
      <div><strong>${esc(o.titulo)}</strong><small>${esc(o.endereco || 'Endereço não informado')}</small></div>
      <div>${selo(o.status)}</div>
      <div><span class="meta-rotulo">Início previsto</span>${fmtData(o.dataInicioPrevista)}</div>
      <div><span class="meta-rotulo">Responsável</span>${esc(o.criadoPor?.nome)}</div>
      <div><span class="meta-rotulo">Fotos e requisições</span>${o.totalFotos} e ${o.totalRequisicoes}</div>
    </a>`;
}

async function telaObras() {
  casca(`
    <div class="pagina-cab">
      <h1>Obras</h1>
      <a class="btn btn-primario" href="#/obras/nova">Cadastrar obra</a>
    </div>
    <div class="filtro">
      <label>Status
        <select id="filtro">
          <option value="">Todos</option>
          ${STATUS_OBRA.map((s) => `<option>${s}</option>`).join('')}
        </select>
      </label>
    </div>
    <div id="lista"><p class="vazio">Carregando obras...</p></div>`);

  const lista = document.getElementById('lista');
  const filtro = document.getElementById('filtro');
  const carregar = async () => {
    try {
      const obras = await api(`/obras${filtro.value ? `?status=${encodeURIComponent(filtro.value)}` : ''}`);
      lista.innerHTML = obras.length
        ? obras.map(linhaObra).join('')
        : '<p class="vazio">Nenhuma obra encontrada. Cadastre a primeira para começar.</p>';
    } catch (e) {
      toast(e.message, 'erro');
    }
  };
  filtro.onchange = carregar;
  await carregar();
}

function telaNovaObra() {
  casca(`
    <a class="voltar" href="#/obras">Voltar para obras</a>
    <h1>Cadastrar obra</h1>
    <form id="form" class="painel" style="margin-top:1.25rem">
      <div class="form-grade">
        <label class="campo largo">Nome da obra<input name="titulo" maxlength="150" required></label>
        <label class="campo">Início previsto<input name="dataInicioPrevista" type="date" required></label>
        <label class="campo">Status
          <select name="status">${STATUS_OBRA.map((s) => `<option>${s}</option>`).join('')}</select>
        </label>
        <label class="campo largo">Endereço<input name="endereco"></label>
        <label class="campo largo">Descrição<textarea name="descricao"></textarea></label>
      </div>
      <p class="erro-form" role="alert" hidden></p>
      <div class="form-acoes">
        <button class="btn btn-primario" type="submit">Cadastrar obra</button>
        <a href="#/obras">Cancelar</a>
      </div>
    </form>`);
  aoEnviar(document.getElementById('form'), async (dados) => {
    const obra = await api('/obras', { metodo: 'POST', corpo: Object.fromEntries(dados) });
    toast('Obra cadastrada.');
    location.hash = `#/obras/${obra.id}`;
  });
}

async function telaObra(id) {
  casca('<p class="vazio">Carregando obra...</p>');
  const [obra, fotos, requisicoes] = await Promise.all([
    api(`/obras/${id}`),
    api(`/obras/${id}/fotos`),
    api(`/obras/${id}/requisicoes`),
  ]);
  const cancelada = obra.status === 'Cancelada';

  const galeria = fotos.length
    ? `<div class="galeria">${fotos
        .map(
          (f, i) => `
        <article class="foto">
          <button type="button" class="foto-abrir" data-foto="${i}" aria-label="Ampliar foto">
            <img src="${esc(f.url)}" alt="Foto da obra enviada por ${esc(f.enviadoPor?.nome)}" loading="lazy">
            <span>${fmtData(f.enviadoEm)} por ${esc(f.enviadoPor?.nome)}</span>
          </button>
          ${cancelada ? '' : `<button type="button" class="btn btn-pequeno foto-excluir" data-excluir-foto="${esc(f.id)}">Excluir foto</button>`}
        </article>`
        )
        .join('')}</div>`
    : '<p class="vazio">Nenhuma foto ainda. Adicione fotos para registrar o andamento da obra.</p>';

  const tabela = requisicoes.length
    ? `<div class="tabela-rolagem"><table>
        <thead><tr><th>Código</th><th>Data</th><th>Solicitante</th><th>Criada em</th><th class="num">Itens</th><th>Status</th><th></th></tr></thead>
        <tbody>${requisicoes
          .map(
            (r) => `<tr>
          <td><a href="#/requisicoes/${r.id}">${esc(r.codigo)}</a></td>
          <td>${fmtData(r.data)}</td>
          <td>${esc(r.solicitante?.nome)}</td>
          <td>${fmtDataHora(r.createdAt)}</td>
          <td class="num">${r.itens.length}</td>
          <td>${selo(r.status)}</td>
          <td><button type="button" class="btn btn-pequeno" data-pdf="${r.id}" data-codigo="${esc(r.codigo)}">Baixar PDF</button></td>
        </tr>`
          )
          .join('')}</tbody></table></div>`
    : '<p class="vazio">Nenhuma requisição de material nesta obra.</p>';

  casca(`
    <a class="voltar" href="#/obras">Voltar para obras</a>
    <header class="cab-obra">
      <div><h1>${esc(obra.titulo)}</h1>${obra.descricao ? `<p>${esc(obra.descricao)}</p>` : ''}</div>
      <form id="form-status-obra" class="form-status-obra">
        <label class="campo">Status
          <select name="status">${STATUS_OBRA.map((status) => `<option ${status === obra.status ? 'selected' : ''}>${esc(status)}</option>`).join('')}</select>
        </label>
        <button class="btn btn-primario" type="submit">Atualizar status</button>
      </form>
    </header>
    <dl class="ficha">
      <div><dt>Início previsto</dt><dd>${fmtData(obra.dataInicioPrevista)}</dd></div>
      <div><dt>Responsável pelo cadastro</dt><dd>${esc(obra.criadoPor?.nome)}</dd></div>
      <div><dt>Endereço</dt><dd>${esc(obra.endereco || 'Não informado')}</dd></div>
      <div><dt>Cadastrada em</dt><dd>${fmtDataHora(obra.createdAt)}</dd></div>
    </dl>
    ${cancelada ? '<p class="aviso">Esta obra foi cancelada e está disponível apenas para consulta.</p>' : ''}

    <section class="bloco">
      <div class="secao-cab">
        <h2>Fotos do andamento</h2>
        ${
          cancelada
            ? ''
            : `<label class="btn btn-primario" for="arquivos">Adicionar fotos</label>
               <input id="arquivos" type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden>`
        }
      </div>
      ${galeria}
    </section>

    <section class="bloco">
      <div class="secao-cab">
        <h2>Requisições de material</h2>
        ${cancelada ? '' : `<a class="btn btn-primario" href="#/obras/${obra.id}/requisicoes/nova">Nova requisição</a>`}
      </div>
      ${tabela}
    </section>`);

  document.getElementById('form-status-obra').onsubmit = async (evento) => {
    evento.preventDefault();
    const status = new FormData(evento.currentTarget).get('status');
    try {
      await api(`/obras/${id}`, { metodo: 'PATCH', corpo: { status } });
      toast('Status da obra atualizado.');
      await telaObra(id);
    } catch (e) {
      toast(e.message, 'erro');
    }
  };

  // Envio de fotos
  const arquivos = document.getElementById('arquivos');
  if (arquivos) {
    arquivos.onchange = async () => {
      if (!arquivos.files.length) return;
      const form = new FormData();
      [...arquivos.files].forEach((f) => form.append('fotos', f));
      try {
        const novas = await api(`/obras/${id}/fotos`, { metodo: 'POST', form });
        toast(novas.length === 1 ? 'Foto adicionada.' : `${novas.length} fotos adicionadas.`);
        await telaObra(id);
      } catch (e) {
        toast(e.message, 'erro');
        arquivos.value = '';
      }
    };
  }

  // Foto ampliada
  const lightbox = document.getElementById('lightbox');
  document.querySelectorAll('[data-foto]').forEach((botao) => {
    botao.onclick = () => {
      const f = fotos[Number(botao.dataset.foto)];
      lightbox.querySelector('img').src = f.url;
      lightbox.querySelector('img').alt = `Foto enviada por ${f.enviadoPor?.nome}`;
      lightbox.querySelector('p').textContent = `${f.nomeOriginal}, enviada por ${f.enviadoPor?.nome} em ${fmtDataHora(f.enviadoEm)}`;
      lightbox.showModal();
    };
  });
  document.querySelectorAll('[data-excluir-foto]').forEach((botao) => {
    botao.onclick = async () => {
      if (!confirm('Excluir esta foto da obra? Esta ação não pode ser desfeita.')) return;
      botao.disabled = true;
      try {
        await api(`/obras/${id}/fotos/${encodeURIComponent(botao.dataset.excluirFoto)}`, { metodo: 'DELETE' });
        toast('Foto excluída.');
        await telaObra(id);
      } catch (e) {
        toast(e.message, 'erro');
        botao.disabled = false;
      }
    };
  });
  document.getElementById('lightbox-fechar').onclick = () => lightbox.close();

  document.querySelectorAll('[data-pdf]').forEach((botao) => {
    botao.onclick = () => baixarPdf(botao.dataset.pdf, botao.dataset.codigo);
  });
}

/* ------------------------- Requisições de material ------------------------- */

const linhaItemForm = () => `
  <div class="item">
    <label>Material<input name="descricao" required></label>
    <label>Quantidade<input name="quantidade" type="number" min="0.01" step="any" required></label>
    <label>Unidade<input name="unidade" placeholder="sc, m³, un"></label>
    <label>Observação<input name="observacao"></label>
    <button type="button" class="btn btn-pequeno" data-remover>Remover</button>
  </div>`;

async function telaNovaRequisicao(obraId) {
  casca('<p class="vazio">Carregando...</p>');
  const obra = await api(`/obras/${obraId}`);
  if (obra.status === 'Cancelada') {
    throw new Error('Esta obra foi cancelada e não aceita novas requisições.');
  }

  casca(`
    <a class="voltar" href="#/obras/${obra.id}">Voltar para ${esc(obra.titulo)}</a>
    <h1>Nova requisição de material</h1>
    <form id="form" class="painel" style="margin-top:1.25rem">
      <div class="form-grade">
        <label class="campo">Data<input name="data" type="date" value="${hojeISO()}" required></label>
        <label class="campo">Observações gerais<input name="observacoes"></label>
      </div>
      <h2 style="margin-top:1.5rem">Materiais</h2>
      <div class="itens" id="itens">${linhaItemForm()}</div>
      <div class="form-acoes"><button type="button" class="btn" id="adicionar">Adicionar material</button></div>
      <p class="erro-form" role="alert" hidden></p>
      <div class="form-acoes">
        <button class="btn btn-primario" type="submit">Registrar requisição</button>
        <a href="#/obras/${obra.id}">Cancelar</a>
      </div>
      <p class="dica">Ao registrar, o PDF da requisição é gerado e fica anexado à obra.</p>
    </form>`);

  const itens = document.getElementById('itens');
  document.getElementById('adicionar').onclick = () => itens.insertAdjacentHTML('beforeend', linhaItemForm());
  itens.addEventListener('click', (e) => {
    if (!e.target.matches('[data-remover]')) return;
    if (itens.children.length === 1) return toast('A requisição precisa ter ao menos um material.', 'erro');
    e.target.closest('.item').remove();
  });

  aoEnviar(document.getElementById('form'), async (dados) => {
    const lista = [...itens.querySelectorAll('.item')].map((linha) => ({
      descricao: linha.querySelector('[name=descricao]').value,
      quantidade: linha.querySelector('[name=quantidade]').value,
      unidade: linha.querySelector('[name=unidade]').value,
      observacao: linha.querySelector('[name=observacao]').value,
    }));
    const r = await api(`/obras/${obraId}/requisicoes`, {
      metodo: 'POST',
      corpo: { data: dados.get('data'), observacoes: dados.get('observacoes'), itens: lista },
    });
    toast(`Requisição ${r.codigo} registrada e PDF gerado.`);
    location.hash = `#/requisicoes/${r.id}`;
  });
}

async function telaRequisicao(id) {
  casca('<p class="vazio">Carregando requisição...</p>');
  const r = await api(`/requisicoes/${id}`);

  casca(`
    <a class="voltar" href="#/obras/${r.obra.id}">Voltar para ${esc(r.obra.titulo)}</a>
    <header class="cab-obra">
      <h1>Requisição ${esc(r.codigo)}</h1>
      ${selo(r.status)}
    </header>
    <dl class="ficha">
      <div><dt>Obra</dt><dd><a href="#/obras/${r.obra.id}">${esc(r.obra.titulo)}</a></dd></div>
      <div><dt>Solicitante</dt><dd>${esc(r.solicitante?.nome)}</dd></div>
      <div><dt>Data da solicitação</dt><dd>${fmtData(r.data)}</dd></div>
      <div><dt>Criada em</dt><dd>${fmtDataHora(r.createdAt)}</dd></div>
    </dl>
    ${r.observacoes ? `<p style="margin-top:1rem"><strong>Observações:</strong> ${esc(r.observacoes)}</p>` : ''}

    <section class="bloco">
      <div class="secao-cab"><h2>Materiais solicitados</h2></div>
      <div class="tabela-rolagem"><table>
        <thead><tr><th>Item</th><th>Descrição</th><th class="num">Quantidade</th><th>Unidade</th><th>Observação</th></tr></thead>
        <tbody>${r.itens
          .map(
            (it, i) => `<tr><td>${i + 1}</td><td>${esc(it.descricao)}</td><td class="num">${fmtQtd(it.quantidade)}</td><td>${esc(it.unidade || '-')}</td><td>${esc(it.observacao || '-')}</td></tr>`
          )
          .join('')}</tbody></table></div>
    </section>

    <section class="bloco">
      <div class="secao-cab"><h2>Documento PDF</h2></div>
      <div class="tabela-rolagem"><table>
        <thead><tr><th>Versão</th><th>Gerada em</th><th></th></tr></thead>
        <tbody>${r.pdfs
          .map(
            (p) => `<tr><td>${p.versao}</td><td>${fmtDataHora(p.geradoEm)}</td>
              <td><button type="button" class="btn btn-pequeno" data-versao="${p.versao}">Baixar PDF</button></td></tr>`
          )
          .join('')}</tbody></table></div>
    </section>

    <section class="bloco">
      <div class="secao-cab"><h2>Histórico</h2></div>
      <ul class="historico">${r.historico
        .map(
          (h) => `<li><strong>${esc(h.status)}</strong>${h.descricao ? `, ${esc(h.descricao.toLowerCase())}` : ''}<br>
            <span class="dica">${fmtDataHora(h.data)}${h.usuario?.nome ? ` por ${esc(h.usuario.nome)}` : ''}</span></li>`
        )
        .join('')}</ul>
    </section>`);

  document.querySelectorAll('[data-versao]').forEach((botao) => {
    botao.onclick = async () => {
      const versao = botao.dataset.versao;
      try {
        const blob = await api(`/requisicoes/${id}/pdf?versao=${versao}`, { blob: true });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${r.codigo}-v${versao}.pdf`;
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        toast(e.message, 'erro');
      }
    };
  });
}

/* -------------------------------- Rotas -------------------------------- */

const rotas = [
  [/^#\/obras$/, telaObras],
  [/^#\/obras\/nova$/, telaNovaObra],
  [/^#\/obras\/([a-f0-9]{24})$/, telaObra],
  [/^#\/obras\/([a-f0-9]{24})\/requisicoes\/nova$/, telaNovaRequisicao],
  [/^#\/requisicoes\/([a-f0-9]{24})$/, telaRequisicao],
];

async function rotear() {
  const hash = location.hash || '#/obras';
  const publica = hash === '#/login' || hash === '#/cadastro';

  if (!estado.token && !publica) {
    location.hash = '#/login';
    return;
  }
  if (estado.token && publica) {
    location.hash = '#/obras';
    return;
  }
  if (hash === '#/login') return telaLogin();
  if (hash === '#/cadastro') return telaCadastro();

  for (const [regex, tela] of rotas) {
    const m = hash.match(regex);
    if (!m) continue;
    try {
      await tela(...m.slice(1));
    } catch (e) {
      if (estado.token) {
        casca(`<p class="aviso">${esc(e.message)}</p><p><a href="#/obras">Voltar para as obras</a></p>`);
      }
    }
    return;
  }
  location.hash = '#/obras';
}

window.addEventListener('hashchange', rotear);
rotear();
