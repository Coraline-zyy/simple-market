// sessionStorage survives page navigation/reload, but ends when this tab closes.
const KEY="youqiu:install-dismissed-session";
let dismissedInDocument=false;
export function isInstallDismissed() {
 if(typeof window==="undefined")return false;
 try { return dismissedInDocument || window.sessionStorage.getItem(KEY)==="1"; }
 catch { return dismissedInDocument; }
}
export function dismissInstallPrompt() {
 dismissedInDocument=true;
 try { window.sessionStorage.setItem(KEY,"1"); } catch { /* private storage may be unavailable */ }
}
