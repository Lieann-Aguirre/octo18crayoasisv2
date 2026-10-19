"""Fetch source images for private visual QA; never modifies source workbooks."""
import concurrent.futures,json,pathlib,urllib.request,hashlib
from PIL import Image,ImageOps,ImageDraw
products=json.loads(pathlib.Path('data/products.json').read_text(encoding='utf-8'))
root=pathlib.Path('tmp/image-review');root.mkdir(parents=True,exist_ok=True)
urls=list(dict.fromkeys(i['url'] for p in products for i in p['images']))
def download(url):
 target=root/(hashlib.sha256(url.encode()).hexdigest()[:20]+'.jpg')
 try:
  if not target.exists():
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
   with urllib.request.urlopen(req,timeout=25) as response: data=response.read(12000000)
   target.write_bytes(data)
  with Image.open(target) as im: size=list(im.size)
  return {'url':url,'path':str(target.resolve()),'width':size[0],'height':size[1]}
 except Exception as exc:return {'url':url,'error':str(exc)}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:results=list(pool.map(download,urls))
lookup={r['url']:r for r in results};entries=[]
for p in products:
 for i,img in enumerate(p['images']):entries.append({'productId':p['id'],'name':p['name'],'index':i,'role':img['role'],**lookup[img['url']]})
(root/'manifest.json').write_text(json.dumps(entries,indent=2),encoding='utf-8')
valid=[r for r in entries if 'path' in r]
for start in range(0,len(valid),20):
 batch=valid[start:start+20];canvas=Image.new('RGB',(1500,400*((len(batch)+4)//5)),'#eef1f6');draw=ImageDraw.Draw(canvas)
 for j,r in enumerate(batch):
  x=(j%5)*300;y=(j//5)*400
  with Image.open(r['path']) as im:
   thumb=ImageOps.contain(im.convert('RGB'),(280,300));canvas.paste(thumb,(x+(300-thumb.width)//2,y+10+(300-thumb.height)//2))
  text=f"{start+j}: {r['productId']} #{r['index']} {r['role']}\n{r['width']} x {r['height']}\n{r['name'][:39]}"
  draw.multiline_text((x+8,y+320),text,fill='#16365f',spacing=5)
 canvas.save(root/f'contact-{start//20+1:02}.jpg',quality=90)
print(json.dumps({'images':len(urls),'downloaded':sum('path' in r for r in results),'failed':sum('error' in r for r in results),'sheets':(len(valid)+19)//20,'first_errors':[r for r in results if 'error' in r][:3]},indent=2))
