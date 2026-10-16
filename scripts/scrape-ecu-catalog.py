"""Extract ECU's published faculties and programs without database writes.

Run from the repository root: python scripts/scrape-ecu-catalog.py
Only Python's standard library is required.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen


SOURCE_URL = "https://ecu-ssd.org/faculties.html"
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


@dataclass
class Element:
    tag: str
    attrs: dict[str, str | None] = field(default_factory=dict)
    children: list[Element | str] = field(default_factory=list)

    def descendants(self, tag: str) -> list[Element]:
        result: list[Element] = []
        for child in self.children:
            if isinstance(child, Element):
                if child.tag == tag:
                    result.append(child)
                result.extend(child.descendants(tag))
        return result

    def text(self) -> str:
        pieces = [child.text() if isinstance(child, Element) else child for child in self.children]
        return " ".join(" ".join(pieces).split())


class Document(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        element = Element(tag, dict(attrs))
        self.stack[-1].children.append(element)
        if tag not in VOID_TAGS:
            self.stack.append(element)

    def handle_endtag(self, tag: str) -> None:
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


def fetch_document(url: str) -> tuple[Document, str]:
    request = Request(url, headers={"User-Agent": "ECU-Academic-Catalog-Research/1.0"})
    with urlopen(request, timeout=30) as response:
        final_url = response.geturl()
        html = response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
    document = Document()
    document.feed(html)
    return document, final_url


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def inspect_links(document: Document, base_url: str) -> dict[str, list[str]]:
    downloads: set[str] = set()
    curriculum_links: set[str] = set()
    for anchor in document.root.descendants("a"):
        href = anchor.attrs.get("href")
        if not href:
            continue
        target = urldefrag(urljoin(base_url, href))[0]
        if urlparse(target).hostname not in {"ecu-ssd.org", "www.ecu-ssd.org"}:
            continue
        if re.search(r"\.(pdf|docx?|xlsx?)(?:$|\?)", target, re.IGNORECASE):
            downloads.add(target)
        if re.search(r"\b(curriculum|syllabus|syllabi|course units?|course outline|module handbook)\b", f"{anchor.text()} {target}", re.IGNORECASE):
            curriculum_links.add(target)
    return {"documentLinks": sorted(downloads), "curriculumLinks": sorted(curriculum_links)}


def scrape_catalog() -> dict:
    document, final_url = fetch_document(SOURCE_URL)
    faculties: list[dict] = []
    for section in document.root.descendants("section"):
        if "programs-section" not in (section.attrs.get("class") or "").split():
            continue
        headings = section.descendants("h4")
        if not headings or not headings[0].text().lower().startswith("faculty of"):
            continue
        faculty_key = section.attrs.get("id")
        if not faculty_key:
            raise ValueError("A faculty section has no source identifier; review the site markup.")
        source = f"{final_url}#{faculty_key}"
        programs: list[dict] = []
        for item in section.descendants("li"):
            if "faculty-description" not in (item.attrs.get("class") or "").split():
                continue
            name = item.text()
            level = name.split()[0]
            if level not in {"Bachelor", "Diploma", "Certificate", "Master"}:
                raise ValueError(f"Unrecognized program level: {name}")
            programs.append({
                "key": slug(name),
                "facultyKey": faculty_key,
                "name": name,
                "level": level,
                "sourceUrl": source,
                "officialCode": None,
                "departmentKey": None,
                "durationYears": None,
                "courseUnitsStatus": "not_published_on_faculty_page",
                "courseUnits": [],
            })
        if not programs:
            raise ValueError(f"Faculty {faculty_key} has no extracted programs; review the site markup.")
        faculties.append({
            "key": faculty_key,
            "name": headings[0].text(),
            "sourceUrl": source,
            "officialCode": None,
            "departmentsStatus": "not_published_on_faculty_page",
            "departments": [],
            "programs": programs,
        })
    if not faculties:
        raise ValueError("No faculties extracted; the site markup may have changed.")
    keys = [program["key"] for faculty in faculties for program in faculty["programs"]]
    if len(keys) != len(set(keys)):
        raise ValueError("Duplicate program keys found; review the source before using this snapshot.")

    sources_checked = [{"url": final_url, "status": "fetched", **inspect_links(document, final_url)}]
    for path in ("admission.html", "apply.html", "index.html"):
        url = urljoin(final_url, path)
        try:
            related_document, related_url = fetch_document(url)
            sources_checked.append({"url": related_url, "status": "fetched", **inspect_links(related_document, related_url)})
        except Exception as error:
            sources_checked.append({"url": url, "status": "fetch_failed", "error": str(error)})

    return {
        "formatVersion": 1,
        "sourceUrl": final_url,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Published academic catalog for review before preparing database seed records.",
        "counts": {"faculties": len(faculties), "programs": len(keys), "courseUnits": 0},
        "missingPublishedFields": ["faculty codes", "departments", "program codes", "program durations", "course unit titles and codes", "credit units", "curriculum years and semesters"],
        "sourcesChecked": sources_checked,
        "faculties": faculties,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path(__file__).resolve().parents[1] / "packages/backend/seed-data/ecu-catalog.json")
    args = parser.parse_args()
    catalog = scrape_catalog()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "counts": catalog["counts"], "sourcesChecked": catalog["sourcesChecked"]}, indent=2))


if __name__ == "__main__":
    main()
