type AuthError={status?:number;code?:string;message?:string};
export function loginErrorMessage(error:AuthError,lang:"zh"|"en",fallback:string) {
 const zh=lang==="zh",message=error.message||"";
 if(error.status===429 || /over_.*rate_limit|rate.?limit|too many|too frequent/i.test((error.code||"")+" "+message))
  return zh?"登录服务暂时限流，请稍后重试；这不是账号被永久锁定。":"The sign-in service is temporarily rate limited. Try again shortly; your account is not permanently locked.";
 if(error.code==="invalid_credentials" || /invalid login credentials/i.test(message))
  return zh?"邮箱或密码错误，请重新输入。":"Incorrect email or password. Please try again.";
 return fallback+message;
}
