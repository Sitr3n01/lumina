@echo off
echo ============================================================
echo  LUMINA - Reset de Estado para Testes
echo  ATENCAO: Isso apagara todos os dados locais do LUMINA.
echo  A proxima abertura iniciara o Wizard de configuracao.
echo ============================================================
echo.

set USERDATA=%APPDATA%\lumina-desktop

echo Diretorio userData: %USERDATA%
echo.

echo Apagando banco de dados...
del /f /q "%USERDATA%\data\lumina.db" 2>nul && echo   [OK] lumina.db removido || echo   [--] lumina.db nao encontrado

echo Apagando configuracao (.env)...
del /f /q "%USERDATA%\.env" 2>nul && echo   [OK] .env removido || echo   [--] .env nao encontrado

echo Apagando pending-admin.json...
del /f /q "%USERDATA%\pending-admin.json" 2>nul && echo   [OK] pending-admin.json removido || echo   [--] nao encontrado

echo Apagando pending-template.pdf...
del /f /q "%USERDATA%\pending-template.pdf" 2>nul && echo   [OK] pending-template.pdf removido || echo   [--] nao encontrado

echo.
echo ============================================================
echo  Reset concluido!
echo  Abra o LUMINA normalmente — o Wizard sera iniciado.
echo ============================================================
echo.
pause
