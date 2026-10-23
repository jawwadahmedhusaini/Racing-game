"""Package a previously verified production build and the editable source."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil
import hashlib

root=Path(__file__).resolve().parent.parent
release=root/'artifacts'/'release'
release.mkdir(parents=True, exist_ok=True)
web=release/'web'
if web.exists():
    shutil.rmtree(web)
shutil.copytree(root/'dist',web)
for source in (root/'scripts'/'release').iterdir():
    if source.is_file():
        shutil.copy2(source,release/source.name)
with ZipFile(root/'artifacts'/'apex-rush-web.zip','w',ZIP_DEFLATED,compresslevel=8) as archive:
    for file in sorted(release.rglob('*')):
        if file.is_file():
            archive.write(file,Path('APEX-RUSH')/file.relative_to(release))
with ZipFile(root/'artifacts'/'apex-rush-source.zip','w',ZIP_DEFLATED,compresslevel=8) as archive:
    for name in ['src','public','scripts','tests']:
        for file in sorted((root/name).rglob('*')):
            if file.is_file() and '__pycache__' not in file.parts:
                archive.write(file,Path('Racing-game')/file.relative_to(root))
    for file in sorted(root.iterdir()):
        if file.is_file() and (file.suffix in ['.md','.json','.ts','.html'] or file.name=='.gitignore'):
            archive.write(file,Path('Racing-game')/file.name)
    evidence = ['unit-results.json','browser-results.json','dependency-audit.json','performance.json','production-smoke.json','hosting-smoke.json','visual-review.json',
                'garage-final.png','spectre-final.png','stratos-final.png','garage-final.jpg','ultra-garage.png','coast-start.png','coast-final.png','city-final.png','mobile-garage.png','mobile-race.png','results.png','production-race.png']
    for name in evidence:
        file=root/'artifacts'/name
        if file.exists():
            archive.write(file,Path('Racing-game')/'artifacts'/name)
checksums=[]
for name in ['apex-rush-web.zip','apex-rush-source.zip']:
    path=root/'artifacts'/name
    with ZipFile(path) as archive:
        assert archive.testzip() is None
        print(name,path.stat().st_size,'bytes',len(archive.namelist()),'files')
    checksums.append(f'{hashlib.sha256(path.read_bytes()).hexdigest()}  {name}')
(root/'artifacts'/'SHA256SUMS.txt').write_text('\n'.join(checksums)+'\n')
