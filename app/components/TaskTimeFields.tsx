"use client";
import { TimeRange, localTimezone } from "@/lib/taskTime";
import CalendarRangePicker, {todayDate} from "@/app/components/CalendarRangePicker";
import TimeWheelPicker from "@/app/components/TimeWheelPicker";
export default function TaskTimeFields({value,onChange,lang,filter=false}:{value:TimeRange;onChange:(value:TimeRange)=>void;lang:"zh"|"en";filter?:boolean}){
 const zh=lang==="zh",zone=value.timezone||localTimezone();
 const update=(patch:Partial<TimeRange>)=>onChange({...value,timezone:zone,...patch});
 const content=<div className="min-w-0 space-y-3">
  <div className="flex flex-wrap gap-4 text-sm">
   <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={value.dates} onChange={e=>update({dates:e.target.checked,dateFrom:e.target.checked?(value.dateFrom||todayDate()):"",dateTo:e.target.checked?(value.dateTo||todayDate()):""})} className="accent-violet-500"/>{zh?"选择日期":"Choose dates"}</label>
   <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={value.times} onChange={e=>update({times:e.target.checked,timeFrom:e.target.checked?(value.timeFrom||"09:00"):"",timeTo:e.target.checked?(value.timeTo||"18:00"):""})} className="accent-violet-500"/>{zh?"选择时间":"Choose hours"}</label>
   <button type="button" onClick={()=>onChange({dates:false,times:false,dateFrom:"",dateTo:"",timeFrom:"",timeTo:"",timezone:zone})} className="text-xs text-violet-300 hover:underline">{zh?"重置为不限":"Reset to any time"}</button>
  </div>
  {value.dates&&<CalendarRangePicker from={value.dateFrom} to={value.dateTo} onChange={(dateFrom,dateTo)=>update({dateFrom,dateTo})} lang={lang}/>}
  {value.times&&<div className="grid grid-cols-2 gap-2"><TimeWheelPicker value={value.timeFrom} onChange={timeFrom=>update({timeFrom})} lang={lang} label={zh?"开始时间":"From"}/><TimeWheelPicker value={value.timeTo} onChange={timeTo=>update({timeTo})} lang={lang} label={zh?"结束时间":"Until"}/></div>}
  <p className="text-xs leading-5 text-zinc-500">{!value.dates&&!value.times?(zh?"日期和时间均不限。":"Any date and any hour."):value.dates&&!value.times?(zh?"所选日期区间内，全天都可以。":"Available all day within the selected dates."):!value.dates&&value.times?(zh?"每天都可以，限所选时段。":"Available every day during the selected hours."):(zh?"所选日期区间内，每天限所选时段。":"Available during these hours each day within the selected dates.")}{value.times&&value.timeTo<value.timeFrom?(zh?" 结束时间为次日。":" Ends the next day."):""}</p>
  {filter?<p className="text-xs text-zinc-500">{zh?"按任务显示的日期和当地钟点筛选，包含时间不限的任务，不换算时区。":"Matches the displayed dates and local hours, including flexible tasks. No time-zone conversion."}</p>:<p className="text-xs text-zinc-500">{zh?"当地时区：":"Local time zone: "}{zone}</p>}
 </div>;
 return filter?<details className="relative"><summary className="cursor-pointer list-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2">{!value.dates&&!value.times?(zh?"时间：不限":"Time: Any"):(zh?"时间区间":"Schedule")} ▾</summary><div className="absolute right-0 top-full z-20 mt-2 max-h-[70vh] w-[min(470px,85vw)] overflow-y-auto rounded-xl border border-zinc-700 bg-[#11131e] p-4 shadow-xl">{content}</div></details>:<fieldset className="min-w-0 rounded-xl border border-zinc-800 p-4"><legend className="px-2 text-sm text-zinc-400">{zh?"任务时间":"Task timing"}</legend>{content}</fieldset>
}
