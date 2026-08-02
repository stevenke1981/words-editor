# start-dev.ps1
# words-editor 開發伺服器啟動腳本（修正版）
# 功能：檢查必要工具 → 安裝缺失套件 → 啟動 Tauri 開發伺服器

$ErrorActionPreference = "Stop"

Write-Host "=== words-editor 開發環境檢查 ===" -ForegroundColor Cyan

# 1. 檢查 Rust
Write-Host "`n[1/6] 檢查 Rust 工具鏈..." -ForegroundColor Yellow
try {
    $cargoVersion = cargo --version
    if ($LASTEXITCODE -ne 0) { throw "cargo not found" }
    Write-Host "  ✓ Rust 已安裝: $cargoVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 未找到 Rust！請先安裝：https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# 2. 檢查 Node.js
Write-Host "`n[2/6] 檢查 Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    if ($LASTEXITCODE -ne 0) { throw "node not found" }
    Write-Host "  ✓ Node.js 已安裝: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ 未找到 Node.js！請先安裝：https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 3. 檢查 pnpm（優先）或 npm
Write-Host "`n[3/6] 檢查套件管理工具..." -ForegroundColor Yellow
$usePnpm = $false
try {
    $pnpmVer = pnpm --version
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ pnpm 已安裝: v$pnpmVer" -ForegroundColor Green
        $usePnpm = $true
    } else { throw "pnpm not found" }
} catch {
    Write-Host "  ! 未找到 pnpm，改為使用 npm..." -ForegroundColor DarkYellow
    try {
        $npmVer = npm --version
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ npm 已安裝: v$npmVer" -ForegroundColor Green
        } else { throw "npm not found" }
    } catch {
        Write-Host "  ✗ 未找到 npm！請安裝 Node.js" -ForegroundColor Red
        exit 1
    }
}

# 4. 檢查並安裝 Tauri CLI
Write-Host "`n[4/6] 檢查 Tauri CLI..." -ForegroundColor Yellow

$tauriReady = $false
cargo tauri --version 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Tauri CLI 已安裝" -ForegroundColor Green
    $tauriReady = $true
} else {
    Write-Host "  ! Tauri CLI 未安裝，正在安裝..." -ForegroundColor DarkYellow
}

if (-not $tauriReady) {
    Write-Host "  執行: cargo install tauri-cli（此過程可能需要數分鐘）..." -ForegroundColor DarkYellow
    cargo install tauri-cli

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Tauri CLI 安裝失敗！請手動執行：cargo install tauri-cli" -ForegroundColor Red
        exit 1
    }

    # 安裝後再次驗證
    cargo tauri --version 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Tauri CLI 安裝成功" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Tauri CLI 安裝後仍無法使用，請手動執行：cargo install tauri-cli" -ForegroundColor Red
        exit 1
    }
}

# 5. 安裝前端依賴
Write-Host "`n[5/6] 安裝前端依賴..." -ForegroundColor Yellow
if ($usePnpm) {
    pnpm install
} else {
    npm install
}
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ 前端依賴安裝失敗" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ 前端依賴安裝完成" -ForegroundColor Green

# 6. 啟動開發伺服器
Write-Host "`n[6/6] 啟動 Tauri 開發伺服器..." -ForegroundColor Yellow
Write-Host "首次編譯可能需要較長時間，請耐心等待..." -ForegroundColor DarkGray

Set-Location -Path "src-tauri"
cargo tauri dev
