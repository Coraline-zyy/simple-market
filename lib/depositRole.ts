// A conversation's owner_id is its initiator, NOT necessarily the task publisher.
// Never change cooperation confirmation roles to fix deposit display.
export function depositPresentation(uid:string|null,publisherId:string|null|undefined,amount:number|null|undefined,lang:"zh"|"en") {
 const zh=lang==="zh";
 if(!uid || !publisherId || amount==null || !Number.isFinite(amount) || amount<0)
  return {label:zh?"押金信息暂不可用":"Deposit information unavailable",status:zh?"当前状态：待确认":"Status: Unknown",role:"unknown"};
 if(amount===0) return {label:zh?"此任务无需押金":"No deposit required",status:zh?"当前状态：无需支付":"Status: Not required",role:"none"};
 if(uid===publisherId) return {label:zh?"您无需支付押金":"No deposit required from you",status:zh?"当前状态：无需支付":"Status: Not required",role:"publisher"};
 return {label:zh?"支付押金（未开通）":"Pay deposit (unavailable)",status:zh?"当前状态：支付未开通":"Status: Payment unavailable",role:"participant"};
}
