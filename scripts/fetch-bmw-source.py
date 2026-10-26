"""Fetch and verify the pinned CC0 BMW conversion inputs; never runs downloaded code."""
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import urlopen
import hashlib,json,argparse
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',default='/tmp/apex-assets');args=parser.parse_args()
root=Path(__file__).resolve().parent.parent;manifest=json.loads((root/'public/licenses/bmw-m3.json').read_text());out=Path(args.output);out.mkdir(parents=True,exist_ok=True)
for source in manifest['sources']:
 name=Path(urlparse(source['url']).path).name;data=urlopen(source['url'],timeout=45).read()
 if hashlib.sha256(data).hexdigest()!=source['sha256']:raise ValueError(f'Checksum mismatch: {name}')
 (out/name).write_bytes(data);print(name,len(data))
(out/'bmw-sources.json').write_text(json.dumps(manifest['sources'],indent=2)+'\n')
print('Inputs verified. Convert with Blender --disable-autoexec; see scripts/prepare-bmw.py.')
