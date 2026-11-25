"""Render Slipstream Signal, an original 32-bar stereo race cue at 136 BPM."""
from pathlib import Path
import subprocess
import numpy as np
from scipy.signal import butter, sosfilt

rate = 44100
beat = 60 / 136
length = round(32 * 4 * beat * rate)
mix = np.zeros((length, 2))
rng = np.random.default_rng(136)
def add(at, sound, pan=0):
    # Wrap releases across the loop boundary.
    start = round(at * beat * rate) % length
    stereo = sound[:, None] * np.sqrt([(1-pan)/2, (1+pan)/2])
    n = min(length-start, len(sound))
    mix[start:start+n] += stereo[:n]
    mix[:len(sound)-n] += stereo[n:]

def times(seconds):
    return np.arange(round(seconds*rate)) / rate

roots = [38, 38, 34, 36, 38, 41, 34, 36]
for bar in range(32):
    root = roots[bar % 8]
    freq = 440 * 2**((root-69)/12)
    for step in range(16):
        pos = bar*4 + step/4
        if step in ([0,6,10] if bar%4==3 else [0,8,11]):
            t=times(.32)
            add(pos,.76*np.sin(2*np.pi*(48*t+2.8*(1-np.exp(-t*52))))*np.exp(-t*14))
        if step in [4,12]:
            t=times(.23)
            noise=sosfilt(butter(2,[700,7800],btype='bandpass',fs=rate,output='sos'),rng.normal(size=len(t)))
            add(pos,(noise*.36*np.exp(-t*21)+.21*np.sin(2*np.pi*187*t)*np.exp(-t*32)))
        if step%2==0 or bar%8==7:
            t=times(.07 if step%4!=2 else .12)
            hat=sosfilt(butter(3,6900,btype='highpass',fs=rate,output='sos'),rng.normal(size=len(t)))
            add(pos,.115*hat*np.exp(-t*(64 if step%4 else 95)),.32 if step%4 else -.34)
        if step in [0,3,6,8,11,14]:
            t=times(.18)
            f=freq*(2 if step==14 else 1)
            add(pos,.43*np.tanh(1.6*np.sin(2*np.pi*f*t)+.32*np.sin(4*np.pi*f*t))*(1-np.exp(-t*210))*np.exp(-t*13))
        if 8<=bar<28 and step in [2,5,9,12,15]:
            t=times(.36)
            semitone=[12,19,24,15,22][[2,5,9,12,15].index(step)]
            f=freq*2**(semitone/12)
            pluck=.19*(np.sin(2*np.pi*f*t)+.38*np.sin(4*np.pi*f*t))*np.exp(-t*12)*(1-np.exp(-t*140))
            add(pos,pluck,-.3);add(pos+.75,pluck*.33,.65)
    t=times(4*beat)
    envelope=np.minimum(1,t*5)*np.minimum(1,(4*beat-t)*3)
    for voice,interval in enumerate([0,3 if root in [38,41] else 4,7]):
        f=freq*2**(1+interval/12)
        add(bar*4,.067*envelope*(np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*1.003*t)),(voice-1)*.65)
pcm=np.int16(29000*np.tanh(mix))
out=Path(__file__).resolve().parents[1]/'public/assets/audio/slipstream-signal.ogg'
subprocess.run(['ffmpeg','-loglevel','error','-y','-f','s16le','-ar',str(rate),'-ac','2','-i','-','-c:a','libvorbis','-q:a','3',str(out)],input=pcm.astype('<i2').tobytes(),check=True)
