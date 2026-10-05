export type TaskTime = {
  task_starts_at?: string | null; task_ends_at?: string | null; task_date_only?: boolean;
  task_schedule_v2?: boolean; task_date_from?: string | null; task_date_to?: string | null;
  task_time_from?: string | null; task_time_to?: string | null; task_timezone?: string | null;
};
export const TASK_TIME_COLUMNS = "task_starts_at, task_ends_at, task_date_only, task_schedule_v2, task_date_from, task_date_to, task_time_from, task_time_to, task_timezone";
export type TimeRange = { dates: boolean; times: boolean; dateFrom: string; dateTo: string; timeFrom: string; timeTo: string; timezone?: string };
export const ANY_TIME: TimeRange = { dates: false, times: false, dateFrom: "", dateTo: "", timeFrom: "", timeTo: "" };
export function localTimezone() { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}
function validClock(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
export function timePayload(range: TimeRange): TaskTime {
  if (range.dates && (!validDate(range.dateFrom) || !validDate(range.dateTo) || range.dateTo < range.dateFrom)) throw new Error("Invalid date range");
  if (range.times && (!validClock(range.timeFrom) || !validClock(range.timeTo) || range.timeFrom === range.timeTo)) throw new Error("Invalid daily time range");
  const timezone = range.timezone || localTimezone();
  new Intl.DateTimeFormat("en", {timeZone:timezone}); // Reject unknown time zones.
  return { task_starts_at:null, task_ends_at:null, task_date_only:false, task_schedule_v2:true,
    task_date_from:range.dates ? range.dateFrom : null, task_date_to:range.dates ? range.dateTo : null,
    task_time_from:range.times ? range.timeFrom : null, task_time_to:range.times ? range.timeTo : null, task_timezone:timezone };
}
const day = (date:string) => Date.parse(date + "T00:00:00Z") / 86400000;
const minute = (time:string) => Number(time.slice(0,2))*60 + Number(time.slice(3,5));
function bounds(range:TimeRange) {
  const from = range.times ? minute(range.timeFrom) : 0;
  let to = range.times ? minute(range.timeTo) : 1440;
  if (range.times && to < from) to += 1440;
  return {lo:range.dates?day(range.dateFrom):-Infinity, hi:range.dates?day(range.dateTo):Infinity, from, to};
}
function localCivilMinutes(value:string) {
  const date=new Date(value);
  return Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/60000 + date.getHours()*60 + date.getMinutes() + date.getSeconds()/60;
}
export function overlapsTime(task: TaskTime, range: TimeRange): boolean {
  try {
    timePayload(range);
    if (!range.dates && !range.times) return true;
    if (!task.task_schedule_v2 && task.task_starts_at && task.task_ends_at) {
      // Preserve legacy continuous intervals, including multi-day overnight spans.
      const start=localCivilMinutes(task.task_starts_at), end=localCivilMinutes(task.task_ends_at), b=bounds(range);
      const lo=Math.max(b.lo,Math.floor(start/1440)-1), hi=Math.min(b.hi,Math.floor(end/1440));
      if(lo>hi)return false;
      return [lo,lo+1,hi].some(d=>d<=hi && d*1440+b.from<=end && d*1440+b.to>=start);
    }
    const aRange=rangeFromTask(task);timePayload(aRange);
    const a=bounds(aRange),b=bounds(range);
    // Civil date/time filtering matches the schedule as displayed, without
    // silently changing a publisher's recurring hours into another time zone.
    return [-1,0,1].some(shift =>
      a.from+shift*1440<=b.to && a.to+shift*1440>=b.from &&
      Math.max(b.lo,a.lo-shift)<=Math.min(b.hi,a.hi-shift));
  } catch { return false; }
}
export function rangeFromTask(task: TaskTime): TimeRange {
  if (task.task_schedule_v2) return { dates:!!task.task_date_from, times:!!task.task_time_from,
    dateFrom:task.task_date_from??"", dateTo:task.task_date_to??"",
    timeFrom:task.task_time_from?.slice(0,5)??"", timeTo:task.task_time_to?.slice(0,5)??"", timezone:task.task_timezone??localTimezone() };
  if (!task.task_starts_at || !task.task_ends_at) return {...ANY_TIME};
  const localInput=(value:string)=>{const date=new Date(value);return new Date(date.getTime()-date.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const start=localInput(task.task_starts_at),end=localInput(task.task_ends_at);
  return {dates:true,times:!task.task_date_only,dateFrom:start.slice(0,10),dateTo:end.slice(0,10),
    timeFrom:task.task_date_only?"":start.slice(11),timeTo:task.task_date_only?"":end.slice(11),timezone:localTimezone()};
}
export function formatTaskTime(task: TaskTime, lang:"zh"|"en"):string {
  const zh=lang==="zh";
  if(!task.task_schedule_v2){
    if(!task.task_starts_at||!task.task_ends_at)return zh?"时间不限":"Flexible timing";
    const locale=zh?"zh-CN":"en-GB";
    const format=(value:string)=>task.task_date_only?new Date(value).toLocaleDateString(locale):new Date(value).toLocaleString(locale,{year:"numeric",month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"});
    return format(task.task_starts_at)+" – "+format(task.task_ends_at);
  }
  const r=rangeFromTask(task);
  if(!r.dates&&!r.times)return zh?"时间不限":"Flexible timing";
  const dates=r.dates?(r.dateFrom===r.dateTo?r.dateFrom:r.dateFrom+" – "+r.dateTo):(zh?"每天":"Every day");
  const times=r.times?r.timeFrom+" – "+r.timeTo+(r.timeTo<r.timeFrom?(zh?"（次日）":" (next day)"):""):(zh?"全天":"All day");
  return dates+" · "+times+(r.times&&task.task_timezone?" · "+task.task_timezone:"");
}
