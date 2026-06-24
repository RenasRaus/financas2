@echo off
title Financas Raupps - Servidor Local
cd /d "%~dp0financas-app"

echo.
echo  ================================
echo    Financas Raupps
echo  ================================
echo.
echo  Iniciando servidor...
echo  Acesse: http://localhost:3000
echo.
echo  Pressione Ctrl+C para parar.
echo.

npm run dev
pause
