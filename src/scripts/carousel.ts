import {CAROUSEL_DELAY,canAdvance,moveSlide,swipeDirection,type CarouselState} from '../lib/carousel-state';

export function initCarousels(){
 document.querySelectorAll<HTMLElement>('[data-carousel]').forEach(root=>{
  if(root.dataset.initialized)return;root.dataset.initialized='true';
  const slides=Array.from(root.querySelectorAll<HTMLElement>('[data-carousel-slide]'));
  const dots=Array.from(root.querySelectorAll<HTMLButtonElement>('[data-carousel-dot]'));
  const play=root.querySelector<HTMLButtonElement>('[data-carousel-play]')!;
  const announcement=root.querySelector<HTMLElement>('[data-carousel-announcement]')!;
  const viewport=root.querySelector<HTMLElement>('[data-carousel-viewport]')!;
  if(slides.length<2)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state:CarouselState={index:0,count:slides.length,userPaused:false,reducedMotion:reduced.matches,hovered:false,focused:root.contains(document.activeElement),inView:!('IntersectionObserver' in window),documentVisible:!document.hidden};
  let timer:number|undefined;
  let keyboardIntent=false;
  document.addEventListener('keydown',()=>keyboardIntent=true,{capture:true});
  root.addEventListener('pointerdown',()=>keyboardIntent=false,{capture:true});
  const schedule=()=>{window.clearTimeout(timer);if(canAdvance(state))timer=window.setTimeout(()=>{state=moveSlide(state,state.index+1);render(false);},CAROUSEL_DELAY);};
  const render=(manual:boolean)=>{
   slides[state.index].querySelectorAll<HTMLImageElement>('img[data-carousel-src]').forEach(img=>{img.loading='eager';if(img.dataset.carouselSrcset)img.srcset=img.dataset.carouselSrcset;img.src=img.dataset.carouselSrc!;img.removeAttribute('data-carousel-src');img.removeAttribute('data-carousel-srcset');});
   slides.forEach((slide,i)=>{slide.hidden=i!==state.index;slide.inert=i!==state.index;});
   dots.forEach((dot,i)=>{if(i===state.index)dot.setAttribute('aria-current','true');else dot.removeAttribute('aria-current');});
   root.querySelector('[data-carousel-position]')!.textContent=`${state.index+1} / ${state.count}`;
   play.disabled=state.reducedMotion;play.textContent=state.reducedMotion?'Autoplay off':state.userPaused?'Play slideshow':'Pause slideshow';
   play.setAttribute('aria-label',state.reducedMotion?'Automatic slideshow disabled for reduced motion':state.userPaused?'Play slideshow':'Pause slideshow');
   if(manual)announcement.textContent=`${slides[state.index].dataset.label}. Slide ${state.index+1} of ${state.count}.`;
   schedule();
  };
  const go=(index:number)=>{state=moveSlide(state,index,true);render(true);};
  root.querySelector('[data-carousel-prev]')!.addEventListener('click',()=>go(state.index-1));
  root.querySelector('[data-carousel-next]')!.addEventListener('click',()=>go(state.index+1));
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>go(i)));
  play.addEventListener('click',()=>{state.userPaused=!state.userPaused;render(false);});
  root.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){state.hovered=true;schedule();}});
  root.addEventListener('pointerleave',()=>{state.hovered=false;schedule();});
  root.addEventListener('focusin',event=>{if(keyboardIntent&&!root.contains(event.relatedTarget as Node|null))state.userPaused=true;state.focused=true;render(false);});
  root.addEventListener('focusout',event=>{state.focused=root.contains(event.relatedTarget as Node|null);schedule();});
  root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();go(state.index+(event.key==='ArrowRight'?1:-1));}});
  document.addEventListener('visibilitychange',()=>{state.documentVisible=!document.hidden;schedule();});
  reduced.addEventListener('change',()=>{state.reducedMotion=reduced.matches;render(false);});
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{state.inView=entries[0].isIntersecting&&entries[0].intersectionRatio>=.1;schedule();},{threshold:.1}).observe(root);
  let start:{x:number;y:number}|null=null;
  viewport.addEventListener('pointerdown',event=>{if(event.pointerType!=='mouse'&&!(event.target as Element).closest('a,button'))start={x:event.clientX,y:event.clientY};});
  viewport.addEventListener('pointercancel',()=>start=null);
  viewport.addEventListener('pointerup',event=>{if(!start)return;const direction=swipeDirection(event.clientX-start.x,event.clientY-start.y);start=null;if(direction)go(state.index+direction);});
  window.addEventListener('pagehide',()=>window.clearTimeout(timer));
  window.addEventListener('pageshow',schedule);
  root.querySelector<HTMLElement>('[data-carousel-controls]')!.hidden=false;
  render(false);
 });
}
