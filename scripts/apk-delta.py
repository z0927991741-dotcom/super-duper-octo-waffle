"""Reconstruct an already-signed APK byte for byte; never changes its signature."""
from pathlib import Path
import base64,gzip,hashlib,json,sys,zipfile
digest=lambda data:hashlib.sha256(data).hexdigest()
if sys.argv[1]=='create':
 old,new,patch=map(Path,sys.argv[2:5]);before=old.read_bytes();after=new.read_bytes();operations=[]
 with zipfile.ZipFile(old) as a,zipfile.ZipFile(new) as b:
  def ranges(archive):
   entries=sorted(archive.infolist(),key=lambda info:info.header_offset)
   return {info.filename:(info.header_offset,entries[i+1].header_offset if i+1<len(entries) else archive.start_dir) for i,info in enumerate(entries)}
  originals=ranges(a);targets=ranges(b)
  first=min(start for start,end in targets.values())
  if first:operations.append({'data':base64.b64encode(after[:first]).decode()})
  for name,(start,end) in sorted(targets.items(),key=lambda item:item[1][0]):
   previous=originals.get(name)
   if previous and before[previous[0]:previous[1]]==after[start:end]:operations.append({'copy':[previous[0],end-start]})
   else:operations.append({'data':base64.b64encode(after[start:end]).decode()})
  operations.append({'data':base64.b64encode(after[b.start_dir:]).decode()})
 payload={'baseSHA256':digest(before),'targetSHA256':digest(after),'operations':operations}
 patch.write_bytes(gzip.compress(json.dumps(payload,separators=(',',':')).encode(),mtime=0))
 print('Signed APK delta bytes:',patch.stat().st_size)
elif sys.argv[1]=='apply':
 old,patch,target=map(Path,sys.argv[2:5]);before=old.read_bytes();payload=json.loads(gzip.decompress(patch.read_bytes()))
 if digest(before)!=payload['baseSHA256']:raise RuntimeError('APK base checksum mismatch')
 result=b''.join(before[item['copy'][0]:sum(item['copy'])] if 'copy' in item else base64.b64decode(item['data'],validate=True) for item in payload['operations'])
 if digest(result)!=payload['targetSHA256']:raise RuntimeError('Reconstructed APK checksum mismatch')
 target.write_bytes(result);print('Signed APK restored with SHA256',digest(result))
else:raise SystemExit('Expected create or apply')
