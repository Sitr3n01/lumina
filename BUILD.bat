@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1

:: ============================================================
:: BUILD.bat — Gera o instalador LUMINA-Setup-A.0.1.0.exe
:: Executa as 3 etapas em sequência:
::   1. Build do Frontend (React/Vite)
::   2. Empacotamento do Backend Python (PyInstaller)
::   3. Build do instalador Electron (electron-builder)
::
:: Pré-requisitos:
::   - Node.js 20+ e npm instalados
::   - Python 3.11+ com venv em ./venv/
::   - pip install -r requirements.txt já executado
::
:: Saída: release\LUMINA-Setup-A.0.1.0.exe
:: ============================================================

echo.
echo ====================================================
echo  LUMINA Desktop — Build do Instalador Windows
echo ====================================================
echo.

set "ROOT=%~dp0"
set "VENV_ACTIVATE=%ROOT%venv\Scripts\activate.bat"

:: --- Verificar venv ---
if not exist "%VENV_ACTIVATE%" (
    echo [ERRO] Ambiente virtual Python nao encontrado em: %ROOT%venv\
    echo.
    echo Execute primeiro:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:: --- Ativar venv ---
echo [1/3] Ativando ambiente virtual Python...
call "%VENV_ACTIVATE%"

:: --- Verificar/instalar PyInstaller ---
python -c "import PyInstaller" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo     PyInstaller nao encontrado. Instalando...
    pip install pyinstaller
    if %ERRORLEVEL% neq 0 (
        echo.
        echo [ERRO] Falha ao instalar PyInstaller.
        echo Tente manualmente: pip install pyinstaller
        pause
        exit /b 1
    )
)
echo     OK - PyInstaller disponivel.

:: --- Etapa 1: Frontend ---
echo.
echo ====================================================
echo [ETAPA 1/3] Build do Frontend (React + Vite)
echo ====================================================
cd "%ROOT%frontend"
call npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] Build do frontend falhou.
    cd "%ROOT%"
    pause
    exit /b 1
)
echo     OK - frontend/dist/ gerado com sucesso.
cd "%ROOT%"

:: --- Etapa 2: Backend Python ---
echo.
echo ====================================================
echo [ETAPA 2/3] Empacotamento do Backend Python (PyInstaller)
echo ====================================================
echo     Isso pode demorar alguns minutos...
echo.
pyinstaller --noconfirm lumina.spec
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] PyInstaller falhou.
    echo Verifique as mensagens acima para detalhes.
    pause
    exit /b 1
)
echo     OK - dist\lumina-backend\ gerado com sucesso.

:: --- Verificar que o exe foi criado ---
if not exist "%ROOT%dist\lumina-backend\lumina-backend.exe" (
    echo [ERRO] lumina-backend.exe nao encontrado em dist\lumina-backend\
    echo Verifique a configuracao do lumina.spec.
    pause
    exit /b 1
)

:: --- Etapa 3: Electron Builder ---
echo.
echo ====================================================
echo [ETAPA 3/3] Build do Instalador Electron (NSIS)
echo ====================================================
cd "%ROOT%"
call npm run build:electron
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERRO] electron-builder falhou.
    pause
    exit /b 1
)

:: --- Resultado ---
echo.
echo ====================================================
echo  BUILD CONCLUIDO COM SUCESSO!
echo ====================================================
echo.
echo  Instalador gerado em:
echo  %ROOT%release\LUMINA-Setup-A.0.1.0.exe
echo.

if exist "%ROOT%release\LUMINA-Setup-A.0.1.0.exe" (
    for %%F in ("%ROOT%release\LUMINA-Setup-A.0.1.0.exe") do (
        set /a size=%%~zF / 1048576
        echo  Tamanho: !size! MB
    )
)

echo.
pause
