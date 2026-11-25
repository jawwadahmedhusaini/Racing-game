"""Fetch only the pinned, credited preparation inputs; never execute downloaded scripts."""
from pathlib import Path
import hashlib,json,urllib.request
ROOT=Path(__file__).resolve().parent.parent
base='https://raw.githubusercontent.com/stuntrally/blendfiles/251bc67d5ff52ce535525e144a4a1304e3b2b5ef/'
entries=[('cars/LF/LF.blend','next-cars/cars/LF/LF.blend','aea32a17aaae35d75fb7b690bee9e63410e19c88af5d80e1738d5bc9907cb538'),('cars/LF/about.txt','next-cars/cars/LF/about.txt',None),('props/buildings/skyscrapers/12Buildings.blend','next-city/12Buildings.blend','df96af8430c86cb056434b3c9b1f137d3263cf1ae0ed1dd2fde341be93637d02'),('props/buildings/skyscrapers/readme.txt','next-city/readme.txt','1ad67058c2d3d0d77570c43156c4a994d0ccc45def160b669e6a2f37fee82d5a')]
manifest=json.loads((ROOT/'public/licenses/imported-art.json').read_text())
for record in manifest['car']['textures']:entries.append((record['url'],'next-cars/textures/'+record['url'].split('/')[-1],record['sha256']))
for source,target,digest in entries:
 path=ROOT/'asset-inbox'/target;url=source if source.startswith('https:') else base+source
 data=path.read_bytes() if path.exists() else urllib.request.urlopen(url,timeout=45).read()
 if digest and hashlib.sha256(data).hexdigest()!=digest:raise ValueError('Source hash mismatch: '+target)
 path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);print(target,len(data))
(ROOT/'asset-inbox/next-cars/textures/sources.json').write_text(json.dumps(manifest['car']['textures'],indent=2)+'\n')
