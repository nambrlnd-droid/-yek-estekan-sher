#!/usr/bin/env python3
"""Collect public posts from t.me/s/Poemestic into a review inbox."""
import argparse, json, re, sys, time
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

CHANNEL = "Poemestic"
OUT = Path("telegram-inbox.json")

class PostParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.posts, self.current, self.depth = [], None, 0
        self.target, self.target_depth, self.parts = None, 0, []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = set((a.get("class") or "").split())
        if self.current is None and tag == "div" and a.get("data-post", "").startswith(CHANNEL + "/"):
            self.current = {"id": a["data-post"].rsplit("/", 1)[-1], "text": "", "author": "", "date": ""}
            self.depth = 1
            return
        if self.current is None:
            return
        self.depth += 1
        if tag == "br" and self.target == "text":
            self.parts.append("\n")
        if tag == "time" and a.get("datetime"):
            self.current["date"] = a["datetime"]
        if "tgme_widget_message_text" in classes:
            self.target, self.target_depth, self.parts = "text", self.depth, []
        elif "tgme_widget_message_from_author" in classes:
            self.target, self.target_depth, self.parts = "author", self.depth, []

    def handle_endtag(self, tag):
        if self.current is None:
            return
        if self.target and self.depth == self.target_depth:
            value = "".join(self.parts).strip()
            self.current[self.target] = value
            self.target, self.parts = None, []
        self.depth -= 1
        if self.depth <= 0:
            self.current["text"] = re.sub(r"\n{3,}", "\n\n", self.current["text"]).strip()
            if self.current["id"] and self.current["text"]:
                self.posts.append(self.current)
            self.current, self.depth = None, 0

    def handle_data(self, data):
        if self.current is not None and self.target:
            self.parts.append(data)

def fetch(url):
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; YekEstekanSher/1.0)"})
    with urlopen(req, timeout=35) as response:
        return response.read().decode("utf-8", "replace")

def read_page(before=None):
    url = f"https://t.me/s/{CHANNEL}"
    if before:
        url += "?" + urlencode({"before": before})
    parser = PostParser()
    parser.feed(fetch(url))
    return parser.posts

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=10)
    ap.add_argument("--delay", type=float, default=1.5)
    args = ap.parse_args()
    if args.pages < 1 or args.pages > 100:
        raise SystemExit("--pages must be between 1 and 100")
    existing = json.loads(OUT.read_text("utf-8")) if OUT.exists() else {"channel": CHANNEL, "posts": []}
    by_id = {str(p["id"]): p for p in existing.get("posts", [])}
    fetched = 0
    now = datetime.now(timezone.utc).isoformat()

    def merge(batch):
        nonlocal fetched
        fetched += len(batch)
        ids = []
        for p in batch:
            pid = str(p["id"])
            p["source_url"] = f"https://t.me/{CHANNEL}/{pid}"
            p["status"] = by_id.get(pid, {}).get("status", "needs_review")
            p["first_seen_at"] = by_id.get(pid, {}).get("first_seen_at", now)
            by_id[pid] = p
            if pid.isdigit():
                ids.append(int(pid))
        return min(ids) if ids else None

    # Always refresh the newest page so recent channel posts are not missed.
    latest = read_page()
    latest_oldest = merge(latest) if latest else None
    print(f"Latest page: {len(latest)} posts; oldest id={latest_oldest}")

    # Continue progressively through the historical archive across scheduled runs.
    cursor = existing.get("archive_cursor") or latest_oldest
    archive_oldest = cursor
    pages_done = 0
    for page_no in range(args.pages):
        if not cursor or int(cursor) <= 1:
            print("Reached the beginning of the channel archive.")
            archive_oldest = None
            break
        batch = read_page(cursor)
        if not batch:
            print(f"Archive page {page_no+1}: no posts returned; stopping.")
            break
        oldest = merge(batch)
        pages_done += 1
        print(f"Archive page {page_no+1}: {len(batch)} posts; oldest id={oldest}")
        if not oldest or oldest >= int(cursor):
            print("Archive cursor did not move; stopping to avoid a loop.")
            break
        archive_oldest = oldest
        cursor = oldest
        if page_no + 1 < args.pages:
            time.sleep(args.delay)

    result = {"channel": CHANNEL, "updated_at": datetime.now(timezone.utc).isoformat(),
              "fetched_this_run": fetched, "archive_cursor": archive_oldest, "archive_pages_this_run": pages_done, "posts": sorted(by_id.values(), key=lambda p: int(p["id"]))}
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", "utf-8")
    print(f"Saved {len(result['posts'])} unique posts ({fetched} fetched this run).")

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Telegram public archive fetch failed: {exc}", file=sys.stderr)
        raise
