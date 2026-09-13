@echo off
chcp 65001 >nul
title 猫步可爱 - 安卓虚拟机启动器

echo ======================================================
echo [>>] 猫步可爱 - 安卓虚拟机一键启动脚本
echo ======================================================

set "PROJECT_ROOT=%~dp0"
set "SDK_ROOT=%LOCALAPPDATA%\Android\Sdk"
if exist "%SDK_ROOT%" goto SDK_FOUND
if defined ANDROID_HOME set "SDK_ROOT=%ANDROID_HOME%"
if defined ANDROID_SDK_ROOT set "SDK_ROOT=%ANDROID_SDK_ROOT%"

:SDK_FOUND
set "EMULATOR_EXE=%SDK_ROOT%\emulator\emulator.exe"
set "ADB_EXE=%SDK_ROOT%\platform-tools\adb.exe"

if not exist "%EMULATOR_EXE%" goto ERR_NO_EMULATOR
if not exist "%ADB_EXE%" goto ERR_NO_ADB

set "AVD_NAME="
for /f "tokens=*" %%i in ('"%EMULATOR_EXE%" -list-avds 2^>nul') do (
    if not defined AVD_NAME set "AVD_NAME=%%i"
    if /i "%%i"=="maobu_test" set "AVD_NAME=maobu_test"
)

if not defined AVD_NAME goto ERR_NO_AVD

echo [*] 选定安卓虚拟设备: %AVD_NAME%

if /i "%1"=="--restart" goto KILL_EXISTING
if /i "%1"=="-r" goto KILL_EXISTING

powershell -NoProfile -Command "$p = Get-Process qemu-system-x86_64 -ErrorAction SilentlyContinue; if (!$p) { exit 0 } elseif (($p | Where-Object { $_.MainWindowHandle -ne 0 }).Count -gt 0) { exit 1 } else { exit 2 }"
set RUN_STATE=%errorlevel%

if %RUN_STATE% equ 1 goto RUNNING_VISIBLE
if %RUN_STATE% equ 2 goto RUNNING_HEADLESS
goto CLEAN_AND_LAUNCH

:RUNNING_VISIBLE
echo [OK] 检测到安卓模拟器窗口正在前台运行中！
goto WAIT_DEVICE

:RUNNING_HEADLESS
echo [*] 检测到后台残留无窗口模拟器进程，正在终止并重新打开可见窗口...
goto KILL_EXISTING

:KILL_EXISTING
echo [*] 正在关闭残留模拟器进程...
taskkill /f /im qemu-system-x86_64.exe >nul 2>&1
taskkill /f /im emulator.exe >nul 2>&1
"%ADB_EXE%" kill-server >nul 2>&1
ping 127.0.0.1 -n 2 >nul

:CLEAN_AND_LAUNCH
echo [*] 检查并清理 AVD 锁文件...
if exist "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\hardware-qemu.ini.lock" rd /s /q "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\hardware-qemu.ini.lock" >nul 2>&1
if exist "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\multiinstance.lock" del /f /q "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\multiinstance.lock" >nul 2>&1
for /d %%d in ("%USERPROFILE%\.android\avd\%AVD_NAME%.avd\*.lock") do rd /s /q "%%d" >nul 2>&1
del /f /q "%USERPROFILE%\.android\avd\%AVD_NAME%.avd\*.lock" >nul 2>&1

echo [*] 正在启动安卓虚拟机界面: %AVD_NAME% ...
cd /d "%SDK_ROOT%\emulator"
start "" "%EMULATOR_EXE%" -avd %AVD_NAME%

:WAIT_DEVICE
echo [*] 正在等待虚拟机建立 ADB 连接...
set /a WAIT_COUNT=0

:LOOP_DEVICE
"%ADB_EXE%" devices | findstr /i "emulator" | findstr /i "device" >nul
if %errorlevel% equ 0 goto DEVICE_READY
ping 127.0.0.1 -n 3 >nul
set /a WAIT_COUNT+=2
echo [*] 等待虚拟机连接响应... [%WAIT_COUNT%s]
if %WAIT_COUNT% gtr 120 goto WAIT_TIMEOUT
goto LOOP_DEVICE

:WAIT_TIMEOUT
echo [警告] 虚拟机连接超时，请检查模拟器窗口是否已正常打开。
goto FINISH

:DEVICE_READY
echo [OK] 虚拟机 ADB 连接已建立！
echo [*] 正在等待安卓系统开机就绪...
set /a BOOT_COUNT=0

:CHECK_BOOT
ping 127.0.0.1 -n 3 >nul
set /a BOOT_COUNT+=2
set "BOOT_VAL=0"
for /f "tokens=*" %%a in ('"%ADB_EXE%" shell getprop sys.boot_completed 2^>nul') do set "BOOT_VAL=%%a"
if "%BOOT_VAL%"=="1" goto BOOT_SUCCESS
echo [*] 正在开机加载桌面中... [%BOOT_COUNT%s]
if %BOOT_COUNT% gtr 180 goto BOOT_TIMEOUT
goto CHECK_BOOT

:BOOT_TIMEOUT
echo [警告] 开机检测耗时较长，尝试直接唤醒屏幕...
goto BOOT_SUCCESS

:BOOT_SUCCESS
echo [OK] 安卓系统已就绪！
echo [*] 唤醒屏幕并解锁...
"%ADB_EXE%" shell input keyevent 82 >nul 2>&1
ping 127.0.0.1 -n 2 >nul
"%ADB_EXE%" shell input keyevent 82 >nul 2>&1

"%ADB_EXE%" shell pm list packages | findstr "com.maobu.cuteapp" >nul
if %errorlevel% equ 0 goto LAUNCH_APP

echo [*] 正在向虚拟机安装「猫步可爱」应用...
set "APK_PATH=%PROJECT_ROOT%android\app\build\outputs\apk\debug\app-debug.apk"
if exist "%APK_PATH%" goto INSTALL_APK
echo [提示] 未找到预编译 APK，请先在终端执行 npm run build
goto LAUNCH_APP

:INSTALL_APK
"%ADB_EXE%" install -r "%APK_PATH%"

:LAUNCH_APP
echo [*] 正在启动应用: com.maobu.cuteapp ...
"%ADB_EXE%" shell am start -n com.maobu.cuteapp/.MainActivity >nul 2>&1
if %errorlevel% equ 0 goto SHOW_SUCCESS

echo ======================================================
echo [提示] 虚拟机已就绪。可通过 npx cap run android 重新安装运行。
echo ======================================================
goto FINISH

:SHOW_SUCCESS
echo ======================================================
echo [OK] 启动成功！已在虚拟机中打开「猫步可爱」App！
echo ======================================================

:FINISH
echo 请按任意键退出控制台 (模拟器窗口将保持运行)...
pause >nul
exit /b 0

:ERR_NO_EMULATOR
echo [错误] 未在以下路径找到 Android Emulator 模拟器:
echo        "%EMULATOR_EXE%"
echo 请检查 Android SDK 安装路径或在 Android Studio 中安装 Emulator 组件。
echo ======================================================
pause
exit /b 1

:ERR_NO_ADB
echo [错误] 未在以下路径找到 ADB 工具:
echo        "%ADB_EXE%"
echo 请检查 Android SDK platform-tools 是否已安装。
echo ======================================================
pause
exit /b 1

:ERR_NO_AVD
echo [错误] 系统中未找到任何已创建的安卓虚拟机 AVD。
echo 请先在 Android Studio 中通过 Device Manager 创建一台虚拟设备。
echo ======================================================
pause
exit /b 1
