@echo off
chcp 65001 >nul
title 猫步可爱 - 安卓虚拟机启动器
echo ======================================================
echo 🐱 正在启动「猫步可爱」安卓虚拟机 ( maobu_test )...
echo ======================================================
cd /d "%LOCALAPPDATA%\Android\Sdk\emulator"
start "" emulator.exe -avd maobu_test
echo 虚拟机窗口启动中，正在等待系统就绪...
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" wait-for-device
ping -n 3 127.0.0.1 >nul
echo 正在打开「猫步可爱」App...
"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" shell am start -n com.maobu.cuteapp/.MainActivity
echo ======================================================
echo ✨ 启动完成！已在桌面弹出虚拟机窗口并打开 App！
echo ======================================================
pause
