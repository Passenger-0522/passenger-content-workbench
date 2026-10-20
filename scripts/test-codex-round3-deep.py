#!/usr/bin/env python3
import json
import urllib.request
import urllib.error
import subprocess
import time
import os
import shutil
from pathlib import Path

ROOT = Path("/Users/liangxiaoling/Downloads/个人内容工作台")
TEST_PORT = 3025
BASE_URL = f"http://127.0.0.1:{TEST_PORT}"
DATA_DIR = Path("/tmp/workbench-codex3-test-data")

def setup_env():
    if DATA_DIR.exists():
        shutil.rmtree(DATA_DIR)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "incoming").mkdir(exist_ok=True)
    (DATA_DIR / "receipts").mkdir(exist_ok=True)

def start_server():
    env = os.environ.copy()
    env["PORT"] = str(TEST_PORT)
    env["WORKBENCH_DATA_DIR"] = str(DATA_DIR)
    env["ENABLE_MODEL_API"] = "false"
    proc = subprocess.Popen(
        ["npx", "tsx", "server/index.ts"],
        cwd=str(ROOT),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    for _ in range(30):
        time.sleep(0.5)
        try:
            req = urllib.request.Request(f"{BASE_URL}/api/health", headers={"Host": f"127.0.0.1:{TEST_PORT}"})
            with urllib.request.urlopen(req, timeout=2) as r:
                if r.status == 200:
                    return proc
        except Exception:
            pass
    raise RuntimeError("Failed to start server on 3025")

def req(method, path, body=None, host=f"127.0.0.1:{TEST_PORT}", headers=None, token=None):
    h = {"Host": host}
    if headers:
        h.update(headers)
    if token:
        h["x-workbench-token"] = token
    data = json.dumps(body).encode("utf-8") if body is not None else None
    if body is not None:
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(f"{BASE_URL}{path}", data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=5) as res:
            res_body = res.read().decode("utf-8")
            try:
                return res.status, json.loads(res_body)
            except Exception:
                return res.status, res_body
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(res_body)
        except Exception:
            return e.code, res_body

def main():
    setup_env()
    proc = start_server()
    print("Test server started.")
    try:
        # Check 1: Host fixture-rebind.invalid rejection
        s1, res1 = req("GET", "/api/auth/token", host="fixture-rebind.invalid")
        print(f"Check 1 (Host rebinding rejection): HTTP {s1} (Expected 403) -> {'PASS' if s1 == 403 else 'FAIL'}")

        # Legitimate token handshake
        s_auth, res_auth = req("GET", "/api/auth/token")
        token = res_auth.get("token")
        print(f"Token handshake: HTTP {s_auth}, token exists: {bool(token)}")

        # Check 2: Symlink escape outside asset root
        outside_file = Path("/tmp/outside-secret.txt")
        outside_file.write_text("SECRET_DATA")
        probe_dir = DATA_DIR / "incoming" / "symlink-probe"
        probe_dir.mkdir(parents=True, exist_ok=True)
        symlink_path = probe_dir / "outside.png"
        if symlink_path.exists() or symlink_path.is_symlink():
            symlink_path.unlink()
        symlink_path.symlink_to(outside_file)

        s2, res2 = req("GET", "/api/assets/incoming/symlink-probe/outside.png")
        print(f"Check 2 (Symlink escape outside rejection): HTTP {s2} (Expected 403) -> {'PASS' if s2 == 403 else 'FAIL'}")

        # Check 3: Truncated fake PNG
        fake_png_pkg = DATA_DIR / "incoming" / "fake-png-pkg"
        fake_png_pkg.mkdir(parents=True, exist_ok=True)
        # Create a truncated fake PNG (signature + header only, no IDAT/IEND)
        fake_png = fake_png_pkg / "fake.png"
        fake_png.write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x04>\x00\x00\x05\xa8\x08\x02\x00\x00\x00\x94")
        manifest3 = {
            "schemaVersion": "1.2",
            "importId": "fake-png-pkg",
            "executionParty": "codex",
            "files": {
                "images": [{"path": "fake.png", "usage": "primary", "ratio": "3:4"}]
            }
        }
        (fake_png_pkg / "manifest.json").write_text(json.dumps(manifest3))
        (fake_png_pkg / "READY").write_text("READY")

        # Create project first
        s_p, p_res = req("POST", "/api/projects", {"title": "测试项目", "masterContent": "母本"}, token=token)
        pid = p_res["id"]
        manifest3["projectId"] = pid
        (fake_png_pkg / "manifest.json").write_text(json.dumps(manifest3))

        s3, imp3 = req("POST", "/api/handoff/import/fake-png-pkg", {}, token=token)
        receipt3 = imp3.get("receipt", {})
        # Check 3 & 4: Truncated PNG rejected, and all-invalid package status is failed/rejected
        check3_pass = receipt3.get("assetsAdded") == 0
        check4_pass = receipt3.get("status") in ["failed", "rejected"]
        print(f"Check 3 (Truncated PNG rejected): assetsAdded={receipt3.get('assetsAdded')} -> {'PASS' if check3_pass else 'FAIL'}")
        print(f"Check 4 (All-invalid package not marked imported): status={receipt3.get('status')} -> {'PASS' if check4_pass else 'FAIL'}")

        # Check 5: PATCH image_text variant without images cannot be set to ready
        s_v, v_res = req("POST", f"/api/projects/{pid}/variants", {
            "platform": "xiaohongshu", "format": "image_text", "title": "小红书图文", "content": "正文", "covers": []
        }, token=token)
        vid = v_res["id"]

        s5, res5 = req("PATCH", f"/api/projects/{pid}/variants/{vid}", {"status": "ready"}, token=token)
        check5_pass = s5 == 400 and "missing" in res5
        print(f"Check 5 (image_text without covers rejects ready): HTTP {s5}, missing={res5.get('missing')} -> {'PASS' if check5_pass else 'FAIL'}")

        # Check 6: GET /api/export/today
        s6, res6 = req("GET", "/api/export/today")
        check6_pass = s6 == 200 and "今日发布与内容物料导出" in res6
        print(f"Check 6 (GET /api/export/today returns 200): HTTP {s6} -> {'PASS' if check6_pass else 'FAIL'}")

    finally:
        proc.terminate()
        proc.wait()
        if DATA_DIR.exists():
            shutil.rmtree(DATA_DIR)
        print("Test server stopped and cleaned up.")

if __name__ == "__main__":
    main()
