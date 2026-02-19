/**
 * Wizard JavaScript - LUMINA Desktop
 * Controla a navegação entre steps, validação e envio via IPC.
 */
'use strict';

// ============================================================
// ESTADO DO WIZARD
// ============================================================

const TOTAL_STEPS = 7;
const SKIPPABLE_STEPS = [4, 5]; // Calendários e Email podem ser pulados

let currentStep = 1;
let formData = {};
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
    'Revisão',
];

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
        // Círculo do step
        const circle = document.createElement('div');
        circle.className = 'step-item';

        const stepEl = document.createElement('div');
        stepEl.className = 'step-circle' +
            (i < currentStep ? ' completed' : '') +
            (i === currentStep ? ' active' : '');
        stepEl.id = `stepCircle_${i}`;
        stepEl.title = STEP_NAMES[i];

        if (i < currentStep) {
            stepEl.innerHTML = ''; // A classe CSS cuida do ✓
        } else {
            stepEl.innerHTML = `<span class="step-num">${i}</span>`;
        }

        circle.appendChild(stepEl);

        // Linha conectora (exceto após o último)
        if (i < TOTAL_STEPS) {
            const line = document.createElement('div');
            line.className = 'step-line' + (i < currentStep ? ' completed' : '');
            line.id = `stepLine_${i}`;
            circle.appendChild(line);
        }

        container.appendChild(circle);
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
        btnNext.textContent = 'Começar →';
    } else if (currentStep === TOTAL_STEPS) {
        btnNext.textContent = '✅ Salvar e Iniciar';
    } else {
        btnNext.textContent = 'Próximo →';
    }

    // Atualizar indicator visual
    renderStepsIndicator();

    // Mostrar step correspondente
    document.querySelectorAll('.wizard-step').forEach((el) => {
        el.classList.toggle('active', parseInt(el.dataset.step) === currentStep);
    });

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
        formData.adminPassword = document.getElementById('adminPassword')?.value || '';
    }
}

// ============================================================
// VALIDAÇÃO
// ============================================================

function validateStep(step) {
    clearErrors();
    const errors = [];

    switch (step) {
        case 2: // Imóvel
            const propName = document.getElementById('PROPERTY_NAME')?.value?.trim();
            if (!propName) errors.push({ field: 'PROPERTY_NAME', msg: 'Nome do imóvel é obrigatório' });

            const condoEmail = document.getElementById('CONDO_EMAIL')?.value?.trim();
            if (condoEmail && !isValidEmail(condoEmail)) {
                errors.push({ field: 'CONDO_EMAIL', msg: 'Email inválido' });
            }
            break;

        case 3: // Proprietário
            const ownerName = document.getElementById('OWNER_NAME')?.value?.trim();
            if (!ownerName) errors.push({ field: 'OWNER_NAME', msg: 'Nome do proprietário é obrigatório' });

            const ownerEmail = document.getElementById('OWNER_EMAIL')?.value?.trim();
            if (ownerEmail && !isValidEmail(ownerEmail)) {
                errors.push({ field: 'OWNER_EMAIL', msg: 'Email inválido' });
            }
            break;

        case 5: // Email (apenas se preenchido)
            const emailFrom = document.getElementById('EMAIL_FROM')?.value?.trim();
            if (emailFrom && !isValidEmail(emailFrom)) {
                errors.push({ field: 'EMAIL_FROM', msg: 'Email inválido' });
            }
            break;

        case 6: // Admin
            const adminEmail = document.getElementById('adminEmail')?.value?.trim();
            if (!adminEmail) {
                errors.push({ field: 'adminEmail', msg: 'Email é obrigatório' });
            } else if (!isValidEmail(adminEmail)) {
                errors.push({ field: 'adminEmail', msg: 'Email inválido' });
            }

            const pwd = document.getElementById('adminPassword')?.value || '';
            if (pwd.length < 8) {
                errors.push({ field: 'adminPassword', msg: 'Senha deve ter pelo menos 8 caracteres' });
            }

            const pwdConfirm = document.getElementById('adminPasswordConfirm')?.value || '';
            if (pwd !== pwdConfirm) {
                errors.push({ field: 'adminPasswordConfirm', msg: 'As senhas não conferem' });
            }
            break;
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
// TELA DE REVISÃO (Step 7)
// ============================================================

function populateReview() {
    collectStepData(currentStep);
    const grid = document.getElementById('reviewGrid');

    const sections = [
        {
            title: '🏠 Imóvel',
            rows: [
                ['Nome', formData.PROPERTY_NAME],
                ['Endereço', formData.PROPERTY_ADDRESS],
                ['Condomínio', formData.CONDO_NAME],
                ['Admin Condo', formData.CONDO_ADMIN_NAME],
                ['Email Condo', formData.CONDO_EMAIL],
            ],
        },
        {
            title: '👤 Proprietário',
            rows: [
                ['Nome', formData.OWNER_NAME],
                ['Email', formData.OWNER_EMAIL],
                ['Telefone', formData.OWNER_PHONE],
                ['Apto', `${formData.OWNER_BLOCO || ''}${formData.OWNER_APTO || ''}`],
                ['Garagem', formData.OWNER_GARAGEM],
            ],
        },
        {
            title: '📅 Calendários',
            rows: [
                ['Airbnb', formData.AIRBNB_ICAL_URL ? '✅ Configurado' : '⚠️ Não configurado'],
                ['Booking', formData.BOOKING_ICAL_URL ? '✅ Configurado' : '⚠️ Não configurado'],
                ['Intervalo', `${formData.CALENDAR_SYNC_INTERVAL_MINUTES || 30} minutos`],
            ],
        },
        {
            title: '📧 Email',
            rows: [
                ['Provedor', formData.EMAIL_PROVIDER || 'gmail'],
                ['Remetente', formData.EMAIL_FROM || '⚠️ Não configurado'],
                ['Senha', formData.EMAIL_PASSWORD ? '••••••••' : '⚠️ Não configurada'],
            ],
        },
        {
            title: '🔐 Admin',
            rows: [
                ['Email', formData.adminEmail],
                ['Senha', formData.adminPassword ? '••••••••' : '⚠️ Não definida'],
            ],
        },
    ];

    grid.innerHTML = sections.map(({ title, rows }) => `
    <div class="review-card">
      <h4>${title}</h4>
      ${rows.map(([label, value]) => `
        <div class="review-row">
          <span class="label">${label}</span>
          <span class="value">${value || '-'}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
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
      ❌ ${msg}
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
        resultEl.innerHTML = '<div class="inline-message error">⚠️ Digite uma URL primeiro</div>';
        return;
    }
    if (!isValidUrl(url)) {
        resultEl.innerHTML = '<div class="inline-message error">❌ URL inválida</div>';
        return;
    }

    resultEl.innerHTML = '<div class="inline-message info">🔄 Testando...</div>';

    const result = await window.wizardAPI.testIcalUrl(url);
    if (result.success) {
        resultEl.innerHTML = `<div class="inline-message success">✅ Calendário válido! ${result.events} evento(s) encontrado(s)</div>`;
    } else {
        resultEl.innerHTML = `<div class="inline-message error">❌ ${result.error || 'URL inválida'}</div>`;
    }
}

async function testEmail() {
    const resultEl = document.getElementById('email_test');
    const btn = document.getElementById('testEmailBtn');
    btn.disabled = true;

    resultEl.innerHTML = '<div class="inline-message info">🔄 Testando conexão SMTP...</div>';

    const config = {
        EMAIL_PROVIDER: document.getElementById('EMAIL_PROVIDER')?.value,
        EMAIL_FROM: document.getElementById('EMAIL_FROM')?.value,
        EMAIL_SMTP_HOST: document.getElementById('EMAIL_SMTP_HOST')?.value,
        EMAIL_SMTP_PORT: parseInt(document.getElementById('EMAIL_SMTP_PORT')?.value) || 587,
    };

    const result = await window.wizardAPI.testEmailConnection(config);
    btn.disabled = false;

    if (result.success) {
        resultEl.innerHTML = '<div class="inline-message success">✅ Conexão SMTP estabelecida com sucesso!</div>';
    } else {
        resultEl.innerHTML = `<div class="inline-message error">❌ ${result.error || 'Falha na conexão'}</div>`;
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
