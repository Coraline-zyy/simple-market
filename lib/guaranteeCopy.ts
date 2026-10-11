// Both chat entry points must describe the same manual coordination process.
export const guaranteeCopy = {
 zh: {
  preview: "管理员人工协调 · 网站自动支付与转账尚未开通",
  notice: "如需交易担保、押金或预付款协调，请点击“需要担保”联系管理员。经双方明确同意并核实收款信息后，可按管理员确认的方式，将款项转入双方确认的指定账户暂存；待双方确认交易完成且无争议，并通知管理员后，再按约定转付相应款项，押金按约定原路退回。交易未完成或发生争议时，须按双方约定及管理员核实结果处理，网站不会自动转付或退款。请勿向未经确认的账户转账，并保留完整的沟通与付款凭证。",
  confirmation: "点击“确认发起”仅提交担保协调请求，不会扣款、转账，也不代表款项已到账或管理员已接受担保。",
 },
 en: {
  preview: "Manual administrator coordination · Automatic payments and transfers are not available",
  notice: "For transaction, deposit or advance-payment coordination, select “Request guarantee” to contact an administrator. Only after both parties expressly agree and verify the payment details may funds be transferred, using the administrator-confirmed method, to a designated account confirmed by both parties. Once both parties confirm completion without dispute and notify the administrator, the relevant funds may be released as agreed and any deposit returned to its original source as agreed. Incomplete or disputed transactions must be handled according to the parties’ agreement and the administrator’s verification; the website does not automatically transfer or refund funds. Do not transfer to an unverified account, and keep complete communication and payment records.",
  confirmation: "Confirm request only submits a coordination request. It does not charge or transfer funds, confirm receipt of funds, or mean an administrator has accepted the guarantee.",
 },
} as const;
