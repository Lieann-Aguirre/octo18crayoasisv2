import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

// Recolour only the supplied artwork. Pixel positions and alpha stay exact;
// originals remain untouched. No lettering is regenerated or re-typeset.
await mkdir('public/brand', { recursive: true });
const navy = [23, 59, 118], blue = [36, 94, 211], yellow = [255, 207, 86];
async function brand(source, crop, emblem, number) {
  const { data, info } = await sharp(source).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const within = (x,y,r) => x>=r[0] && y>=r[1] && x<r[2] && y<r[3];
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    const at=(y*info.width+x)*4;
    if(!data[at+3]) continue;
    let colour=navy;
    if(within(x,y,emblem)) {
      colour=blue;
      if(within(x,y,number)) {
        const light=(data[at]+data[at+1]+data[at+2])/3;
        // Preserve the source number's light/dark contours against blue.
        const amount=Math.min(1,Math.abs(light-124)/100);
        const target=light>124?yellow:navy;
        colour=blue.map((v,i)=>Math.round(v+(target[i]-v)*amount));
      }
    }
    for(let channel=0;channel<3;channel++)data[at+channel]=colour[channel];
  }
  return sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png().toBuffer();
}
const compact = await brand('assets/brand/compact-original.png',
  {left:137,top:264,width:218,height:60},[0,0,60,60],[17,16,45,44]);
const full = await brand('assets/brand/full-original.png',
  {left:87,top:174,width:325,height:144},[131,0,198,69],[146,20,182,49]);
await writeFile('public/brand/logo-compact.png', compact);
await writeFile('public/brand/logo-full.png', full);
const emblem = await sharp(compact)
  .extract({ left: 0, top: 0, width: 60, height: 60 })
  .extend({ top: 4, bottom: 4, left: 4, right: 4, background: '#00000000' })
  .png().toBuffer();
await writeFile('public/brand/emblem.png', emblem);
await sharp(emblem).resize(64, 64).png().toFile('public/favicon.png');
await sharp(emblem).resize(180, 180).png().toFile('public/apple-touch-icon.png');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#eaf1fc"/><rect width="1200" height="12" fill="#173b76"/><circle cx="1120" cy="360" r="260" fill="#ffdc75"/><g font-family="Arial"><text x="78" y="327" font-size="66" font-weight="bold" fill="#173b76">Everyday essentials.</text><text x="78" y="412" font-size="66" font-weight="bold" fill="#245ed3">Extra possibilities.</text><text x="78" y="513" font-size="28" fill="#52627c">School &amp; office supplies · Manila, Philippines</text></g></svg>`;
await writeFile('public/og-cover.svg', svg);
await sharp(Buffer.from(svg)).composite([{ input: full, left: 78, top: 62 }]).png().toFile('public/og-cover.png');
// Preserve compatibility with old bookmarks without retaining the invented logo.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 68 68"><image width="68" height="68" href="data:image/png;base64,${emblem.toString('base64')}"/></svg>`;
await writeFile('public/favicon.svg', favicon);
console.log('Prepared blue/navy supplied logos, yellow emblem details, favicon and social-sharing cover.');
