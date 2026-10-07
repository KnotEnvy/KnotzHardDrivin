"""Trim the in-engine capture and export browser-compatible showcase movies."""
from pathlib import Path
import json
import shutil
import subprocess

root=Path('artifacts/water')
metadata=json.loads((root/'motion.json').read_text(encoding='utf8'))
ffmpeg=shutil.which('ffmpeg') or r'C:/Program Files/ffmpeg/bin/ffmpeg.exe'
raw=metadata['raw']
# Recorded-video timestamps can drift from wall time during shader compilation.
# Locate the actual cinematic views against their captured reference images.
pixels=64*40
frames=subprocess.check_output([ffmpeg,'-v','error','-i',raw,'-vf','fps=2,scale=64:40,format=gray','-f','rawvideo','-pix_fmt','gray','pipe:1'])
references={kind:subprocess.check_output([ffmpeg,'-v','error','-i',str(root/f'motion-{kind}.png'),'-vf','scale=64:40,format=gray','-f','rawvideo','-pix_fmt','gray','pipe:1']) for kind in ['water','shore','drive']}
timeline=[]
for i in range(len(frames)//pixels):
 frame=frames[i*pixels:(i+1)*pixels]
 differences={kind:sum(abs(a-b) for a,b in zip(frame,ref))/pixels for kind,ref in references.items()}
 kind=min(differences,key=differences.get)
 timeline.append({'time':i/2,'kind':kind,'difference':round(differences[kind],2)})
matches={kind:[row for row in timeline if row['kind']==kind and row['difference']<16] for kind in references}
if any(not rows for rows in matches.values()):
 raise RuntimeError('A cinematic view could not be located in the recording. Inspect video-timeline.json before exporting.')
(root/'video-timeline.json').write_text(json.dumps({'raw':raw,'frames':timeline},indent=2),encoding='utf8')
start=matches['water'][0]['time']
end=matches['drive'][-1]['time']+.5
duration=end-start
if not all(start<=rows[0]['time']<end for rows in matches.values()):
 raise RuntimeError('Cinematic scene order is inconsistent; inspect the recording.')
base=[ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(start),'-i',raw,'-t',str(duration),'-an']
subprocess.run(base+['-c:v','libx264','-preset','fast','-crf','24','-pix_fmt','yuv420p','-movflags','+faststart',str(root/'water-showcase.mp4')],check=True)
subprocess.run(base+['-c:v','libvpx-vp9','-cpu-used','5','-row-mt','1','-b:v','0','-crf','35',str(root/'water-showcase.webm')],check=True)
for seconds in [1,5,9,14,20]:
 subprocess.run([ffmpeg,'-y','-hide_banner','-loglevel','error','-ss',str(seconds),'-i',str(root/'water-showcase.mp4'),'-frames:v','1',str(root/f'film-frame-{seconds}.png')],check=True)
metadata['movie']={'file':'water-showcase.mp4','webm':'water-showcase.webm','duration':duration,'bytes':(root/'water-showcase.mp4').stat().st_size,'webmBytes':(root/'water-showcase.webm').stat().st_size,'rawStart':start,'rawEnd':end,'scenes':{kind:{'start':rows[0]['time'],'end':rows[-1]['time']+.5} for kind,rows in matches.items()}}
(root/'motion.json').write_text(json.dumps(metadata,indent=2),encoding='utf8')
print(json.dumps(metadata['movie']))
