
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,X} from 'lucide-react';
export const tourSteps=[
 {target:'import',tab:'edit',title:'先匯入你的原稿',text:'點這個匯入按鈕，選擇 Word、PDF 或文字檔；也能直接貼上內容。確認原文後才會取代草稿。'},
 {target:'chapters',tab:'chapters',title:'選擇要修改的章節',text:'匯入後，可從「章節」打開導覽抽屜。點選章節即可切換正文，抽屜會自動收合。'},
 {target:'body',tab:'edit',title:'在正文區直接編輯',text:'在這裡輸入或修改正文。要針對一小段提出修改要求，可以先反白那段文字。'},
 {target:'prompt',tab:'prompt',title:'在這裡寫下修改要求',text:'例如「保留原意，改成正式語氣」。也可以點選下方範例快速填入。AI 尚未連線時不會修改正文。'},
 {target:'export',tab:'edit',title:'完成後匯出全文',text:'這裡會下載包含所有章節的 Word。修改會自動保存在這個瀏覽器，可隨時重新開啟導覽。'}
];
export default function WorkspaceTour({step,onStep,onClose}:{step:number;onStep:(n:number)=>void;onClose:()=>void}){
 const [box,setBox]=useState<{left:number;top:number;width:number;height:number;cardLeft:number;cardTop:number;cardWidth:number;below:boolean}|null>(null);
 const card=useRef<HTMLDivElement>(null),current=tourSteps[step];
 useEffect(()=>{
  let frame=0;
  const target=document.querySelector<HTMLElement>('[data-tour="'+current.target+'"]');
  target?.scrollIntoView({block:'nearest',behavior:'instant'});
  function measure(){const el=document.querySelector<HTMLElement>('[data-tour="'+current.target+'"]');if(!el)return;const r=el.getBoundingClientRect();const w=Math.min(330,innerWidth-32),h=card.current?.offsetHeight||226;const top=Math.max(8,r.top),bottom=Math.min(innerHeight-8,r.bottom);const below=bottom+h+28<innerHeight;const cardTop=below?bottom+24:top-h-24>8?top-h-24:Math.max(12,innerHeight-h-16);setBox({left:Math.max(5,r.left-5),top:top-5,width:Math.min(r.width+10,innerWidth-10),height:Math.max(20,bottom-top+10),cardLeft:Math.max(16,Math.min(innerWidth-w-16,r.left+r.width/2-w/2)),cardTop,cardWidth:w,below});}
  frame=requestAnimationFrame(()=>{measure();card.current?.focus({preventScroll:true});});
  window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);
  function key(e:KeyboardEvent){if(e.key==='Escape')onClose();}
  window.addEventListener('keydown',key);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);window.removeEventListener('keydown',key);};
 },[step,current.target]);
 const tipX=box?box.left+box.width/2:0,tipY=box?(box.below?box.top+box.height:box.top):0;
 const lineX=box?box.cardLeft+box.cardWidth/2:0,lineY=box?(box.below?box.cardTop:box.cardTop+(card.current?.offsetHeight||226)):0;
 return <>{box&&<><div className="bp-tour-spotlight" style={{left:box.left,top:box.top,width:box.width,height:box.height}}/><svg className="bp-tour-arrow" aria-hidden="true"><defs><marker id="bp-arrow-tip" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6" fill="none" stroke="#2563d9" strokeWidth="1.5"/></marker></defs><path d={'M '+lineX+' '+lineY+' L '+tipX+' '+tipY} stroke="#2563d9" strokeWidth="2.5" fill="none" markerEnd="url(#bp-arrow-tip)"/></svg></>}
 <div ref={card} tabIndex={-1} role="dialog" aria-label="操作導覽" className="bp-tour-card" style={box?{left:box.cardLeft,top:box.cardTop,width:box.cardWidth}:{left:16,top:120,width:Math.min(330,innerWidth-32)}}>
 <div className="bp-tour-top"><span>操作導覽 · {step+1} / {tourSteps.length}</span><button aria-label="關閉導覽" onClick={onClose}><X size={16}/></button></div><h2>{current.title}</h2><p>{current.text}</p><footer><button onClick={onClose}>略過導覽</button><div>{step>0&&<button onClick={()=>onStep(step-1)}>上一步</button>}<button className="bp-primary" onClick={()=>step===tourSteps.length-1?onClose():onStep(step+1)}>{step===tourSteps.length-1?'開始使用':'下一步'}<ArrowRight size={15}/></button></div></footer></div></>;
}
