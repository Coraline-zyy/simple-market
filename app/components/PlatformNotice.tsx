export function PlatformNotice({lang}:{lang:"zh"|"en"}){
 return <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-zinc-500">
 {lang==="zh"?"支付与押金系统尚未开通，平台暂不提供资金托管或交易赔付保障。交易双方需自行协商付款方式，请谨慎核实对方及交易信息，保护个人资料与财产安全；任何认证标识均不等于交易安全保证。我们将逐步完善平台功能，感谢你的理解与支持。":"Payments and deposits are not yet available, and the platform does not currently hold transaction funds or provide compensation protection. Please agree payment arrangements directly with the other party, carefully check their details and the transaction, and protect your personal information and money. No verification badge guarantees a safe transaction. We will continue improving the platform. Thank you for your understanding and support."}
 </p>
}
