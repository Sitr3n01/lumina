@echo off
REM =====================================================
REM SENTINEL - Script de Setup Automatizado para Windows
REM =====================================================

echo.
echo ================================================
echo    SENTINEL - Setup Automatizado
echo ================================================
echo.

REM Verificar se Python está instalado
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado!
    echo Por favor, instale Python 3.10+ de: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [OK] Python encontrado
python --version

REM Verificar se está no diretório correto
if not exist "app\" (
    echo [ERRO] Script deve ser executado da raiz do projeto apartment_rental_manager
    pause
    exit /b 1
)

echo.
echo [1/6] Criando ambiente virtual...
if exist "venv\" (
    echo Ambiente virtual ja existe. Pulando...
) else (
    python -m venv venv
    echo [OK] Ambiente virtual criado
)

echo.
echo [2/6] Ativando ambiente virtual...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo [ERRO] Falha ao ativar ambiente virtual
    pause
    exit /b 1
)
echo [OK] Ambiente virtual ativado

echo.
echo [3/6] Atualizando pip...
python -m pip install --upgrade pip --quiet
echo [OK] pip atualizado

echo.
echo [4/6] Instalando dependencias... (isso pode demorar alguns minutos)
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias
    pause
    exit /b 1
)
echo [OK] Dependencias instaladas

echo.
echo [5/6] Criando diretorios necessarios...
if not exist "data\" mkdir data
if not exist "data\downloads\" mkdir data\downloads
if not exist "data\generated_docs\" mkdir data\generated_docs
if not exist "data\logs\" mkdir data\logs
if not exist "templates\" mkdir templates
echo [OK] Diretorios criados

echo.
echo [6/6] Verificando arquivo .env...
if exist ".env" (
    echo [OK] Arquivo .env ja existe
) else (
    echo [AVISO] Arquivo .env nao encontrado
    echo Copiando .env.template para .env...
    copy .env.template .env >nul
    echo.
    echo ================================================
    echo  IMPORTANTE: Configure o arquivo .env antes de continuar!
    echo ================================================
    echo.
    echo Abra o arquivo .env e configure:
    echo   - TELEGRAM_BOT_TOKEN (obtenha em https://t.me/BotFather)
    echo   - TELEGRAM_ADMIN_USER_IDS (obtenha em https://t.me/userinfobot)
    echo   - AIRBNB_ICAL_URL (URL do calendario do Airbnb)
    echo   - BOOKING_ICAL_URL (URL do calendario do Booking)
    echo   - Dados do seu imovel (nome, endereco, condominio)
    echo.
    notepad .env
)

echo.
echo ================================================
echo  SETUP CONCLUIDO COM SUCESSO!
echo ================================================
echo.
echo Proximos passos:
echo   1. Certifique-se de que o .env esta configurado corretamente
echo   2. Execute: python scripts\init_db.py
echo   3. Inicie o servidor: scripts\start_server.bat
echo.
pause
