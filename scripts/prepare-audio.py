"""Prepare credited CC BY 4.0 Stunt Rally engine/impact samples. Requires ffmpeg.
Engine banks were rendered by CryHam using Engine Simulator, not recorded from real cars.
Immutable source hashes and adaptations are recorded alongside the distributed files.
"""
from pathlib import Path
import array, hashlib, json, math, subprocess, sys, urllib.request, wave
ROOT=Path(__file__).resolve().parent.parent
REV='fe3ecd73fff671c3d75ecaeadccea5c5e6afe0d8'
BASE=f'https://raw.githubusercontent.com/stuntrally/stuntrally3/{REV}/data/sounds/'
OUT=ROOT/'public/assets/audio'; OUT.mkdir(parents=True,exist_ok=True)
CACHE=ROOT/'asset-inbox/audio'; CACHE.mkdir(parents=True,exist_ok=True)
records=[]

def prepare(source,name,loop=False):
 data=urllib.request.urlopen(BASE+source,timeout=40).read(); raw=CACHE/Path(source).name;raw.write_bytes(data)
 pcm=subprocess.check_output(['ffmpeg','-v','error','-i',str(raw),'-ac','1','-ar','44100','-f','f32le','-'])
 a=array.array('f');a.frombytes(pcm)
 if sys.byteorder!='little':a.byteswap()
 if loop:
  # Retain up to 0.9 seconds, remove DC, crossfade the seam instead of hard cutting it.
  a=a[:39690]; n=min(1323,len(a)//8)
  a=array.array('f',a[n:-n])+array.array('f',(a[-n+i]*(1-i/n)+a[i]*i/n for i in range(n)))
 mean=sum(a)/len(a);a=array.array('f',(v-mean for v in a))
 rms=math.sqrt(sum(v*v for v in a)/len(a)); peak=max(abs(v) for v in a)
 gain=min((.19 if loop else .24)/max(rms,1e-9),.85/max(peak,1e-9))
 samples=array.array('h',(round(max(-.99,min(.99,v*gain))*32767) for v in a))
 if sys.byteorder!='little':samples.byteswap()
 dest=OUT/(name+'.wav')
 with wave.open(str(dest),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(44100);w.writeframes(samples.tobytes())
 records.append({'file':str(dest.relative_to(ROOT/'public')),'source':BASE+source,'sourceSha256':hashlib.sha256(data).hexdigest(),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'seconds':len(a)/44100,'bytes':dest.stat().st_size,'loop':loop})
 print(name,len(data),'->',dest.stat().st_size,flush=True)

for bank,rpms in {'v8f':[1,3,5,7,9],'v12d':[1,3,5,7,9],'b-v8':[1,2,4,6,7],'b-i6r':[1,3,5,7,8]}.items():
 for rpm in rpms:prepare(f'engines/{bank}-{rpm}.wav',f'{bank}-{rpm}',True)
for source,name,loop in [('crash/02.wav','impact-light',False),('crash/06.wav','impact-heavy',False),('crash/screech.wav','scrape',True)]:prepare(source,name,loop)
licenses=ROOT/'public/licenses';licenses.mkdir(exist_ok=True)
for source in ['_sounds.txt','_crash.txt']:(licenses/('stunt-rally'+source)).write_bytes(urllib.request.urlopen(BASE+source,timeout=30).read())
manifest={'license':'CC-BY-4.0','revision':REV,'engineAuthor':'CryHam','engineOrigin':'Rendered in Engine Simulator 0.1.14, edited/EQ by CryHam; not real vehicle recordings.','impactAuthors':'Halleck (original metal impacts/scraping), edited by CryHam','sourceCredits':['licenses/stunt-rally_sounds.txt','licenses/stunt-rally_crash.txt'],'licenseText':'licenses/CC-BY-4.0.txt','modifications':'Mono 44.1 kHz PCM16; removed DC; normalized gain; loop beds shortened and crossfaded at seam. In-game RPM interpolation, load filtering and spatial mixing.','assets':records}
(licenses/'audio.json').write_text(json.dumps(manifest,indent=2)+'\n')
