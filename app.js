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
  return `<w:p><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
  <w:r><w:rPr><w:b/><w:sz w:val="32"/><w:szCs w:val="32"/><w:color w:val="1F4E79"/></w:rPr><w:t>${esc(txt)}</w:t></w:r></w:p>`;
}
function h2(txt) {
  return `<w:p><w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>
  <w:r><w:rPr><w:b/><w:sz w:val="26"/><w:szCs w:val="26"/><w:color w:val="2E75B6"/></w:rPr><w:t>${esc(txt)}</w:t></w:r></w:p>`;
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
  return `${empty()}${p('_'.repeat(40), {center:true})}${p(e('tecNome'), {bold:true, center:true})}${p('RNP: ' + e('tecRnp'), {center:true})}`;
}

function cabecalhoDoc(titulo, subtitulo = '') {
  return `
    ${logoDocXml()}
    ${p(titulo, {bold:true, center:true, size:'36', space:'120'})}
    ${empty()}
    ${p(e('razaoSocial').toUpperCase(), {bold:true, center:true, size:'28'})}
    ${e('nomeFantasia') ? p(e('nomeFantasia'), {center:true, size:'24'}) : ''}
    ${p('CNPJ: ' + e('cnpj'), {center:true})}
    ${p(e('municipio') + ' – ' + e('uf'), {center:true})}
    ${p(e('mesAno') || new Date().getFullYear().toString(), {center:true})}
    ${e('numRelatorio') ? p('Nº ' + e('numRelatorio'), {center:true, size:'20'}) : ''}
    ${subtitulo ? p(subtitulo, {center:true, size:'20'}) : ''}
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
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701"/>
  </w:sectPr>
</w:body>
</w:document>`;
}

function xmlRce() {
  const r = id => d('rce.' + id);
  return xmlBase('RCE – ROTEIRO DE CARACTERIZAÇÃO DO EMPREENDIMENTO', `
    ${h1('1. APRESENTAÇÃO')}
    ${p(`O RCE – Roteiro de Caracterização do Empreendimento tem como objetivo descrever a empresa e fornecer uma visão geral dos principais aspectos do negócio, sua atividade e funcionamento, visando a concessão do Licenciamento Ambiental.`, {justify:true})}
    ${p('Este documento foi elaborado seguindo o Termo de Referência, Anexo I, da Resolução 273 do CONAMA e suas alterações 276/01 e 319/02.', {justify:true})}
    ${empty()}
    ${h1('2. IDENTIFICAÇÃO DO EMPREENDIMENTO')}
    ${tabelaSimples([
      ['Campo','Informação'],
      ['Razão Social', e('razaoSocial')],
      ['Nome Fantasia', e('nomeFantasia')],
      ['CNPJ', e('cnpj')],
      ['Inscrição Estadual', e('inscricaoEstadual')],
      ['Endereço', e('endereco')],
      ['Município / UF', e('municipio') + ' – ' + e('uf')],
      ['CEP', e('cep')],
      ['Telefone / E-mail', e('telefone') + ' | ' + e('email')],
      ['Registro ANP', e('registroAnp')],
      ['Bandeira', e('bandeira')],
      ['Início de Operação', e('inicioOperacao')],
      ['Área Construída', e('areaConstruida') + ' m²'],
      ['Área Total', e('areaTotal') + ' m²'],
      ['N° IPTU', r('numIptu')],
      ['Valor do Investimento', r('valorInvestimento')],
    ])}
    ${empty()}
    ${h1('3. MAPA DE LOCALIZAÇÃO')}
    ${p('Coordenadas UTM (SIRGAS 2000): ' + e('coordE') + ' m E / ' + e('coordN') + ' m N – Zona ' + e('zonaUtm'))}
    ${p('[Inserir mapa de localização]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('4. RELAÇÃO DE PRODUTOS COMERCIALIZADOS')}
    ${tabelaSimples([
      ['Produto','Média Mensal (L)'],
      ['Gasolina Comum', r('gasolinaComum')],
      ['Gasolina Aditivada', r('gasolinaAditivada')],
      ['Etanol', r('etanol')],
      ['Diesel S-10', r('dieselS10')],
      ['Diesel S-500', r('dieselS500')],
      ['Óleo Lubrificante', r('oleoLubrificante')],
    ])}
    ${empty()}
    ${h1('5. BOMBAS E BICOS')}
    ${tabelaSimples([
      ['Item','Quantidade'],
      ['Bombas', r('qtdBombas')],
      ['Bicos', r('qtdBicos')],
    ])}
    ${empty()}
    ${h1('6. TANQUES SUBTERRÂNEOS')}
    ${r('descricaoTanques') ? p(r('descricaoTanques'), {justify:true}) : p('[Inserir descrição dos tanques]')}
    ${empty()}
    ${h1('7. ATIVIDADES DESENVOLVIDAS')}
    ${r('servicos') ? p(r('servicos'), {justify:true}) : p('[Inserir atividades desenvolvidas]')}
  `);
}

function xmlPgrs() {
  const r = id => d('pgrs.' + id);
  return xmlBase('PGRS – PROGRAMA DE GERENCIAMENTO DE RESÍDUOS SÓLIDOS', `
    ${h1('1. APRESENTAÇÃO / OBJETIVO')}
    ${p(`O Plano de Gerenciamento de Resíduos Sólidos (PGRS) foi elaborado conforme as instruções e termos de referência do Instituto do Meio Ambiente e Recursos Hídricos – INEMA, em atendimento às Resoluções CONAMA nº 273/2000, nº 362/2005, nº 450/2012, à Lei Federal nº 12.305/2010, que instituiu a Política Nacional de Resíduos Sólidos, e à NBR 10004.`, {justify:true})}
    ${p(`O PGRS tem como objetivo estabelecer as diretrizes para o manejo adequado dos resíduos sólidos gerados pelo empreendimento ${e('razaoSocial')}, contemplando a segregação na fonte, o correto acondicionamento, transporte e destinação final.`, {justify:true})}
    ${empty()}
    ${h1('2. IDENTIFICAÇÃO DO GERADOR')}
    ${tabelaSimples([
      ['Campo','Informação'],
      ['Razão Social', e('razaoSocial')],
      ['Nome Fantasia', e('nomeFantasia')],
      ['CNPJ', e('cnpj')],
      ['Endereço', e('endereco') + ' – ' + e('municipio') + '/' + e('uf') + ' – CEP: ' + e('cep')],
      ['Nº de Funcionários', r('numFuncionarios')],
      ['Estrutura Organizacional', r('estruturaOrg')],
      ['Área Construída', e('areaConstruida') + ' m²'],
      ['Área Total', e('areaTotal') + ' m²'],
      ['Atividade', 'Comércio varejista de combustíveis para veículos automotores'],
      ['Responsável pelo Empreendimento', e('respNome')],
      ['Técnico Responsável', e('tecNome') + ' – RNP: ' + e('tecRnp')],
    ])}
    ${empty()}
    ${h1('3. RESÍDUOS GERADOS')}
    ${h2('3.1 Resíduos Classe I – Perigosos')}
    ${r('residuosClasseI') ? p(r('residuosClasseI'), {justify:true}) : p('[Descrever resíduos perigosos]')}
    ${h2('3.2 Resíduos Classe II-A – Não Inertes')}
    ${r('residuosClasseIIA') ? p(r('residuosClasseIIA'), {justify:true}) : p('[Descrever resíduos não inertes]')}
    ${h2('3.3 Resíduos Classe II-B – Inertes')}
    ${r('residuosClasseIIB') ? p(r('residuosClasseIIB'), {justify:true}) : p('[Descrever resíduos inertes]')}
    ${empty()}
    ${h1('4. DESTINAÇÃO FINAL')}
    ${tabelaSimples([
      ['Resíduo','Destinação/Empresa'],
      ['Óleo Lubrificante Usado', r('empresaOleo') || '[Empresa de rerefino autorizada]'],
      ['Resíduos Comuns', r('empresaResiduos') || '[Coleta municipal / empresa contratada]'],
    ])}
    ${empty()}
    ${h1('5. CONSIDERAÇÕES FINAIS')}
    ${p(`O presente PGRS foi elaborado com o objetivo de assegurar o gerenciamento adequado dos resíduos sólidos gerados pelo empreendimento ${e('razaoSocial')}, em conformidade com a legislação ambiental vigente.`, {justify:true})}
  `);
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
  return xmlBase('DIAGNÓSTICO AMBIENTAL', `
    ${h1('1. INTRODUÇÃO')}
    ${p(`O presente relatório tem por objetivo apresentar o diagnóstico ambiental da área do empreendimento ${e('razaoSocial')}, situado em ${e('municipio')} – ${e('uf')}. Este estudo é fundamental para a manutenção da conformidade regulatória e para a gestão de recursos hídricos subterrâneos, conforme exigido pelos órgãos de controle ambiental.`, {justify:true})}
    ${empty()}
    ${h1('2. LOCALIZAÇÃO E ACESSOS')}
    ${p(`O empreendimento está situado no município de ${e('municipio')} – ${e('uf')}, em área ${r('tipoAreaDiag') || 'urbana'}. O ponto focal é definido pelas coordenadas ${e('coordE')} m E / ${e('coordN')} m N, zona ${e('zonaUtm')}, sistema SIRGAS2000.`, {justify:true})}
    ${r('acessoDiag') ? p(r('acessoDiag'), {justify:true}) : ''}
    ${p('[Inserir Figura 1: Mapa de Localização]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('3. GEOLOGIA')}
    ${r('geologiaDiag') ? p(r('geologiaDiag'), {justify:true}) : p('A área de estudo apresenta geologia regional composta predominantemente por rochas metamórficas e ígneas do embasamento cristalino brasileiro, típicas do Cráton São Francisco.')}
    ${p('[Inserir Figura: Mapa Geológico]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('4. HIDROGRAFIA')}
    ${r('corpoAgua') ? p(`O principal corpo d'água próximo à área do empreendimento é o ${r('corpoAgua')}${r('distanciaCorpo') ? ', distando cerca de ' + r('distanciaCorpo') + ' do local' : ''}.${r('baciaDiag') ? ' Inserido na ' + r('baciaDiag') + '.' : ''}`, {justify:true}) : p('[Descrever hidrografia local]')}
    ${p('[Inserir Figura: Mapa das Drenagens]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('5. HIDROGEOLOGIA')}
    ${r('numPocos') ? p(`Foram analisados ${r('numPocos')} poços CPRM (SIAGAS) no entorno do empreendimento. A profundidade do nível estático varia de ${r('neMin')} a ${r('neMax')} metros.`, {justify:true}) : p('[Descrever hidrogeologia]')}
    ${r('profLencol') ? p(`Profundidade estimada do lençol freático na área: ${r('profLencol')} metros.`) : ''}
    ${empty()}
    ${h1('6. SOLO')}
    ${r('tipoSoloDiag') ? p('Tipo de solo: ' + r('tipoSoloDiag')) : ''}
    ${empty()}
    ${h1('7. CONSIDERAÇÕES FINAIS')}
    ${p(`O presente diagnóstico ambiental fornece o subsídio técnico necessário para a avaliação da vulnerabilidade do aquífero e o dimensionamento do sistema de monitoramento, garantindo que o empreendimento ${e('razaoSocial')} opere em conformidade com a legislação vigente.`, {justify:true})}
    ${r('dataVisitaDiag') ? p('Data da visita de campo: ' + r('dataVisitaDiag')) : ''}
  `);
}

function xmlGeo() {
  const r = id => d('geo.' + id);
  return xmlBase('CARACTERIZAÇÃO GEOLÓGICA', `
    ${h1('1. INTRODUÇÃO')}
    ${p(`O presente estudo visa a obtenção da licença ambiental do empreendimento ${e('razaoSocial')}. Postos de revenda de combustíveis são potenciais poluidores e possíveis causadores de acidentes ambientais, podendo causar contaminação do solo e das águas subterrâneas.`, {justify:true})}
    ${empty()}
    ${h1('2. OBJETIVO')}
    ${p('A caracterização geológica visa apresentar as características físicas da área do empreendimento e seu entorno, buscando entender a dinâmica das rochas e dos recursos hídricos da região, minimizando os riscos de acidentes ambientais.', {justify:true})}
    ${empty()}
    ${h1('3. LOCALIZAÇÃO E ACESSOS')}
    ${p(`O empreendimento está localizado no município de ${e('municipio')} – ${e('uf')}, nas coordenadas UTM ${e('coordE')} m E / ${e('coordN')} m N, zona ${e('zonaUtm')}.`, {justify:true})}
    ${p('[Inserir Figura: Mapa de Localização]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('4. CLIMA')}
    ${tabelaSimples([
      ['Parâmetro','Valor'],
      ['Precipitação anual', r('precipitacao') || '[Inserir]'],
      ['Temperatura média', r('tempMedia') || '[Inserir]'],
    ])}
    ${p('[Inserir Gráfico de Precipitação]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('5. CARACTERIZAÇÃO GEOLÓGICA')}
    ${p(`A área de estudo, inserida no município de ${e('municipio')}, apresenta geologia regional composta predominantemente por rochas metamórficas e ígneas do embasamento cristalino brasileiro.`, {justify:true})}
    ${p('[Inserir Figura: Mapa Geológico]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('6. GEOMORFOLOGIA')}
    ${r('geomorfo') ? p(r('geomorfo'), {justify:true}) : p('[Descrever geomorfologia local]')}
    ${empty()}
    ${h1('7. SOLO')}
    ${r('descSolo') ? p(r('descSolo'), {justify:true}) : p('[Descrever tipo e características do solo]')}
    ${h2('7.1 Análise Química do Solo')}
    ${tabelaSimples([
      ['Parâmetro','Resultado'],
      ['pH', r('phSolo') || '[Aguardando laudo]'],
      ['Cloretos (mg/L)', r('cloretos') || '[Aguardando laudo]'],
    ])}
    ${h2('7.2 Permeabilidade')}
    ${r('permeabilidade') ? p(r('permeabilidade'), {justify:true}) : p('[Inserir resultado do teste de permeabilidade]')}
    ${p('[Inserir Fotografia: Teste de Permeabilidade]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('8. ANÁLISE DE COMPOSTOS ORGÂNICOS VOLÁTEIS (VOC)')}
    ${tabelaSimples([
      ['Parâmetro','Resultado'],
      ['VOC', r('resultadoVoc') || 'Não detectado'],
      ['Observações', r('obsVoc') || '—'],
    ])}
    ${p('[Inserir Fotografia: Teste de VOC]', {center:true, cor:'718096'})}
    ${empty()}
    ${h1('9. CONSIDERAÇÕES FINAIS')}
    ${p(`Com base nas análises realizadas, o empreendimento ${e('razaoSocial')} apresenta as características físico-químicas descritas neste estudo, fornecendo os dados técnicos necessários para o processo de licenciamento ambiental junto ao INEMA.`, {justify:true})}
  `);
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
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1701" w:right="1134" w:bottom="1134" w:left="1701"/>
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
</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>
  ${logoBytes ? '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/logo.jpeg"/>' : ''}
</Relationships>`,
    'word/document.xml': documentXml,
    'word/styles.xml': estilos(),
    'word/header1.xml': cabecalhoPagina(),
  };
  if (logoBytes) files['word/media/logo.jpeg'] = logoBytes;
  return zipFiles(files);
}

function cabecalhoPagina() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:p>
    <w:pPr><w:jc w:val="right"/></w:pPr>
    <w:r><w:fldChar w:fldCharType="begin"/></w:r>
    <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
    <w:r><w:fldChar w:fldCharType="separate"/></w:r>
    <w:r><w:t>1</w:t></w:r>
    <w:r><w:fldChar w:fldCharType="end"/></w:r>
  </w:p>
</w:hdr>`;
}

function estilos() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
      <w:sz w:val="24"/><w:szCs w:val="24"/>
      <w:lang w:val="pt-BR"/>
    </w:rPr></w:rPrDefault>
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
            <a:blip r:embed="rId3"/>
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
