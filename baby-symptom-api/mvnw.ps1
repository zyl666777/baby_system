$ErrorActionPreference = 'Stop'
$version = '3.9.11'
$wrapperRoot = Join-Path $env:USERPROFILE '.m2\wrapper'
$mavenDir = Join-Path $wrapperRoot "apache-maven-$version"

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
    Write-Host '找不到 Java，請先安裝 JDK 21（https://adoptium.net），裝完重開 VS Code。' -ForegroundColor Red
    exit 1
}

if (-not (Test-Path (Join-Path $mavenDir 'bin\mvn.cmd'))) {
    Write-Host "第一次執行：下載 Maven $version ..."
    New-Item -ItemType Directory -Force -Path $wrapperRoot | Out-Null
    $zip = Join-Path $env:TEMP "apache-maven-$version-bin.zip"
    $url = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/$version/apache-maven-$version-bin.zip"
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Expand-Archive -Path $zip -DestinationPath $wrapperRoot -Force
    Remove-Item $zip
}

Push-Location $PSScriptRoot
try {
    & (Join-Path $mavenDir 'bin\mvn.cmd') @args
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
