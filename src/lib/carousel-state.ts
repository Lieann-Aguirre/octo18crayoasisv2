export type CarouselState={index:number;count:number;userPaused:boolean;reducedMotion:boolean;hovered:boolean;focused:boolean;inView:boolean;documentVisible:boolean};
export const CAROUSEL_DELAY=7000;
export function canAdvance(s:CarouselState){return s.count>1&&!s.userPaused&&!s.reducedMotion&&!s.hovered&&!s.focused&&s.inView&&s.documentVisible;}
export function moveSlide(s:CarouselState,index:number,manual=false){return {...s,index:((index%s.count)+s.count)%s.count,userPaused:manual||s.userPaused};}
export function swipeDirection(dx:number,dy:number){return Math.abs(dx)>=50&&Math.abs(dx)>Math.abs(dy)*1.5?(dx<0?1:-1):0;}
