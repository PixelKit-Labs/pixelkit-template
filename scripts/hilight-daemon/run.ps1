# Start script for PixelKit HiLight Daemon on connected device
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
$JAR_PATH = Join-Path $SCRIPT_DIR "hilight-daemon.jar"

if (-not (Test-Path $JAR_PATH)) {
    Write-Host "Building daemon first..."
    & (Join-Path $SCRIPT_DIR "build.ps1")
}

$SDK_DIR = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$ADB = Join-Path $SDK_DIR "platform-tools\adb.exe"

Write-Host "Checking connected device..."
$DEVICES = & $ADB devices
$HAS_DEVICE = ($DEVICES | Where-Object { $_ -match "\bdevice$" })
if (-not $HAS_DEVICE) {
    Write-Error "No active ADB device detected. Connect your Pixel 11 Pro via USB or Wireless Debugging."
}

Write-Host "Pushing hilight-daemon.jar to device..."
& $ADB push $JAR_PATH /data/local/tmp/hilight-daemon.jar

Write-Host "Stopping any prior daemon instance..."
& $ADB shell "pkill -f com.pixelkit.hilight.HiLightDaemon" 2>$null

Write-Host "Forwarding port 11080 for dev host..."
& $ADB forward tcp:11080 tcp:11080

Write-Host "Launching HiLightDaemon as UID 2000..."
# Start in background on device
& $ADB shell "nohup /system/bin/app_process -Djava.class.path=/data/local/tmp/hilight-daemon.jar /data/local/tmp com.pixelkit.hilight.HiLightDaemon > /data/local/tmp/hilight-daemon.log 2>&1 &"

Start-Sleep -Milliseconds 800

Write-Host "Checking daemon status..."
try {
    $RESPONSE = Invoke-RestMethod -Uri "http://127.0.0.1:11080/status" -TimeoutSec 3
    Write-Host "HiLightDaemon is active!" -ForegroundColor Green
    Write-Host ($RESPONSE | ConvertTo-Json -Depth 3)
} catch {
    Write-Warning "Could not reach daemon on http://127.0.0.1:11080. Checking log:"
    & $ADB shell "cat /data/local/tmp/hilight-daemon.log"
}
