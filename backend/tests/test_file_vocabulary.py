import io
import json
import sys
from pathlib import Path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app import file_vocabulary as fv  # noqa: E402


def _minimal_text_pdf(lines: list[str]) -> bytes:
    """Helvetica 한 줄씩 찍는 최소 PDF. pypdf가 텍스트를 뽑을 수 있을 만큼만 갖춘다."""
    content_lines = ["BT", "/F1 12 Tf", "14 TL", "72 720 Td"]
    for line in lines:
        escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        content_lines.append(f"({escaped}) Tj T*")
    content_lines.append("ET")
    content = "\n".join(content_lines).encode("latin-1")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length " + str(len(content)).encode() + b" >>\nstream\n" + content + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]

    out = io.BytesIO()
    out.write(b"%PDF-1.4\n")
    offsets = []
    for index, body in enumerate(objects, start=1):
        offsets.append(out.tell())
        out.write(f"{index} 0 obj\n".encode() + body + b"\nendobj\n")
    xref_offset = out.tell()
    out.write(f"xref\n0 {len(objects) + 1}\n".encode())
    out.write(b"0000000000 65535 f \n")
    for offset in offsets:
        out.write(f"{offset:010d} 00000 n \n".encode())
    out.write(f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n".encode())
    return out.getvalue()


# --- 종류 판별 ---------------------------------------------------------------


def test_detect_document_kind_uses_extension_and_signature():
    assert fv.detect_document_kind("words.csv", b"word,meaning") == "csv"
    assert fv.detect_document_kind("Words.PDF", b"%PDF-1.7\n") == "pdf"
    assert fv.detect_document_kind("list.xlsx", b"PK\x03\x04rest") == "xlsx"


@pytest.mark.parametrize(
    ("filename", "header", "detail"),
    [
        ("words.txt", b"abate", fv.UNSUPPORTED_FILE_DETAIL),
        ("words.xls", b"\xd0\xcf\x11\xe0", fv.LEGACY_EXCEL_DETAIL),
        ("fake.pdf", b"not a pdf", fv.UNSUPPORTED_FILE_DETAIL),
        ("fake.xlsx", b"not a zip", fv.UNSUPPORTED_FILE_DETAIL),
    ],
)
def test_detect_document_kind_rejects(filename, header, detail):
    with pytest.raises(fv.DocumentError) as excinfo:
        fv.detect_document_kind(filename, header)
    assert excinfo.value.detail == detail


# --- 텍스트 추출 -------------------------------------------------------------


def test_csv_text_reads_utf8_with_bom(tmp_path):
    path = tmp_path / "words.csv"
    path.write_bytes("﻿word,meaning\nabate,줄이다\ncandid,솔직한\n".encode("utf-8"))

    assert fv.extract_document_text(path, "csv") == "word\tmeaning\nabate\t줄이다\ncandid\t솔직한"


def test_csv_text_falls_back_to_cp949(tmp_path):
    path = tmp_path / "words.csv"
    path.write_bytes("abate,줄이다\n".encode("cp949"))

    assert fv.extract_document_text(path, "csv") == "abate\t줄이다"


def test_xlsx_text_joins_every_sheet_from_an_extensionless_upload(tmp_path):
    from openpyxl import Workbook

    workbook = Workbook()
    first = workbook.active
    first.title = "Day 1"
    first.append(["abate", "줄이다", None])
    first.append([None, None, None])
    second = workbook.create_sheet("Day 2")
    second.append(["candid", "솔직한"])
    # 업로드는 확장자 없는 임시 파일(`source`)로 저장된다. openpyxl 이 경로 확장자를 보지 않아야 한다.
    path = tmp_path / "source"
    workbook.save(path)

    assert fv.extract_document_text(path, "xlsx") == "abate\t줄이다\ncandid\t솔직한"


def test_broken_xlsx_is_reported(tmp_path):
    path = tmp_path / "source"
    path.write_bytes(b"PK\x03\x04 not really a workbook")

    with pytest.raises(fv.DocumentError) as excinfo:
        fv.extract_document_text(path, "xlsx")
    assert excinfo.value.detail == fv.BROKEN_FILE_DETAIL


def test_pdf_text_is_extracted(tmp_path):
    path = tmp_path / "words.pdf"
    lines = [f"{index}. word{index} meaning{index}" for index in range(1, 40)]
    path.write_bytes(_minimal_text_pdf(lines))

    text = fv.extract_document_text(path, "pdf")

    assert "word1" in text
    assert "word39" in text


def test_pdf_without_text_is_reported_as_scanned(tmp_path):
    path = tmp_path / "scan.pdf"
    path.write_bytes(_minimal_text_pdf(["only one line"]))

    with pytest.raises(fv.DocumentError) as excinfo:
        fv.extract_document_text(path, "pdf")
    assert excinfo.value.detail == fv.SCANNED_PDF_DETAIL


def test_broken_pdf_is_reported(tmp_path):
    path = tmp_path / "broken.pdf"
    path.write_bytes(b"%PDF-1.4\ngarbage")

    with pytest.raises(fv.DocumentError) as excinfo:
        fv.extract_document_text(path, "pdf")
    assert excinfo.value.detail == fv.BROKEN_FILE_DETAIL


# --- 분할 --------------------------------------------------------------------


def test_split_text_breaks_on_line_boundaries():
    text = "\n".join(["aaaa", "bbbb", "", "cccc", "dddd"])

    assert fv.split_text(text, max_chars=9) == ["aaaa\nbbbb", "cccc\ndddd"]


def test_split_text_hard_splits_a_single_long_line():
    assert fv.split_text("x" * 25, max_chars=10) == ["x" * 10, "x" * 10, "x" * 5]


def test_split_text_skips_blank_text():
    assert fv.split_text("\n\n  \n") == []


# --- Codex 결과 정리 ----------------------------------------------------------


def test_normalize_entries_trims_dedupes_and_caps():
    entries = fv.normalize_entries(
        [
            {"word": " Abate ", "meaning_ko": "  줄이다\n"},
            {"word": "abate", "meaning_ko": "다른 뜻"},
            "candid",
            {"word": "123", "meaning_ko": "숫자"},
            {"word": "", "meaning_ko": "빈"},
            {"word": "ephemeral", "meaning_ko": None},
            42,
        ],
        limit=2,
    )

    assert [entry.as_dict() for entry in entries] == [
        {"word": "Abate", "meaning_ko": "줄이다"},
        {"word": "candid", "meaning_ko": None},
    ]


def test_normalize_entries_shares_seen_across_segments():
    seen: set[str] = set()
    first = fv.normalize_entries([{"word": "abate"}], seen=seen)
    second = fv.normalize_entries([{"word": "ABATE"}, {"word": "candid"}], seen=seen)

    assert [entry.word for entry in first] == ["abate"]
    assert [entry.word for entry in second] == ["candid"]


def test_parse_extraction_output_rejects_non_object():
    with pytest.raises(fv.DocumentError) as excinfo:
        fv.parse_extraction_output("[1, 2]")
    assert excinfo.value.status_code == 502

    with pytest.raises(fv.DocumentError):
        fv.parse_extraction_output("not json")


def test_resolve_folder_name_matches_case_and_space_insensitively():
    folders = ["TOEFL", " Day 1 "]

    assert fv.resolve_folder_name("toefl", folders) == "TOEFL"
    assert fv.resolve_folder_name("day 1", folders) == " Day 1 "
    assert fv.resolve_folder_name("GRE", folders) is None
    assert fv.resolve_folder_name(None, folders) is None


def test_build_extraction_prompt_includes_context():
    prompt = fv.build_extraction_prompt(
        "abate\t줄이다",
        file_name="toefl.csv",
        segment_index=1,
        segment_count=3,
        user_message="TOEFL 폴더에 넣어줘",
        folder_names=["TOEFL"],
    )

    assert 'File name: "toefl.csv"' in prompt
    assert "part 2 of 3" in prompt
    assert '["TOEFL"]' in prompt
    assert "TOEFL 폴더에 넣어줘" in prompt
    assert "Return JSON only" in prompt
    assert prompt.endswith("TEXT:\nabate\t줄이다")


# --- 전체 흐름 -----------------------------------------------------------------


def test_extract_vocabulary_merges_segments_in_order(tmp_path, monkeypatch):
    monkeypatch.setattr(fv, "SEGMENT_CHARS", 20)
    path = tmp_path / "words.csv"
    path.write_text("abate,줄이다\ncandid,솔직한\nephemeral,덧없는\n", encoding="utf-8")

    prompts: list[str] = []

    def fake_run(prompt: str) -> str:
        prompts.append(prompt)
        segment = prompt.rsplit("TEXT:\n", 1)[1]
        entries = []
        for line in segment.splitlines():
            word, meaning = line.split("\t")
            entries.append({"word": word, "meaning_ko": meaning})
        # 첫 조각만 폴더 이름을 제안하고, 두 번째 조각이 다른 제안을 해도 첫 것을 지킨다.
        suggested = "TOEFL Day 1" if len(prompts) == 1 else "Other"
        return json.dumps({
            "entries": entries + [{"word": "ABATE", "meaning_ko": "중복"}],
            "suggested_folder_name": suggested,
            "target_folder_name": "toefl",
        })

    result = fv.extract_vocabulary_from_document(
        path,
        "csv",
        file_name="words.csv",
        user_message="TOEFL 폴더에 넣어줘",
        folder_names=["TOEFL"],
        run=fake_run,
    )

    assert len(prompts) == 2
    assert [entry.as_dict() for entry in result.entries] == [
        {"word": "abate", "meaning_ko": "줄이다"},
        {"word": "candid", "meaning_ko": "솔직한"},
        {"word": "ephemeral", "meaning_ko": "덧없는"},
    ]
    assert result.suggested_folder_name == "TOEFL Day 1"
    assert result.target_folder_name == "TOEFL"


def test_extract_vocabulary_stops_at_entry_cap(tmp_path, monkeypatch):
    monkeypatch.setattr(fv, "MAX_ENTRIES", 3)
    monkeypatch.setattr(fv, "SEGMENT_CHARS", 12)
    path = tmp_path / "words.csv"
    path.write_text("\n".join(f"word{index}" for index in range(10)), encoding="utf-8")

    calls = 0

    def fake_run(prompt: str) -> str:
        nonlocal calls
        calls += 1
        segment = prompt.rsplit("TEXT:\n", 1)[1]
        return json.dumps({"entries": [{"word": word} for word in segment.splitlines()]})

    result = fv.extract_vocabulary_from_document(
        path, "csv", file_name="words.csv", user_message=None, folder_names=[], run=fake_run
    )

    assert len(result.entries) == 3
    assert calls < 5


def test_extract_vocabulary_reports_no_words(tmp_path):
    path = tmp_path / "words.csv"
    path.write_text("1,2\n3,4\n", encoding="utf-8")

    with pytest.raises(fv.DocumentError) as excinfo:
        fv.extract_vocabulary_from_document(
            path,
            "csv",
            file_name="words.csv",
            user_message=None,
            folder_names=[],
            run=lambda prompt: '{"entries":[{"word":"12"}]}',
        )
    assert excinfo.value.detail == fv.NO_WORDS_DETAIL


def test_extract_vocabulary_reports_invalid_codex_json(tmp_path):
    path = tmp_path / "words.csv"
    path.write_text("abate,줄이다\n", encoding="utf-8")

    with pytest.raises(fv.DocumentError) as excinfo:
        fv.extract_vocabulary_from_document(
            path, "csv", file_name="words.csv", user_message=None, folder_names=[], run=lambda prompt: "nope"
        )
    assert excinfo.value.detail == fv.INVALID_CODEX_JSON_DETAIL


# --- 업로드 저장 ---------------------------------------------------------------


class _FakeUpload:
    def __init__(self, filename: str, data: bytes) -> None:
        self.filename = filename
        self._stream = io.BytesIO(data)
        self.closed = False

    async def read(self, size: int) -> bytes:
        return self._stream.read(size)

    async def close(self) -> None:
        self.closed = True


@pytest.mark.anyio
async def test_save_validated_document_upload_writes_file(tmp_path):
    upload = _FakeUpload("words.csv", b"abate,\xec\xa4\x84\xec\x9d\xb4\xeb\x8b\xa4\n")
    destination = tmp_path / "source"

    kind = await fv.save_validated_document_upload(upload, destination)

    assert kind == "csv"
    assert destination.read_bytes().startswith(b"abate,")
    assert upload.closed


@pytest.mark.anyio
async def test_save_validated_document_upload_rejects_too_large(tmp_path):
    upload = _FakeUpload("words.csv", b"a" * 20)
    destination = tmp_path / "source"

    with pytest.raises(fv.DocumentError) as excinfo:
        await fv.save_validated_document_upload(upload, destination, max_size=10)

    assert excinfo.value.status_code == 413
    assert not destination.exists()
    assert upload.closed


@pytest.mark.anyio
async def test_save_validated_document_upload_rejects_empty_file(tmp_path):
    upload = _FakeUpload("words.csv", b"")
    destination = tmp_path / "source"

    with pytest.raises(fv.DocumentError) as excinfo:
        await fv.save_validated_document_upload(upload, destination)

    assert excinfo.value.detail == fv.BROKEN_FILE_DETAIL
    assert not destination.exists()
