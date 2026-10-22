"""Convert BabylonJS/Assets trees to compact right-handed, material-grouped LODs.
Usage: python3 scripts/prepare-vegetation.py /tmp/rawtrees.babylon
Source, license and SHA-256 are documented in ASSET_LICENSES.md.
"""
import hashlib
import json
from pathlib import Path
import sys

source=Path(sys.argv[1] if len(sys.argv)>1 else '/tmp/rawtrees.babylon')
assert hashlib.sha256(source.read_bytes()).hexdigest()=='ca542e1e4815b8b3e6144a611892f46dbfb6fddb13bbdfc3198873683d0c0e23', 'Unexpected source asset'
data=json.loads(source.read_text())
materials={m['id']:m['name'] for m in data['materials']}
multi={m['id']:m['materials'] for m in data['multiMaterials']}
result={}
for label,name in [('near','Tree1_LOD1'),('far','Tree1_LOD2')]:
    mesh=next(m for m in data['meshes'] if m['name']==name)
    converted={}
    for key in ['positions','normals']:
        converted[key]=[round(-value if i%3==2 else value,5) for i,value in enumerate(mesh[key])]
    converted['uvs']=[round(value,6) for value in mesh['uvs']]
    groups={'bark':[],'leaf':[]}
    for sub in mesh['subMeshes']:
        material=materials[multi[mesh['materialId']][sub['materialIndex']]]
        indices=mesh['indices'][sub['indexStart']:sub['indexStart']+sub['indexCount']]
        target=groups['bark' if material.startswith('Branches') else 'leaf']
        for i in range(0,len(indices),3):
            target.extend([indices[i],indices[i+2],indices[i+1]])
    converted['groups']=groups
    result[label]=converted
output=Path(__file__).resolve().parent.parent/'public/assets/vegetation.json'
output.write_text(json.dumps(result,separators=(',',':')))
print(output.name,output.stat().st_size,hashlib.sha256(output.read_bytes()).hexdigest())
