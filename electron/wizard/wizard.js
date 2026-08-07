/**
 * Wizard JavaScript - LUMINA Desktop
 * Controla a navegação entre steps, validação e envio via IPC.
 */
'use strict';

// ============================================================
// ESTADO DO WIZARD
// ============================================================


/**
 * Ícones do wizard.
 *
 * Substituem os 34 emoji que estavam espalhados por este arquivo. Emoji é
 * tipografia, não ilustração: o desenho muda por plataforma e por versão do
 * sistema, não acompanha a cor do contexto (`currentColor` não o alcança), e um
 * leitor de tela anuncia "marca de verificação branca pesada" no meio da frase.
 *
 * `aria-hidden` em todos: quem carrega a informação é o texto ao lado. O SVG só
 * a reforça.
 */
const ICONES = (() => {
    const svg = (d, extra = '') =>
        `<svg class="wz-icone" viewBox="0 0 20 20" fill="none" stroke="currentColor" ` +
        `stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
        `aria-hidden="true" focusable="false">${d}${extra}</svg>`;
    return {
        ok: svg('<path d="m4 10.5 4 4 8-9"/>'),
        erro: svg('<path d="M5 5l10 10M15 5L5 15"/>'),
        aviso: svg('<path d="M10 2.5 18.5 17H1.5z"/><path d="M10 8v3.5M10 14v.3"/>'),
        carregando: svg('<path d="M17 10a7 7 0 1 1-2-4.9"/><path d="M17 3v3.5h-3.5"/>'),
        documento: svg('<path d="M5 2.5h6l4 4V17.5H5z"/><path d="M11 2.5v4h4"/>'),
        busca: svg('<circle cx="9" cy="9" r="5.5"/><path d="m13 13 4 4"/>'),
        olho: svg('<path d="M1.5 10S4.5 4.5 10 4.5 18.5 10 18.5 10 15.5 15.5 10 15.5 1.5 10 1.5 10Z"/><circle cx="10" cy="10" r="2.5"/>'),
        olhoFechado: svg('<path d="M3 3l14 14"/><path d="M8.2 8.3A2.5 2.5 0 0 0 11.7 11.8"/><path d="M6.3 6.4C3.6 7.8 1.5 10 1.5 10S4.5 15.5 10 15.5c1.5 0 2.8-.4 3.9-1"/><path d="M16.2 12.6c1.4-1.3 2.3-2.6 2.3-2.6S15.5 4.5 10 4.5c-.6 0-1.2.1-1.7.2"/>'),
        adiante: svg('<path d="M4 10h12"/><path d="m11 5 5 5-5 5"/>'),
    };
})();


const TOTAL_STEPS = 8;
const SKIPPABLE_STEPS = [4, 5, 7]; // Calendários, Email e Template podem ser pulados

let currentStep = 1;
const formData = {};
let defaults = {};

// Nomes dos steps para exibição
const STEP_NAMES = [
    '', // índice 0 não usado
    'Boas-vindas',
    'Imóvel',
    'Proprietário',
    'Calendários',
    'Email',
    'Admin',
    'Template',
    'Revisão',
];

// ============================================================
// SECURITY: HTML ESCAPE
// ============================================================

/**
 * Escapa caracteres HTML para prevenir XSS ao usar innerHTML
 * @param {*} str - Valor a escapar
 * @returns {string} String segura para interpolação em HTML
 */
function escapeHtml(str) {
    if (str == null) return '-';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function init() {
    // Carregar defaults do backend Electron
    try {
        defaults = await window.wizardAPI.getDefaultConfig();
        applyDefaults(defaults);
    } catch (e) {
        console.warn('[Wizard] Não foi possível carregar defaults:', e);
    }

    renderStepsIndicator();
    updateNavigation();
}

/**
 * Aplica valores padrão nos campos do formulário
 */
function applyDefaults(d) {
    if (d.CALENDAR_SYNC_INTERVAL_MINUTES) {
        const slider = document.getElementById('CALENDAR_SYNC_INTERVAL_MINUTES');
        if (slider) {
            slider.value = d.CALENDAR_SYNC_INTERVAL_MINUTES;
            document.getElementById('syncIntervalVal').textContent =
                d.CALENDAR_SYNC_INTERVAL_MINUTES + 'min';
        }
    }
    if (d.EMAIL_PROVIDER) {
        const sel = document.getElementById('EMAIL_PROVIDER');
        if (sel) sel.value = d.EMAIL_PROVIDER;
    }
    if (d.EMAIL_SMTP_PORT) {
        const el = document.getElementById('EMAIL_SMTP_PORT');
        if (el) el.value = d.EMAIL_SMTP_PORT;
    }
    if (d.EMAIL_IMAP_PORT) {
        const el = document.getElementById('EMAIL_IMAP_PORT');
        if (el) el.value = d.EMAIL_IMAP_PORT;
    }
}

// ============================================================
// UI: STEPS INDICATOR
// ============================================================

function renderStepsIndicator() {
    const container = document.getElementById('stepsIndicator');
    container.innerHTML = '';

    for (let i = 1; i <= TOTAL_STEPS; i++) {
        const item = document.createElement('div');
        item.className = 'step-item';

        // Row: circle + name label (horizontal)
        const row = document.createElement('div');
        row.className = 'step-indicator-row';

        const stepEl = document.createElement('div');
        stepEl.className = 'step-circle' +
            (i < currentStep ? ' completed' : '') +
            (i === currentStep ? ' active' : '');
        stepEl.id = `stepCircle_${i}`;

        if (i < currentStep) {
            stepEl.innerHTML = ICONES.ok;
        } else {
            stepEl.innerHTML = `<span class="step-num">${i}</span>`;
        }

        const nameEl = document.createElement('span');
        nameEl.className = 'step-name' +
            (i === currentStep ? ' active' : '') +
            (i < currentStep ? ' completed' : '');
        nameEl.textContent = STEP_NAMES[i];

        row.appendChild(stepEl);
        row.appendChild(nameEl);
        item.appendChild(row);

        // Vertical connector line (except after last step)
        if (i < TOTAL_STEPS) {
            const line = document.createElement('div');
            line.className = 'step-line' + (i < currentStep ? ' completed' : '');
            line.id = `stepLine_${i}`;
            item.appendChild(line);
        }

        container.appendChild(item);
    }
}

// ============================================================
// NAVEGAÇÃO
// ============================================================

function updateNavigation() {
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const btnSkip = document.getElementById('btnSkip');

    // Mostrar/esconder botão Anterior
    btnBack.style.display = currentStep > 1 ? '' : 'none';

    // Botão Pular (apenas steps opcionais)
    const isSkippable = SKIPPABLE_STEPS.includes(currentStep);
    btnSkip.style.display = isSkippable ? '' : 'none';

    // Texto do botão principal
    if (currentStep === 1) {
        btnNext.innerHTML = 'Começar ' + ICONES.adiante;
    } else if (currentStep === TOTAL_STEPS) {
        btnNext.innerHTML = ICONES.ok + ' Salvar e iniciar';
    } else {
        btnNext.innerHTML = 'Próximo ' + ICONES.adiante;
    }

    // Atualizar indicator visual
    renderStepsIndicator();

    // Mostrar step correspondente
    document.querySelectorAll('.wizard-step').forEach((el) => {
        el.classList.toggle('active', parseInt(el.dataset.step) === currentStep);
    });

    // Preencher template no step 7
    if (currentStep === 7) {
        populateTemplate();
    }

    // Preencher review no último step
    if (currentStep === TOTAL_STEPS) {
        populateReview();
    }
}

async function wizardNext() {
    // Validar step atual
    const errors = validateStep(currentStep);
    if (errors.length > 0) {
        showValidationErrors(errors);
        return;
    }

    // Coletar dados do step atual
    collectStepData(currentStep);

    if (currentStep === TOTAL_STEPS) {
        // Último step: salvar e iniciar
        await finishWizard();
        return;
    }

    currentStep++;
    clearErrors();
    updateNavigation();
}

function wizardBack() {
    if (currentStep > 1) {
        collectStepData(currentStep);
        currentStep--;
        clearErrors();
        updateNavigation();
    }
}

function wizardSkip() {
    if (SKIPPABLE_STEPS.includes(currentStep)) {
        collectStepData(currentStep); // Coletar o que tiver preenchido
        currentStep++;
        clearErrors();
        updateNavigation();
    }
}

// ============================================================
// COLETA DE DADOS
// ============================================================

function collectStepData(step) {
    const stepEl = document.querySelector(`.wizard-step[data-step="${step}"]`);
    if (!stepEl) return;

    // Coletar todos os inputs/selects do step
    stepEl.querySelectorAll('input, select, textarea').forEach((el) => {
        if (el.name) {
            if (el.type === 'checkbox') {
                formData[el.name] = el.checked;
            } else if (el.type === 'number' || el.type === 'range') {
                formData[el.name] = parseInt(el.value, 10) || el.value;
            } else {
                formData[el.name] = el.value;
            }
        }
    });

    // Coletar campos de admin separadamente (step 6)
    if (step === 6) {
        formData.adminEmail = document.getElementById('adminEmail')?.value || '';
        formData.adminUsername = document.getElementById('adminUsername')?.value?.trim() || '';
        formData.adminPassword = document.getElementById('adminPassword')?.value || '';
    }
}

// ============================================================
// SUGESTÃO AUTOMÁTICA DE USERNAME
// ============================================================

/**
 * Ao digitar o email, sugere automaticamente um username
 * baseado na parte antes do @, apenas se o campo estiver vazio.
 */
function suggestUsername() {
    const emailVal = document.getElementById('adminEmail')?.value || '';
    const usernameEl = document.getElementById('adminUsername');
    if (!usernameEl || usernameEl.value.trim()) return; // Não sobrescrever se já preenchido

    const local = emailVal.split('@')[0] || '';
    // Sanitizar: manter apenas letras, números e underscore
    const suggested = local.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '').slice(0, 30);
    if (suggested.length >= 3) {
        usernameEl.value = suggested;
    }
}

// ============================================================
// VALIDAÇÃO
// ============================================================

function validateStep(step) {
    clearErrors();
    const errors = [];

    // Cada `case` tem chaves próprias. Sem elas, todos os `const` daqui compartilham UM
    // único escopo de bloco — o do `switch` inteiro. Hoje ninguém cruza a fronteira, mas
    // basta um caso ler a variável de outro para receber ReferenceError por zona morta
    // temporal, num caminho que só roda no passo correspondente do wizard.
    switch (step) {
        case 2: { // Imóvel
            const propName = document.getElementById('PROPERTY_NAME')?.value?.trim();
            if (!propName) errors.push({ field: 'PROPERTY_NAME', msg: 'Nome do imóvel é obrigatório' });

            const condoEmail = document.getElementById('CONDO_EMAIL')?.value?.trim();
            if (condoEmail && !isValidEmail(condoEmail)) {
                errors.push({ field: 'CONDO_EMAIL', msg: 'Email inválido' });
            }
            break;
        }

        case 3: { // Proprietário
            const ownerName = document.getElementById('OWNER_NAME')?.value?.trim();
            if (!ownerName) errors.push({ field: 'OWNER_NAME', msg: 'Nome do proprietário é obrigatório' });

            const ownerEmail = document.getElementById('OWNER_EMAIL')?.value?.trim();
            if (ownerEmail && !isValidEmail(ownerEmail)) {
                errors.push({ field: 'OWNER_EMAIL', msg: 'Email inválido' });
            }
            break;
        }

        case 5: { // Email (apenas se preenchido)
            const emailFrom = document.getElementById('EMAIL_FROM')?.value?.trim();
            if (emailFrom && !isValidEmail(emailFrom)) {
                errors.push({ field: 'EMAIL_FROM', msg: 'Email inválido' });
            }
            break;
        }

        case 6: { // Admin
            const adminEmail = document.getElementById('adminEmail')?.value?.trim();
            if (!adminEmail) {
                errors.push({ field: 'adminEmail', msg: 'Email é obrigatório' });
            } else if (!isValidEmail(adminEmail)) {
                errors.push({ field: 'adminEmail', msg: 'Email inválido' });
            }

            const adminUsername = document.getElementById('adminUsername')?.value?.trim();
            if (!adminUsername) {
                errors.push({ field: 'adminUsername', msg: 'Nome de usuário é obrigatório' });
            } else if (adminUsername.length < 3) {
                errors.push({ field: 'adminUsername', msg: 'Mínimo 3 caracteres' });
            } else if (!/^[a-zA-Z0-9_]+$/.test(adminUsername)) {
                errors.push({ field: 'adminUsername', msg: 'Apenas letras, números e underscore' });
            }

            const pwd = document.getElementById('adminPassword')?.value || '';
            if (pwd.length < 8) {
                errors.push({ field: 'adminPassword', msg: 'Senha deve ter pelo menos 8 caracteres' });
            } else if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd)) {
                errors.push({ field: 'adminPassword', msg: 'Senha deve ter maiúscula, minúscula e número' });
            }

            const pwdConfirm = document.getElementById('adminPasswordConfirm')?.value || '';
            if (pwd !== pwdConfirm) {
                errors.push({ field: 'adminPasswordConfirm', msg: 'As senhas não conferem' });
            }
            break;
        }
    }

    return errors;
}

function showValidationErrors(errors) {
    errors.forEach(({ field, msg }) => {
        const errEl = document.getElementById(`err_${field}`);
        if (errEl) errEl.textContent = msg;
        const inputEl = document.getElementById(field);
        if (inputEl) inputEl.classList.add('error');
    });
}

function clearErrors() {
    document.querySelectorAll('.field-error').forEach((el) => (el.textContent = ''));
    document.querySelectorAll('input.error').forEach((el) => el.classList.remove('error'));
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidUrl(url) {
    try { new URL(url); return true; }
    catch { return false; }
}

// ============================================================
// UPLOAD DE PDF TEMPLATE (Step 7)
// ============================================================

/** PDF selecionado pelo usuário (ArrayBuffer), para incluir no formData */
let pendingPdfBuffer = null;

/**
 * Chamado quando o usuário seleciona um arquivo via input file
 * @param {HTMLInputElement} input
 */
function handlePdfFileSelected(input) {
    const file = input.files[0];
    if (!file) return;
    processPdfFile(file);
}

/**
 * Chamado quando o usuário arrasta um arquivo para o drop zone
 * @param {DragEvent} event
 */
function handlePdfDrop(event) {
    event.preventDefault();
    document.getElementById('pdfDropZone')?.classList.remove('drag-over');
    const file = event.dataTransfer?.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showPdfError('Apenas arquivos PDF são aceitos.');
        return;
    }
    processPdfFile(file);
}

/**
 * Lê o arquivo PDF e envia para o main process via IPC para salvar em userData
 * @param {File} file
 */
async function processPdfFile(file) {
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
        showPdfError('Arquivo muito grande. Máximo: 20MB');
        return;
    }

    // Mostrar área de status e esconder drop zone
    const dropZone = document.getElementById('pdfDropZone');
    const statusArea = document.getElementById('pdfStatusArea');
    if (dropZone) dropZone.style.display = 'none';
    if (statusArea) statusArea.style.display = 'block';

    // Preencher info do arquivo
    const fileNameEl = document.getElementById('pdfFileName');
    const fileSizeEl = document.getElementById('pdfFileSize');
    if (fileNameEl) fileNameEl.textContent = file.name;
    if (fileSizeEl) fileSizeEl.textContent = `(${(file.size / 1024).toFixed(0)} KB)`;

    // Mostrar progress
    const progressEl = document.getElementById('pdfProgress');
    const progressBarEl = document.getElementById('pdfProgressBar');
    const progressTextEl = document.getElementById('pdfProgressText');
    if (progressEl) progressEl.style.display = 'flex';

    const setProgress = (pct, text) => {
        if (progressBarEl) progressBarEl.style.width = `${pct}%`;
        if (progressTextEl) progressTextEl.textContent = text;
    };

    setProgress(20, 'Lendo arquivo...');

    try {
        // Ler arquivo como ArrayBuffer
        const arrayBuffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Falha ao ler o arquivo'));
            reader.readAsArrayBuffer(file);
        });

        setProgress(60, 'Salvando template...');

        // Enviar para main process via IPC
        const result = await window.wizardAPI.savePdfTemplate(arrayBuffer);

        if (!result.success) {
            throw new Error(result.error || 'Falha ao salvar o arquivo');
        }

        pendingPdfBuffer = arrayBuffer;
        setProgress(100, 'Template salvo!');

        // Esconder progress e mostrar resultado de sucesso
        setTimeout(() => {
            if (progressEl) progressEl.style.display = 'none';
            showPdfSuccess(file.name);
        }, 500);

    } catch (err) {
        if (progressEl) progressEl.style.display = 'none';
        showPdfError(err.message || 'Erro ao processar o arquivo.');
    }
}

/**
 * Exibe resultado de sucesso no upload do PDF
 * @param {string} filename
 */
function showPdfSuccess(filename) {
    const resultEl = document.getElementById('pdfAnalysisResult');
    const iconEl = document.getElementById('pdfAnalysisIcon');
    const titleEl = document.getElementById('pdfAnalysisTitle');
    const fieldsGridEl = document.getElementById('pdfFieldsGrid');

    if (iconEl) iconEl.innerHTML = ICONES.ok;
    if (titleEl) titleEl.textContent = 'Template salvo! Será analisado ao iniciar o sistema.';
    if (fieldsGridEl) {
        fieldsGridEl.innerHTML = `
            <div class="pdf-field-tag">${ICONES.documento} ${escapeHtml(filename)}</div>
            <div class="pdf-field-tag">${ICONES.busca} Análise automática na inicialização</div>
        `;
    }
    if (resultEl) resultEl.style.display = 'block';
}

/**
 * Exibe mensagem de erro no upload do PDF
 * @param {string} message
 */
function showPdfError(message) {
    // Esconder progress, mostrar resultado de erro
    const progressEl = document.getElementById('pdfProgress');
    if (progressEl) progressEl.style.display = 'none';

    const resultEl = document.getElementById('pdfAnalysisResult');
    const iconEl = document.getElementById('pdfAnalysisIcon');
    const titleEl = document.getElementById('pdfAnalysisTitle');
    const fieldsGridEl = document.getElementById('pdfFieldsGrid');

    if (iconEl) iconEl.innerHTML = ICONES.erro;
    if (titleEl) titleEl.textContent = 'Erro ao processar o arquivo';
    if (fieldsGridEl) fieldsGridEl.innerHTML = `<div class="pdf-field-tag error">${escapeHtml(message)}</div>`;
    if (resultEl) resultEl.style.display = 'block';

    pendingPdfBuffer = null;
}

/**
 * Limpa a seleção de PDF e volta ao estado inicial
 */
function clearPdfSelection() {
    pendingPdfBuffer = null;

    const input = document.getElementById('templatePdf');
    if (input) input.value = '';

    const dropZone = document.getElementById('pdfDropZone');
    const statusArea = document.getElementById('pdfStatusArea');
    const resultEl = document.getElementById('pdfAnalysisResult');
    const progressEl = document.getElementById('pdfProgress');

    if (dropZone) dropZone.style.display = 'flex';
    if (statusArea) statusArea.style.display = 'none';
    if (resultEl) resultEl.style.display = 'none';
    if (progressEl) progressEl.style.display = 'none';
}

// ============================================================
// TEMPLATE DE CONDOMÍNIO (Step 7)
// ============================================================

/**
 * Preenche o preview do template de autorização com dados já coletados no wizard
 */
function populateTemplate() {
    // Coletar dados dos steps anteriores para preencher o template
    for (let i = 1; i <= 6; i++) {
        collectStepData(i);
    }

    const setEl = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || el.textContent;
    };

    // Preencher campos do template com dados do wizard
    if (formData.CONDO_NAME) {
        setEl('tplCondoName', `CONDOMÍNIO: ${escapeHtml(formData.CONDO_NAME)}`);
        setEl('tplCondoNameInline', escapeHtml(formData.CONDO_NAME));
    }
    if (formData.OWNER_NAME) {
        setEl('tplOwnerName', escapeHtml(formData.OWNER_NAME));
    }
    if (formData.OWNER_APTO) {
        setEl('tplOwnerApto', escapeHtml(formData.OWNER_APTO));
    }
    if (formData.OWNER_BLOCO) {
        setEl('tplOwnerBloco', escapeHtml(formData.OWNER_BLOCO));
    }
    if (formData.PROPERTY_ADDRESS) {
        setEl('tplAddress', escapeHtml(formData.PROPERTY_ADDRESS));
    }
    if (formData.OWNER_APTO || formData.OWNER_BLOCO) {
        setEl('tplSigDetail',
            `Unidade: ${escapeHtml(formData.OWNER_APTO || '________')} / Bloco: ${escapeHtml(formData.OWNER_BLOCO || '________')}`);
    }
}

// ============================================================
// TELA DE REVISÃO (Step 8)
// ============================================================

function populateReview() {
    collectStepData(currentStep);
    const grid = document.getElementById('reviewGrid');

    const sections = [
        {
            title: 'Imóvel',
            rows: [
                ['Nome', escapeHtml(formData.PROPERTY_NAME)],
                ['Endereço', escapeHtml(formData.PROPERTY_ADDRESS)],
                ['Condomínio', escapeHtml(formData.CONDO_NAME)],
                ['Admin Condo', escapeHtml(formData.CONDO_ADMIN_NAME)],
                ['Email Condo', escapeHtml(formData.CONDO_EMAIL)],
            ],
        },
        {
            title: 'Proprietário',
            rows: [
                ['Nome', escapeHtml(formData.OWNER_NAME)],
                ['Email', escapeHtml(formData.OWNER_EMAIL)],
                ['Telefone', escapeHtml(formData.OWNER_PHONE)],
                ['Apto', escapeHtml(`${formData.OWNER_BLOCO || ''}${formData.OWNER_APTO || ''}`)],
                ['Garagem', escapeHtml(formData.OWNER_GARAGEM)],
            ],
        },
        {
            title: 'Calendários',
            rows: [
                ['Airbnb', formData.AIRBNB_ICAL_URL ? ICONES.ok + ' Configurado' : ICONES.aviso + ' Não configurado'],
                ['Booking', formData.BOOKING_ICAL_URL ? ICONES.ok + ' Configurado' : ICONES.aviso + ' Não configurado'],
                ['Intervalo', `${parseInt(formData.CALENDAR_SYNC_INTERVAL_MINUTES) || 30} minutos`],
            ],
        },
        {
            title: 'E-mail',
            rows: [
                ['Provedor', escapeHtml(formData.EMAIL_PROVIDER) || 'gmail'],
                ['Remetente', escapeHtml(formData.EMAIL_FROM) || ICONES.aviso + ' Não configurado'],
                ['Senha', formData.EMAIL_PASSWORD ? '••••••••' : ICONES.aviso + ' Não configurada'],
            ],
        },
        {
            title: 'Administrador',
            rows: [
                ['Email', escapeHtml(formData.adminEmail)],
                ['Usuário', escapeHtml(formData.adminUsername) || ICONES.aviso + ' Não definido'],
                ['Senha', formData.adminPassword ? '••••••••' : ICONES.aviso + ' Não definida'],
            ],
        },
    ];

    grid.innerHTML = sections.map(({ title, rows }) => `
    <div class="review-card">
      <h4>${title}</h4>
      ${rows.map(([label, value]) => `
        <div class="review-row">
          <span class="label">${label}</span>
          <span class="value">${value}</span>
        </div>
      `).join('')}
    </div>
  `).join('');

    // Exibir credenciais de acesso para o usuário guardar
    showCredentialsSummary();
}

// ============================================================
// CREDENCIAIS DE ACESSO — EXIBIÇÃO NO STEP 8
// ============================================================

function showCredentialsSummary() {
    const card = document.getElementById('credentialsSummary');
    const usernameEl = document.getElementById('credUsername');
    const passwordEl = document.getElementById('credPassword');

    if (!card || !formData.adminUsername || !formData.adminPassword) return;

    usernameEl.textContent = formData.adminUsername;
    // Senha inicialmente mascarada
    passwordEl.dataset.actual = formData.adminPassword;
    passwordEl.dataset.visible = 'false';
    passwordEl.textContent = '•'.repeat(formData.adminPassword.length);
    passwordEl.classList.add('masked');

    card.style.display = '';
}

function toggleCredPassword(btn) {
    const passwordEl = document.getElementById('credPassword');
    if (!passwordEl) return;
    const isVisible = passwordEl.dataset.visible === 'true';
    if (isVisible) {
        passwordEl.textContent = '•'.repeat(passwordEl.dataset.actual.length);
        passwordEl.classList.add('masked');
        passwordEl.dataset.visible = 'false';
        btn.innerHTML = ICONES.olho;
        btn.title = 'Mostrar senha';
    } else {
        passwordEl.textContent = passwordEl.dataset.actual;
        passwordEl.classList.remove('masked');
        passwordEl.dataset.visible = 'true';
        btn.innerHTML = ICONES.olhoFechado;
        btn.title = 'Ocultar senha';
    }
}

function copyCredential(elementId, btn) {
    const el = document.getElementById(elementId);
    if (!el) return;
    // Copiar valor real (não o mascarado)
    const valueToCopy = el.dataset.actual || el.textContent;
    navigator.clipboard.writeText(valueToCopy).then(() => {
        const original = btn.textContent;
        btn.innerHTML = ICONES.ok + ' Copiado';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.textContent = original;
            btn.classList.remove('copied');
        }, 2000);
    }).catch(() => {
        btn.innerHTML = ICONES.erro + ' Erro';
        setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
    });
}

// ============================================================
// FINALIZAR WIZARD
// ============================================================

async function finishWizard() {
    showLoading('Salvando configurações...');

    try {
        // Coletar todos os dados dos steps
        for (let i = 1; i <= TOTAL_STEPS; i++) {
            collectStepData(i);
        }

        // 1. Salvar .env
        const saveResult = await window.wizardAPI.saveConfig(formData);
        if (!saveResult.success) {
            throw new Error(saveResult.error || 'Erro ao salvar configuração');
        }

        updateLoadingText('Inicializando sistema...');

        // 2. Completar wizard (sinaliza ao main process para abrir o app)
        const completeResult = await window.wizardAPI.complete();
        if (!completeResult.success) {
            throw new Error(completeResult.error || 'Erro ao inicializar sistema');
        }

        updateLoadingText('Pronto! Abrindo LUMINA...');

    } catch (err) {
        hideLoading();
        showCompletionError(err.message);
    }
}

function showCompletionError(msg) {
    const msgEl = document.getElementById('completionMessage');
    msgEl.innerHTML = `
    <div class="inline-message error" style="margin-top:16px;">
      ${ICONES.erro} ${escapeHtml(msg)}
    </div>
  `;
}

// ============================================================
// TESTES INLINE (iCal e Email)
// ============================================================

async function testIcal(fieldId, resultId) {
    const url = document.getElementById(fieldId)?.value?.trim();
    const resultEl = document.getElementById(resultId);

    if (!url) {
        resultEl.innerHTML = '<div class="inline-message error">' + ICONES.aviso + ' Digite uma URL primeiro</div>';
        return;
    }
    if (!isValidUrl(url)) {
        resultEl.innerHTML = '<div class="inline-message error">' + ICONES.erro + ' URL inválida</div>';
        return;
    }

    resultEl.innerHTML = '<div class="inline-message info">' + ICONES.carregando + ' Testando...</div>';

    const result = await window.wizardAPI.testIcalUrl(url);
    if (result.success) {
        resultEl.innerHTML = `<div class="inline-message success">${ICONES.ok} Calendário válido! ${escapeHtml(result.events)} evento(s) encontrado(s)</div>`;
    } else {
        resultEl.innerHTML = `<div class="inline-message error">${ICONES.erro} ${escapeHtml(result.error || 'URL inválida')}</div>`;
    }
}

async function testEmail() {
    const resultEl = document.getElementById('email_test');
    const btn = document.getElementById('testEmailBtn');
    btn.disabled = true;

    resultEl.innerHTML = '<div class="inline-message info">' + ICONES.carregando + ' Testando conexão SMTP...</div>';

    const config = {
        EMAIL_PROVIDER: document.getElementById('EMAIL_PROVIDER')?.value,
        EMAIL_FROM: document.getElementById('EMAIL_FROM')?.value,
        EMAIL_SMTP_HOST: document.getElementById('EMAIL_SMTP_HOST')?.value,
        EMAIL_SMTP_PORT: parseInt(document.getElementById('EMAIL_SMTP_PORT')?.value) || 587,
    };

    const result = await window.wizardAPI.testEmailConnection(config);
    btn.disabled = false;

    if (result.success) {
        resultEl.innerHTML = '<div class="inline-message success">' + ICONES.ok + ' Conexão SMTP estabelecida com sucesso!</div>';
    } else {
        resultEl.innerHTML = `<div class="inline-message error">${ICONES.erro} ${escapeHtml(result.error || 'Falha na conexão')}</div>`;
    }
}

// ============================================================
// PROVIDER DE EMAIL (mostrar/esconder campos custom)
// ============================================================

function onEmailProviderChange() {
    const provider = document.getElementById('EMAIL_PROVIDER')?.value;
    const customSection = document.getElementById('customEmailSection');
    if (customSection) {
        customSection.classList.toggle('expanded', provider === 'custom');
    }
}

// ============================================================
// FORÇA DA SENHA
// ============================================================

function updatePasswordStrength() {
    const pwd = document.getElementById('adminPassword')?.value || '';
    const bar = document.getElementById('passwordStrengthBar');
    if (!bar) return;

    let strength = 0;
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 20;
    if (/[0-9]/.test(pwd)) strength += 20;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 20;

    const color = strength < 40 ? '#ef4444' : strength < 70 ? '#f59e0b' : '#10b981';
    bar.style.width = `${Math.min(strength, 100)}%`;
    bar.style.background = color;
}

// ============================================================
// LOADING OVERLAY
// ============================================================

function showLoading(text) {
    document.getElementById('loadingOverlay').classList.add('visible');
    document.getElementById('loadingText').textContent = text || 'Carregando...';
    document.getElementById('btnNext').disabled = true;
    document.getElementById('btnBack').disabled = true;
}

function updateLoadingText(text) {
    document.getElementById('loadingText').textContent = text;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('visible');
    document.getElementById('btnNext').disabled = false;
    document.getElementById('btnBack').disabled = false;
}

// ============================================================
// INIT
// ============================================================

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);
