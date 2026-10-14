#!/usr/bin/env python3
"""Slice the extracted exam guides into per-domain source files and emit a deck manifest.

Run via:  powershell -File scripts/extract-pdf.ps1 -Slice
        (or directly:  python scripts/slice_sources.py)

Handles three different guide layouts:
  * CCAR-F  - "Domain N: Name (W%)" followed by "Task Statement N.M: Title"
  * CCAR-P  - "Domain N: Name (W%)" followed by bulleted objectives (no titles)
  * CCDV-F  - "Domain N: Name (W%)" followed by weighted skill lines "Skill Name (x.y%)"
"""
import json
import os
import re
import sys
import unicodedata


def nfkc(s):
    """Normalise ligatures/full-width forms (PDF text loves to emit 'ﬂ' for 'fl')."""
    return unicodedata.normalize("NFKC", s)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "content", "source")
OUT = os.path.join(ROOT, "content", "decks")

GUIDES = [
    {
        "file": "Claude-Certified-Architect-Foundations-Exam-Guide.txt",
        "deckId": "architect-foundations",
        "title": "Claude Certified Architect — Foundations",
        "shortName": "Architect · Foundations",
        "examCode": "CCAR-F",
        "items": 60,
        "timeLimitMinutes": 120,
        "passingScore": 720,
        "slug": "ccarf",
        "kind": "task",
        "endMarkers": ["7. How to Prepare"],
    },
    {
        "file": "Claude-Certified-Architect-Profesional-Exam-Guide.txt",
        "deckId": "architect-professional",
        "title": "Claude Certified Architect — Professional",
        "shortName": "Architect · Professional",
        "examCode": "CCAR-P",
        "items": 63,
        "timeLimitMinutes": 120,
        "passingScore": 720,
        "slug": "ccarp",
        "kind": "bullets",
        "endMarkers": ["7. How to Prepare", "8. Sample Questions"],
    },
    {
        "file": "Claude-Certified-Developer-Foundations-Exam-Guide.txt",
        "deckId": "developer-foundations",
        "title": "Claude Certified Developer — Foundations",
        "shortName": "Developer · Foundations",
        "examCode": "CCDV-F",
        "items": 53,
        "timeLimitMinutes": 120,
        "passingScore": 720,
        "slug": "ccdvf",
        "kind": "skills",
        "endMarkers": ["7. How to Prepare", "8. Sample Questions"],
    },
]

DOMAIN_RE = re.compile(r"^Domain (\d+):\s*(.+?)\s*(?:\((\d+(?:\.\d+)?)%\))?\s*$", re.M)
TASK_RE = re.compile(r"^Task Statement (\d+)\.(\d+):\s*(.+?)\s*$", re.M)
BULLET_RE = re.compile(r"^\s*[\u2022\u2023\u25aa\u00b7\-]\s*(.+?)\s*$")
SKILL_RE = re.compile(r"^(.{3,80}?)\s*\((\d+(?:\.\d+)?)%\)\s*$")
# Blueprint table rows, e.g. "1 Agentic Architecture & Orchestration 27%"
BLUEPRINT_RE = re.compile(r"^(\d)\s+(.+?)\s+(\d+(?:\.\d+)?)%\s*$", re.M)

PAGE_RE = re.compile(r"^===== PAGE \d+ =====$", re.M)
NOISE_RE = re.compile(r"^(Claude Certification Program Exam guide|Exam guide)$")


def read(path):
    with open(path, encoding="utf-8") as f:
        return nfkc(f.read())


def strip_pages(text):
    out = []
    for line in text.splitlines():
        s = line.strip()
        if PAGE_RE.match(s) or NOISE_RE.match(s):
            continue
        out.append(line)
    return "\n".join(out)


def slice_domain(body, kind, domain_no):
    """Return [(objectiveId, title)] for one domain body."""
    lines = [l.rstrip() for l in body.splitlines()]

    if kind == "task":
        found = []
        for line in lines:
            m = TASK_RE.match(line.strip())
            if m and int(m.group(1)) == domain_no:
                found.append((f"{domain_no}.{m.group(2)}", m.group(3).strip()))
        return found

    if kind == "bullets":
        found = []
        for line in lines:
            m = BULLET_RE.match(line)
            if m:
                title = re.sub(r"\s+", " ", m.group(1)).strip()
                # Skip page-wrap noise and very short fragments.
                if len(title) < 12:
                    continue
                found.append((None, title))
        return [(f"{domain_no}.{i + 1}", t) for i, (_, t) in enumerate(found)]

    # kind == "skills"
    found = []
    for line in lines:
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        m = SKILL_RE.match(s)
        if m and not s.startswith("Domain"):
            title = re.sub(r"\s+", " ", m.group(1)).strip()
            if len(title) < 3:
                continue
            found.append((None, title))
    return [(f"{domain_no}.{i + 1}", t) for i, (_, t) in enumerate(found)]


def main():
    decks = []
    for guide in GUIDES:
        path = os.path.join(SRC, guide["file"])
        if not os.path.exists(path):
            print("SKIP (source missing, run extract-pdf.ps1 first):", guide["file"])
            continue
        text = strip_pages(read(path))

        matches = list(DOMAIN_RE.finditer(text))
        if not matches:
            print("SKIP (no domains parsed):", guide["file"])
            continue

        # Some guides list domain weights only in the blueprint table, not in the
        # domain headings of the objectives section.
        table_weights = {}
        for m in BLUEPRINT_RE.finditer(text):
            table_weights[int(m.group(1))] = float(m.group(3))

        # Cut the document at the first end marker that follows the last domain.
        last_domain_end = matches[-1].end()
        end = len(text)
        for marker in guide["endMarkers"]:
            idx = text.find(marker, last_domain_end)
            if idx != -1:
                end = min(end, idx)

        domains = []
        for i, m in enumerate(matches):
            body_end = matches[i + 1].start() if i + 1 < len(matches) else end
            body = text[m.end():body_end]
            domain_no = int(m.group(1))
            name = re.sub(r"\s+", " ", m.group(2)).strip()
            weight = float(m.group(3)) if m.group(3) else table_weights.get(domain_no, 0.0)
            objectives = slice_domain(body, guide["kind"], domain_no)

            out_path = os.path.join(SRC, f"{guide['slug']}-d{domain_no}.md")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(f"# {guide['examCode']} — Domain {domain_no}: {name} ({weight:g}% of exam)\n\n")
                f.write("## Objectives measured in this domain\n\n")
                for oid, title in objectives:
                    f.write(f"- **{oid}** {title}\n")
                f.write("\n## Source detail\n\n")
                f.write(body.strip() + "\n")

            domains.append({
                "id": f"d{domain_no}",
                "name": name,
                "weight": weight,
                "objectives": [{"id": oid, "title": title} for oid, title in objectives],
            })
            print(f"  {guide['slug']}-d{domain_no}.md  ({len(objectives)} objectives)  {name}")

        total_obj = sum(len(d["objectives"]) for d in domains)
        print(f"{guide['examCode']}: {len(domains)} domains, {total_obj} objectives\n")

        decks.append({
            "deckId": guide["deckId"],
            "title": guide["title"],
            "shortName": guide["shortName"],
            "examCode": guide["examCode"],
            "items": guide["items"],
            "timeLimitMinutes": guide["timeLimitMinutes"],
            "passingScore": guide["passingScore"],
            "file": f"{guide['deckId']}.json",
            "source": guide["file"].replace(".txt", ".pdf"),
            "sourceSliceDir": guide["slug"],
            "available": False,
            "domains": domains,
        })

    os.makedirs(OUT, exist_ok=True)
    manifest_path = os.path.join(OUT, "manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump({"decks": decks}, f, indent=2, ensure_ascii=False)
    print("wrote", manifest_path, f"({len(decks)} decks)")


if __name__ == "__main__":
    main()
