export default function MobileTradeSummary({lang}:{lang:"zh"|"en"}){
 const zh=lang==="zh";
 return <details className="poster-trade-summary"><summary>{zh?"交易提醒":"Transaction guidance"}<span aria-hidden="true">＋</span></summary><p>{zh?"如需交易担保或押金支付协助，请在聊天中点击“需要担保”，由管理员介入协调。":"For transaction guarantees or help arranging a deposit payment, select “Request guarantee” in chat for administrator assistance."}</p><p className="font-semibold">{zh?"我们鼓励用户线下银行转账或现金交易。":"We encourage users to transact offline by bank transfer or cash."}</p></details>;
}
