#!/usr/bin/env python3
"""买家说 · G10 运营位与话题冒烟测试

用法（需本地 Docker 全栈运行中）：
    python3 scripts/g10-smoke.py
可选环境变量：
    SMOKE_API_BASE   默认 http://localhost:8080/api/v1
    SMOKE_ADMIN_USER 默认 adm23811
    SMOKE_ADMIN_PASS 默认 123456

覆盖：管理端 Banner/话题 CRUD + 重名负例 / 发帖打精选 / 公开端 Banner/话题/精选流/话题聚合流 / 停用话题下架 / 权限边界
退出码：全部通过 0；存在失败 1。
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
        except Exception:  # noqa: BLE001
            payload["body"] = None
        return payload
    except Exception as error:  # noqa: BLE001 - 冒烟脚本需报告任何网络失败
        return {"http": 0, "error": str(error)}


def check(name, ok, detail=""):
    RESULTS.append((name, bool(ok), detail))
    icon = "PASS" if ok else "FAIL"
    print(f"[{icon}] {name}" + (f"  ({detail})" if detail else ""))


def redis_get(key):
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out = subprocess.run(
        ["docker", "compose", "exec", "-T", "redis", "redis-cli", "--raw", "GET", key],
        capture_output=True, text=True, cwd=project_root)
    raw = out.stdout.strip()
    try:
        return json.loads(raw)
    except Exception:  # noqa: BLE001
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
    print(f"=== 买家说 G10 运营位与话题冒烟 @ {API} ===\n")

    # 1. 管理员登录
    admin = req("/auth/login", "POST", body={"username": ADMIN_USER, "password": ADMIN_PASS})
    admin_token = admin.get("data", {}).get("accessToken")
    check("管理员登录", admin_token is not None)

    # 2. 管理端建 Banner
    banner_title = f"G10冒烟位{STAMP}"
    created_banner = req("/admin/banners", "POST", admin_token, {
        "title": banner_title, "imageUrl": "minio/smoke/banner.png",
        "linkType": "url", "linkValue": "https://example.com", "sortOrder": 0,
    })
    banner_id = created_banner.get("data", {}).get("id")
    check("创建 Banner", banner_id is not None, f"bannerId={banner_id}")

    # 3. 负例：重名 Banner（8002）
    dup_banner = req("/admin/banners", "POST", admin_token, {
        "title": banner_title, "imageUrl": "minio/smoke/b2.png",
        "linkType": "url", "linkValue": "https://example.com", "sortOrder": 0,
    })
    check("重名 Banner 被拒(8002)", dup_banner.get("code") == 8002)

    # 4. 负例：非法 linkType
    bad_link = req("/admin/banners", "POST", admin_token, {
        "title": f"非法类型{STAMP}", "imageUrl": "minio/smoke/b3.png",
        "linkType": "evil", "linkValue": "x", "sortOrder": 0,
    })
    check("非法 linkType 被拒", bad_link.get("http") == 400 or bad_link.get("code") not in (0, None))

    # 5. 管理端建话题
    topic_name = f"话题{STAMP}"
    created_topic = req("/admin/topics", "POST", admin_token, {
        "name": topic_name, "description": "G10 冒烟话题", "sortOrder": 0,
    })
    topic_id = created_topic.get("data", {}).get("id")
    check("创建话题", topic_id is not None, f"topicId={topic_id}")

    # 6. 负例：重名话题（8004）
    dup_topic = req("/admin/topics", "POST", admin_token, {
        "name": topic_name, "description": "重复", "sortOrder": 0,
    })
    check("重名话题被拒(8004)", dup_topic.get("code") == 8004)

    # 7. 普通用户注册 + 带话题标签发帖
    reg = register(f"g10smoke{STAMP}", f"运营冒烟{STAMP}")
    user_token = reg.get("data", {}).get("accessToken")
    check("用户注册", user_token is not None)

    post_id = None
    object_name = upload_image(user_token) if user_token else None
    check("图片上传", object_name is not None)
    if object_name and user_token:
        created_post = req("/posts", "POST", user_token, {
            "title": f"G10精选候选{STAMP}", "content": "运营精选冒烟内容：好物分享。",
            "images": [object_name], "tags": [topic_name],
        })
        post_id = created_post.get("data", {}).get("id")
        check("发帖（带话题标签）", post_id is not None, f"postId={post_id}")

    # 8. 管理端打精选
    if post_id and admin_token:
        featured = req(f"/admin/posts/{post_id}/featured", "PUT", admin_token, {"featured": True})
        check("打精选", featured.get("code") == 0, str(featured.get("code")))

    # 9. 公开端验证
    banners = req("/banners").get("data", [])
    check("公开 Banner 含新位", any(b.get("id") == banner_id for b in banners))

    topics = req("/topics").get("data", [])
    target_topic = next((t for t in topics if t.get("id") == topic_id), None)
    check("公开话题列表含新话题", target_topic is not None)
    check("话题帖子数聚合", target_topic is not None and target_topic.get("postCount", 0) >= 1,
          f"postCount={target_topic.get('postCount') if target_topic else None}")

    topic_detail = req(f"/topics/{topic_id}") if topic_id else {}
    check("话题详情", topic_detail.get("code") == 0 and topic_detail.get("data", {}).get("name") == topic_name)

    if post_id:
        featured_feed = req("/posts?sort=featured&limit=50")
        featured_ids = [item["id"] for item in featured_feed.get("data", {}).get("list", [])]
        check("精选流含打标帖", post_id in featured_ids, f"postId={post_id}")

        topic_feed = req(f"/posts?tag={urllib.parse.quote(topic_name)}&limit=50")
        topic_feed_ids = [item["id"] for item in topic_feed.get("data", {}).get("list", [])]
        check("话题聚合流含该帖", post_id in topic_feed_ids)

    # 10. 管理端精选列表（featured 过滤）
    admin_posts = req("/admin/posts?featured=1", token=admin_token).get("data", {})
    admin_featured_ids = [item["id"] for item in admin_posts.get("list", [])]
    check("管理端精选列表", post_id is None or post_id in admin_featured_ids)

    # 11. 负例：停用话题后详情 404（8003）
    if topic_id and admin_token:
        req(f"/admin/topics/{topic_id}", "PUT", admin_token, {
            "name": topic_name, "description": "G10 冒烟话题", "sortOrder": 0, "status": 1,
        })
        offline = req(f"/topics/{topic_id}")
        check("停用话题详情被拒(8003)", offline.get("code") == 8003)

    # 12. 权限边界：普通用户访问管理端 403
    if user_token:
        forbidden = req("/admin/banners", token=user_token)
        check("普通用户访问管理端被拒(403)", forbidden.get("http") == 403)

    # 13. 清理：删除 Banner 与话题
    if banner_id and admin_token:
        del_banner = req(f"/admin/banners/{banner_id}", "DELETE", admin_token)
        check("清理 Banner", del_banner.get("code") == 0)
    if topic_id and admin_token:
        del_topic = req(f"/admin/topics/{topic_id}", "DELETE", admin_token)
        check("清理话题", del_topic.get("code") == 0)

    # 汇总
    failed = [name for name, ok, _ in RESULTS if not ok]
    print(f"\n=== 结果：{len(RESULTS) - len(failed)}/{len(RESULTS)} 通过 ===")
    if failed:
        print("失败用例：" + "; ".join(failed))
        raise SystemExit(1)
    print("全部通过 ✓")


if __name__ == "__main__":
    main()
