param(
  [switch]$Slice
)

# Extracts text from the exam guide PDFs into content/source/*.txt using Python + pypdf.
# Optional -Slice also writes per-domain slices for the Architect Foundations guide
# so content subagents can read a focused source instead of the whole guide.

$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'content/source'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$python = @'
import glob, os, re, sys
from pypdf import PdfReader

root = sys.argv[1]
out_dir = sys.argv[2]

def clean(t):
    if not t:
        return ''
    # Normalize ligatures and common pdf extraction artifacts
    for lig in ['ﬁ','ﬂ','ﬀ','ﬃ','ﬄ']:
        t = t.replace(lig, {'ﬁ':'fi','ﬂ':'fl','ﬀ':'ff','ﬃ':'ffi','ﬄ':'ffl'}[lig])
    t = t.replace('’', "'").replace('‘', "'")
    t = t.replace('“','"').replace('”','"')
    t = t.replace('—','--').replace('–','-')
    t = re.sub(r'[ \t]+', ' ', t)
    return t.strip()

for path in sorted(glob.glob(os.path.join(root, '*.pdf'))):
    name = os.path.splitext(os.path.basename(path))[0]
    reader = PdfReader(path)
    parts = []
    for i, page in enumerate(reader.pages):
        parts.append('\n===== PAGE %d =====\n%s' % (i+1, clean(page.extract_text() or '')))
    out_path = os.path.join(out_dir, name + '.txt')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(parts))
    print('wrote', out_path, '(%d pages)' % len(reader.pages))
'@

$tmpPy = Join-Path $env:TEMP 'extract_pdf_claude_cert.py'
Set-Content -Path $tmpPy -Value $python -Encoding UTF8
python $tmpPy $root $outDir

if ($Slice) {
  # Slice the Architect Foundations guide (domain text lives in section 6) into per-domain files.
  $slicePy = @'
import os, re, sys
root = sys.argv[1]
src = os.path.join(root, 'content/source/Claude-Certified-Architect-Foundations-Exam-Guide.txt')
text = open(src, encoding='utf-8').read()

domains = {
  'd1': ('Domain 1: Agentic Architecture & Orchestration', 'Domain 2: Tool Design & MCP Integration'),
  'd2': ('Domain 2: Tool Design & MCP Integration', 'Domain 3: Claude Code Configuration & Workflows'),
  'd3': ('Domain 3: Claude Code Configuration & Workflows', 'Domain 4: Prompt Engineering & Structured Output'),
  'd4': ('Domain 4: Prompt Engineering & Structured Output', 'Domain 5: Context Management & Reliability'),
  'd5': ('Domain 5: Context Management & Reliability', '7. How to Prepare'),
}

for key, (start, end) in domains.items():
    i = text.find(start)
    j = text.find(end)
    if i == -1 or j == -1 or j <= i:
        print('SKIP', key, 'start=%d end=%d' % (i, j))
        continue
    out = os.path.join(root, 'content/source/domain-%s.md' % key)
    open(out, 'w', encoding='utf-8').write(text[i:j].strip())
    print('wrote', out)
'@
  $tmpSlice = Join-Path $env:TEMP 'slice_pdf_claude_cert.py'
  Set-Content -Path $tmpSlice -Value $slicePy -Encoding UTF8
  python $tmpSlice $root
}
