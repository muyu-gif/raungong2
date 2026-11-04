"""本地 UI 冒烟测试：注册 → 新建 → 生成 → 详情 → 编辑 → 冲突 → 导出 → 打印。
仅用于开发自查，截图输出到 screenshots/。
"""
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "screenshots"
SHOTS.mkdir(exist_ok=True)
BASE = "http://127.0.0.1:5173"
API = "http://127.0.0.1:8082"

console_errors = []
page_errors = []


def attach(page, label):
    page.on("console", lambda msg: console_errors.append((label, msg.type, msg.text)) if msg.type == "error" else None)
    page.on("pageerror", lambda err: page_errors.append((label, str(err))))


def shot(page, name, full=True):
    page.screenshot(path=str(SHOTS / f"{name}.png"), full_page=full)


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 960}, accept_downloads=True)
        page = context.new_page()
        attach(page, "desktop")

        page.goto(f"{BASE}/login", wait_until="networkidle")
        shot(page, "01-login")

        page.get_by_role("tab", name="注册").click()
        username = "demo" + str(int.from_bytes(os.urandom(2), "big"))
        page.fill("#username", username)
        page.fill("#displayName", "演示用户")
        page.fill("#password", "demo12345")
        page.fill("#confirm", "demo12345")
        shot(page, "02-register")
        page.get_by_role("button", name="注册并进入工作台").click()
        page.wait_for_url(f"{BASE}/", timeout=15000)
        page.wait_for_timeout(600)
        shot(page, "03-workbench-empty")

        page.get_by_role("link", name="新建方案").first.click()
        page.wait_for_url("**/plans/new", timeout=10000)
        page.wait_for_timeout(400)
        page.fill("#theme", "2026 级迎新晚会")
        page.get_by_role("radio", name="迎新晚会").click()
        page.fill("#location", "学校礼堂")
        page.fill("#participants", "120")
        page.fill("#budget", "3600")
        page.fill("#audience", "2026 级新生与社团成员")
        page.fill("#constraints", "室内礼堂，禁止明火；音响由场地提供。")
        page.fill("#notes", "希望安排一次抽奖互动，并为嘉宾准备伴手礼。")
        page.wait_for_timeout(300)
        shot(page, "04-create")

        page.locator(".aside .btn--primary").click()
        page.wait_for_url("**/generating", timeout=10000)
        page.wait_for_timeout(1100)
        shot(page, "05-generating")
        page.wait_for_url(re.compile(r"/plans/[0-9a-f-]{36}$"), timeout=20000)
        page.wait_for_timeout(900)
        plan_id = page.url.rsplit("/", 1)[-1]
        print("plan id", plan_id)
        shot(page, "06-detail-overview")

        for label, name in [
            ("筹备阶段", "07-detail-phases"),
            ("当晚流程", "08-detail-rundown"),
            ("预算", "09-detail-budget"),
            ("物资", "10-detail-materials"),
            ("分工", "11-detail-tasks"),
            ("宣传", "12-detail-promotion"),
            ("风险", "13-detail-risks"),
            ("复盘", "14-detail-review"),
            ("警告与假设", "15-detail-warnings"),
        ]:
            page.get_by_role("button", name=re.compile(label)).click()
            page.wait_for_timeout(250)
            shot(page, name)

        # 编辑物资数量
        page.get_by_role("button", name=re.compile("物资")).click()
        page.get_by_role("button", name="编辑本节").click()
        page.wait_for_timeout(300)
        qty = page.locator(".edit-card").first.locator('input[type="number"]').first
        qty.fill("3")
        page.wait_for_timeout(300)
        shot(page, "16-detail-materials-edit")
        page.get_by_role("button", name="保存本节").click()
        page.wait_for_timeout(1400)
        shot(page, "17-detail-materials-saved")
        version_text = page.locator(".version").inner_text()
        print("version after save", version_text)
        assert version_text == "v2", version_text

        # 版本冲突：先用 API 把版本推到 v3，再在页面保存旧版本
        page.get_by_role("button", name="编辑本节").click()
        page.wait_for_timeout(300)
        page.locator(".edit-card").first.locator('input[type="number"]').first.fill("6")
        token = page.evaluate("localStorage.getItem('token')")
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        detail = page.request.get(f"{API}/api/v1/plans/{plan_id}", headers=headers).json()
        patch_payload = json.dumps({"version": detail["version"], "data": detail["content"]["materials"]})
        patch_res = page.request.fetch(
            f"{API}/api/v1/plans/{plan_id}/sections/materials",
            method="PATCH",
            headers=headers,
            data=patch_payload,
        )
        print("external patch", patch_res.status)
        assert patch_res.status == 200
        page.get_by_role("button", name="保存本节").click()
        page.wait_for_selector(".el-message-box", timeout=8000)
        page.wait_for_timeout(300)
        shot(page, "17b-version-conflict", full=False)
        page.get_by_role("button", name="载入最新版本").click()
        page.wait_for_timeout(1300)
        version_text = page.locator(".version").inner_text()
        print("version after conflict reload", version_text)
        assert version_text == "v3", version_text

        # 预算编辑（plan 节，服务端重算）
        page.get_by_role("button", name=re.compile("预算")).click()
        page.get_by_role("button", name="编辑本节").click()
        page.wait_for_timeout(300)
        page.locator(".total-input").fill("500")
        page.wait_for_timeout(300)
        shot(page, "17c-budget-edit")
        page.get_by_role("button", name="保存本节").click()
        page.wait_for_timeout(1400)
        assert page.locator(".version").inner_text() == "v4"
        planned = page.locator(".total--planned .value").inner_text()
        print("planned after budget save", planned)
        assert "3,308.00" in planned, planned
        shot(page, "17d-budget-saved")

        # 导出 Markdown
        with page.expect_download(timeout=15000) as download_info:
            page.get_by_role("button", name=re.compile("Markdown")).click()
        download = download_info.value
        target = SHOTS / "export.md"
        download.save_as(str(target))
        filename = download.suggested_filename
        content = target.read_text(encoding="utf-8")
        (SHOTS / "export-filename.txt").write_text(filename, encoding="utf-8")
        assert "迎新晚会" in filename, filename
        assert "迎新晚会" in content and "## 四、预算" in content, "markdown content"
        print("download ok, chapters:", len([line for line in content.splitlines() if line.startswith("## ")]))
        assert content.count("## ") >= 8

        # 打印预览
        page.goto(f"{BASE}/plans/{plan_id}/print", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot(page, "18-print")
        page.emulate_media(media="print")
        shot(page, "19-print-media")
        page.emulate_media(media="screen")

        # 列表（含搜索）
        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(600)
        shot(page, "20-workbench-list")
        page.fill(".search-input", "迎新")
        page.wait_for_timeout(900)
        shot(page, "21-workbench-search")
        page.fill(".search-input", "不存在的活动")
        page.wait_for_timeout(900)
        shot(page, "21b-workbench-empty-search")

        context.storage_state(path=str(SHOTS / "state.json"))

        # 移动端
        mobile = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True,
            storage_state=str(SHOTS / "state.json"),
        )
        mpage = mobile.new_page()
        attach(mpage, "mobile")
        mpage.goto(f"{BASE}/", wait_until="networkidle")
        mpage.wait_for_timeout(600)
        shot(mpage, "22-mobile-list")
        mpage.goto(f"{BASE}/plans/new", wait_until="networkidle")
        mpage.wait_for_timeout(500)
        shot(mpage, "23-mobile-create")
        mpage.goto(f"{BASE}/plans/{plan_id}", wait_until="networkidle")
        mpage.wait_for_timeout(700)
        shot(mpage, "24-mobile-detail")
        mpage.get_by_role("button", name=re.compile("预算")).click()
        mpage.wait_for_timeout(400)
        shot(mpage, "25-mobile-budget")
        mobile.close()

        # 401：失效 token 应跳转登录页
        expired = browser.new_context(viewport={"width": 1280, "height": 860})
        epage = expired.new_page()
        attach(epage, "expired")
        epage.goto(f"{BASE}/login", wait_until="networkidle")
        epage.evaluate("localStorage.setItem('token', 'expired-token')")
        epage.goto(f"{BASE}/", wait_until="domcontentloaded")
        epage.wait_for_url(re.compile(r"/login"), timeout=15000)
        assert "/login" in epage.url
        epage.wait_for_timeout(400)
        shot(epage, "26-login-expired")
        expired.close()

        # 刷新进度页后应从 sessionStorage 恢复轮询
        page.goto(f"{BASE}/plans/new", wait_until="networkidle")
        page.fill("#theme", "刷新恢复测试活动")
        page.get_by_role("radio", name="其他活动").click()
        page.fill("#location", "线上会议室")
        page.locator(".aside .btn--primary").click()
        page.wait_for_url("**/generating", timeout=10000)
        page.wait_for_timeout(700)
        page.reload(wait_until="domcontentloaded")
        page.wait_for_url(re.compile(r"/plans/[0-9a-f-]{36}$"), timeout=25000)
        assert "刷新恢复测试活动" in page.locator(".plan-title").inner_text()
        print("refresh recovery ok")
        shot(page, "28-refresh-recovery", full=False)

        # 生成失败态
        page.goto(f"{BASE}/plans/new", wait_until="networkidle")
        page.fill("#theme", "生成失败测试活动")
        page.get_by_role("radio", name="其他活动").click()
        page.fill("#location", "线上会议室")
        page.locator(".aside .btn--primary").click()
        page.wait_for_url("**/generating", timeout=10000)
        page.get_by_text("这次生成没有完成").wait_for(timeout=15000)
        page.wait_for_timeout(400)
        shot(page, "27-generating-failed")

        print("console errors:", json.dumps(console_errors, ensure_ascii=False, indent=1))
        print("page errors:", json.dumps(page_errors, ensure_ascii=False, indent=1))
        browser.close()


if __name__ == "__main__":
    main()
