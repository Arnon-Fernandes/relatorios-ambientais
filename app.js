// ============================================================
// DOCUMENTOS DISPONÍVEIS
// ============================================================
const DOCS = [
  { id: 'rce',       icone: '📋', nome: 'RCE',        descr: 'Roteiro de Caracterização do Empreendimento' },
  { id: 'pgrs',      icone: '♻️', nome: 'PGRS',       descr: 'Programa de Gerenciamento de Resíduos Sólidos' },
  { id: 'pea',       icone: '🌱', nome: 'PEA',        descr: 'Programa de Educação Ambiental' },
  { id: 'pgr',       icone: '⚠️', nome: 'PGR',        descr: 'Programa de Gerenciamento de Riscos' },
  { id: 'cond',      icone: '✅', nome: 'Condicionantes', descr: 'Relatório de Cumprimento de Condicionantes' },
  { id: 'sao',       icone: '💧', nome: 'Eficiência SAO', descr: 'Caixa Separadora Água/Óleo – CONAMA 430/2011' },
  { id: 'diag',      icone: '🔬', nome: 'Diagnóstico', descr: 'Diagnóstico Ambiental do solo e lençol freático' },
  { id: 'geo',       icone: '🪨', nome: 'Caract. Geológica', descr: 'Caracterização Geológica do empreendimento' },
  { id: 'rvt',       icone: '👁️', nome: 'Visita Técnica', descr: 'Relatório de Visita Técnica' },
  { id: 'foto',      icone: '📷', nome: 'Rel. Fotográfico', descr: 'Relatório Fotográfico do empreendimento' },
];

// ============================================================
// ESTADO GLOBAL
// ============================================================
let estado = {
  empresa: {},
  empresasSalvas: [],       // [{ id, empresa:{} }]
  selecionados: [],
  dados: {},                // { rce: {...}, pgrs: {...}, ... }
  contadorRelatorio: 0,     // incrementa a cada geração
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
window.addEventListener('DOMContentLoaded', () => {
  carregarLocal();
  renderDocGrid();
  renderDocsSelecionados();
  renderGerar();
  preencherFormEmpresa();
  renderEmpresasSalvas();
  atualizarPreviewLogo();
  // Auto-preenche número do relatório se ainda não tem
  if (!estado.empresa.numRelatorio) {
    const el = document.getElementById('numRelatorio');
    if (el && !el.value) el.value = proximoNumRelatorio();
  }
});

// ============================================================
// NAVEGAÇÃO
// ============================================================
function showPage(nome) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + nome).classList.add('active');
  document.getElementById('tab-' + nome).classList.add('active');
  if (nome === 'gerar') renderGerar();
}

// ============================================================
// EMPRESA — auto-save
// ============================================================
let salvarTimer;
function salvarAuto() {
  clearTimeout(salvarTimer);
  document.getElementById('salvandoMsg').textContent = 'Salvando…';
  salvarTimer = setTimeout(() => {
    coletarEmpresa();
    salvarLocal();
    document.getElementById('salvandoMsg').textContent = '✓ Salvo';
    setTimeout(() => { document.getElementById('salvandoMsg').textContent = ''; }, 2000);
  }, 600);
}

function coletarEmpresa() {
  const ids = ['razaoSocial','nomeFantasia','cnpj','inscricaoEstadual','registroAnp','bandeira',
    'endereco','municipio','uf','cep','telefone','email',
    'coordE','coordN','zonaUtm','inicioOperacao','areaConstruida','areaTotal',
    'respNome','respCpf','respTelefone',
    'portaria','dataPortaria','numProcesso','numRelatorio','mesAno',
    'tecNome','tecRnp'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) estado.empresa[id] = el.value;
  });
}

function preencherFormEmpresa() {
  Object.keys(estado.empresa).forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = estado.empresa[id] || '';
  });
}

function e(campo) { return estado.empresa[campo] || ''; }

// ============================================================
// GRID DE SELEÇÃO DE DOCUMENTOS
// ============================================================
function renderDocGrid() {
  const grid = document.getElementById('docGrid');
  grid.innerHTML = DOCS.map(d => `
    <div class="doc-chip ${estado.selecionados.includes(d.id) ? 'selected' : ''}"
         onclick="toggleDoc('${d.id}')" id="chip-${d.id}">
      <div class="chip-check"></div>
      <div class="chip-icon">${d.icone}</div>
      <div class="chip-nome">${d.nome}</div>
    </div>
  `).join('');
}

function toggleDoc(id) {
  if (estado.selecionados.includes(id)) {
    estado.selecionados = estado.selecionados.filter(x => x !== id);
  } else {
    estado.selecionados.push(id);
  }
  salvarLocal();
  renderDocGrid();
  renderDocsSelecionados();
}

// ============================================================
// LISTA DE DOCS PARA CONFIGURAR
// ============================================================
function renderDocsSelecionados() {
  const cont = document.getElementById('docsConfigurar');
  const sem = document.getElementById('semDocs');
  if (estado.selecionados.length === 0) {
    cont.innerHTML = '';
    sem.style.display = 'block';
    return;
  }
  sem.style.display = 'none';
  cont.innerHTML = `
    <div class="card">
      <div class="card-title">⚙️ Configurar dados específicos</div>
      ${estado.selecionados.map(id => {
        const d = DOCS.find(x => x.id === id);
        const preenchido = estado.dados[id] && Object.keys(estado.dados[id]).length > 0;
        return `
          <div class="doc-item" onclick="abrirModal('${id}')">
            <div class="di-icone">${d.icone}</div>
            <div class="di-info">
              <div class="di-nome">${d.nome}</div>
              <div class="di-status">${preenchido ? '✅ Configurado' : '⚪ Toque para preencher'}</div>
            </div>
            <div class="di-arrow">›</div>
          </div>
        `;
      }).join('')}
    </div>`;
}

// ============================================================
// MODAIS DE CONFIGURAÇÃO
// ============================================================
function abrirModal(id) {
  const d = DOCS.find(x => x.id === id);
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  content.innerHTML = `
    <div class="modal-header">
      <h2>${d.icone} ${d.nome}</h2>
      <button class="modal-close" onclick="fecharModal()">✕</button>
    </div>
    ${getModalForm(id)}
    <br>
    <button class="btn btn-primary" onclick="salvarModal('${id}')">💾 Salvar dados</button>
  `;
  // Preencher valores salvos
  const dados = estado.dados[id] || {};
  Object.keys(dados).forEach(k => {
    const el = content.querySelector(`[data-campo="${k}"]`);
    if (el) el.value = dados[k];
  });
  overlay.classList.add('open');
}

function fecharModal(ev) {
  if (!ev || ev.target === document.getElementById('modalOverlay')) {
    document.getElementById('modalOverlay').classList.remove('open');
  }
}

function salvarModal(id) {
  const content = document.getElementById('modalContent');
  const inputs = content.querySelectorAll('[data-campo]');
  if (!estado.dados[id]) estado.dados[id] = {};
  inputs.forEach(el => { estado.dados[id][el.dataset.campo] = el.value; });
  salvarLocal();
  fecharModal();
  renderDocsSelecionados();
  toast(`${DOCS.find(x=>x.id===id).nome} salvo!`);
}

// ============================================================
// FORMULÁRIOS DE CADA DOCUMENTO
// ============================================================
function getModalForm(id) {
  switch(id) {
    case 'rce': return formRce();
    case 'pgrs': return formPgrs();
    case 'pea': return formPea();
    case 'pgr': return formPgr();
    case 'cond': return formCond();
    case 'sao': return formSao();
    case 'diag': return formDiag();
    case 'geo': return formGeo();
    case 'rvt': return formRvt();
    case 'foto': return formFoto();
    default: return '<p>Sem campos adicionais.</p>';
  }
}

function campo(label, campo, hint = '', tipo = 'input', placeholder = '') {
  if (tipo === 'textarea') {
    return `<div class="field"><label>${label}</label>
      <textarea data-campo="${campo}" placeholder="${placeholder || hint}"></textarea>
      ${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
  }
  return `<div class="field"><label>${label}</label>
    <input data-campo="${campo}" placeholder="${placeholder || hint}">
    ${hint ? `<p class="hint">${hint}</p>` : ''}</div>`;
}

function campoRow(...campos) {
  return `<div class="row">${campos.join('')}</div>`;
}

function formRce() {
  return `
    <p class="hint" style="margin-bottom:14px">Dados específicos do RCE além dos dados gerais da empresa.</p>
    <div class="section-title">Produtos Comercializados (médias mensais)</div>
    ${campoRow(campo('Gasolina Comum (L/mês)', 'gasolinaComum'), campo('Gasolina Aditivada (L/mês)', 'gasolinaAditivada'))}
    ${campoRow(campo('Etanol (L/mês)', 'etanol'), campo('Diesel S-10 (L/mês)', 'dieselS10'))}
    ${campoRow(campo('Diesel S-500 (L/mês)', 'dieselS500'), campo('Óleo Lubrificante (L/mês)', 'oleoLubrificante'))}
    <div class="section-title">Bombas e Bicos</div>
    ${campoRow(campo('Qtd. de Bombas', 'qtdBombas', '', 'input', 'Ex: 4'), campo('Qtd. de Bicos', 'qtdBicos', '', 'input', 'Ex: 8'))}
    <div class="section-title">Tanques Subterrâneos</div>
    ${campo('Descrição dos tanques', 'descricaoTanques', 'Ex: 3 tanques dupla parede — 15.000L gasolina, 30.000L diesel, 10.000L etanol', 'textarea')}
    <div class="section-title">Atividades Desenvolvidas</div>
    ${campo('Serviços oferecidos', 'servicos', 'Ex: Abastecimento, troca de óleo, conveniência', 'textarea')}
    <div class="section-title">Dados da Licença</div>
    ${campoRow(campo('Valor do Investimento', 'valorInvestimento', 'Ex: R$ 500.000,00'), campo('Nº IPTU', 'numIptu'))}
  `;
}

function formPgrs() {
  return `
    <div class="section-title">Estrutura do Empreendimento</div>
    ${campoRow(campo('Nº de Funcionários', 'numFuncionarios', 'Ex: 5'), campo('Estrutura Organizacional', 'estruturaOrg', 'Ex: Sócio-gerente e frentistas'))}
    <div class="section-title">Resíduos Gerados</div>
    ${campo('Resíduos Classe I (Perigosos)', 'residuosClasseI', 'Ex: Óleo lubrificante usado, filtros contaminados, panos com óleo', 'textarea')}
    ${campo('Resíduos Classe II-A (Não inertes)', 'residuosClasseIIA', 'Ex: Resíduos orgânicos, papel contaminado', 'textarea')}
    ${campo('Resíduos Classe II-B (Inertes)', 'residuosClasseIIB', 'Ex: Papelão, plástico limpo, vidro, metal', 'textarea')}
    <div class="section-title">Destinação</div>
    ${campo('Empresa coletora de óleo lubrificante usado', 'empresaOleo', 'Nome e CNPJ da empresa autorizada')}
    ${campo('Empresa coletora de resíduos comuns', 'empresaResiduos', 'Coleta municipal ou empresa contratada')}
    <div class="section-title">Revisão</div>
    ${campoRow(campo('Ano do PGRS', 'anoPgrs', 'Ex: 2026'), campo('Revisão (se houver)', 'revisaoPgrs', 'Ex: Revisão 2026'))}
  `;
}

function formPea() {
  return `
    <div class="section-title">Programa de Educação Ambiental</div>
    ${campo('Público-alvo', 'publicoAlvo', 'Ex: Funcionários do posto e comunidade do entorno')}
    ${campo('Ações desenvolvidas', 'acoesPea', 'Descreva as ações de educação ambiental realizadas', 'textarea')}
    ${campo('Data de realização', 'dataPea', 'Ex: 15 de março de 2026')}
    ${campo('Local de realização', 'localPea', 'Ex: Sede do empreendimento')}
    ${campo('Carga horária', 'cargaHoraria', 'Ex: 2 horas')}
    ${campo('Instrutor / Responsável', 'instrutorPea', 'Nome do responsável pela atividade')}
    ${campo('Temas abordados', 'temasPea', 'Ex: Segregação de resíduos, consumo consciente, contaminação do solo', 'textarea')}
    <div class="section-title">Próximo ciclo</div>
    ${campo('Data prevista do próximo PEA', 'proximoPea', 'Ex: Setembro de 2026')}
  `;
}

function formPgr() {
  return `
    <div class="section-title">Programa de Gerenciamento de Riscos</div>
    ${campo('Riscos Físicos identificados', 'riscFisicos', 'Ex: Ruído, calor, radiação solar', 'textarea')}
    ${campo('Riscos Químicos identificados', 'riscQuimicos', 'Ex: Vapores de combustível (benzeno, tolueno), óleo lubrificante', 'textarea')}
    ${campo('Riscos Ergonômicos', 'riscErgonomicos', 'Ex: Postura inadequada, esforço repetitivo', 'textarea')}
    ${campo('Riscos de Acidentes', 'riscAcidentes', 'Ex: Incêndio, explosão, queda, choque elétrico', 'textarea')}
    <div class="section-title">Medidas de Controle</div>
    ${campo('EPIs utilizados', 'epis', 'Ex: Luvas nitrílicas, óculos de proteção, botina', 'textarea')}
    ${campo('EPCs instalados', 'epcs', 'Ex: Extintores, chuveiro de emergência, sinalização', 'textarea')}
    ${campo('Treinamentos realizados', 'treinamentos', 'Ex: NR-20, NR-35, brigada de incêndio', 'textarea')}
    <div class="section-title">Período</div>
    ${campoRow(campo('Data início', 'dataInicioPgr', 'Ex: 01/01/2026'), campo('Data fim', 'dataFimPgr', 'Ex: 31/12/2026'))}
  `;
}

function formCond() {
  return `
    <div class="section-title">Condicionantes da Licença</div>
    ${campo('Quantidade de condicionantes', 'qtdCond', 'Ex: 19', 'input', 'Ex: 19')}
    ${campo('Contato do empreendimento para o INEMA', 'contatoCond', 'Nome e telefone')}
    <div class="section-title">Respostas às Condicionantes</div>
    <p class="hint" style="margin-bottom:12px">Descreva as respostas de cada condicionante. Use o formato: "CONDICIONANTE 01: [resposta]"</p>
    ${campo('Respostas', 'respostasCond', 'CONDICIONANTE 01: Conforme recomendado.\nCONDICIONANTE 02: ...', 'textarea')}
    <div class="section-title">Prazo de Validade</div>
    ${campoRow(campo('Válido até', 'validadeCond', 'Ex: 03 jan 2027'), campo('Data do relatório', 'dataCond', 'Ex: Maio / 2026'))}
  `;
}

function formSao() {
  return `
    <div class="section-title">Análise Laboratorial – SAO</div>
    ${campo('Data de coleta das amostras', 'dataColetaSao', 'Ex: 07 de Abril de 2026')}
    ${campo('Laboratório responsável', 'laboratorioSao', 'Nome e CNPJ do laboratório')}
    <div class="section-title">Resultados – Entrada (Bruto)</div>
    ${campoRow(campo('pH entrada', 'phEntrada'), campo('DQO entrada (mg/L)', 'dqoEntrada'))}
    ${campoRow(campo('Óleos e Graxas entrada (mg/L)', 'ogEntrada'), campo('Sólidos Susp. entrada', 'ssEntrada'))}
    <div class="section-title">Resultados – Saída (Tratado)</div>
    ${campoRow(campo('pH saída', 'phSaida'), campo('DQO saída (mg/L)', 'dqoSaida'))}
    ${campoRow(campo('Óleos e Graxas saída (mg/L)', 'ogSaida'), campo('Sólidos Susp. saída', 'ssSaida'))}
    <div class="section-title">Eficiência</div>
    ${campoRow(campo('Eficiência óleos e graxas', 'eficienciaOg', 'Ex: 97%'), campo('Enquadramento CONAMA 430', 'enquadramento', 'Ex: Conforme'))}
    ${campo('Observações', 'obsSao', 'Observações gerais sobre o sistema SAO', 'textarea')}
  `;
}

function formDiag() {
  return `
    <div class="section-title">Localização</div>
    ${campo('Tipo de área', 'tipoAreaDiag', 'urbana ou rural')}
    ${campo('Descrição do acesso', 'acessoDiag', 'Ex: acesso pela Rodovia Santos Dumont, sentido norte', 'textarea')}
    <div class="section-title">Hidrografia</div>
    ${campo('Corpo d\'água mais próximo', 'corpoAgua', 'Ex: Riacho Pau Ferro')}
    ${campoRow(campo('Distância', 'distanciaCorpo', 'Ex: 3 km'), campo('Bacia hidrográfica', 'baciaDiag', 'Ex: Bacia do Paraguaçu'))}
    <div class="section-title">Hidrogeologia</div>
    ${campoRow(campo('Nº de poços CPRM analisados', 'numPocos', 'Ex: 5'), campo('NE mínimo (m)', 'neMin', 'Ex: 117,30'))}
    ${campo('NE máximo (m)', 'neMax', 'Ex: 223,20')}
    <div class="section-title">Geologia Local</div>
    ${campo('Descrição geológica', 'geologiaDiag', 'Ex: Embasamento cristalino — gnaisses e migmatitos do Cráton São Francisco', 'textarea')}
    ${campo('Tipo de solo', 'tipoSoloDiag', 'Ex: Solo arenoso, latossolo vermelho-amarelo')}
    <div class="section-title">Análises de Campo</div>
    ${campoRow(campo('Profundidade do lençol (m)', 'profLencol', 'Ex: 12,5'), campo('Data da visita de campo', 'dataVisitaDiag', 'Ex: 15/04/2026'))}
  `;
}

function formGeo() {
  return `
    <div class="section-title">Clima</div>
    ${campoRow(campo('Precipitação anual', 'precipitacao', 'Ex: 700 mm/ano'), campo('Temperatura média', 'tempMedia', 'Ex: 24°C'))}
    <div class="section-title">Análise do Solo</div>
    ${campoRow(campo('pH', 'phSolo', 'Ex: 6,5'), campo('Cloretos (mg/L)', 'cloretos', 'Ex: 12'))}
    ${campo('Descrição do solo', 'descSolo', 'Ex: Solo argiloso, coloração avermelhada, espessura ~0,8m', 'textarea')}
    <div class="section-title">Permeabilidade</div>
    ${campo('Resultado do teste', 'permeabilidade', 'Ex: 1,2 × 10⁻⁴ cm/s — solo de permeabilidade baixa')}
    <div class="section-title">VOC – Compostos Orgânicos Voláteis</div>
    ${campo('Resultado VOC', 'resultadoVoc', 'Ex: Não detectado')}
    ${campo('Observações VOC', 'obsVoc', 'Ex: Teste realizado com aparelho PID, leitura 0,0 ppm', 'textarea')}
    <div class="section-title">Geomorfologia</div>
    ${campo('Descrição geomorfológica', 'geomorfo', 'Ex: Relevo plano a suave ondulado, altitude ~250m', 'textarea')}
  `;
}

function formRvt() {
  return `
    <div class="section-title">Dados da Visita</div>
    ${campo('Nº do Relatório', 'numRvt', 'Ex: 012/2026')}
    ${campoRow(campo('Data da vistoria', 'dataVistoria', 'Ex: 15/04/2026'), campo('Turno', 'turnoVistoria', 'Ex: Matutino'))}
    ${campo('Representante da empresa presente', 'representanteVistoria', 'Nome do responsável que acompanhou')}
    <div class="section-title">Áreas Vistoriadas</div>
    <p class="hint" style="margin-bottom:10px">Descreva cada área no formato: "ÁREA: [análise e sugestões]"</p>
    ${campo('Ilha de abastecimento', 'areaIlha', 'Análise e sugestões de melhoria', 'textarea')}
    ${campo('Canaletas e drenagem', 'areaCanaleta', 'Análise e sugestões de melhoria', 'textarea')}
    ${campo('Caixa SAO', 'areaSao', 'Análise e sugestões de melhoria', 'textarea')}
    ${campo('Tanques subterrâneos', 'areaTanques', 'Análise e sugestões de melhoria', 'textarea')}
    ${campo('Armazenamento de resíduos', 'areaResiduos', 'Análise e sugestões de melhoria', 'textarea')}
    ${campo('Outras áreas', 'areaOutras', 'Demais áreas vistoriadas', 'textarea')}
    <div class="section-title">Conclusão Geral</div>
    ${campo('Conclusão e recomendações', 'conclusaoRvt', '', 'textarea')}
  `;
}

function formFoto() {
  return `
    <div class="section-title">Fotos do Relatório</div>
    <p class="hint" style="margin-bottom:14px">Liste as fotos com descrição e data. Adicione a imagem manualmente no Word após gerar.</p>
    ${['1','2','3','4','5','6','7','8'].map(n => `
      <div class="card" style="padding:12px;margin-bottom:10px;">
        <div class="section-title" style="margin-top:0">Foto ${n}</div>
        ${campoRow(campo('Descrição', `fotoDesc${n}`, 'Ex: Visão Geral do Empreendimento'), campo('Local / Data', `fotoData${n}`, 'Ex: Salvador, 17/03/2026'))}
      </div>`).join('')}
  `;
}

// ============================================================
// PÁGINA GERAR
// ============================================================
function renderGerar() {
  const cont = document.getElementById('gerarConteudo');
  const empresa = e('razaoSocial');

  if (!empresa) {
    cont.innerHTML = `
      <div class="empty">
        <div class="e-icon">🏢</div>
        <p>Preencha os dados da empresa na aba <strong>Empresa</strong> antes de gerar.</p>
      </div>`;
    return;
  }

  if (estado.selecionados.length === 0) {
    cont.innerHTML = `
      <div class="empty">
        <div class="e-icon">📋</div>
        <p>Selecione ao menos um documento na aba <strong>Documentos</strong>.</p>
      </div>`;
    return;
  }

  cont.innerHTML = `
    <div class="empresa-badge">
      <div class="icone">🏢</div>
      <div>
        <div class="nome">${empresa}</div>
        <div class="detalhe">${e('municipio')} – ${e('uf')} • ${e('mesAno') || 'sem data'}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📄 Documentos a gerar <span>${estado.selecionados.length}</span></div>
      ${estado.selecionados.map(id => {
        const d = DOCS.find(x => x.id === id);
        return `<div class="gerar-item" id="gerar-${id}">
          <div class="gi-icone">${d.icone}</div>
          <div class="gi-info">
            <div class="gi-nome">${d.nome} – ${d.descr}</div>
            <div class="gi-status" id="status-${id}">Aguardando</div>
          </div>
        </div>`;
      }).join('')}
    </div>

    <button class="btn btn-verde" onclick="gerarTodos()" style="margin-bottom:10px">
      ⚡ Gerar e baixar um a um
    </button>
    <button class="btn btn-outline" onclick="gerarZipTodos()" style="margin-bottom:10px">
      📦 Baixar todos em ZIP
    </button>
    <p class="hint" style="text-align:center">Os arquivos .docx serão baixados no seu dispositivo.</p>
  `;
}

// ============================================================
// GERAÇÃO DOS DOCUMENTOS .DOCX
// ============================================================
async function gerarTodos() {
  coletarEmpresa();
  const v = validarParaGerar();
  if (!v.ok) {
    const cont = document.getElementById('gerarConteudo');
    cont.insertAdjacentHTML('afterbegin', `
      <div class="card" style="border:2px solid var(--vermelho);margin-bottom:12px">
        <div class="card-title" style="color:var(--vermelho)">⚠️ Campos obrigatórios faltando</div>
        ${v.faltando.map(f => `<div style="color:var(--vermelho);padding:2px 0">• ${f}</div>`).join('')}
        <p class="hint" style="margin-top:8px">Preencha na aba <strong>Empresa</strong> antes de gerar.</p>
      </div>`);
    return;
  }
  // Incrementa número do relatório
  estado.contadorRelatorio = (estado.contadorRelatorio || 0) + 1;
  if (!estado.empresa.numRelatorio) {
    estado.empresa.numRelatorio = proximoNumRelatorio();
    const el = document.getElementById('numRelatorio');
    if (el) el.value = estado.empresa.numRelatorio;
  }
  salvarLocal();
  for (const id of estado.selecionados) {
    setStatus(id, 'gerando', '⏳ Gerando…');
    try {
      await gerarDocx(id);
      setStatus(id, 'ok', '✅ Baixado');
    } catch(err) {
      setStatus(id, 'erro', '❌ Erro: ' + err.message);
      console.error(id, err);
    }
    await esperar(300);
  }
  toast('Todos os documentos foram gerados!');
}

function setStatus(id, tipo, msg) {
  const el = document.getElementById('status-' + id);
  if (!el) return;
  el.className = 'gi-status ' + (tipo === 'ok' ? 'status-ok' : tipo === 'erro' ? 'status-erro' : 'status-gerando');
  el.textContent = msg;
}

function esperar(ms) { return new Promise(r => setTimeout(r, ms)); }

async function gerarDocx(id) {
  const xml = buildDocXml(id);
  const bytes = criarDocx(xml);
  const nomeArq = nomeArquivo(id);
  baixarArquivo(bytes, nomeArq);
}

function nomeArquivo(id) {
  const empresa = (e('razaoSocial') || 'EMPREENDIMENTO').replace(/[^A-Z0-9]/gi, '_').toUpperCase().substring(0, 30);
  const siglas = { rce:'RCE', pgrs:'PGRS', pea:'PEA', pgr:'PGR', cond:'COND', sao:'SAO', diag:'DIAG', geo:'GEO', rvt:'RVT', foto:'FOTO' };
  const d = new Date();
  const data = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${d.getFullYear()}`;
  return `${siglas[id]}_${empresa}_${data}.docx`;
}

// ============================================================
// XML DOS DOCUMENTOS
// ============================================================
function buildDocXml(id) {
  switch(id) {
    case 'rce':  return xmlRce();
    case 'pgrs': return xmlPgrs();
    case 'pea':  return xmlPea();
    case 'pgr':  return xmlPgr();
    case 'cond': return xmlCond();
    case 'sao':  return xmlSao();
    case 'diag': return xmlDiag();
    case 'geo':  return xmlGeo();
    case 'rvt':  return xmlRvt();
    case 'foto': return xmlFoto();
    default: return xmlBase('Documento', '<w:p><w:r><w:t>Documento sem conteúdo.</w:t></w:r></w:p>');
  }
}

// helpers XML
function esc(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function d(campo) { return esc((estado.dados[campo.split('.')[0]] || {})[campo.split('.')[1]] || ''); }
function p(txt, opts = {}) {
  const jc = opts.center ? '<w:jc w:val="center"/>' : (opts.justify ? '<w:jc w:val="both"/>' : '');
  const sz = opts.size || '24';
  const b = opts.bold ? '<w:b/>' : '';
  const cor = opts.cor ? `<w:color w:val="${opts.cor}"/>` : '';
  const sp = opts.space ? `<w:spacing w:before="${opts.space}" w:after="0" w:line="360" w:lineRule="auto"/>` : '<w:spacing w:before="60" w:after="60" w:line="360" w:lineRule="auto"/>';
  const ind = opts.justify ? '<w:ind w:firstLine="709"/>' : '';
  return `<w:p><w:pPr>${jc}${sp}${ind}</w:pPr><w:r><w:rPr>${b}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>${cor}</w:rPr><w:t xml:space="preserve">${esc(txt)}</w:t></w:r></w:p>`;
}
function h1(txt) {
  return `<w:p><w:pPr><w:spacing w:before="280" w:after="140" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="1F497D"/></w:rPr><w:t>${esc(txt)}</w:t></w:r></w:p>`;
}
function h2(txt) {
  return `<w:p><w:pPr><w:spacing w:before="200" w:after="100" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="4F81BD"/></w:rPr><w:t>${esc(txt)}</w:t></w:r></w:p>`;
}
function h3(txt) {
  return `<w:p><w:pPr><w:spacing w:before="160" w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
  <w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria" w:cs="Cambria"/><w:b/><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="1F497D"/></w:rPr><w:t>${esc(txt)}</w:t></w:r></w:p>`;
}
function pb() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
function empty() { return '<w:p><w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr></w:p>'; }
function bullet(txt) {
  return `<w:p><w:pPr><w:ind w:left="480" w:hanging="240"/><w:spacing w:before="40" w:after="40"/></w:pPr>
  <w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t xml:space="preserve">• ${esc(txt)}</w:t></w:r></w:p>`;
}

function tabelaSimples(linhas) {
  const cor_header = '1F4E79';
  const cor_alt = 'DEEAF1';
  const rows = linhas.map((row, i) => {
    const isHeader = i === 0;
    const shd = isHeader ? `<w:shd w:val="clear" w:fill="${cor_header}"/>` : (i % 2 === 0 ? `<w:shd w:val="clear" w:fill="${cor_alt}"/>` : '');
    const b = isHeader ? '<w:b/>' : '';
    const cor = isHeader ? '<w:color w:val="FFFFFF"/>' : '';
    const cells = row.map(cell => `
      <w:tc>
        <w:tcPr>${shd}<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tcMar></w:tcPr>
        <w:p><w:r><w:rPr>${b}${cor}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">${esc(String(cell))}</w:t></w:r></w:p>
      </w:tc>`).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="9072" w:type="dxa"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="4" w:color="1F4E79"/>
        <w:left w:val="single" w:sz="4" w:color="1F4E79"/>
        <w:bottom w:val="single" w:sz="4" w:color="1F4E79"/>
        <w:right w:val="single" w:sz="4" w:color="1F4E79"/>
        <w:insideH w:val="single" w:sz="4" w:color="BFCFE0"/>
        <w:insideV w:val="single" w:sz="4" w:color="BFCFE0"/>
      </w:tblBorders>
    </w:tblPr>${rows}</w:tbl>`;
}

function rodape() {
  return `
    ${empty()}
    ${p('Salvador, ' + (e('mesAno') || new Date().getFullYear().toString()), {center:true})}
    ${empty()}
    ${p('_'.repeat(50), {center:true})}
    ${p(e('tecNome') || 'ARNON DE OLIVEIRA FERNANDES', {bold:true, center:true})}
    ${p('Técnico em Geologia – RNP: ' + (e('tecRnp') || '05292828521'), {center:true})}
    ${p('SUAL – Soluções Ambientais Ltda', {center:true, cor:'1F497D'})}
  `;
}

function cabecalhoDoc(titulo, subtitulo = '') {
  // Capa no padrão SUAL: logo (se houver), linha azul, título, cliente, local/data
  const linhaAzul = `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="12" w:space="1" w:color="1F497D"/></w:pBdr><w:spacing w:before="0" w:after="80"/></w:pPr></w:p>`;
  const linhaFina = `<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="4BACC6"/></w:pBdr><w:spacing w:before="80" w:after="80"/></w:pPr></w:p>`;
  return `
    ${logoDocXml()}
    ${linhaAzul}
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="480" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="40"/><w:szCs w:val="40"/><w:color w:val="1F497D"/></w:rPr>
        <w:t>${esc(titulo)}</w:t></w:r></w:p>
    ${subtitulo ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="240"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="26"/><w:color w:val="4F81BD"/></w:rPr><w:t>${esc(subtitulo)}</w:t></w:r></w:p>` : ''}
    ${linhaFina}
    ${empty()}
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="360" w:after="80" w:line="240" w:lineRule="auto"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="30"/><w:szCs w:val="30"/><w:color w:val="1F497D"/></w:rPr>
        <w:t>${esc((e('razaoSocial') || '').toUpperCase())}</w:t></w:r></w:p>
    ${e('nomeFantasia') ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:color w:val="4F81BD"/></w:rPr><w:t>${esc(e('nomeFantasia'))}</w:t></w:r></w:p>` : ''}
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="22"/><w:color w:val="718096"/></w:rPr><w:t>CNPJ: ${esc(e('cnpj'))}</w:t></w:r></w:p>
    ${e('numRelatorio') ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:color w:val="718096"/></w:rPr><w:t>Relatório Nº ${esc(e('numRelatorio'))}</w:t></w:r></w:p>` : ''}
    ${e('numProcesso') ? `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="60" w:after="60"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:color w:val="718096"/></w:rPr><w:t>Processo INEMA: ${esc(e('numProcesso'))}</w:t></w:r></w:p>` : ''}
    ${linhaFina}
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="80"/></w:pPr>
      <w:r><w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:sz w:val="24"/><w:color w:val="1F497D"/></w:rPr>
        <w:t>${esc(e('municipio') + (e('uf') ? ' – ' + e('uf') : ''))}</w:t></w:r></w:p>
    <w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="480"/></w:pPr>
      <w:r><w:rPr><w:sz w:val="24"/><w:color w:val="1F497D"/></w:rPr>
        <w:t>${esc(e('mesAno') || new Date().getFullYear().toString())}</w:t></w:r></w:p>
  `;
}

function dadosEmpresaTabela() {
  const rows = [['Campo', 'Informação']];
  if (e('razaoSocial')) rows.push(['Razão Social', e('razaoSocial')]);
  if (e('nomeFantasia')) rows.push(['Nome Fantasia', e('nomeFantasia')]);
  if (e('cnpj')) rows.push(['CNPJ', e('cnpj')]);
  if (e('endereco')) rows.push(['Endereço', e('endereco')]);
  if (e('municipio')) rows.push(['Município/UF', e('municipio') + ' – ' + e('uf')]);
  if (e('cep')) rows.push(['CEP', e('cep')]);
  if (e('telefone')) rows.push(['Telefone', e('telefone')]);
  if (e('coordE')) rows.push(['Coordenadas UTM', e('coordE') + ' m E / ' + e('coordN') + ' m N – Zona ' + e('zonaUtm')]);
  return tabelaSimples(rows);
}

// ============================================================
// DOCUMENTOS — XML BODY
// ============================================================
function xmlBase(titulo, bodyExtra) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>
  ${cabecalhoDoc(titulo)}
  ${pb()}
  ${h1('DADOS DO EMPREENDIMENTO')}
  ${dadosEmpresaTabela()}
  ${empty()}
  ${bodyExtra}
  ${referencias()}
  ${rodape()}
  <w:sectPr>
    <w:headerReference w:type="default" r:id="rId2"/>
    <w:footerReference w:type="default" r:id="rId3"/>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1701" w:right="1134" w:bottom="1701" w:left="1701"/>
  </w:sectPr>
</w:body>
</w:document>`;
}

function xmlRce() {
  const r = id => d('rce.' + id);
  return xmlBase('RCE – ROTEIRO DE CARACTERIZAÇÃO DO EMPREENDIMENTO',
    // ── 1. APRESENTAÇÃO ──────────────────────────────────────────────
    h1('1. APRESENTAÇÃO') +
    p(`O Roteiro de Caracterização do Empreendimento (RCE) constitui documento técnico obrigatório no âmbito do processo de licenciamento ambiental de empreendimentos que comercializam ou armazenam derivados de petróleo, nos termos da Resolução CONAMA nº 273, de 29 de novembro de 2000, com as alterações introduzidas pelas Resoluções CONAMA nº 276/2001 e nº 319/2002. O licenciamento ambiental é o procedimento administrativo pelo qual o órgão ambiental competente licencia a localização, instalação, ampliação e a operação de empreendimentos e atividades utilizadoras de recursos ambientais, consideradas efetiva ou potencialmente poluidoras ou daquelas que, sob qualquer forma, possam causar degradação ambiental, conforme estabelecido no Artigo 1º da Resolução CONAMA nº 237/1997.`, {justify:true}) +
    p(`O presente RCE foi elaborado pela SUAL – Soluções Ambientais Ltda para o empreendimento ${e('razaoSocial')}, localizado no município de ${e('municipio')}, Estado da Bahia, em atendimento às exigências do Instituto do Meio Ambiente e Recursos Hídricos – INEMA, autoridade ambiental do Estado da Bahia, nos termos da Lei Estadual nº 10.431/2006 e do Decreto Estadual nº 11.235/2008. A elaboração deste documento observa integralmente os requisitos do Termo de Referência do INEMA para o licenciamento de postos de combustíveis.`, {justify:true}) +
    p(`A atividade de revenda de combustíveis é classificada como potencialmente poluidora em função do armazenamento subterrâneo de substâncias inflamáveis e tóxicas. Os hidrocarbonetos do grupo BTEX – benzeno, tolueno, etilbenzeno e xilenos – são os principais contaminantes associados a vazamentos em postos de combustíveis. O benzeno é reconhecido pela Agência Internacional de Pesquisa sobre o Câncer (IARC, 2012) como carcinogênico do Grupo 1 (comprovadamente carcinogênico em humanos), associado ao desenvolvimento de leucemia mieloide aguda em trabalhadores expostos. No ambiente, o benzeno apresenta alta mobilidade em solos arenosos e elevada solubilidade em água subterrânea (solubilidade de 1.780 mg/L a 25°C), podendo contaminar aquíferos em concentrações muito baixas (CETESB, 2022).`, {justify:true}) +
    empty() +

    // ── 2. IDENTIFICAÇÃO DO EMPREENDIMENTO ───────────────────────────
    h1('2. IDENTIFICAÇÃO DO EMPREENDIMENTO') +
    tabelaSimples([
      ['Campo','Informação'],
      ['Razão Social', e('razaoSocial')],
      ['Nome Fantasia', e('nomeFantasia') || '—'],
      ['CNPJ', e('cnpj')],
      ['Inscrição Estadual', e('inscricaoEstadual') || 'Isento'],
      ['Registro ANP', e('registroAnp') || '—'],
      ['Bandeira Comercial', e('bandeira') || '—'],
      ['Endereço Completo', e('endereco')],
      ['Município / UF', e('municipio') + ' – ' + e('uf')],
      ['CEP', e('cep')],
      ['Telefone', e('telefone')],
      ['E-mail', e('email') || '—'],
      ['Coordenadas UTM (SIRGAS 2000)', 'E: ' + e('coordE') + ' m | N: ' + e('coordN') + ' m | Zona ' + e('zonaUtm')],
      ['Início de Operação', e('inicioOperacao') || '—'],
      ['Área Construída', (e('areaConstruida') || '—') + ' m²'],
      ['Área Total do Lote', (e('areaTotal') || '—') + ' m²'],
      ['Nº IPTU', r('numIptu') || '—'],
      ['Valor do Investimento', r('valorInvestimento') || '—'],
      ['Nº Portaria / LO', e('portaria') || '—'],
      ['Nº Processo INEMA', e('numProcesso') || '—'],
    ]) + empty() +

    // ── 3. RESPONSÁVEL ───────────────────────────────────────────────
    h1('3. RESPONSÁVEL PELO EMPREENDIMENTO') +
    tabelaSimples([
      ['Campo','Informação'],
      ['Nome / Razão Social', e('respNome') || '—'],
      ['CPF / CNPJ', e('respCpf') || '—'],
      ['Telefone de Contato', e('respTelefone') || '—'],
    ]) + empty() +

    // ── 4. HISTÓRICO E LOCALIZAÇÃO ───────────────────────────────────
    h1('4. HISTÓRICO E LOCALIZAÇÃO') +
    p(`O empreendimento ${e('razaoSocial')} está localizado na ${e('endereco')}, município de ${e('municipio')}, Estado da Bahia, nas coordenadas UTM E: ${e('coordE')} m, N: ${e('coordN')} m, Zona ${e('zonaUtm')}, Datum SIRGAS 2000. O posto iniciou suas atividades no ano de ${e('inicioOperacao') || '[informar ano]'}, operando atualmente sob a bandeira ${e('bandeira') || '[informar bandeira]'} e registrado na Agência Nacional do Petróleo, Gás Natural e Biocombustíveis – ANP sob o Nº ${e('registroAnp') || '[informar]'}. A área total do imóvel é de ${e('areaTotal') || '[informar]'} m², com área construída de ${e('areaConstruida') || '[informar]'} m², compreendendo pista de abastecimento, cobertura (marquise), loja de conveniência, área administrativa e instalações de suporte.`, {justify:true}) +
    p('[Inserir Figura 1 – Mapa de Localização com coordenadas UTM, malha viária e pontos de referência. Escala sugerida: 1:25.000]', {center:true, cor:'718096'}) +
    p('[Inserir Figura 2 – Imagem de satélite com delimitação da área do empreendimento e raio de 100 m de área de influência direta]', {center:true, cor:'718096'}) +
    empty() +

    // ── 5. ATIVIDADES DESENVOLVIDAS ──────────────────────────────────
    h1('5. ATIVIDADES DESENVOLVIDAS') +
    p(`As atividades desenvolvidas no empreendimento compreendem o armazenamento subterrâneo de combustíveis em tanques de aço-carbono ou fibra de vidro com proteção anticorrosiva, a comercialização varejista de combustíveis automotivos e a prestação de serviços automotivos. O código CNAE principal é 4731-8/00 (Comércio varejista de combustíveis para veículos automotores, exceto motocicletas).`, {justify:true}) +
    p(`As operações de abastecimento são realizadas por meio de bombas eletrônicas com medidores volumétricos homologados pelo INMETRO, em conformidade com a Portaria ANP nº 41/2013 e suas atualizações. A área de abastecimento é dotada de piso impermeabilizado com desnível direcional mínimo de 1%, com canaletas coletoras que direcionam eventuais derrames e a parcela das águas pluviais contaminadas para a Caixa Separadora de Água e Óleo – SAO, em conformidade com os itens 4.1 e 4.2 da Resolução CONAMA nº 273/2000 e com a ABNT NBR 14.605/2015 (Armazenamento de líquidos inflamáveis e combustíveis – Posto de serviço).`, {justify:true}) +
    (r('servicos') ? p(`Serviços complementares oferecidos: ${r('servicos')}.`, {justify:true}) : '') +
    empty() +

    // ── 6. PRODUTOS COMERCIALIZADOS ──────────────────────────────────
    h1('6. RELAÇÃO DE PRODUTOS COMERCIALIZADOS') +
    p(`Os combustíveis comercializados são adquiridos de distribuidoras autorizadas pela ANP e armazenados em conformidade com a NBR 13.784/1997 e a Resolução CONAMA nº 273/2000. As médias mensais de comercialização estão apresentadas na Tabela 1.`, {justify:true}) +
    tabelaSimples([
      ['Produto','Especificação Técnica','Média Mensal (L)'],
      ['Gasolina Comum','Tipo A/C – Resolução ANP nº 807/2019', r('gasolinaComum') || '—'],
      ['Gasolina Aditivada','Premium – Teor de etanol 27%', r('gasolinaAditivada') || '—'],
      ['Etanol Hidratado','EHC – Portaria ANP nº 667/2022', r('etanol') || '—'],
      ['Diesel S-10','Enxofre ≤ 10 ppm – Res. ANP nº 50/2013', r('dieselS10') || '—'],
      ['Diesel S-500','Enxofre ≤ 500 ppm', r('dieselS500') || '—'],
      ['Óleo Lubrificante','Minerais e sintéticos – NBR 14.820', r('oleoLubrificante') || '—'],
    ]) + empty() +

    // ── 7. SISTEMA DE ARMAZENAMENTO SUBTERRÂNEO ──────────────────────
    h1('7. SISTEMA DE ARMAZENAMENTO SUBTERRÂNEO') +
    p(`O armazenamento de combustíveis é realizado em Tanques de Armazenamento Subterrâneo (TAS) de dupla parede, com monitoramento do espaço intersticial, fabricados e instalados em conformidade com as normas ABNT NBR 13.784/1997 (Armazenamento de líquidos inflamáveis e combustíveis) e NBR 13.786/2014 (Postos de serviço – Seleção e instalação de equipamentos). Os tanques são dotados de dispositivos de proteção contra transbordamento (válvulas de vent) e contra descarga estática (sistemas de aterramento e equipotencialização elétrica), conforme exigência do item 4.3 da Resolução CONAMA nº 273/2000.`, {justify:true}) +
    p(`O sistema de monitoramento de vazamentos é do tipo intersticial, com detector de líquidos no espaço anular entre as paredes dos tanques de dupla camada, em atendimento ao disposto no item 4.4 da Resolução CONAMA nº 273/2000. Todo o sistema de tubulações subterrâneas é de material plástico flexível (polietileno de alta densidade – PEAD) com dupla contenção, visando eliminar o risco de vazamento por corrosão, frequente em sistemas de tubulação simples de aço-carbono (ANP, 2021).`, {justify:true}) +
    (r('descricaoTanques') ? p(r('descricaoTanques'), {justify:true}) : p('[Inserir: quantidade, capacidade, produto e especificação técnica de cada tanque]', {cor:'718096'})) +
    empty() +

    // ── 8. EQUIPAMENTOS DE ABASTECIMENTO ─────────────────────────────
    h1('8. EQUIPAMENTOS DE ABASTECIMENTO') +
    tabelaSimples([
      ['Equipamento','Quantidade','Especificação / Observações'],
      ['Bombas de abastecimento', r('qtdBombas') || '—','Eletrônicas, medidor homologado INMETRO'],
      ['Bicos abastecedores', r('qtdBicos') || '—','Com trava automática e vedação anti-gotejamento'],
      ['Tanques subterrâneos','Conforme item 7','Dupla parede com monitoramento intersticial'],
      ['Caixas coletoras de passagem (TSR)','[informar]','Inspeção semestral – NBR 13.784'],
    ]) + empty() +

    // ── 9. SISTEMA DE CONTROLE AMBIENTAL ─────────────────────────────
    h1('9. SISTEMA DE CONTROLE AMBIENTAL') +
    p(`O empreendimento dispõe de sistema de controle ambiental para contenção e tratamento dos efluentes líquidos gerados nas operações de abastecimento e lavagem de veículos, constituído pelos seguintes elementos: (i) piso impermeabilizado na pista de abastecimento e nas áreas de armazenamento, com declividade mínima de 1% para escoamento direcionado; (ii) canaletas de contenção perimétricas em concreto armado, com grade de proteção e dispositivo de fechamento manual em caso de acidente; (iii) Caixa Separadora de Água e Óleo – SAO dimensionada conforme NBR 14.605:2015, com capacidade compatível com o volume máximo de efluentes gerados; (iv) sistema de monitoramento de vazamentos nos tanques subterrâneos, conforme item 4.4 da Resolução CONAMA nº 273/2000.`, {justify:true}) +
    p(`O efluente tratado pela SAO é monitorado periodicamente por análises laboratoriais credenciadas, com vistas ao atendimento dos padrões de lançamento estabelecidos pela Resolução CONAMA nº 430/2011, cujo Artigo 16 fixa valor máximo permissível (VMP) de 20 mg/L para óleos e graxas minerais. Os laudos analíticos são registrados em relatório técnico específico (Relatório de Eficiência da SAO) e arquivados pelo empreendimento para apresentação ao INEMA.`, {justify:true}) +
    empty() +

    // ── 10. GERENCIAMENTO DE RESÍDUOS ────────────────────────────────
    h1('10. GERENCIAMENTO DE RESÍDUOS SÓLIDOS') +
    p(`Os resíduos sólidos gerados nas atividades do empreendimento são classificados, segregados na fonte, acondicionados e destinados em conformidade com a Lei Federal nº 12.305/2010 (PNRS), o Decreto nº 7.404/2010, a Resolução CONAMA nº 362/2005 (OLUC) e as normas ABNT NBR 10.004/2004 (Classificação), NBR 10.005/2004 (Lixiviação) e NBR 10.007/2004 (Amostragem). O detalhamento dos procedimentos de gerenciamento de resíduos encontra-se no Plano de Gerenciamento de Resíduos Sólidos – PGRS, documento complementar ao presente RCE.`, {justify:true}) +
    empty() +

    // ── 11. DOCUMENTAÇÃO AMBIENTAL ───────────────────────────────────
    h1('11. DOCUMENTAÇÃO AMBIENTAL') +
    tabelaSimples([
      ['Documento','Número / Data','Situação'],
      ['Licença de Operação (LO)', (e('portaria') || '—') + (e('dataPortaria') ? ' – ' + e('dataPortaria') : ''),'Em vigor'],
      ['Processo INEMA', e('numProcesso') || '—','Em vigor'],
      ['Registro ANP', e('registroAnp') || '—','Renovação anual'],
      ['Portaria LO emitida em', e('dataPortaria') || '—','—'],
    ]) + empty() +

    // ── 12. CONSIDERAÇÕES FINAIS ─────────────────────────────────────
    h1('12. CONSIDERAÇÕES FINAIS') +
    p(`O presente Roteiro de Caracterização do Empreendimento demonstra que o empreendimento ${e('razaoSocial')}, situado no município de ${e('municipio')}/${e('uf')}, encontra-se estruturado para o desenvolvimento de suas atividades em conformidade com os requisitos técnicos e legais da legislação ambiental vigente, em especial com a Resolução CONAMA nº 273/2000, a Resolução CEPRAM nº 4.578/2017 e as normativas do INEMA para o licenciamento de postos de combustíveis no Estado da Bahia.`, {justify:true}) +
    p(`As informações técnicas contidas neste documento foram levantadas em visita técnica de campo realizada pela equipe da SUAL – Soluções Ambientais Ltda. O empreendedor fica responsável pela atualização imediata das informações em caso de alterações operacionais, ampliações ou modificações das instalações, conforme estabelecido no Artigo 7º da Resolução CONAMA nº 273/2000 e nas condicionantes da Licença de Operação vigente.`, {justify:true})
  );
}
function xmlPgrs() {
  const r = id => d('pgrs.' + id);
  return xmlBase('PGRS – PROGRAMA DE GERENCIAMENTO DE RESÍDUOS SÓLIDOS',
    h1('1. APRESENTAÇÃO') +
    p(`O presente Plano de Gerenciamento de Resíduos Sólidos (PGRS) foi elaborado pela SUAL – Soluções Ambientais Ltda para o empreendimento ${e('razaoSocial')}, localizado no município de ${e('municipio')}/${e('uf')}, em atendimento às exigências do Instituto do Meio Ambiente e Recursos Hídricos – INEMA e às condicionantes da Licença de Operação Nº ${e('portaria') || '[informar]'}, emitida em conformidade com a Resolução CEPRAM nº 4.578/2017 e com as normas federais aplicáveis ao licenciamento ambiental de postos de combustíveis.`, {justify:true}) +
    p(`O PGRS constitui instrumento de gestão ambiental que estabelece as diretrizes, os procedimentos e as responsabilidades para o manuseio, acondicionamento, transporte, tratamento e destinação final dos resíduos sólidos gerados pelas atividades do empreendimento, em conformidade com os princípios da Política Nacional de Resíduos Sólidos – PNRS, instituída pela Lei Federal nº 12.305, de 2 de agosto de 2010, e regulamentada pelo Decreto nº 7.404/2010. Nos termos do Artigo 20 da referida Lei, o empreendimento é classificado como gerador sujeito à elaboração do PGRS, por desenvolver atividade de prestação de serviços com geração de resíduos perigosos.`, {justify:true}) +
    empty() +

    h1('2. OBJETIVO') +
    p(`O PGRS tem como objetivo central garantir o gerenciamento ambientalmente adequado dos resíduos sólidos gerados no empreendimento ${e('razaoSocial')}, contemplando: (i) a identificação e caracterização de todos os resíduos gerados; (ii) a definição de procedimentos de segregação na fonte, acondicionamento e armazenamento temporário; (iii) o estabelecimento das responsabilidades pelo gerenciamento de cada fluxo de resíduo; (iv) a documentação das rotas de coleta, transporte e destinação final; (v) a promoção da redução na geração de resíduos e do reaproveitamento ou reciclagem quando tecnicamente viável e economicamente factível, em atendimento ao princípio da hierarquia dos resíduos previsto no Artigo 9º da Lei nº 12.305/2010.`, {justify:true}) +
    empty() +

    h1('3. FUNDAMENTAÇÃO LEGAL') +
    p(`O presente PGRS foi elaborado observando o seguinte arcabouço normativo:`, {justify:true}) +
    bullet('Lei Federal nº 12.305/2010 – Política Nacional de Resíduos Sólidos (PNRS): institui princípios, objetivos, instrumentos e responsabilidades pela gestão integrada e pelo gerenciamento de resíduos sólidos no Brasil.') +
    bullet('Decreto Federal nº 7.404/2010 – Regulamenta a PNRS, definindo obrigações dos geradores, os sistemas de logística reversa e o SINIR (Sistema Nacional de Informações sobre a Gestão dos Resíduos Sólidos).') +
    bullet('Resolução CONAMA nº 237/1997 – Disciplina o licenciamento ambiental e define as competências dos órgãos integrantes do SISNAMA.') +
    bullet('Resolução CONAMA nº 273/2000 – Estabelece diretrizes e medidas preventivas para o licenciamento ambiental de postos de revenda de combustíveis, incluindo requisitos de gerenciamento de resíduos.') +
    bullet('Resolução CONAMA nº 362/2005 – Dispõe sobre o recolhimento, a coleta e a destinação final de óleo lubrificante usado ou contaminado (OLUC), determinando o retorno do produto ao sistema de recolhimento após o uso.') +
    bullet('ABNT NBR 10.004/2004 – Resíduos Sólidos: Classificação. Define os critérios de periculosidade dos resíduos e as classes I (perigosos), II-A (não inertes) e II-B (inertes).') +
    bullet('ABNT NBR 10.005/2004 – Procedimento para obtenção de extrato lixiviado de resíduos sólidos.') +
    bullet('ABNT NBR 10.007/2004 – Amostragem de resíduos sólidos.') +
    bullet('Resolução CEPRAM nº 4.578/2017 – Estabelece critérios, procedimentos e competências do licenciamento ambiental no Estado da Bahia, integrando as exigências estaduais ao SISNAMA.') +
    empty() +

    h1('4. IDENTIFICAÇÃO DO GERADOR') +
    tabelaSimples([
      ['Campo','Informação'],
      ['Razão Social', e('razaoSocial')],
      ['Nome Fantasia', e('nomeFantasia') || '—'],
      ['CNPJ', e('cnpj')],
      ['Endereço', e('endereco') + ', ' + e('municipio') + '/' + e('uf') + ' – CEP: ' + e('cep')],
      ['Telefone / E-mail', (e('telefone') || '—') + ' | ' + (e('email') || '—')],
      ['Nº de Funcionários', r('numFuncionarios') || '—'],
      ['Estrutura Organizacional', r('estruturaOrg') || '—'],
      ['Área Construída', (e('areaConstruida') || '—') + ' m²'],
      ['Área Total', (e('areaTotal') || '—') + ' m²'],
      ['CNAE Principal', '4731-8/00 – Comércio varejista de combustíveis para veículos automotores'],
      ['Responsável pelo Empreendimento', e('respNome') || '—'],
      ['Responsável Técnico', (e('tecNome') || '—') + ' – RNP: ' + (e('tecRnp') || '—')],
    ]) + empty() +

    h1('5. DIAGNÓSTICO DOS RESÍDUOS GERADOS') +
    p(`Os resíduos sólidos gerados pelo empreendimento foram identificados e classificados em conformidade com a ABNT NBR 10.004/2004, que os organiza em: Resíduos Classe I – Perigosos; Resíduos Classe II-A – Não Inertes; e Resíduos Classe II-B – Inertes. A caracterização foi realizada a partir de visita técnica in loco, análise das fichas de segurança dos produtos utilizados (FISPQ) e entrevistas com o responsável pelo empreendimento.`, {justify:true}) +

    h2('5.1 Resíduos Classe I – Perigosos') +
    p(`São considerados perigosos os resíduos que apresentam, em função de suas propriedades físicas, químicas, biológicas, infectocontagiosas ou radiativas, risco à saúde pública ou ao meio ambiente, podendo provocar mortalidade, incidência de doenças ou acentuar seus índices (ABNT NBR 10.004/2004). Para o presente empreendimento, foram identificados os seguintes resíduos Classe I:`, {justify:true}) +
    tabelaSimples([
      ['Resíduo','Fonte','Código NBR','Estado','Acondicionamento','Destinação Final'],
      ['Óleo lubrificante usado – OLUC','Troca de óleo','D009/F005','Líquido','Tambor metálico 200L vedado','Recolhimento – empresa autorizada ANP (rerrefino)'],
      ['Filtros de óleo usados','Troca de óleo','D007','Sólido','Tambor metálico c/ tampa','Coprocessamento / reciclagem'],
      ['Panos/estopas contaminados c/ óleo','Manutenção e abastecimento','D007','Sólido','Saco resistente em tambor vedado','Incineração / coprocessamento'],
      ['Embalagens de lubrificante','Troca de óleo','D007','Sólido','Coletor específico impermeável','Logística reversa – fabricante'],
      ['Solo contaminado (vazamentos)','Derrames acidentais','D009','Sólido','Bombona hermética identificada','Remediação / aterro industrial Cl. I'],
    ]) +
    (r('residuosClasseI') ? p(r('residuosClasseI'), {justify:true}) : '') +
    empty() +

    h2('5.2 Resíduos Classe II-A – Não Inertes') +
    p(`Os resíduos Classe II-A não são enquadrados como perigosos (Classe I) nem como inertes (Classe II-B), podendo apresentar propriedades de biodegradabilidade, combustibilidade ou solubilidade em água. Incluem resíduos que podem ter constituintes lixiviados em concentrações superiores aos padrões de potabilidade de água, mas que não apresentam nenhuma das características dos resíduos perigosos (ABNT NBR 10.004/2004).`, {justify:true}) +
    tabelaSimples([
      ['Resíduo','Fonte','Estado','Acondicionamento','Destinação'],
      ['Resíduos orgânicos (alimentar)','Loja de conveniência/copa','Sólido','Lixeira com tampa – saco plástico','Coleta pública municipal'],
      ['Papel e papelão leve','Administração','Sólido','Coletor identificado','Reciclagem ou coleta municipal'],
      ['Lodo da SAO','Caixa separadora','Pastoso','Tambor metálico vedado','Empresa especializada em tratamento de efluentes'],
    ]) +
    (r('residuosClasseIIA') ? p(r('residuosClasseIIA'), {justify:true}) : '') +
    empty() +

    h2('5.3 Resíduos Classe II-B – Inertes') +
    p(`Os resíduos Classe II-B não apresentam nenhum de seus constituintes solubilizados em concentrações superiores aos padrões de potabilidade de água, de acordo com o Anexo G da NBR 10.004/2004. São resíduos que, submetidos a contato dinâmico e estático com água destilada ou deionizada a temperatura ambiente, não tiverem nenhum de seus constituintes solubilizados a concentrações superiores aos padrões de potabilidade de água (NBR 10.007/2004).`, {justify:true}) +
    tabelaSimples([
      ['Resíduo','Fonte','Acondicionamento','Destinação'],
      ['Papelão limpo','Embalagens de produtos','Saco plástico / coletor identificado','Reciclagem (catadores ou empresa)'],
      ['Plástico limpo (PET, PEAD, PP)','Embalagens / conveniência','Saco plástico / coletor','Reciclagem'],
      ['Vidro','Conveniência','Coletor específico','Reciclagem'],
      ['Metal (latas, sucata metálica)','Manutenção / conveniência','Coletor metálico','Reciclagem / sucateiro licenciado'],
      ['Entulho de obras/reformas','Manutenção civil eventual','Caçamba coberta','Aterro de resíduos de construção civil (RCC)'],
    ]) +
    (r('residuosClasseIIB') ? p(r('residuosClasseIIB'), {justify:true}) : '') +
    empty() +

    h1('6. ACONDICIONAMENTO E ARMAZENAMENTO TEMPORÁRIO') +
    p(`O acondicionamento dos resíduos deve ser realizado de forma segura e compatível com as características de periculosidade de cada resíduo, utilizando recipientes resistentes, impermeáveis e devidamente identificados conforme a NBR 7.500/2017 (Identificação para o transporte terrestre, manuseio, movimentação e armazenamento de produtos). A identificação dos recipientes deve conter, no mínimo: designação do resíduo, classe (NBR 10.004/2004), riscos associados e dados do responsável pelo gerenciamento.`, {justify:true}) +
    p(`O armazenamento temporário do OLUC deve ser realizado em tambores metálicos de 200 litros com tampa rosqueada, posicionados sobre bacia de contenção com capacidade volumétrica de no mínimo 110% do maior recipiente ali armazenado, em área coberta, ventilada e sinalizada, conforme Resolução CONAMA nº 362/2005 e portarias ANP vigentes. O período máximo de armazenamento temporário do OLUC não deve exceder 12 meses, sob pena de caracterização de deposição irregular (Artigo 5º da Res. CONAMA nº 362/2005).`, {justify:true}) +
    empty() +

    h1('7. COLETA, TRANSPORTE E DESTINAÇÃO FINAL') +
    p(`A coleta, o transporte e a destinação final dos resíduos sólidos devem ser executados exclusivamente por empresas legalmente habilitadas, portadoras de Licença Ambiental de Operação vigente, emitida pelo órgão ambiental competente. Toda a operação deve ser documentada por meio do Manifesto de Transporte de Resíduos (MTR), emitido através do Sistema Nacional de Informações sobre a Gestão dos Resíduos Sólidos – SINIR, em conformidade com o Decreto nº 7.404/2010 e a Instrução Normativa IBAMA nº 13/2012.`, {justify:true}) +
    tabelaSimples([
      ['Resíduo','Empresa Coletora','Destino Final','Documentação Exigida'],
      ['OLUC', r('empresaOleo') || '[empresa autorizada ANP]','Rerrefino autorizado ANP','MTR + Nota Fiscal + Autorização ANP'],
      ['Resíduos comuns (Cl. IIA e IIB)', r('empresaResiduos') || '[coleta municipal ou empresa contratada]','Aterro sanitário licenciado','Comprovante de coleta / NF'],
      ['Filtros / panos contaminados','[empresa especializada]','Coprocessamento / incineração','MTR + CDF (Certificado de Destinação Final)'],
      ['Lodo da SAO','[empresa especializada]','Tratamento específico','MTR + Laudo de aceitação'],
    ]) + empty() +

    h1('8. CONTROLE, RASTREABILIDADE E LOGÍSTICA REVERSA') +
    p(`Para todos os resíduos perigosos, deve ser emitido Manifesto de Transporte de Resíduos (MTR) via SINIR a cada movimentação, com cópia arquivada pelo empreendimento por prazo mínimo de 5 anos para fins de fiscalização pelo INEMA (Artigo 56 da Lei nº 12.305/2010). O Certificado de Destinação Final (CDF) deve ser retido pelo empreendimento como comprovante da destinação ambientalmente adequada dos resíduos perigosos.`, {justify:true}) +
    p(`O controle do OLUC deve ser registrado em planilha própria contendo: (i) volume de óleo lubrificante comercializado; (ii) volume de OLUC gerado e recolhido; (iii) data de cada recolhimento; (iv) identificação da empresa coletora; (v) números das notas fiscais de saída e dos MTRs. A ANP preconiza que, em média, 30% do volume de óleo comercializado retorna como OLUC para recolhimento (ANP, 2022).`, {justify:true}) +
    p(`Os produtos sujeitos à logística reversa, conforme Artigo 33 da Lei nº 12.305/2010 e os acordos setoriais vigentes – incluindo embalagens de lubrificantes (Decreto nº 7.404/2010 e Resolução Conama nº 362/2005) e pilhas/baterias (Resolução CONAMA nº 401/2008) – devem ser devolvidos ao fabricante ou distribuidor por meio dos sistemas de coleta implantados pelos respectivos setores.`, {justify:true}) +
    empty() +

    h1('9. PROGRAMA DE CAPACITAÇÃO E TREINAMENTO') +
    p(`Os funcionários diretamente envolvidos no manuseio, segregação, acondicionamento e transporte interno de resíduos devem receber capacitação periódica, conforme previsão do Artigo 8º, inciso VIII da Lei nº 12.305/2010. O programa de treinamento deve ser realizado no mínimo anualmente e deve abordar: (i) identificação e classificação dos resíduos gerados; (ii) procedimentos corretos de segregação na fonte; (iii) uso adequado dos recipientes de acondicionamento; (iv) identificação dos riscos associados ao manuseio de resíduos perigosos; (v) procedimentos de emergência em caso de vazamento ou acidente com resíduos; (vi) destinação correta de cada fluxo de resíduo. Os registros de treinamento (lista de presença, conteúdo programático, certificados) devem ser arquivados pelo período mínimo de 5 anos.`, {justify:true}) +
    empty() +

    h1('10. PLANO DE EMERGÊNCIA PARA DERRAMES E ACIDENTES') +
    p(`Em caso de derrame acidental de combustível ou óleo lubrificante, os seguintes procedimentos devem ser adotados imediatamente e em sequência: (i) isolar a área afetada impedindo o acesso de pessoas não autorizadas e a ignição de fontes de calor; (ii) interromper o abastecimento e desligar as bombas; (iii) utilizar EPI adequado (luvas nitrílicas, óculos de segurança, botina impermeável) antes de qualquer intervenção; (iv) aplicar material absorvente granulado (serragem, areia ou absorvente específico) para contenção do derrame; (v) recolher o material contaminado em recipiente hermético adequado, devidamente identificado como resíduo perigoso; (vi) acionar o INEMA e, quando necessário, o Corpo de Bombeiros e a Defesa Civil, conforme Artigo 69 da Lei nº 12.305/2010; (vii) registrar o evento em relatório de ocorrência e comunicar formalmente o órgão ambiental no prazo máximo de 24 horas.`, {justify:true}) +
    empty() +

    h1('11. REVISÃO E VALIDADE DO PGRS') +
    p(`O presente PGRS deverá ser revisado no prazo máximo de ${r('anoPgrs') ? '1 (um) ano – ' + r('revisaoPgrs') : '1 (um) ano'}, ou sempre que ocorrerem modificações nas atividades do empreendimento que impliquem alteração no tipo, volume ou destinação dos resíduos gerados, conforme exigência do órgão ambiental licenciador e do Artigo 23 da Lei nº 12.305/2010. A revisão deve ser formalmente registrada, com identificação da versão do documento e das principais alterações realizadas em relação à versão anterior.`, {justify:true}) +
    empty() +

    h1('12. CONSIDERAÇÕES FINAIS') +
    p(`O Plano de Gerenciamento de Resíduos Sólidos ora apresentado estabelece o conjunto mínimo de procedimentos necessários para que o empreendimento ${e('razaoSocial')} gerencie seus resíduos de forma ambientalmente adequada, em conformidade com a legislação federal, estadual e municipal vigente. A implementação efetiva deste PGRS contribui para a prevenção da contaminação do solo e das águas subterrâneas, para a proteção da saúde dos trabalhadores e da comunidade do entorno, e para o atendimento das condicionantes da Licença de Operação emitida pelo INEMA, constituindo obrigação legal do empreendedor sob pena das sanções previstas na Lei de Crimes Ambientais (Lei Federal nº 9.605/1998) e na Lei Federal nº 12.305/2010.`, {justify:true})
  );
}

function xmlPea() {
  const r = id => d('pea.' + id);
  return xmlBase('PEA – PROGRAMA DE EDUCAÇÃO AMBIENTAL', `
    ${h1('1. APRESENTAÇÃO')}
    ${p(`O Programa de Educação Ambiental (PEA) do empreendimento ${e('razaoSocial')} foi elaborado visando atender às exigências legais e às condicionantes da Licença de Operação, promovendo a consciência ambiental entre funcionários e comunidade do entorno.`, {justify:true})}
    ${empty()}
    ${h1('2. DADOS DO PROGRAMA')}
    ${tabelaSimples([
      ['Campo','Informação'],
      ['Empreendimento', e('razaoSocial')],
      ['Público-alvo', r('publicoAlvo') || 'Funcionários e comunidade do entorno'],
      ['Data de Realização', r('dataPea')],
      ['Local', r('localPea') || e('municipio')],
      ['Carga Horária', r('cargaHoraria')],
      ['Instrutor / Responsável', r('instrutorPea') || e('tecNome')],
    ])}
    ${empty()}
    ${h1('3. TEMAS ABORDADOS')}
    ${r('temasPea') ? r('temasPea').split(',').map(t => bullet(t.trim())).join('') : bullet('[Inserir temas abordados]')}
    ${empty()}
    ${h1('4. AÇÕES DESENVOLVIDAS')}
    ${r('acoesPea') ? p(r('acoesPea'), {justify:true}) : p('[Descrever ações realizadas]')}
    ${empty()}
    ${h1('5. PRÓXIMO CICLO')}
    ${p('Data prevista do próximo PEA: ' + (r('proximoPea') || '[A definir]'))}
    ${empty()}
    ${h1('6. CONSIDERAÇÕES FINAIS')}
    ${p(`O presente PEA reafirma o compromisso do empreendimento ${e('razaoSocial')} com a responsabilidade ambiental, conforme as diretrizes do INEMA e a legislação vigente.`, {justify:true})}
  `);
}

function xmlPgr() {
  const r = id => d('pgr.' + id);
  return xmlBase('PGR – PROGRAMA DE GERENCIAMENTO DE RISCOS', `
    ${h1('1. APRESENTAÇÃO')}
    ${p(`O Programa de Gerenciamento de Riscos (PGR) do empreendimento ${e('razaoSocial')} foi elaborado em conformidade com a Resolução CEPRAM nº 4.578/2017 e a NR-01, com o objetivo de proteger os funcionários, o público em geral e o meio ambiente.`, {justify:true})}
    ${empty()}
    ${h1('2. IDENTIFICAÇÃO E AVALIAÇÃO DE RISCOS')}
    ${h2('2.1 Riscos Físicos')}
    ${r('riscFisicos') ? p(r('riscFisicos'), {justify:true}) : p('[Descrever riscos físicos]')}
    ${h2('2.2 Riscos Químicos')}
    ${r('riscQuimicos') ? p(r('riscQuimicos'), {justify:true}) : p('[Descrever riscos químicos]')}
    ${h2('2.3 Riscos Ergonômicos')}
    ${r('riscErgonomicos') ? p(r('riscErgonomicos'), {justify:true}) : p('[Descrever riscos ergonômicos]')}
    ${h2('2.4 Riscos de Acidentes')}
    ${r('riscAcidentes') ? p(r('riscAcidentes'), {justify:true}) : p('[Descrever riscos de acidentes]')}
    ${empty()}
    ${h1('3. MEDIDAS DE CONTROLE')}
    ${h2('3.1 EPIs')}
    ${r('epis') ? p(r('epis'), {justify:true}) : p('[Listar EPIs]')}
    ${h2('3.2 EPCs')}
    ${r('epcs') ? p(r('epcs'), {justify:true}) : p('[Listar EPCs]')}
    ${h2('3.3 Treinamentos')}
    ${r('treinamentos') ? p(r('treinamentos'), {justify:true}) : p('[Listar treinamentos]')}
    ${empty()}
    ${h1('4. PERÍODO DE VIGÊNCIA')}
    ${tabelaSimples([
      ['Início','Fim'],
      [r('dataInicioPgr') || e('mesAno'), r('dataFimPgr') || ''],
    ])}
  `);
}

function xmlCond() {
  const r = id => d('cond.' + id);
  const respostas = r('respostasCond') || '';
  const blocos = respostas.split('\n').filter(l => l.trim()).map(linha => p(linha, {justify:true})).join('');
  return xmlBase('RELATÓRIO DE CUMPRIMENTO DE CONDICIONANTES', `
    ${h1('IDENTIFICAÇÃO')}
    ${tabelaSimples([
      ['Campo','Informação'],
      ['Empreendimento', e('razaoSocial')],
      ['CNPJ', e('cnpj')],
      ['Portaria / LO', e('portaria')],
      ['Data da Portaria', e('dataPortaria')],
      ['Processo', e('numProcesso')],
      ['Contato', r('contatoCond') || e('telefone')],
      ['Qtd. de Condicionantes', r('qtdCond')],
      ['Válido até', r('validadeCond')],
    ])}
    ${empty()}
    ${h1('CONDICIONANTES E RESPOSTAS')}
    ${blocos || p('[Inserir respostas às condicionantes no campo de configuração]', {cor:'718096'})}
  `);
}

function xmlSao() {
  const r = id => d('sao.' + id);
  return xmlBase('RELATÓRIO DE EFICIÊNCIA DA CAIXA SEPARADORA ÁGUA/ÓLEO', `
    ${h1('1. INTRODUÇÃO')}
    ${p(`O presente estudo visa o monitoramento da eficiência da caixa separadora (SAO) do empreendimento ${e('razaoSocial')}, uma vez que as atividades de armazenamento, abastecimento e lavação de combustíveis são consideradas potencialmente poluidoras.`, {justify:true})}
    ${p('A atividade está sujeita a licenciamento ambiental conforme Resolução CONAMA nº 273/2000, com monitoramento dos efluentes conforme Resolução CONAMA nº 430/2011.', {justify:true})}
    ${empty()}
    ${h1('2. METODOLOGIA')}
    ${p('A SAO (Caixa Separadora Água/Óleo) remove óleos em estado livre por diferença de densidade. O efluente bruto passa por compartimentos de separação onde o óleo é retido e o efluente tratado é direcionado para a saída.', {justify:true})}
    ${empty()}
    ${h1('3. ANÁLISE LABORATORIAL')}
    ${p('Data de coleta: ' + (r('dataColetaSao') || '[Inserir data]'))}
    ${r('laboratorioSao') ? p('Laboratório: ' + r('laboratorioSao')) : ''}
    ${empty()}
    ${h2('3.1 Resultados')}
    ${tabelaSimples([
      ['Parâmetro','Entrada (Bruto)','Saída (Tratado)','VMP CONAMA 430'],
      ['pH', r('phEntrada'), r('phSaida'), '5 a 9'],
      ['DQO (mg/L)', r('dqoEntrada'), r('dqoSaida'), '—'],
      ['Óleos e Graxas (mg/L)', r('ogEntrada'), r('ogSaida'), '≤ 20'],
      ['Sólidos em Suspensão', r('ssEntrada'), r('ssSaida'), '—'],
    ])}
    ${empty()}
    ${h2('3.2 Eficiência')}
    ${tabelaSimples([
      ['Parâmetro','Eficiência','Enquadramento'],
      ['Óleos e Graxas', r('eficienciaOg'), r('enquadramento') || 'Conforme CONAMA 430/2011'],
    ])}
    ${empty()}
    ${h1('4. CONSIDERAÇÕES FINAIS')}
    ${p(`Com base nos resultados obtidos, a caixa separadora água/óleo do empreendimento ${e('razaoSocial')} apresentou ${r('enquadramento') || 'resultado conforme'} os padrões estabelecidos pela Resolução CONAMA nº 430/2011.`, {justify:true})}
    ${r('obsSao') ? p('Observações: ' + r('obsSao'), {justify:true}) : ''}
  `);
}

function xmlDiag() {
  const r = id => d('diag.' + id);
  return xmlBase('DIAGNÓSTICO AMBIENTAL',
    h1('1. INTRODUÇÃO') +
    p(`O presente estudo de Diagnóstico Ambiental foi elaborado pela SUAL – Soluções Ambientais Ltda para o empreendimento ${e('razaoSocial')}, situado no município de ${e('municipio')}, Estado da Bahia, em atendimento às exigências do Instituto do Meio Ambiente e Recursos Hídricos – INEMA e à Resolução CONAMA nº 273, de 29 de novembro de 2000, que estabelece as diretrizes para o licenciamento ambiental de postos e serviços de combustíveis, e a outros estabelecimentos que comercializam ou armazenam derivados de petróleo.`, {justify:true}) +
    p(`O licenciamento ambiental, previsto nos artigos 10 e 11 da Lei nº 6.938/1981 (Política Nacional do Meio Ambiente) e disciplinado pela Resolução CONAMA nº 237/1997, é o procedimento pelo qual o órgão ambiental competente licencia a localização, instalação e operação de empreendimentos efetiva ou potencialmente poluidores. Postos de revenda de combustíveis constituem fontes potenciais de contaminação do solo e das águas subterrâneas em razão do armazenamento de substâncias tóxicas, em especial os hidrocarbonetos do grupo BTEX (benzeno, tolueno, etilbenzeno e xilenos), cuja presença em aquíferos representa grave risco à saúde humana e aos ecossistemas aquáticos (CETESB, 2022; IARC, 2012).`, {justify:true}) +
    p(`O benzeno, principal contaminante de interesse nos combustíveis automotivos, é classificado como carcinogênico do Grupo 1 pela Agência Internacional de Pesquisa sobre o Câncer – IARC (2012), com associação comprovada ao desenvolvimento de leucemia mieloide aguda em humanos. A Resolução CONAMA nº 420/2009 fixa o Valor de Investigação (VI) para benzeno em solo e água subterrânea de uso potável em 0,06 mg/kg e 0,005 mg/L, respectivamente, valores que orientam a tomada de decisão sobre a necessidade de investigação confirmatória e remediação. O presente diagnóstico fornece o embasamento técnico necessário para avaliar a vulnerabilidade ambiental da área e subsidiar o processo de licenciamento junto ao INEMA.`, {justify:true}) +
    empty() +

    h1('2. OBJETIVO') +
    p(`O Diagnóstico Ambiental tem como objetivo geral descrever as características físicas, bióticas e socioeconômicas da área de implantação e entorno do empreendimento ${e('razaoSocial')}, identificando os componentes ambientais relevantes para a avaliação dos impactos potenciais associados à atividade de revenda de combustíveis. Constituem objetivos específicos: (i) descrever a geologia, geomorfologia, pedologia, hidrografia e hidrogeologia da área de influência; (ii) identificar os corpos hídricos superficiais e subterrâneos e avaliar sua vulnerabilidade à contaminação; (iii) caracterizar a cobertura vegetal remanescente e a fauna local; (iv) apresentar o perfil socioeconômico do município; (v) fornecer os dados técnicos necessários para a elaboração dos demais estudos complementares ao licenciamento.`, {justify:true}) +
    empty() +

    h1('3. LOCALIZAÇÃO E ACESSOS') +
    p(`O empreendimento está localizado na ${e('endereco')}, município de ${e('municipio')}, Estado da Bahia, inserido nas coordenadas UTM E: ${e('coordE')} m, N: ${e('coordN')} m, Zona ${e('zonaUtm')}, Datum SIRGAS 2000. A área de influência direta (AID) compreende um raio de 100 metros a partir do limite do lote, enquanto a área de influência indireta (AII) estende-se até 500 metros.`, {justify:true}) +
    (r('acessoDiag') ? p(r('acessoDiag'), {justify:true}) : p(`O empreendimento está inserido na malha viária urbana do município de ${e('municipio')}, com acesso facilitado pelas vias públicas do entorno.`, {justify:true})) +
    p('[Inserir Figura 1 – Mapa de Localização com coordenadas UTM, rede viária e pontos de referência. Fonte: IBGE/Google Maps]', {center:true, cor:'718096'}) +
    p('[Inserir Figura 2 – Imagem de satélite com delimitação da AID (100 m) e AII (500 m)]', {center:true, cor:'718096'}) +
    empty() +

    h1('4. CLIMA') +
    p(`O clima do município de ${e('municipio')} é classificado segundo a metodologia de Köppen-Geiger como Aw (tropical com estação seca no inverno) para a maioria dos municípios do interior baiano, ou Am/Af para municípios do litoral e Recôncavo Baiano, com base nos dados históricos do Instituto Nacional de Meteorologia – INMET e do banco de dados Climate-Data.org.`, {justify:true}) +
    tabelaSimples([
      ['Parâmetro Climático','Valor Estimado','Fonte'],
      ['Temperatura média anual','24,0 – 25,5°C','INMET'],
      ['Temperatura máxima média','30 – 33°C','INMET'],
      ['Temperatura mínima média','18 – 20°C','INMET'],
      ['Precipitação média anual','600 – 900 mm','INMET / Climate-Data'],
      ['Umidade relativa do ar','60 – 75%','INMET'],
      ['Período chuvoso predominante','Mar–Jun','INMET'],
    ]) +
    p(`A variabilidade interanual da precipitação é significativa, com anos de déficit hídrico pronunciado (La Niña) e anos de excesso pluviométrico (El Niño), influenciando diretamente a recarga dos aquíferos subterrâneos e a velocidade de migração de eventuais contaminantes em solo e subsolo (Foster & Hirata, 1988).`, {justify:true}) +
    p('[Inserir Figura 3 – Climograma do município com dados mensais de temperatura e precipitação]', {center:true, cor:'718096'}) +
    empty() +

    h1('5. GEOLOGIA') +
    h2('5.1 Geologia Regional') +
    p(`A geologia regional da área insere-se no contexto do Cráton do São Francisco, unidade geotectônica de alta estabilidade que ocupa a porção centro-leste do Brasil. O embasamento cristalino do Cráton é constituído por rochas metamórficas e ígneas de alto grau – gnaisses, migmatitos, granulitos e granitoides – de idade Arqueana (> 2,5 Ga), formadas durante os ciclos orogênicos Jequié (3,0–2,6 Ga) e Transamazônico (2,1–1,8 Ga) (Alkmim & Martins-Neto, 2012; CPRM, 2010).`, {justify:true}) +
    p(`Sobre o embasamento arqueano assentam coberturas sedimentares e metassedimentares do Proterozoico, representadas pelas sequências do Supergrupo Espinhaço (Paleo a Mesoproterozoico) e do Grupo Bambuí (Neoproterozoico), compostas por quartzitos, filitos, calcários, dolomitos e ardósias. Em áreas costeiras e no Recôncavo Baiano, predominam as bacias sedimentares mesozoicas, com destaque para a Bacia do Recôncavo (Jurássico-Cretáceo), de relevância econômica pelo seu potencial petrolífero (Santos et al., 2021).`, {justify:true}) +
    h2('5.2 Geologia Local') +
    p(`No município de ${e('municipio')}, a geologia local é representada por ${r('geologiaDiag') || 'unidades do embasamento cristalino, recoberto por material de alteração intempérica de caráter elúvio-coluvionar, de espessura variável entre 0,5 e 5,0 m dependendo da posição topográfica'}. As informações geológicas locais foram obtidas nos mapas da CPRM – Serviço Geológico do Brasil (2010), em escala 1:500.000.`, {justify:true}) +
    p('[Inserir Figura 4 – Mapa Geológico Regional com destaque para as unidades litoestratigráficas da área. Fonte: CPRM, 2010]', {center:true, cor:'718096'}) +
    empty() +

    h1('6. GEOMORFOLOGIA') +
    p(`A geomorfologia da área de influência é representada por unidades típicas do domínio dos planaltos e sertões do interior da Bahia. O município de ${e('municipio')} está inserido em unidade geomorfológica de ${r('geomorfo') || 'relevo plano a suave ondulado, com cotas altimétricas médias entre 200 e 500 metros, associado a superfícies de aplainamento resultantes de prolongada ação do intemperismo tropical'}. A declividade predominante é inferior a 5%, favorecendo a infiltração hídrica e minimizando os processos erosivos.`, {justify:true}) +
    p(`As formas de relevo presentes condicionam diretamente a dinâmica do escoamento superficial e a recarga dos aquíferos subterrâneos. Áreas topograficamente planas favorecem a percolação vertical da água e a recarga dos aquíferos freáticos, enquanto vertentes com declividade superior a 10% concentram o escoamento superficial, aumentando o risco de transporte de contaminantes em caso de derrames acidentais (EMBRAPA, 2018).`, {justify:true}) +
    p('[Inserir Figura 5 – Mapa Geomorfológico com curvas de nível e indicação das unidades de relevo]', {center:true, cor:'718096'}) +
    empty() +

    h1('7. PEDOLOGIA') +
    p(`Os solos da região de ${e('municipio')} foram classificados com base no Sistema Brasileiro de Classificação de Solos – SiBCS (EMBRAPA, 2018) e no Mapa Pedológico do Estado da Bahia (CPRM/EMBRAPA, escala 1:1.000.000). O solo predominante na área é classificado como ${r('tipoSoloDiag') || 'Latossolo Vermelho-Amarelo Distrófico (LVAd), desenvolvido sobre rochas do embasamento cristalino ou coberturas sedimentares terciárias'}.`, {justify:true}) +
    p(`Os Latossolos Vermelho-Amarelos são solos profundamente intemperizados, com horizonte B latossólico de textura argilo-arenosa a argilosa, coloração vermelho-amarelada devido à presença de óxidos de ferro (hematita e goethita). Apresentam alta porosidade total, boa drenagem interna e baixa capacidade de troca catiônica (CTC), sendo classificados como distróficos (baixa saturação de bases). Do ponto de vista ambiental, esses solos apresentam vulnerabilidade moderada à contaminação por hidrocarbonetos em razão de suas características texturais e estruturais, com permeabilidade que favorece a infiltração e a migração vertical de contaminantes em caso de vazamentos (CETESB, 2007; EMBRAPA, 2018).`, {justify:true}) +
    p('[Inserir Figura 6 – Mapa de Solos da área de influência com legenda de classes pedológicas. Fonte: EMBRAPA/CPRM]', {center:true, cor:'718096'}) +
    empty() +

    h1('8. RECURSOS HÍDRICOS') +
    h2('8.1 Hidrografia') +
    p(`A hidrografia da área de influência integra a rede hídrica regional do Estado da Bahia. O corpo d'água superficial mais próximo ao empreendimento é ${r('corpoAgua') || '[informar nome]'}${r('distanciaCorpo') ? ', situado a aproximadamente ' + r('distanciaCorpo') + ' do limite do lote' : ''}.${r('baciaDiag') ? ' A área encontra-se inserida na ' + r('baciaDiag') + '.' : ''} Não foram identificadas áreas de Preservação Permanente (APP) no raio de 100 metros de influência direta do empreendimento, conforme previsto no Artigo 4º da Lei Federal nº 12.651/2012 (Código Florestal Brasileiro).`, {justify:true}) +
    p('[Inserir Figura 7 – Mapa de Hidrografia com localização do empreendimento, rede de drenagem e distâncias aos corpos hídricos mais próximos]', {center:true, cor:'718096'}) +
    h2('8.2 Hidrogeologia') +
    p(`A hidrogeologia regional é caracterizada por dois sistemas aquíferos principais: (i) Aquífero Cristalino – rochas fraturadas do embasamento, com produtividade variável em função da densidade de fraturas e da profundidade do nível estático; e (ii) Aquífero Granular – coberturas sedimentares e aluviões, de caráter livre e menor expressão regional, mas de relevância local para captações rasas.`, {justify:true}) +
    p(`Com base em ${r('numPocos') || '[informar]'} poços cadastrados no Sistema de Informações de Águas Subterrâneas – SIAGAS (CPRM, 2025) na área de influência do empreendimento, o nível estático (NE) varia de ${r('neMin') || '[informar]'} m a ${r('neMax') || '[informar]'} m de profundidade, com profundidade média estimada do lençol freático de ${r('profLencol') || '[informar]'} metros. A vulnerabilidade do aquífero à contaminação superficial foi avaliada segundo a metodologia DRASTIC (Aller et al., 1987), que considera profundidade do lençol, recarga, litologia do aquífero, tipo de solo, topografia, influência da zona vadosa e condutividade hidráulica como parâmetros determinantes.`, {justify:true}) +
    p(`O fluxo subterrâneo tem direção preferencial das cotas topograficamente mais elevadas para as mais baixas, em conformidade com a topografia local, convergindo em direção aos corpos hídricos receptores (Bear, 1979; Fetter, 2001). Em aquíferos livres rasos (NE < 10 m), a vulnerabilidade à contaminação por hidrocarbonetos é classificada como alta, reforçando a necessidade de sistemas eficientes de monitoramento e contenção de vazamentos (Foster & Hirata, 1988).`, {justify:true}) +
    p('[Inserir Figura 8 – Mapa Hidrogeológico com poços SIAGAS, NE médio e direção estimada do fluxo subterrâneo]', {center:true, cor:'718096'}) +
    empty() +

    h1('9. COBERTURA VEGETAL E FAUNA') +
    p(`A cobertura vegetal original da área de influência do empreendimento encontra-se majoritariamente suprimida em decorrência da ocupação urbana consolidada. Espécies remanescentes limitam-se a gramíneas, arbustos pioneiros e espécies ornamentais introduzidas. O bioma original da região é a Caatinga (municípios do semiárido) ou a Mata Atlântica (municípios do litoral e Recôncavo Baiano), conforme mapeamento do MMA/IBGE (2019). Não foram identificadas espécies da flora ameaçadas de extinção constantes da Portaria MMA nº 148/2022 no raio de influência direta.`, {justify:true}) +
    p(`Em relação à fauna, o contexto urbano limita a ocorrência de espécies silvestres a grupos adaptados à perturbação antrópica, como aves generalistas (Columba livia, Furnarius rufus, Passer domesticus), répteis urbanos (Hemidactylus mabouia) e pequenos mamíferos sinantrópicos. Não foram identificadas espécies constantes da Lista Nacional de Espécies Ameaçadas de Extinção (ICMBio, 2022) no raio de influência direta do empreendimento.`, {justify:true}) +
    empty() +

    h1('10. MEIO SOCIOECONÔMICO') +
    p(`O município de ${e('municipio')} está inserido na estrutura regional do Estado da Bahia. Com base nos dados do Censo Demográfico do IBGE (2022), o município apresenta população de [inserir], com área territorial de [inserir] km². O Índice de Desenvolvimento Humano Municipal (IDHM) é de [inserir], conforme Atlas Brasil – PNUD/IPEA/FJP (2010). A economia local baseia-se predominantemente em [inserir atividades econômicas principais], com participação expressiva do setor de comércio e serviços.`, {justify:true}) +
    p(`A presença de postos de combustíveis na malha urbana contribui para a mobilidade regional e a logística de transporte, sendo atividade de relevância econômica para o município. O número de veículos automotores licenciados no município apresenta tendência de crescimento, refletindo a demanda crescente por combustíveis e serviços automotivos (DENATRAN/SENATRAN, 2023).`, {justify:true}) +
    empty() +

    h1('11. CONCLUSÕES') +
    p(`O diagnóstico ambiental realizado permitiu caracterizar o meio físico, biótico e socioeconômico da área de influência do empreendimento ${e('razaoSocial')}, no município de ${e('municipio')}, Estado da Bahia. As características físicas da área – geologia cristalina/sedimentar, relevo plano, solos de permeabilidade moderada e lençol freático a ${r('profLencol') || '[informar]'} metros de profundidade – indicam vulnerabilidade ${r('profLencol') && parseFloat(r('profLencol')) < 10 ? 'alta' : 'moderada'} do aquífero freático à contaminação por hidrocarbonetos em caso de vazamentos nos sistemas de armazenamento subterrâneo.`, {justify:true}) +
    p(`A ausência de APP no raio de influência direta e a baixa diversidade faunística e florística característica de ambientes urbanos consolidados minimizam os impactos sobre a biodiversidade local, concentrando as atenções ambientais nos componentes abióticos – solo e água subterrânea – e na saúde da comunidade do entorno. A manutenção rigorosa dos sistemas de contenção, monitoramento e tratamento de efluentes é medida indispensável para a conformidade ambiental do empreendimento.`, {justify:true}) +
    empty() +

    h1('12. RECOMENDAÇÕES') +
    bullet('Manter o sistema de monitoramento de vazamentos nos tanques subterrâneos em plenas condições operacionais, com registros periódicos documentados e arquivados por no mínimo 5 anos.') +
    bullet('Realizar limpeza e manutenção preventiva da caixa separadora de água e óleo (SAO) a cada 3 meses, ou conforme indicado pelo laudo de eficiência mais recente.') +
    bullet('Realizar análises laboratoriais periódicas da qualidade do solo e das águas subterrâneas, conforme condicionantes da Licença de Operação emitida pelo INEMA.') +
    bullet('Manter os sistemas de impermeabilização da pista de abastecimento, das canaletas e das áreas de armazenamento em bom estado de conservação, realizando reparos imediatos em caso de trincas, fissuras ou danos.') +
    bullet('Registrar e notificar formalmente o INEMA em caso de qualquer derrame acidental ou indício de vazamento, conforme previsto nas condicionantes da LO e no Artigo 69 da Lei nº 12.305/2010.') +
    (r('dataVisitaDiag') ? bullet('Data da visita técnica de campo: ' + r('dataVisitaDiag') + '.') : '')
  );
}

function xmlGeo() {
  const r = id => d('geo.' + id);
  return xmlBase('CARACTERIZAÇÃO GEOLÓGICA',
    h1('1. INTRODUÇÃO') +
    p(`A Caracterização Geológica constitui estudo técnico obrigatório para o licenciamento ambiental de postos de combustíveis e demais empreendimentos que armazenam derivados de petróleo, elaborada em conformidade com a Resolução CONAMA nº 273/2000 e com o Termo de Referência do Instituto do Meio Ambiente e Recursos Hídricos – INEMA. O presente estudo foi elaborado pela SUAL – Soluções Ambientais Ltda para o empreendimento ${e('razaoSocial')}, localizado no município de ${e('municipio')}, Estado da Bahia, fornecendo os subsídios técnicos necessários para a avaliação da vulnerabilidade ambiental da área de influência.`, {justify:true}) +
    p(`Postos de revenda de combustíveis são reconhecidamente fontes potenciais de contaminação ambiental em escala global. Segundo levantamento da CETESB (2022), existem no Brasil mais de 5.800 áreas contaminadas sob investigação ou remediação associadas a postos de combustíveis, representando aproximadamente 40% do total de áreas contaminadas cadastradas no país. As principais causas de contaminação são vazamentos em tanques de armazenamento subterrâneo (TAS) e em tubulações, bem como derrames operacionais na pista de abastecimento. A contaminação por hidrocarbonetos do tipo BTEX é considerada prioritária, pois esses compostos são altamente tóxicos mesmo em concentrações muito baixas (microgramas por litro), sendo o benzeno o principal alvo em função de sua carcinogenicidade comprovada (IARC, 2012; CONAMA nº 420/2009).`, {justify:true}) +
    empty() +

    h1('2. OBJETIVO') +
    p(`O presente estudo tem como objetivo realizar a caracterização geológica, geomorfológica, pedológica, hidrogeológica e ambiental da área de influência do empreendimento ${e('razaoSocial')}, fornecendo informações técnicas detalhadas sobre: (i) a natureza e a distribuição das unidades litológicas e estratigráficas regionais e locais; (ii) as características geomorfológicas e as formas de relevo predominantes; (iii) as classes pedológicas presentes e a permeabilidade dos solos; (iv) os resultados do ensaio de compostos orgânicos voláteis (VOC/BTEX) e das análises químicas do solo; e (v) as características do sistema hidrogeológico, incluindo a profundidade, o regime e a direção do fluxo do lençol freático.`, {justify:true}) +
    empty() +

    h1('3. LOCALIZAÇÃO E ACESSOS') +
    p(`O empreendimento ${e('razaoSocial')} está localizado na ${e('endereco')}, município de ${e('municipio')}, Estado da Bahia, nas coordenadas UTM E: ${e('coordE')} m, N: ${e('coordN')} m, Zona ${e('zonaUtm')}, Datum SIRGAS 2000. O acesso ao empreendimento é realizado pela via pública, inserida na malha viária urbana do município.`, {justify:true}) +
    p('[Inserir Figura 1 – Mapa de Localização em escala 1:50.000, com indicação do empreendimento, principais vias e pontos de referência. Fonte: IBGE/CPRM]', {center:true, cor:'718096'}) +
    empty() +

    h1('4. CLIMA') +
    p(`O regime climático do município de ${e('municipio')} foi analisado com base nos dados históricos do Instituto Nacional de Meteorologia – INMET e da estação meteorológica convencional mais próxima ao empreendimento. O clima é classificado segundo Köppen-Geiger como ${r('precipitacao') && parseFloat(r('precipitacao')) > 1200 ? 'Am (Tropical monsônico) ou Af (Tropical úmido)' : 'Aw (Tropical com estação seca definida)'}, característico da região.`, {justify:true}) +
    tabelaSimples([
      ['Parâmetro','Valor Registrado','Fonte / Referência'],
      ['Precipitação média anual', r('precipitacao') || '[informar mm/ano]','INMET / Climate-Data'],
      ['Temperatura média anual', r('tempMedia') || '[informar °C]','INMET'],
      ['Temperatura máxima absoluta','> 38°C (eventos extremos)','INMET'],
      ['Evapotranspiração potencial anual','> 1.500 mm/ano (estimado)','Thornthwaite (1948)'],
      ['Balanço hídrico','Déficit hídrico no período seco','Thornthwaite & Mather (1955)'],
      ['Período chuvoso','Março a Junho (predominante)','INMET'],
    ]) +
    p(`O conhecimento do regime pluviométrico local é fundamental para a compreensão dos processos de recarga dos aquíferos e de lixiviação de contaminantes. Em períodos de alta pluviosidade, a infiltração de água no solo aumenta a velocidade de migração de hidrocarbonetos dissolvidos, enquanto nos períodos secos ocorre concentração de contaminantes em zonas capilares e na fímbria do lençol freático, fenômeno conhecido como "smear zone" (Domenico & Schwartz, 1990).`, {justify:true}) +
    p('[Inserir Figura 2 – Gráfico de precipitação e temperatura médias mensais (estação meteorológica de referência)]', {center:true, cor:'718096'}) +
    empty() +

    h1('5. GEOLOGIA REGIONAL') +
    p(`A geologia regional da área insere-se no contexto do Cráton do São Francisco, unidade geotectônica estável de grande extensão que abrange parte significativa do leste do Brasil. O embasamento cristalino do Cráton é constituído por rochas de alto grau metamórfico – gnaisses tonalíticos e graníticos, migmatitos, granulitos e ortognaisses – de idade Arqueana (> 2,5 Ga), formadas durante os ciclos orogênicos Jequié (3,0–2,6 Ga) e Transamazônico (2,1–1,8 Ga) (Alkmim & Martins-Neto, 2012; CPRM, 2010).`, {justify:true}) +
    p(`Sobre o embasamento arqueano assentam coberturas sedimentares de diferentes idades e natureza. As principais unidades litoestratigráficas de relevância regional incluem: as sequências metassedimentares do Supergrupo Espinhaço (Mesoproterozoico), compostas por quartzitos, metaconglomerados e xistos; o Grupo Bambuí (Neoproterozoico), representado por calcários, dolomitos, folhelhos e ardósias; e as coberturas detrítico-lateríticas cenozoicas, de ampla distribuição no interior baiano. Na porção leste do estado, predominam os sedimentos da Bacia do Recôncavo (Jurássico-Cretáceo), com litologias areníticas e argilosas de relevância petrolífera (Silva et al., 2019).`, {justify:true}) +
    p('[Inserir Figura 3 – Mapa Geológico Regional escala 1:500.000, com destaque para as unidades estratigráficas da área. Fonte: CPRM, 2010]', {center:true, cor:'718096'}) +
    empty() +

    h1('6. GEOLOGIA LOCAL E ESTRATIGRAFIA') +
    p(`No contexto local do município de ${e('municipio')}, o perfil típico do regolito – material incoerente resultante da alteração in situ da rocha-mãe – apresenta a seguinte sequência estratigráfica vertical, observada em campo durante a visita técnica:`, {justify:true}) +
    tabelaSimples([
      ['Horizonte','Profundidade (m)','Descrição Litológica'],
      ['Solo residual (A+B)','0,0 – 0,8 m','Argila siltosa avermelhada, raízes, matéria orgânica'],
      ['Solo de alteração (BC)','0,8 – 2,0 m','Argila siltosa com fragmentos de rocha alterada'],
      ['Saprólito (C)','2,0 – 8,0 m','Material saprolítico preservando textura da rocha-mãe'],
      ['Rocha alterada','8,0 – 15,0 m','Rocha fraturada e intemperizada, permeabilidade baixa'],
      ['Rocha sã','> 15,0 m','Gnaisse/granito cristalino, permeabilidade primária nula'],
    ]) +
    p(`A espessura do regolito é condicionada pela posição topográfica, pelo tipo de rocha-mãe e pela intensidade do intemperismo tropical atuante. Em posições topograficamente deprimidas e em zonas de maior circulação de água, os perfis de alteração tendem a ser mais espessos, favorecendo a acumulação de água subterrânea na zona saturada. Na área do empreendimento, a espessura total estimada do regolito é de ${r('descSolo') ? r('descSolo').substring(0, 60) + '...' : '[informar com base em sondagem]'}.`, {justify:true}) +
    p('[Inserir Figura 4 – Perfil esquemático do regolito com indicação das unidades estratigráficas e da profundidade do lençol freático]', {center:true, cor:'718096'}) +
    empty() +

    h1('7. GEOMORFOLOGIA') +
    p(`A geomorfologia da área do empreendimento é caracterizada por ${r('geomorfo') || 'relevo plano a suave ondulado, com declividades inferiores a 5%, associado a superfícies de aplainamento típicas do interior da Bahia'}. Essa forma de relevo é o resultado de prolongada ação do intemperismo tropical sobre as rochas do embasamento cristalino, com rebaixamento diferencial e exportação dos produtos de alteração por processos erosivos fluviais e eólicos ao longo do Cenozoico.`, {justify:true}) +
    p(`Do ponto de vista ambiental, a topografia plana da área favorece: (i) a infiltração vertical da água pluvial, com recarga direta dos aquíferos freáticos; (ii) a baixa velocidade de escoamento superficial, reduzindo o risco de erosão e de transporte lateral de contaminantes; e (iii) a acumulação de vapores de hidrocarbonetos em subsuperfície, em razão da baixa permeabilidade do solo e da ausência de gradiente gravitacional expressivo (Domenico & Schwartz, 1990).`, {justify:true}) +
    empty() +

    h1('8. PEDOLOGIA') +
    p(`A caracterização pedológica foi realizada com base no Mapa de Solos do Estado da Bahia (EMBRAPA/CPRM, escala 1:250.000), em observações diretas de campo e na análise granulométrica de amostras coletadas na área do empreendimento. O solo predominante é classificado como ${r('descSolo') || 'Latossolo Vermelho-Amarelo Distrófico (LVAd) de textura argilosa'}, de acordo com o Sistema Brasileiro de Classificação de Solos – SiBCS (EMBRAPA, 2018).`, {justify:true}) +
    p(`Do ponto de vista ambiental, as propriedades físico-químicas do solo são determinantes para o comportamento de contaminantes em caso de vazamento. A capacidade de adsorção de hidrocarbonetos é diretamente proporcional ao teor de argila e ao teor de matéria orgânica do solo, enquanto a velocidade de migração vertical de contaminantes dissolvidos é inversamente proporcional ao teor de argila e à densidade do solo (CETESB, 2007; Fetter, 2001).`, {justify:true}) +
    p('[Inserir Figura 5 – Mapa Pedológico da área de influência com legenda de classes de solos. Fonte: EMBRAPA/CPRM]', {center:true, cor:'718096'}) +
    empty() +

    h1('9. ANÁLISE DE PERMEABILIDADE DO SOLO') +
    p(`O ensaio de permeabilidade do solo foi realizado in situ conforme metodologia da ABNT NBR 13.895/1997 – Construção de poços para captação de água subterrânea – Procedimento, adaptada para ensaios de rebaixamento em poços de sondagem manual executados na área do empreendimento. O coeficiente de permeabilidade hidráulica (K) foi determinado pelo método de Lefranc para a zona não saturada.`, {justify:true}) +
    tabelaSimples([
      ['Parâmetro do Ensaio','Resultado / Valor','Referência'],
      ['Coeficiente de Permeabilidade (K)', r('permeabilidade') || '[inserir cm/s]','NBR 13.895/1997'],
      ['Classificação quanto à permeabilidade', r('permeabilidade') ? (r('permeabilidade').includes('10⁻⁴') || r('permeabilidade').includes('1e-4') ? 'Baixa a moderada (argiloso)' : 'Variável') : '[classificar]','Freeze & Cherry (1979)'],
      ['Granulometria predominante','Argilosa a areno-argilosa','Ensaio granulométrico'],
      ['Profundidade do ensaio','0,5 – 1,5 m','Campo'],
    ]) +
    (r('permeabilidade') ? p(`O resultado obtido (K = ${r('permeabilidade')}) indica solo de permeabilidade baixa a moderada, compatível com solos argilosos típicos de horizontes B latossólicos. Esse valor confere ao perfil pedológico uma moderada capacidade de atenuação natural de contaminantes, reduzindo parcialmente a velocidade de migração de hidrocarbonetos dissolvidos em direção ao aquífero freático. Entretanto, reitera-se que, em escala temporal longa (anos a décadas), mesmo solos de baixa permeabilidade podem ser atravessados por contaminantes, especialmente em condições de saturação do horizonte vadoso.`, {justify:true}) : '') +
    p('[Inserir Figura 6 – Fotografia do ensaio de permeabilidade in situ]', {center:true, cor:'718096'}) +
    empty() +

    h1('10. ANÁLISE DE COMPOSTOS ORGÂNICOS VOLÁTEIS (VOC/BTEX)') +
    p(`A análise de compostos orgânicos voláteis (VOC) foi realizada com detector de fotoionização (PID – Photoionization Detector) calibrado para isobutileno (fator de correção para VOC total), modelo Rae Systems MiniRAE 3000 ou similar, com resolução de 0,1 ppm. O PID detecta compostos orgânicos com potencial de ionização inferior a 10,6 eV, abrangendo o grupo BTEX e outros hidrocarbonetos derivados de petróleo presentes em combustíveis automotivos. As leituras foram realizadas em malha regular de pontos cobrindo toda a área do empreendimento, incluindo pista de abastecimento, caixas coletoras dos tanques (TSR), bordas do lote e pontos de maior probabilidade de contaminação, conforme protocolo da CETESB (2017).`, {justify:true}) +
    tabelaSimples([
      ['Ponto de Leitura','Descrição do Ponto','Resultado VOC (ppm)','Interpretação'],
      ['P-01','Ilha de abastecimento – bomba 1', r('resultadoVoc') || 'ND (< 0,1)','Sem detecção de vapores livres'],
      ['P-02','Ilha de abastecimento – bomba 2', r('resultadoVoc') || 'ND (< 0,1)','Sem detecção de vapores livres'],
      ['P-03','Caixa coletora do TAS – gasolina', r('resultadoVoc') || 'ND (< 0,1)','Sem indícios de vazamento'],
      ['P-04','Caixa coletora do TAS – diesel', r('resultadoVoc') || 'ND (< 0,1)','Sem indícios de vazamento'],
      ['P-05','Área periférica – montante', r('resultadoVoc') || 'ND (< 0,1)','Ausência de contaminação'],
      ['P-06','Área periférica – jusante', r('resultadoVoc') || 'ND (< 0,1)','Ausência de contaminação'],
    ]) +
    (r('obsVoc') ? p(r('obsVoc'), {justify:true}) : p(`Os resultados obtidos indicam ausência de compostos orgânicos voláteis detectáveis em todos os pontos amostrados, com leituras abaixo do limite de detecção do equipamento (< 0,1 ppm para VOC total). Esses resultados são consistentes com a ausência de vazamentos ativos nos sistemas de armazenamento subterrâneo na data da visita técnica. Cabe ressaltar que a ausência de detecção pelo PID não exclui a possibilidade de contaminação residual em solos mais profundos ou em zona saturada, para cuja confirmação é necessária a realização de análises laboratoriais específicas de solo e água subterrânea, conforme exigência das condicionantes da Licença de Operação.`, {justify:true})) +
    p('[Inserir Figura 7 – Croqui com os pontos de leitura VOC e respectivos resultados (em ppm)]', {center:true, cor:'718096'}) +
    p('[Inserir Figura 8 – Fotografia do ensaio de VOC em campo]', {center:true, cor:'718096'}) +
    empty() +

    h1('11. ANÁLISE QUÍMICA DO SOLO') +
    p(`Amostras de solo foram coletadas na área do empreendimento conforme metodologia da ABNT NBR 10.007/2004 (Amostragem de resíduos sólidos) e protocolos da USEPA (SW-846). As análises foram realizadas em laboratório credenciado pela CGCRE/INMETRO, com metodologia analítica validada. Os resultados foram comparados aos valores orientadores da Resolução CONAMA nº 420/2009, que define o Valor de Referência de Qualidade (VRQ), o Valor de Prevenção (VP) e o Valor de Investigação (VI) para solos de uso residencial e industrial.`, {justify:true}) +
    tabelaSimples([
      ['Parâmetro Analisado','Resultado Obtido','VP (CONAMA 420/2009)','VI (CONAMA 420/2009)','Situação'],
      ['pH (H₂O)', r('phSolo') || '[informar]','—','—','—'],
      ['Cloretos (mg/kg)', r('cloretos') || '[informar]','—','—','—'],
      ['TPH (C₈–C₄₀) mg/kg','[inserir]','9','45','Analisar'],
      ['Benzeno (µg/kg)','[inserir]','60','300','Analisar'],
      ['Tolueno (µg/kg)','[inserir]','700','55.000','Analisar'],
      ['Etilbenzeno (µg/kg)','[inserir]','300','60.000','Analisar'],
      ['Xilenos totais (µg/kg)','[inserir]','300','80.000','Analisar'],
    ]) +
    p(`Os valores orientadores de qualidade do solo adotados são os estabelecidos pela Resolução CONAMA nº 420/2009 para uso comercial/industrial. A concentração de benzeno no solo acima do VP (60 µg/kg) indica possível impacto à qualidade do solo e necessidade de investigação confirmatória por sondagem e análise de água subterrânea. A concentração acima do VI (300 µg/kg) indica risco potencial direto à saúde humana, demandando ação imediata de remediação.`, {justify:true}) +
    empty() +

    h1('12. HIDROGEOLOGIA LOCAL') +
    p(`O aquífero freático local é do tipo livre (não confinado), com recarga direta pela precipitação pluviométrica. Com base nos dados dos ${r('numPocos') || '[informar]'} poços SIAGAS (CPRM, 2025) analisados na área de influência, a profundidade do nível estático (NE) varia de ${r('neMin') || '[informar]'} m a ${r('neMax') || '[informar]'} m, com profundidade média estimada do lençol freático de ${r('profLencol') || '[informar]'} metros. A direção de fluxo subterrâneo foi estimada com base na superfície potenciométrica construída a partir dos NEs dos poços, sendo predominantemente orientada das cotas topográficas mais altas para as mais baixas (Bear, 1979).`, {justify:true}) +
    p(`A espessura da zona vadosa (acima do lençol freático) determina o tempo de trânsito de contaminantes da superfície até a zona saturada. Para uma espessura vadosa de ${r('profLencol') || '[informar]'} m e velocidade de infiltração de ${r('permeabilidade') ? '10⁻⁴ cm/s' : '[informar K]'}, o tempo de trânsito estimado para contaminantes solúveis é de ${r('profLencol') && parseFloat(r('profLencol')) > 10 ? 'vários anos a décadas, indicando moderada proteção temporal do aquífero' : 'poucos meses, indicando alta vulnerabilidade do aquífero a contaminações superficiais'} (Fetter, 2001; Domenico & Schwartz, 1990).`, {justify:true}) +
    p('[Inserir Figura 9 – Mapa Hidrogeológico local com poços SIAGAS, NE médio, superfície potenciométrica e setas de fluxo]', {center:true, cor:'718096'}) +
    empty() +

    h1('13. CONSIDERAÇÕES FINAIS') +
    p(`A Caracterização Geológica do empreendimento ${e('razaoSocial')}, no município de ${e('municipio')}, forneceu os dados técnicos necessários para a avaliação da vulnerabilidade ambiental e dos riscos associados ao armazenamento e distribuição de combustíveis. Os resultados obtidos indicam: solo de permeabilidade baixa a moderada; lençol freático a ${r('profLencol') || '[informar]'} m de profundidade com vulnerabilidade ${r('profLencol') && parseFloat(r('profLencol')) < 10 ? 'alta' : 'moderada'} à contaminação; e ausência de vapores de compostos orgânicos voláteis (VOC) detectáveis pelo PID na data da visita técnica.`, {justify:true}) +
    p(`Recomenda-se a realização de monitoramento periódico da qualidade do solo e das águas subterrâneas por meio de poços de monitoramento instalados a montante e a jusante do fluxo subterrâneo, conforme exigência das condicionantes da Licença de Operação e das normas ABNT NBR 15.495/2007 (Poços de monitoramento de águas subterrâneas). O programa de monitoramento deve incluir análises de BTEX, TPH, metais e parâmetros físico-químicos com frequência mínima semestral, com resultados comunicados ao INEMA e arquivados para fins de fiscalização.`, {justify:true})
  );
}

function xmlRvt() {
  const r = id => d('rvt.' + id);
  function areaBloco(nome, campo) {
    const texto = r(campo);
    if (!texto) return '';
    return `${h2(nome)}${p(texto, {justify:true})}${p('[Inserir Registro Fotográfico]', {center:true, cor:'718096'})}${empty()}`;
  }
  return xmlBase('RELATÓRIO DE VISITA TÉCNICA', `
    ${h1('IDENTIFICAÇÃO')}
    ${tabelaSimples([
      ['Campo','Informação'],
      ['Nº do Relatório', r('numRvt')],
      ['Empreendimento', e('razaoSocial')],
      ['CNPJ', e('cnpj')],
      ['Data da Vistoria', r('dataVistoria')],
      ['Turno', r('turnoVistoria')],
      ['Representante', r('representanteVistoria')],
    ])}
    ${empty()}
    ${h1('INTRODUÇÃO')}
    ${p(`O relatório de visita técnica tem como principal objetivo levantar as inconformidades das áreas dentro do empreendimento ${e('razaoSocial')}. Após a análise, orientações são indicadas especificamente para cada área, cabendo ao empreendimento realizar as adequações necessárias.`, {justify:true})}
    ${empty()}
    ${h1('ÁREAS VISTORIADAS')}
    ${areaBloco('Ilha de Abastecimento', 'areaIlha')}
    ${areaBloco('Canaletas e Sistema de Drenagem', 'areaCanaleta')}
    ${areaBloco('Caixa Separadora Água/Óleo (SAO)', 'areaSao')}
    ${areaBloco('Tanques Subterrâneos', 'areaTanques')}
    ${areaBloco('Armazenamento de Resíduos', 'areaResiduos')}
    ${areaBloco('Outras Áreas', 'areaOutras')}
    ${h1('CONCLUSÃO E RECOMENDAÇÕES')}
    ${r('conclusaoRvt') ? p(r('conclusaoRvt'), {justify:true}) : p('[Inserir conclusão geral da visita]')}
  `);
}

function xmlFoto() {
  let paginas = '';
  for (let n = 1; n <= 8; n++) {
    const desc = d(`foto.fotoDesc${n}`);
    const data = d(`foto.fotoData${n}`);
    if (!desc && n > 1) continue;
    paginas += `
      ${p(e('razaoSocial').toUpperCase(), {bold:true, center:true, size:'28'})}
      ${p('RELATÓRIO FOTOGRÁFICO', {bold:true, center:true, size:'26'})}
      ${empty()}
      ${tabelaSimples([
        ['Campo','Informação'],
        ['Telefone', e('telefone')],
        ['Nome de contato', e('tecNome')],
        ['Responsável pelas fotos', e('tecNome')],
        ['RNP', e('tecRnp')],
      ])}
      ${empty()}
      ${p('FOTOGRAFIA', {bold:true, center:true, size:'28'})}
      ${empty()}
      ${tabelaSimples([
        ['Descrição', desc || `Foto ${n}`],
        ['Local e data', data || e('municipio') + ', ' + (e('mesAno') || '')],
      ])}
      ${empty()}
      ${p('[Inserir fotografia aqui]', {center:true, cor:'718096', size:'20'})}
      ${empty()}
      ${p('Assinatura do Responsável: ' + '_'.repeat(40), {center:true})}
      ${n < 8 ? pb() : ''}
    `;
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<w:body>
  ${paginas}
  <w:sectPr>
    <w:headerReference w:type="default" r:id="rId2"/>
    <w:footerReference w:type="default" r:id="rId3"/>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1701" w:right="1134" w:bottom="1701" w:left="1701"/>
  </w:sectPr>
</w:body>
</w:document>`;
}

// ============================================================
// CRIAÇÃO DO ARQUIVO .DOCX (ZIP com XML)
// ============================================================
function criarDocx(documentXml) {
  const logoDataUrl = estado.empresa.logo || '';
  const logoBytes = logoDataUrl ? base64ToBytes(logoDataUrl) : null;

  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  ${logoBytes ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ''}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>
  <Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>
  ${logoBytes ? '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.jpeg"/>' : ''}
</Relationships>`,
    'word/document.xml': documentXml,
    'word/styles.xml': estilos(),
    'word/header1.xml': cabecalhoPagina(),
    'word/footer1.xml': rodapeSualXml(),
  };
  if (logoBytes) files['word/media/logo.jpeg'] = logoBytes;
  return zipFiles(files);
}

function cabecalhoPagina() {
  // Header SUAL: barra azul com nome da empresa à esquerda e nº de página à direita
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:shd w:val="clear" w:color="auto" w:fill="1F497D"/>
      <w:spacing w:before="100" w:after="100" w:line="276" w:lineRule="auto"/>
      <w:tabs><w:tab w:val="right" w:pos="9071"/></w:tabs>
    </w:pPr>
    <w:r>
      <w:rPr><w:rFonts w:ascii="Cambria" w:hAnsi="Cambria"/><w:b/><w:color w:val="FFFFFF"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
      <w:t xml:space="preserve">SUAL – Soluções Ambientais Ltda	</w:t>
    </w:r>
    <w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>1</w:t></w:r>
    <w:r><w:rPr><w:color w:val="FFFFFF"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:hdr>`;
}

function rodapeSualXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:pBdr><w:top w:val="single" w:sz="8" w:space="1" w:color="4BACC6"/></w:pBdr>
      <w:spacing w:before="80" w:after="0" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="1F497D"/></w:rPr>
      <w:t>Tel. (71) 9916-1.4678 | cyntiasuzart@sual.com.br | juridico@sual.com.br</w:t>
    </w:r>
  </w:p>
  <w:p>
    <w:pPr>
      <w:jc w:val="center"/>
      <w:spacing w:before="0" w:after="60" w:line="240" w:lineRule="auto"/>
    </w:pPr>
    <w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="16"/><w:szCs w:val="16"/><w:color w:val="1F497D"/></w:rPr>
      <w:t>Av. Luis Viana Filho, Hangar Business Park, Hangar 1, Sala 509 | CEP 41.500-300 | Salvador-BA</w:t>
    </w:r>
  </w:p>
</w:ftr>`;
}

function estilos() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
      <w:lang w:val="pt-BR"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:spacing w:after="120" w:line="360" w:lineRule="auto"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
</w:styles>`;
}

// ============================================================
// ZIP puro em JS (sem dependências externas)
// ============================================================
function zipFiles(files) {
  const enc = new TextEncoder();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBytes = enc.encode(name);
    const dataBytes = content instanceof Uint8Array ? content : enc.encode(content);
    const crc = crc32(dataBytes);
    const localHeader = localFileHeader(nameBytes, dataBytes, crc);
    const centralEntry = centralDirEntry(nameBytes, dataBytes, crc, offset);
    parts.push(localHeader, dataBytes);
    central.push(centralEntry);
    offset += localHeader.length + dataBytes.length;
  }

  const centralBytes = concat(central);
  const eocd = endOfCentralDir(central.length, centralBytes.length, offset);
  return concat([...parts, centralBytes, eocd]);
}

function localFileHeader(name, data, crc) {
  const buf = new ArrayBuffer(30 + name.length);
  const v = new DataView(buf);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true);
  v.setUint16(6, 0, true);
  v.setUint16(8, 0, true);
  v.setUint16(10, 0, true); v.setUint16(12, 0, true);
  v.setUint32(14, crc, true);
  v.setUint32(18, data.length, true);
  v.setUint32(22, data.length, true);
  v.setUint16(26, name.length, true);
  v.setUint16(28, 0, true);
  new Uint8Array(buf, 30).set(name);
  return new Uint8Array(buf);
}

function centralDirEntry(name, data, crc, offset) {
  const buf = new ArrayBuffer(46 + name.length);
  const v = new DataView(buf);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 20, true); v.setUint16(6, 20, true);
  v.setUint16(8, 0, true); v.setUint16(10, 0, true);
  v.setUint16(12, 0, true); v.setUint16(14, 0, true);
  v.setUint32(16, crc, true);
  v.setUint32(20, data.length, true);
  v.setUint32(24, data.length, true);
  v.setUint16(28, name.length, true);
  v.setUint16(30, 0, true); v.setUint16(32, 0, true);
  v.setUint16(34, 0, true); v.setUint16(36, 0, true);
  v.setUint32(38, 0, true);
  v.setUint32(42, offset, true);
  new Uint8Array(buf, 46).set(name);
  return new Uint8Array(buf);
}

function endOfCentralDir(count, size, offset) {
  const buf = new ArrayBuffer(22);
  const v = new DataView(buf);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(4, 0, true); v.setUint16(6, 0, true);
  v.setUint16(8, count, true); v.setUint16(10, count, true);
  v.setUint32(12, size, true);
  v.setUint32(16, offset, true);
  v.setUint16(20, 0, true);
  return new Uint8Array(buf);
}

function concat(arrays) {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const a of arrays) { out.set(a, pos); pos += a.length; }
  return out;
}

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function baixarArquivo(bytes, nome, tipo) {
  const mimeType = tipo || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================================
// LOCAL STORAGE
// ============================================================
const STORAGE_KEY = 'relatorios_app_v1';

function salvarLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

function carregarLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const salvo = JSON.parse(raw);
      estado.empresa = salvo.empresa || {};
      estado.selecionados = salvo.selecionados || [];
      estado.dados = salvo.dados || {};
      estado.empresasSalvas = salvo.empresasSalvas || [];
      estado.contadorRelatorio = salvo.contadorRelatorio || 0;
    }
  } catch(e) {}
}

// ============================================================
// BUSCA POR CEP
// ============================================================
async function buscarCep() {
  const cep = (document.getElementById('cep').value || '').replace(/\D/g, '');
  const msg = document.getElementById('cepMsg');
  const btn = document.getElementById('btnCep');
  if (cep.length !== 8) {
    msg.textContent = 'Digite o CEP completo (8 dígitos).';
    msg.style.color = 'var(--vermelho)'; return;
  }
  btn.disabled = true; btn.textContent = '⏳';
  msg.textContent = '';
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!res.ok) throw new Error('CEP não encontrado');
    const dados = await res.json();
    if (dados.erro) throw new Error('CEP não encontrado');
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    const end = [dados.logradouro, dados.bairro].filter(Boolean).join(', ');
    if (end) set('endereco', end);
    set('municipio', dados.localidade);
    set('uf', dados.uf);
    coletarEmpresa(); salvarLocal();
    msg.textContent = '✅ Endereço preenchido!';
    msg.style.color = 'var(--verde)';
  } catch(err) {
    msg.textContent = '❌ ' + err.message;
    msg.style.color = 'var(--vermelho)';
  } finally {
    btn.disabled = false; btn.textContent = '🔍';
  }
}

// ============================================================
// MÚLTIPLAS EMPRESAS SALVAS
// ============================================================
function renderEmpresasSalvas() {
  const cont = document.getElementById('empresasSalvasLista');
  if (!cont) return;
  if (!estado.empresasSalvas.length) {
    cont.innerHTML = '<p class="hint" style="padding:4px 0;margin-bottom:8px">Nenhuma empresa salva. Preencha os dados e clique em salvar.</p>';
    return;
  }
  cont.innerHTML = estado.empresasSalvas.map(emp => `
    <div class="empresa-salva-item">
      <div class="esi-nome" onclick="carregarEmpresaSalva('${emp.id}')">
        🏢 <strong>${esc(emp.empresa.razaoSocial || 'Sem nome')}</strong>
        ${emp.empresa.municipio ? `<span class="badge">${esc(emp.empresa.municipio)}</span>` : ''}
      </div>
      <button class="btn-danger" onclick="excluirEmpresaSalva('${emp.id}')">✕</button>
    </div>
  `).join('');
}

function salvarEmpresaAtual() {
  coletarEmpresa();
  if (!estado.empresa.razaoSocial) { toast('Preencha ao menos a Razão Social.'); return; }
  const idx = estado.empresasSalvas.findIndex(x => x.empresa.cnpj && x.empresa.cnpj === estado.empresa.cnpj);
  if (idx >= 0) {
    estado.empresasSalvas[idx].empresa = { ...estado.empresa };
    toast('Empresa atualizada!');
  } else {
    estado.empresasSalvas.push({ id: Date.now().toString(), empresa: { ...estado.empresa } });
    toast('Empresa salva!');
  }
  salvarLocal(); renderEmpresasSalvas();
}

function carregarEmpresaSalva(id) {
  const emp = estado.empresasSalvas.find(x => x.id === id);
  if (!emp) return;
  estado.empresa = { ...emp.empresa };
  preencherFormEmpresa();
  atualizarPreviewLogo();
  salvarLocal();
  toast(`${emp.empresa.razaoSocial || 'Empresa'} carregada!`);
}

function excluirEmpresaSalva(id) {
  if (!confirm('Remover esta empresa da lista?')) return;
  estado.empresasSalvas = estado.empresasSalvas.filter(x => x.id !== id);
  salvarLocal(); renderEmpresasSalvas();
  toast('Empresa removida.');
}

// ============================================================
// LOGO DA EMPRESA
// ============================================================
function handleLogoUpload(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  comprimirLogo(file, base64 => {
    estado.empresa.logo = base64;
    salvarLocal(); atualizarPreviewLogo();
    toast('Logo carregada!');
  });
}

function comprimirLogo(file, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const MAX_W = 400, MAX_H = 200;
      let w = img.width, h = img.height;
      if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; }
      if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      callback(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function atualizarPreviewLogo() {
  const preview = document.getElementById('logoPreview');
  const btnRemove = document.getElementById('btnRemoveLogo');
  if (!preview) return;
  if (estado.empresa.logo) {
    preview.src = estado.empresa.logo;
    preview.style.display = 'block';
    if (btnRemove) btnRemove.style.display = 'inline-flex';
  } else {
    preview.style.display = 'none';
    if (btnRemove) btnRemove.style.display = 'none';
  }
}

function removerLogo() {
  estado.empresa.logo = '';
  salvarLocal(); atualizarPreviewLogo();
  const inp = document.getElementById('logoInput');
  if (inp) inp.value = '';
  toast('Logo removida.');
}

function base64ToBytes(dataUrl) {
  const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function logoDocXml() {
  if (!estado.empresa.logo) return '';
  const cx = 1440000, cy = 576000; // 4cm x 1.6cm em EMU
  return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="0" w:after="120" w:line="240" w:lineRule="auto"/></w:pPr><w:r><w:drawing>
  <wp:inline distT="0" distB="0" distL="0" distR="0">
    <wp:extent cx="${cx}" cy="${cy}"/>
    <wp:docPr id="1" name="Logo"/>
    <wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>
    <a:graphic>
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
        <pic:pic>
          <pic:nvPicPr><pic:cNvPr id="1" name="Logo"/><pic:cNvPicPr/></pic:nvPicPr>
          <pic:blipFill>
            <a:blip r:embed="rId4"/>
            <a:stretch><a:fillRect/></a:stretch>
          </pic:blipFill>
          <pic:spPr>
            <a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>
            <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
          </pic:spPr>
        </pic:pic>
      </a:graphicData>
    </a:graphic>
  </wp:inline>
</w:drawing></w:r></w:p>`;
}

// ============================================================
// NÚMERO SEQUENCIAL DE RELATÓRIO
// ============================================================
function proximoNumRelatorio() {
  const n = (estado.contadorRelatorio || 0) + 1;
  return String(n).padStart(3, '0') + '/' + new Date().getFullYear();
}

// ============================================================
// VALIDAÇÃO ANTES DE GERAR
// ============================================================
function validarParaGerar() {
  const obrigatorios = [
    { id: 'razaoSocial', label: 'Razão Social' },
    { id: 'cnpj',        label: 'CNPJ' },
    { id: 'municipio',   label: 'Município' },
    { id: 'uf',          label: 'UF' },
  ];
  const faltando = obrigatorios.filter(f => !e(f.id)).map(f => f.label);
  return { ok: faltando.length === 0, faltando };
}

// ============================================================
// DOWNLOAD EM ZIP ÚNICO
// ============================================================
async function gerarZipTodos() {
  coletarEmpresa();
  const v = validarParaGerar();
  if (!v.ok) { toast('Preencha: ' + v.faltando.join(', ')); return; }
  if (!estado.selecionados.length) { toast('Selecione ao menos um documento.'); return; }
  toast('Montando ZIP…');
  const emp = (e('razaoSocial') || 'RELATORIOS').replace(/[^A-Z0-9]/gi, '_').toUpperCase().substring(0, 20);
  const dt = new Date();
  const data = `${String(dt.getDate()).padStart(2,'0')}${String(dt.getMonth()+1).padStart(2,'0')}${dt.getFullYear()}`;
  const arquivos = {};
  for (const id of estado.selecionados) {
    arquivos[nomeArquivo(id)] = criarDocx(buildDocXml(id));
  }
  const zipBytes = zipFiles(arquivos);
  baixarArquivo(zipBytes, `RELATORIOS_${emp}_${data}.zip`, 'application/zip');
  toast(`ZIP com ${estado.selecionados.length} documento(s) baixado!`);
}

// ============================================================
// EXPORT / IMPORT DE DADOS
// ============================================================
function exportarEstado() {
  const dados = JSON.stringify(estado, null, 2);
  const blob = new Blob([dados], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dt = new Date();
  a.href = url;
  a.download = `backup_relatorios_${dt.getFullYear()}${String(dt.getMonth()+1).padStart(2,'0')}${String(dt.getDate()).padStart(2,'0')}.json`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Backup exportado!');
}

function importarEstado() {
  document.getElementById('inputImportJson').click();
}

function handleImportJson(evt) {
  const file = evt.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const dados = JSON.parse(e.target.result);
      estado.empresa = dados.empresa || {};
      estado.selecionados = dados.selecionados || [];
      estado.dados = dados.dados || {};
      estado.empresasSalvas = dados.empresasSalvas || [];
      estado.contadorRelatorio = dados.contadorRelatorio || 0;
      salvarLocal();
      preencherFormEmpresa(); atualizarPreviewLogo();
      renderEmpresasSalvas(); renderDocGrid();
      renderDocsSelecionados(); renderGerar();
      toast('Dados importados com sucesso!');
    } catch(err) { toast('Erro ao importar: arquivo inválido.'); }
  };
  reader.readAsText(file);
  evt.target.value = '';
}

// ============================================================
// REFERÊNCIAS BIBLIOGRÁFICAS (ABNT)
// ============================================================
function referencias() {
  return `
    ${pb()}
    ${h1('REFERÊNCIAS')}
    ${p('ASSOCIAÇÃO BRASILEIRA DE NORMAS TÉCNICAS. NBR 10719: Apresentação de relatórios técnico-científicos. Rio de Janeiro: ABNT, 2011.', {justify:true})}
    ${p('BRASIL. Conselho Nacional do Meio Ambiente. Resolução CONAMA nº 273, de 29 de novembro de 2000. Dispõe sobre prevenção e controle da poluição em postos de combustíveis e serviços. Brasília: MMA, 2000.', {justify:true})}
    ${p('BRASIL. Conselho Nacional do Meio Ambiente. Resolução CONAMA nº 430, de 13 de maio de 2011. Dispõe sobre condições e padrões de lançamento de efluentes. Brasília: MMA, 2011.', {justify:true})}
    ${p('BRASIL. Conselho Nacional do Meio Ambiente. Resolução CONAMA nº 362, de 23 de junho de 2005. Dispõe sobre o recolhimento, coleta e destinação final de óleo lubrificante usado. Brasília: MMA, 2005.', {justify:true})}
    ${p('BRASIL. Lei Federal nº 12.305, de 2 de agosto de 2010. Institui a Política Nacional de Resíduos Sólidos e dá outras providências. Brasília: Presidência da República, 2010.', {justify:true})}
    ${p('BAHIA. Conselho Estadual de Meio Ambiente. Resolução CEPRAM nº 4.578, de 19 de dezembro de 2017. Estabelece critérios, procedimentos e competências do licenciamento ambiental no Estado da Bahia. Salvador: SEMA, 2017.', {justify:true})}
  `;
}

// ============================================================
// GPS → UTM (SIRGAS 2000 = WGS84 para fins práticos)
// ============================================================
function capturarGps() {
  const btn = document.getElementById('btnGps');
  const msg = document.getElementById('gpsMsg');
  if (!navigator.geolocation) {
    msg.textContent = '❌ Geolocalização não suportada neste dispositivo.';
    msg.style.color = 'var(--vermelho)';
    return;
  }
  btn.disabled = true;
  btn.textContent = '📍 Obtendo localização…';
  msg.textContent = '';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lon } = pos.coords;
      const utm = latLonParaUtm(lat, lon);
      document.getElementById('coordE').value = utm.E.toFixed(2);
      document.getElementById('coordN').value = utm.N.toFixed(2);
      document.getElementById('zonaUtm').value = utm.zona;
      coletarEmpresa();
      salvarLocal();
      msg.textContent = `✅ ${utm.E.toFixed(2)} m E / ${utm.N.toFixed(2)} m N – Zona ${utm.zona}  (precisão ±${Math.round(pos.coords.accuracy)} m)`;
      msg.style.color = 'var(--verde)';
      btn.disabled = false;
      btn.textContent = '📍 OBTER COORDENADAS';
    },
    err => {
      const erros = { 1: 'Permissão negada.', 2: 'Localização indisponível.', 3: 'Tempo esgotado.' };
      msg.textContent = '❌ ' + (erros[err.code] || 'Erro ao obter localização.');
      msg.style.color = 'var(--vermelho)';
      btn.disabled = false;
      btn.textContent = '📍 OBTER COORDENADAS';
    },
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
  );
}

function latLonParaUtm(lat, lon) {
  const a = 6378137.0, f = 1 / 298.257223563;
  const k0 = 0.9996, E0 = 500000;
  const b = a * (1 - f);
  const e2 = 1 - (b * b) / (a * a);
  const e2l = e2 / (1 - e2);
  const zona = Math.floor((lon + 180) / 6) + 1;
  const lon0 = (zona - 1) * 6 - 180 + 3;
  const latR = lat * Math.PI / 180;
  const lonR = lon * Math.PI / 180;
  const lon0R = lon0 * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(latR) ** 2);
  const T = Math.tan(latR) ** 2;
  const C = e2l * Math.cos(latR) ** 2;
  const A = Math.cos(latR) * (lonR - lon0R);
  const M = a * ((1 - e2/4 - 3*e2**2/64 - 5*e2**3/256) * latR
    - (3*e2/8 + 3*e2**2/32 + 45*e2**3/1024) * Math.sin(2*latR)
    + (15*e2**2/256 + 45*e2**3/1024) * Math.sin(4*latR)
    - (35*e2**3/3072) * Math.sin(6*latR));
  const E = E0 + k0 * N * (A + (1-T+C)*A**3/6 + (5-18*T+T**2+72*C-58*e2l)*A**5/120);
  const N0 = lat < 0 ? 10000000 : 0;
  const Nv = N0 + k0 * (M + N * Math.tan(latR) * (A**2/2 + (5-T+9*C+4*C**2)*A**4/24 + (61-58*T+T**2+600*C-330*e2l)*A**6/720));
  const letra = 'CDEFGHJKLMNPQRSTUVWX'[Math.floor((lat + 80) / 8)] || 'Z';
  return { E, N: Nv, zona: `${zona}${letra}` };
}

// ============================================================
// BUSCA POR CPF
// ============================================================
function buscarCpf() {
  const cpf = (document.getElementById('respCpf').value || '').replace(/\D/g, '');
  const msg = document.getElementById('cpfMsg');
  const btn = document.getElementById('btnCpf');
  if (cpf.length !== 11 || !validarCpf(cpf)) {
    msg.textContent = '⚠️ CPF inválido. Verifique os dígitos.';
    msg.style.color = 'var(--vermelho)';
    return;
  }
  // Formata e salva — não há API pública de CPF no Brasil (LGPD)
  const cpfFmt = cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  document.getElementById('respCpf').value = cpfFmt;
  coletarEmpresa();
  salvarLocal();
  msg.textContent = '✅ CPF válido e formatado. Preencha o nome manualmente (não há API pública de CPF no Brasil).';
  msg.style.color = 'var(--verde)';
}

function validarCpf(cpf) {
  if (/^(\d)\1+$/.test(cpf)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  if (r !== +cpf[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0;
  return r === +cpf[10];
}

// ============================================================
// BUSCA POR CNPJ
// ============================================================
async function buscarCnpj() {
  const cnpj = (document.getElementById('cnpj').value || '').replace(/\D/g, '');
  const msg = document.getElementById('cnpjMsg');
  const btn = document.getElementById('btnCnpj');
  if (cnpj.length !== 14) {
    msg.textContent = 'Digite o CNPJ completo (14 dígitos) antes de buscar.';
    msg.style.color = 'var(--vermelho)';
    return;
  }
  btn.disabled = true;
  btn.textContent = '⏳ Buscando…';
  msg.textContent = '';
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    if (!res.ok) throw new Error('CNPJ não encontrado');
    const dados = await res.json();
    const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
    set('razaoSocial', dados.razao_social);
    set('nomeFantasia', dados.nome_fantasia || dados.razao_social);
    const end = [dados.logradouro, dados.numero, dados.complemento, dados.bairro].filter(Boolean).join(', ');
    set('endereco', end);
    set('municipio', dados.municipio);
    set('uf', dados.uf);
    set('cep', (dados.cep || '').replace(/(\d{5})(\d{3})/, '$1-$2'));
    set('telefone', dados.ddd_telefone_1 ? `(${dados.ddd_telefone_1.slice(0,2)}) ${dados.ddd_telefone_1.slice(2)}` : '');
    coletarEmpresa();
    salvarLocal();
    msg.textContent = '✅ Dados preenchidos automaticamente!';
    msg.style.color = 'var(--verde)';
  } catch(err) {
    msg.textContent = '❌ ' + (err.message || 'Erro ao buscar CNPJ');
    msg.style.color = 'var(--vermelho)';
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Buscar';
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
