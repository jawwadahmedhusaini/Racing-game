"""Offline GLB intake report. Does not import, execute, modify or approve an asset.

Usage: python3 scripts/inspect-asset.py candidate.glb --output report.json
Counts are derived from glTF metadata, not a GPU benchmark or decoded-mesh check.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import struct

MAX_BYTES = 256 * 1024 * 1024


def inspect(path):
    path = Path(path)
    if path.stat().st_size > MAX_BYTES:
        raise ValueError('GLB exceeds the 256 MiB inspection limit')
    data = path.read_bytes()
    if len(data) < 20:
        raise ValueError('Truncated GLB header')
    magic, version, length = struct.unpack_from('<4sII', data)
    if magic != b'glTF' or version != 2 or length != len(data):
        raise ValueError('Expected a complete GLB version 2 file')
    chunks = []
    offset = 12
    while offset < length:
        if offset + 8 > length:
            raise ValueError('Truncated GLB chunk header')
        size, kind = struct.unpack_from('<II', data, offset)
        offset += 8
        if size % 4 or offset + size > length:
            raise ValueError('Invalid GLB chunk size')
        chunks.append((kind, data[offset:offset + size]))
        offset += size
    if not chunks or chunks[0][0] != 0x4E4F534A:
        raise ValueError('GLB must begin with a JSON chunk')
    if sum(kind == 0x4E4F534A for kind, _ in chunks) != 1:
        raise ValueError('Duplicate GLB JSON chunk')
    model = json.loads(chunks[0][1])
    if model.get('asset', {}).get('version') != '2.0':
        raise ValueError('Expected glTF asset version 2.0')
    binary_chunks = [content for kind, content in chunks if kind == 0x004E4942]
    if len(binary_chunks) > 1:
        raise ValueError('Duplicate GLB binary chunk')
    binary = binary_chunks[0] if binary_chunks else b''
    warnings = []
    external = []
    buffers = model.get('buffers', [])
    for i, buffer in enumerate(buffers):
        size = integer(buffer.get('byteLength'), 'buffer byteLength')
        if 'uri' in buffer:
            external.append({'kind': 'buffer', 'index': i, 'uri': buffer['uri']})
        elif i != 0 or not size <= len(binary) <= size + 3:
            raise ValueError('Embedded buffer length does not match the BIN chunk')
    views = model.get('bufferViews', [])
    for view in views:
        buffer = at(buffers, view.get('buffer'), 'bufferView buffer')
        end = integer(view.get('byteOffset', 0), 'bufferView offset') + integer(view.get('byteLength'), 'bufferView length')
        if end > buffer['byteLength']:
            raise ValueError('Buffer view exceeds its declared buffer')
    accessors = model.get('accessors', [])
    for accessor in accessors:
        integer(accessor.get('count'), 'accessor count')
        for bound in ['min', 'max']:
            if bound in accessor and not all(isinstance(v, (int, float)) and math.isfinite(v) for v in accessor[bound]):
                raise ValueError('Non-finite accessor bounds')
    meshes = []
    for mesh in model.get('meshes', []):
        triangles = 0
        for primitive in mesh.get('primitives', []):
            position = at(accessors, primitive.get('attributes', {}).get('POSITION'), 'POSITION accessor')
            count = at(accessors, primitive['indices'], 'index accessor')['count'] if 'indices' in primitive else position['count']
            mode = primitive.get('mode', 4)
            if mode == 4:
                if count % 3:
                    raise ValueError('Triangle primitive count is not divisible by three')
                triangles += count // 3
            elif mode in [5, 6]:
                triangles += max(0, count - 2)
            else:
                warnings.append('Non-triangle primitive: inspect lines/points manually')
        meshes.append({'name': mesh.get('name', ''), 'triangles': triangles, 'primitives': len(mesh.get('primitives', []))})
    nodes = model.get('nodes', [])
    scene_meshes = []
    scenes = model.get('scenes', [])
    visited = set()

    def visit(index, ancestors):
        node = at(nodes, index, 'scene node')
        if index in ancestors:
            raise ValueError('Cycle in scene hierarchy')
        if index in visited:
            raise ValueError('A node occurs more than once in the active scene')
        visited.add(index)
        if 'mesh' in node:
            scene_meshes.append(at(meshes, node['mesh'], 'node mesh'))
        for child in node.get('children', []):
            visit(child, ancestors | {index})

    if scenes:
        for node in at(scenes, model.get('scene', 0), 'active scene').get('nodes', []):
            visit(node, set())
    else:
        warnings.append('No scene is declared')
    images = []
    for i, image in enumerate(model.get('images', [])):
        item = {'name': image.get('name', ''), 'mimeType': image.get('mimeType'), 'embeddedBytes': None}
        if 'uri' in image:
            external.append({'kind': 'image', 'index': i, 'uri': image['uri']})
        elif 'bufferView' in image:
            item['embeddedBytes'] = at(views, image['bufferView'], 'image bufferView')['byteLength']
        images.append(item)
    extensions = model.get('extensionsRequired', [])
    if any(e in extensions for e in ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu']):
        warnings.append('Compressed content requires a decoder; inspect decoded geometry/textures before export')
    if external:
        warnings.append('External/data URI dependencies listed below were not opened; resolve them before integration')
    triangles = sum(mesh['triangles'] for mesh in scene_meshes)
    if triangles > 100000:
        warnings.append('Above initial 100,000-triangle detailed-car budget (not a universal scene limit)')
    if triangles > 35000:
        warnings.append('Above initial 35,000-triangle rival-car budget: prepare a separate LOD')
    if len(data) > 8 * 1024 * 1024:
        warnings.append('Above initial 8 MiB detailed-car transfer budget; inspect textures and geometry')
    return {
        'file': path.name, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
        'assetMetadata': model['asset'], 'requiredExtensions': extensions,
        'uniqueMeshTriangles': sum(mesh['triangles'] for mesh in meshes),
        'activeSceneTriangles': triangles, 'activeScenePrimitives': sum(mesh['primitives'] for mesh in scene_meshes),
        'materials': [m.get('name', '') for m in model.get('materials', [])],
        'wheelNameCandidates': [n.get('name', '') for n in nodes if re.search(r'wheel|tire|tyre|(?:^|[_\s])rim', n.get('name', ''), re.I)],
        'images': images, 'externalDependencies': external, 'meshes': meshes,
        'warnings': sorted(set(warnings)), 'redistributionApproved': False,
        'limitations': 'Metadata inspection only. No license verification, mesh decoding, rig validation, visual review, collisions or FPS measurement. Wheel names do not prove a working wheel rig.',
    }


def integer(value, label):
    if type(value) is not int or value < 0:
        raise ValueError('Invalid ' + label)
    return value


def at(items, index, label):
    integer(index, label)
    if index >= len(items):
        raise ValueError('Invalid ' + label + ' reference')
    return items[index]


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('asset', type=Path)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args()
    try:
        report = json.dumps(inspect(args.asset), indent=2, allow_nan=False) + '\n'
        if args.output:
            if args.output.resolve() == args.asset.resolve():
                raise ValueError('Report output must not overwrite the input asset')
            args.output.write_text(report)
        else:
            print(report, end='')
    except (OSError, ValueError, KeyError, TypeError, RecursionError) as error:
        parser.exit(2, f'Inspection failed: {error}\n')
