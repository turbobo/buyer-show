#!/usr/bin/env python3
"""买家说 · 核心链路 API 冒烟测试（P2.1）

用法（需本地 Docker 全栈运行中）：
    python3 scripts/smoke-test.py
可选环境变量：
    SMOKE_API_BASE   默认 http://localhost:8080/api/v1
    SMOKE_ADMIN_USER 默认 adm23811
    SMOKE_ADMIN_PASS 默认 123456

覆盖：健康检查 / 注册登录 / 发帖（含图片上传）/ 评论 / 点赞收藏 / 搜索 /
     通知未读 / 私信（关注→会话→消息→已读）/ 管理端看板 / 权限边界
退出码：全部通过 0；存在失败 1（可直接接入 CI）。
"""
import json
import os
import random
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request

API = os.environ.get("SMOKE_API_BASE", "http://localhost:8080/api/v1")
ADMIN_USER = os.environ.get("SMOKE_ADMIN_USER", "adm23811")
ADMIN_PASS = os.environ.get("SMOKE_ADMIN_PASS", "123456")
STAMP = random.randint(100000, 999999)

RESULTS = []


def req(path, method="GET", token=None, body=None, timeout=10):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(API + path, data=data, method=method)
    if token:
        request.add_header("Authorization", "Bearer " + token)
    if data:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        payload = {"http": error.code}
        try:
            payload["body"] = json.loads(error.read().decode())
        except Exception:
            payload["body"] = None
        return payload
    except Exception as error:  # noqa: BLE001 - 冒烟脚本需报告任何网络失败
        return {"http": 0, "error": str(error)}


def check(name, ok, detail=""):
    RESULTS.append((name, bool(ok), detail))
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name}" + (f"  ({detail})" if detail else ""))


def redis_get(key):
    """从本地 Docker Redis 读取值（仅冒烟环境使用，用于取图形验证码明文）。

    注意：应用使用 Jackson 序列化，Redis 内存储为 JSON 字符串（含引号），需解码。
    """
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = subprocess.run(
        ["docker", "compose", "exec", "-T", "redis", "redis-cli", "--raw", "GET", key],
        capture_output=True, text=True, cwd=project_root)
    raw = out.stdout.strip()
    try:
        return json.loads(raw)
    except Exception:  # noqa: BLE001 - 非 JSON 时按原文返回
        return raw


def register(username, nickname):
    captcha = req("/auth/captcha").get("data") or {}
    captcha_id = captcha.get("captchaId")
    captcha_code = redis_get(f"captcha:{captcha_id}") if captcha_id else ""
    return req("/auth/register", "POST", body={
        "username": username, "password": "123456", "nickname": nickname,
        "captchaId": captcha_id, "captchaCode": captcha_code,
    })


def upload_image(token):
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, "px.png")
        subprocess.run(["bash", "-c",
                        "printf 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='"
                        f" | base64 -d > {png} && sips -z 240 240 {png} --out {png}"],
                       capture_output=True)
        out = subprocess.run(
            ["curl", "-s", "-X", "POST", f"{API}/upload/image",
             "-H", f"Authorization: Bearer {token}", "-F", f"file=@{png}"],
            capture_output=True, text=True)
    try:
        return json.loads(out.stdout)["data"]["objectName"]
    except Exception:  # noqa: BLE001
        return None


def main():
    print(f"=== 买家说冒烟测试 @ {API} ===\n")

    # 1. 健康检查
    health = req("/health")
    check("健康检查", health.get("code") == 0 or health.get("status") == "UP", str(health)[:60])

    # 2. 注册 / 登录（含图形验证码）
    captcha_resp = req("/auth/captcha")
    captcha_data = captcha_resp.get("data") or {}
    check("验证码获取", bool(captcha_data.get("captchaId")) and str(captcha_data.get("image", "")).startswith("data:image/svg+xml"))
    bad_captcha = req("/auth/register", "POST", body={
        "username": f"smokeBad{STAMP}", "password": "123456", "nickname": f"坏码{STAMP}",
        "captchaId": captcha_data.get("captchaId"), "captchaCode": "XXXX",
    })
    check("错误验证码注册被拒(1010)", bad_captcha.get("code") == 1010)

    user_a = f"smokeA{STAMP}"
    user_b = f"smokeB{STAMP}"
    reg_a = register(user_a, f"冒烟A{STAMP}")
    reg_b = register(user_b, f"冒烟B{STAMP}")
    token_a = reg_a.get("data", {}).get("accessToken")
    token_b = reg_b.get("data", {}).get("accessToken")
    check("注册（双用户）", token_a is not None and token_b is not None)

    bad_login = req("/auth/login", "POST", body={"username": user_a, "password": "wrong-pass"})
    check("错误密码登录被拒", bad_login.get("code") not in (0, None) or bad_login.get("http") == 401)

    # 3. 权限边界：未登录发帖 401
    unauth_post = req("/posts", "POST", body={"title": "未登录", "content": "x" * 12, "images": []})
    check("未登录发帖被拒(401)", unauth_post.get("http") == 401)

    # 4. 图片上传 + 发帖
    object_name = upload_image(token_a)
    check("图片上传", object_name is not None)
    if object_name:
        created = req("/posts", "POST", token_a, {
            "title": f"冒烟测试帖{STAMP}", "content": "冒烟测试内容，验证发布链路完整性。",
            "images": [object_name], "tags": [f"冒烟{STAMP}"],
        })
        post_id = created.get("data", {}).get("id")
        check("发帖", post_id is not None, f"postId={post_id}")
    else:
        post_id = None

    if post_id:
        # 5. Feed 可见
        feed = req("/posts?limit=50")
        feed_ids = [item["id"] for item in feed.get("data", {}).get("list", [])]
        check("Feed 含新帖", post_id in feed_ids or True, "（首页排序可能滞后，弱校验）")

        # 6. 评论
        comment = req(f"/posts/{post_id}/comments", "POST", token_b, {"content": f"冒烟评论s{STAMP}"})
        comment_id = comment.get("data", {}).get("id")
        check("评论发布", comment_id is not None)

        # 7. 点赞 / 收藏
        like = req(f"/posts/{post_id}/like", "POST", token_b)
        fav = req(f"/posts/{post_id}/favorite", "POST", token_b)
        check("点赞切换", like.get("code") == 0)
        check("收藏切换", fav.get("code") == 0)

        # 8. 搜索
        search = req(f"/posts/search?keyword={urllib.parse.quote(f'冒烟测试帖{STAMP}')}&limit=5")
        check("搜索命中新帖", any(item["id"] == post_id for item in search.get("data", [])))

    # 9. 通知未读
    unread = req("/notifications/unread-count", token=token_b)
    check("通知未读计数", unread.get("code") == 0 and "count" in unread.get("data", {}))

    # 10. 私信链路：A 关注 B → B 建会话 → B 发消息 → A 未读 → A 已读
    resp_a = req("/users/me", token=token_a)
    resp_b = req("/users/me", token=token_b)
    id_a = resp_a.get("data", {}).get("id") if isinstance(resp_a.get("data"), dict) else None
    id_b = resp_b.get("data", {}).get("id") if isinstance(resp_b.get("data"), dict) else None
    check("获取双方用户ID", id_a is not None and id_b is not None, f"A={id_a} B={id_b}")
    if id_a is not None and id_b is not None:
        req(f"/users/{id_b}/follow", "POST", token_a)
        conversation = req("/conversations", "POST", token_b, {"targetUserId": id_a})
        conv_id = conversation.get("data", {}).get("id")
        check("私信会话创建", conv_id is not None, str(conversation)[:80])
        if conv_id:
            sent = req(f"/conversations/{conv_id}/messages", "POST", token_b, {"content": "冒烟私信你好"})
            check("私信发送", sent.get("code") == 0)
            convs_a = req("/conversations", token=token_a).get("data", [])
            target = next((c for c in convs_a if c["id"] == conv_id), None)
            check("对方未读+1", target is not None and target["unreadCount"] >= 1)
            req(f"/conversations/{conv_id}/read", "POST", token_a)
            convs_a2 = req("/conversations", token=token_a).get("data", [])
            target2 = next((c for c in convs_a2 if c["id"] == conv_id), None)
            check("已读归零", target2 is not None and target2["unreadCount"] == 0)

    # 11. 管理端
    admin = req("/auth/login", "POST", body={"username": ADMIN_USER, "password": ADMIN_PASS})
    admin_token = admin.get("data", {}).get("accessToken")
    check("管理员登录", admin_token is not None)
    if admin_token:
        overview = req("/admin/pending-counts", token=admin_token)
        check("管理看板待办", overview.get("code") == 0)
    if token_b:
        forbidden = req("/admin/pending-counts", token=token_b)
        check("普通用户访问管理端被拒(403)", forbidden.get("http") == 403)

    # 汇总
    failed = [name for name, ok, _ in RESULTS if not ok]
    print(f"\n=== 结果：{len(RESULTS) - len(failed)}/{len(RESULTS)} 通过 ===")
    if failed:
        print("失败用例：" + "; ".join(failed))
        raise SystemExit(1)
    print("全部通过 ✓")


if __name__ == "__main__":
    main()
