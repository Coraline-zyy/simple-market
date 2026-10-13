"use client";
import {useId,useState,type ReactNode} from "react";

// Desktop children keep their original grid placement via display:contents.
export default function MobileHallFilters({lang,active,children}:{lang:"zh"|"en";active:boolean;children:ReactNode}){
 const [open,setOpen]=useState(false);
 const id=useId();
 return <>
  <button type="button" className="mobile-filter-toggle" aria-expanded={open} aria-controls={id} onClick={()=>setOpen(value=>!value)}>
   <span>{lang==="zh"?"筛选":"Filters"}{active?(lang==="zh"?" · 已选择":" · Applied"):""}</span><span aria-hidden="true">{open?"−":"＋"}</span>
  </button>
  <div id={id} className="hall-optional-filters" data-open={open}>{children}</div>
 </>;
}
