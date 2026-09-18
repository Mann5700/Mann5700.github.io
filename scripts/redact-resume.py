"""
Publishes a phone-free copy of the resume.

The working copy at the repo root keeps your full contact details. The copy
served from public/resume/ has the phone number *removed from the PDF content
stream* (not covered over), and the remaining header line is re-centred so it
still looks typeset rather than edited.

Usage:
    python scripts/redact-resume.py                 # root PDF -> public/resume/
    python scripts/redact-resume.py in.pdf out.pdf

Requires PyMuPDF:  pip install pymupdf
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit("PyMuPDF is not installed. Run: pip install pymupdf")

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IN = ROOT / "Mann Patel Resume.pdf"
DEFAULT_OUT = ROOT / "public" / "resume" / "Mann-Patel-Resume.pdf"

# North American numbers in the shapes a resume header actually uses.
PHONE = re.compile(r"(\+?\d{1,2}[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}")

# Word stamps the authoring machine's account name ("Surname Given (EMPLOYEEID)")
# into the document info dictionary, so the published copy gets its own.
CLEAN_META = {
    "author": "Mann Patel",
    "title": "Mann Patel \u2014 Resume",
    "subject": "",
    "keywords": "",
    "creator": "",
    "producer": "",
    "creationDate": "",
    "modDate": "",
}

# Reproduces the inter-span rhythm of the original header line.
SPAN_GAP = 2.1

LINK_HINTS = (
    ("@", "mailto:"),
    ("github", "github.com"),
    ("linkedin", "linkedin.com"),
)


def find_phone_line(page: fitz.Page):
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            if any(PHONE.search(span["text"]) for span in line["spans"]):
                return line
    return None


def scrub_metadata(doc: fitz.Document) -> None:
    doc.del_xml_metadata()
    doc.set_metadata(CLEAN_META)


def assert_clean(dst: Path) -> None:
    out = fitz.open(dst)

    remaining = PHONE.search(out[0].get_text())
    if remaining:
        sys.exit(f"FAILED: a phone number is still present: {remaining.group(0)}")

    leaked = {
        key: value
        for key, value in out.metadata.items()
        if key in CLEAN_META and (value or "") != CLEAN_META[key]
    }
    if leaked:
        sys.exit(f"FAILED: PDF metadata was not scrubbed: {leaked}")

    print(f"Wrote {dst.relative_to(ROOT)} — no phone number, no authoring metadata.")


def keep_spans(spans: list[dict]) -> list[dict]:
    """Drops the phone span plus the separator that immediately follows it."""
    index = next(i for i, s in enumerate(spans) if PHONE.search(s["text"]))
    drop = {index}
    for j in (index + 1, index + 2):
        if j < len(spans) and spans[j]["text"].strip() in ("|", "", "·", "-"):
            drop.add(j)
    return [s for i, s in enumerate(spans) if i not in drop]


def load_fonts(doc: fitz.Document, page: fitz.Page, needed: set[str]):
    """Returns {span font name: (alias, buffer, fitz.Font)} using the PDF's own fonts."""
    out: dict[str, tuple[str, bytes, fitz.Font]] = {}
    for index, info in enumerate(page.get_fonts()):
        xref, basefont = info[0], info[3]
        name = basefont.split("+")[-1]
        if name in needed and name not in out:
            buffer = doc.extract_font(xref)[3]
            out[name] = (f"rf{index}", buffer, fitz.Font(fontbuffer=buffer))
    missing = needed - out.keys()
    if missing:
        sys.exit(f"Could not extract embedded font(s): {', '.join(sorted(missing))}")
    return out


def link_for(text: str, links: list[dict]) -> str | None:
    lowered = text.strip().lower()
    for hint, marker in LINK_HINTS:
        if hint in lowered:
            for link in links:
                uri = link.get("uri", "")
                if marker in uri.lower():
                    return uri
    return None


def render_previews(pdf: Path) -> None:
    """Rasterises the *redacted* PDF so the on-site viewer can never show the
    phone number even if the wrong file is previewed."""
    out = ROOT / "assets-src" / "resume-preview"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("page-*.png"):
        old.unlink()

    doc = fitz.open(pdf)
    for index, page in enumerate(doc, start=1):
        page.get_pixmap(dpi=200).save(out / f"page-{index}.png")
    print(f"Rendered {doc.page_count} preview page(s) to assets-src/resume-preview/")


def redact(src: Path, dst: Path) -> None:
    doc = fitz.open(src)
    page = doc[0]

    line = find_phone_line(page)
    if line is None:
        print(f"No phone number found in {src.name} — copying as is.")
        dst.parent.mkdir(parents=True, exist_ok=True)
        scrub_metadata(doc)
        doc.save(dst, garbage=4, deflate=True)
        assert_clean(dst)
        render_previews(dst)
        return

    spans = line["spans"]
    kept = keep_spans(spans)
    baseline = max(s["origin"][1] for s in spans)
    links = page.get_links()

    fonts = load_fonts(doc, page, {s["font"] for s in kept})
    widths = [fonts[s["font"]][2].text_length(s["text"], s["size"]) for s in kept]

    gaps = [0.0]
    for previous in kept[:-1]:
        gaps.append(0.0 if previous["text"].strip() == "|" else SPAN_GAP)

    total = sum(widths) + sum(gaps)
    cursor = (page.rect.width - total) / 2

    x0, y0, x1, y1 = line["bbox"]
    area = fitz.Rect(x0 - 1, y0 - 0.6, x1 + 1, y1 + 0.6)

    # Remove the old line and every link annotation sitting on it.
    for link in links:
        if fitz.Rect(link["from"]).intersects(area):
            page.delete_link(link)
    page.add_redact_annot(area)
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)

    # Redaction rewrites the page resources, so fonts are registered afterwards.
    for alias, buffer, _ in fonts.values():
        page.insert_font(fontname=alias, fontbuffer=buffer)

    for span, width, gap in zip(kept, widths, gaps):
        cursor += gap
        alias = fonts[span["font"]][0]
        colour = fitz.sRGB_to_pdf(span["color"])
        page.insert_text(
            (cursor, baseline),
            span["text"],
            fontname=alias,
            fontsize=span["size"],
            color=colour,
        )
        uri = link_for(span["text"], links)
        if uri:
            page.insert_link(
                {
                    "kind": fitz.LINK_URI,
                    "from": fitz.Rect(cursor, y0, cursor + width, y1),
                    "uri": uri,
                }
            )
        cursor += width

    dst.parent.mkdir(parents=True, exist_ok=True)
    scrub_metadata(doc)
    doc.save(dst, garbage=4, deflate=True)

    assert_clean(dst)

    render_previews(dst)


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_IN
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUT
    if not source.exists():
        sys.exit(f"Source PDF not found: {source}")
    redact(source, target)
