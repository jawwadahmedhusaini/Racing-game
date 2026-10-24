"""Run with python3 -m unittest discover -s tests -p 'test_asset_intake.py'."""
import importlib.util
import json
from pathlib import Path
import struct
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('intake', ROOT / 'scripts/inspect-asset.py')
intake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intake)


def glb(model):
    data = json.dumps({'asset': {'version': '2.0'}, **model}).encode()
    data += b' ' * (-len(data) % 4)
    return struct.pack('<4sIIII', b'glTF', 2, 20 + len(data), len(data), 0x4E4F534A) + data


class IntakeTests(unittest.TestCase):
    def inspect(self, data):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'candidate.glb'
            path.write_bytes(data)
            return intake.inspect(path)

    def test_scene_instances_are_counted_separately_from_unique_geometry(self):
        report = self.inspect(glb({'accessors': [{'count': 12}], 'meshes': [{'primitives': [{'attributes': {'POSITION': 0}}]}], 'nodes': [{'mesh': 0}, {'mesh': 0}], 'scenes': [{'nodes': [0, 1]}]}))
        self.assertEqual(report['activeSceneTriangles'], 8)
        self.assertEqual(report['uniqueMeshTriangles'], 4)
        self.assertFalse(report['redistributionApproved'])

    def test_truncated_chunks_are_rejected(self):
        data = bytearray(glb({}))
        struct.pack_into('<I', data, 12, 10000)
        with self.assertRaisesRegex(ValueError, 'chunk size'):
            self.inspect(data)

    def test_cycles_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Cycle'):
            self.inspect(glb({'nodes': [{'children': [0]}], 'scenes': [{'nodes': [0]}]}))

    def test_external_urls_are_reported_without_fetching(self):
        report = self.inspect(glb({'images': [{'uri': 'https://invalid.example/texture.png'}]}))
        self.assertEqual(len(report['externalDependencies']), 1)
        self.assertIsNone(report['images'][0]['embeddedBytes'])

    def test_invalid_indices_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'node mesh'):
            self.inspect(glb({'nodes': [{'mesh': -1}], 'scenes': [{'nodes': [0]}]}))

    def test_nonfinite_bounds_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Non-finite'):
            self.inspect(glb({'accessors': [{'count': 3, 'min': [float('nan'), 0, 0]}]}))

    def test_current_solstice_matches_its_manifest(self):
        manifest = json.loads((ROOT / 'public/licenses/solstice.json').read_text())
        for asset in manifest['assets']:
            report = intake.inspect(ROOT / 'public' / asset['file'])
            self.assertEqual(report['sha256'], asset['sha256'])
            self.assertEqual(report['activeSceneTriangles'], asset['triangles'])
            self.assertEqual(report['externalDependencies'], [])


if __name__ == '__main__':
    unittest.main()
