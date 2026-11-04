# 启动活动智囊后端（纯后端，LangGraph 真调模型）
# 用法：在 backend 目录下执行  .\start.ps1
#       或任意目录执行        powershell -File D:\ruangong2\raungong-main\backend\start.ps1

$ErrorActionPreference = "Stop"

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

$port = 8082

$python = Join-Path $here ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) {
    Write-Host "找不到虚拟环境：$python" -ForegroundColor Red
    Write-Host "请在 backend 目录重建：" -ForegroundColor Yellow
    Write-Host "  py -3.12 -m venv .venv"
    Write-Host "  .venv\Scripts\python.exe -m pip install -r requirements.txt"
    exit 1
}

$busy = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    Write-Host "端口 $port 已被占用，占用的进程：" -ForegroundColor Yellow
    $busy | ForEach-Object {
        $info = Get-CimInstance Win32_Process -Filter "ProcessId=$($_.OwningProcess)"
        Write-Host ("  PID {0}  {1}" -f $_.OwningProcess, $info.CommandLine)
    }
    Write-Host "先停掉占用者，或用 -Port 换一个端口。" -ForegroundColor Yellow
    exit 1
}

Write-Host "启动后端： http://127.0.0.1:$port" -ForegroundColor Green
Write-Host "健康检查： http://127.0.0.1:$port/healthz" -ForegroundColor Green
Write-Host "接口文档： http://127.0.0.1:$port/docs" -ForegroundColor Green
Write-Host "首次启动需等 10~20 秒（加载 LangChain），看到 Application startup complete 即就绪。" -ForegroundColor DarkGray

& $python -m uvicorn app.main:app --host 127.0.0.1 --port $port @args
