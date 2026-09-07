# Build script for PixelKit HiLight Daemon
$ErrorActionPreference = "Stop"

$SCRIPT_DIR = $PSScriptRoot
$SRC_DIR = Join-Path $SCRIPT_DIR "src"
$BUILD_DIR = Join-Path $SCRIPT_DIR "build"
$CLASSES_DIR = Join-Path $BUILD_DIR "classes"
$OUTPUT_JAR = Join-Path $SCRIPT_DIR "hilight-daemon.jar"

$SDK_DIR = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
$ANDROID_JAR = Join-Path $SDK_DIR "platforms\android-37.0\android.jar"
if (-not (Test-Path $ANDROID_JAR)) {
    $ANDROID_JAR = Join-Path $SDK_DIR "platforms\android-36\android.jar"
}

$D8 = Get-ChildItem -Path "$SDK_DIR\build-tools" -Filter "d8.bat" -Recurse | Select-Object -First 1 -ExpandProperty FullName

Write-Host "Compiling HiLightDaemon with javac..."
if (Test-Path $CLASSES_DIR) { Remove-Item -Recurse -Force $CLASSES_DIR }
New-Item -ItemType Directory -Path $CLASSES_DIR -Force | Out-Null

$JAVA_FILES = Get-ChildItem -Path $SRC_DIR -Filter "*.java" -Recurse | Select-Object -ExpandProperty FullName
& javac -cp $ANDROID_JAR -d $CLASSES_DIR $JAVA_FILES

Write-Host "Converting classes to DEX with d8..."
$CLASS_FILES = Get-ChildItem -Path $CLASSES_DIR -Filter "*.class" -Recurse | Select-Object -ExpandProperty FullName

if (Test-Path $OUTPUT_JAR) { Remove-Item -Force $OUTPUT_JAR }
& $D8 --lib $ANDROID_JAR --output $OUTPUT_JAR $CLASS_FILES

Write-Host "Built: $OUTPUT_JAR"
