from pathlib import Path
import json
import zipfile

root = Path(__file__).resolve().parent
version = json.loads((root / 'manifest.json').read_text())['version']
(root / 'dist').mkdir(exist_ok=True)
target = root / 'dist' / f'math100-pdf-v{version}.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in ['manifest.json', 'background.js', 'LICENSE', 'README.md', 'RELEASE_NOTES.md']:
        archive.write(root / name, f'math100-pdf/{name}')
print(target)
