@echo off
REM =====================================================
REM SENTINEL - GUIA DE INICIALIZACAO COMPLETO
REM Execute este arquivo para iniciar o sistema
REM =====================================================

echo.
echo ========================================================
echo           SENTINEL - Sistema de Gestao
echo ========================================================
echo.
echo Este script ira:
echo   1. Verificar se o backend esta configurado
echo   2. Instalar dependencias do frontend (se necessario)
echo   3. Iniciar o backend (FastAPI)
echo   4. Iniciar o frontend (React)
echo.
echo ========================================================
echo.

pause

REM =====================================================
REM PASSO 1: Verificar ambiente Python
REM =====================================================
echo.
echo [PASSO 1/4] Verificando ambiente Python...
echo.

if not exist "venv\" (
    echo [ERRO] Ambiente virtual nao encontrado!
    echo.
    echo Execute primeiro: scripts\setup_windows.bat
    echo.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat
echo [OK] Ambiente virtual ativado

REM =====================================================
REM PASSO 2: Verificar banco de dados
REM =====================================================
echo.
echo [PASSO 2/4] Verificando banco de dados...
echo.

if not exist "data\sentinel.db" (
    echo [AVISO] Banco de dados nao encontrado. Criando...
    python scripts\init_db.py
    if errorlevel 1 (
        echo [ERRO] Falha ao criar banco de dados
        pause
        exit /b 1
    )
) else (
    echo [OK] Banco de dados encontrado
)

REM =====================================================
REM PASSO 3: Verificar Node.js e instalar frontend
REM =====================================================
echo.
echo [PASSO 3/4] Verificando Node.js e frontend...
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado!
    echo.
    echo Por favor, instale Node.js de: https://nodejs.org/
    echo Recomendado: Node.js 18 LTS ou superior
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
node --version

if not exist "frontend\node_modules\" (
    echo [INFO] Instalando dependencias do frontend...
    echo Isso pode demorar alguns minutos...
    cd frontend
    call npm install
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar dependencias do frontend
        cd ..
        pause
        exit /b 1
    )
    cd ..
    echo [OK] Dependencias do frontend instaladas
) else (
    echo [OK] Dependencias do frontend ja instaladas
)

REM =====================================================
REM PASSO 4: Iniciar servicos
REM =====================================================
echo.
echo [PASSO 4/4] Iniciando servicos...
echo.

echo ========================================================
echo  INICIANDO BACKEND E FRONTEND
echo ========================================================
echo.
echo Backend API sera iniciado em: http://127.0.0.1:8000
echo Frontend sera iniciado em:    http://localhost:5173
echo.
echo Aguarde as janelas abrirem...
echo.

REM Iniciar backend em nova janela
start "SENTINEL - Backend API" cmd /k "call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

REM Aguardar 5 segundos para o backend iniciar
echo Aguardando backend inicializar...
timeout /t 5 /nobreak >nul

REM Iniciar frontend em nova janela
start "SENTINEL - Frontend React" cmd /k "cd frontend && npm run dev"

REM Aguardar mais 3 segundos
timeout /t 3 /nobreak >nul

echo.
echo ========================================================
echo  SISTEMA INICIADO COM SUCESSO!
echo ========================================================
echo.
echo Acesse o sistema em:
echo.
echo   Frontend (Interface Web): http://localhost:5173
echo   Backend (API):            http://127.0.0.1:8000
echo   Documentacao API:         http://127.0.0.1:8000/docs
echo.
echo ========================================================
echo.
echo Duas janelas foram abertas:
echo   1. SENTINEL - Backend API (nao feche)
echo   2. SENTINEL - Frontend React (nao feche)
echo.
echo Para parar o sistema:
echo   - Feche as duas janelas abertas
echo   - Ou pressione Ctrl+C em cada uma
echo.
echo ========================================================
echo.

REM Abrir navegador automaticamente
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo O navegador sera aberto automaticamente.
echo.
echo Pressione qualquer tecla para fechar esta janela...
echo (Os servicos continuarao rodando nas outras janelas)
echo.
pause >nul
