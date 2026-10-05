// lib/i18n.ts
export const SUPPORTED_LANGS = ["zh", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function safeLang(x: any): Lang {
  return x === "zh" ? "zh" : "en";
}

/**
 * 重要：分类/筛选用的“全部”建议用稳定值，不要用中英文文本本身
 */
export const ALL_VALUE = "__all__";

const zh = {
  common: {
    services: "服务大厅",
    demands: "需求大厅",
    me: "我的发布 / 对话",
    backHome: "返回首页",
    refresh: "刷新",
    manualRefresh: "刷新",
    loading: "加载中…",
    details: "详情",
    edit: "编辑",
    delete: "删除",
    confirm: "确认完成",
    cancel: "取消",
    save: "保存",
    realtimeOn: "实时更新：已开启",
    categoryAll: "全部分类",
    footerLine: "联系方式：",
    disclaimerLink: "免责声明 / 交易安全",
    account: "账户设置",
  },

  disclaimer: {
    title: "交易安全与免责声明",
    badge: "请在交易前阅读",
    intro: "本平台仅提供信息发布、需求匹配及沟通服务，不是交易的一方，也不为任何用户、商品、服务或付款提供担保。",
    sections: [
      {
        title: "1. 请自行判断交易风险",
        body: "平台无法保证用户身份、发布内容、商品或服务质量、履约能力以及信息的真实性。交易前请自行核实相关信息。",
      },
      {
        title: "2. 私下交易及付款风险",
        body: "请谨慎进行私下转账、预付款、押金、现金交易或其他资金往来。由此产生的诈骗、资金损失、拒绝履约或其他纠纷，由交易双方自行承担。平台不提供资金托管、付款担保或退款保证，也不能保证追回已支付款项。",
      },
      {
        title: "3. 谨防诈骗",
        body: "对大额预付款、异常低价、催促立即付款、可疑链接、不熟悉的付款方式，以及索要密码、验证码或银行卡信息等情况保持警惕。发现可疑行为时，请立即停止交易。",
      },
      {
        title: "4. 用户之间的纠纷",
        body: "用户之间因交易、服务质量、付款、退款或违约产生的争议，原则上应由交易双方自行协商解决。平台可视情况协助审核举报、限制账户或删除违规内容，但不保证能够解决争议或追回损失。",
      },
      {
        title: "5. 平台责任",
        body: "在适用法律允许的范围内，平台不对用户之间的私下交易、付款行为、虚假信息、诈骗行为或第三方行为造成的直接或间接损失承担责任。",
      },
    ],
    safetyTitle: "安全建议",
    safetyItems: [
      "尽可能保留平台内聊天记录。",
      "付款前确认对方身份、交易内容和金额。",
      "不要向其他用户透露密码、验证码或完整银行卡信息。",
      "如怀疑遭遇诈骗，请立即停止付款，并联系银行、支付平台及当地有关机构。",
    ],
    dontShowAgain: "以后不再提醒",
    close: "我已阅读，关闭",
    note: "勾选后，仅当前账号在此浏览器中不再自动显示该提醒；其他账号首次登录仍会看到。你仍可随时从页脚查看交易安全信息。",
  },

  home: {
    title: "首页",
    subtitle: "未登录可浏览；邮箱登录后可发布并查看联系方式。",
    footerLine1: "联系方式：3266506883@qq.com",
    footerLine2: "如果您有任何好的建议或对这个网站感兴趣，请告诉我，我会尽快回复。",
  },

  auth: {
    emailPlaceholder: "邮箱地址",
    emailOnlyPlaceholder: "请输入邮箱地址",
    passwordPlaceholder: "密码",
    passwordLogin: "密码登录",
    signingIn: "登录中…",
    forgotPassword: "忘记密码？",
    or: "或",
    sendLink: "发送邮箱登录链接",
    sendLinkSending: "发送中…",
    hint: "没有设置过密码？你仍可使用邮箱登录链接。登录后可以为当前账号设置密码。",
    msgNeedEmail: "请输入邮箱。",
    msgNeedPassword: "请输入密码。",
    msgPasswordLoginFail: "登录失败：",
    msgPasswordLoginOk: "登录成功 ✅",
    msgSendFail: "发送失败：",
    msgLinkSent: "登录链接已发送，请去邮箱打开最新那封邮件。",
    loggedInAs: "已登录：",
    signOut: "退出登录",
    msgSignOutFail: "退出失败：",
    msgSignOutOk: "已退出 ✅",
    setPasswordTitle: "设置 / 修改密码",
    setPasswordHint: "如果你以前只使用邮箱链接登录，可在这里为当前账号设置密码。",
    newPasswordPlaceholder: "新密码（至少 6 位）",
    confirmPasswordPlaceholder: "再次输入新密码",
    updatePassword: "保存密码",
    updatingPassword: "保存中…",
    passwordTooShort: "密码至少需要 6 位。",
    passwordMismatch: "两次输入的密码不一致。",
    passwordUpdateFail: "密码更新失败：",
    passwordUpdateOk: "密码已更新 ✅ 以后可以使用邮箱 + 密码登录。",
    forgotTitle: "找回密码",
    forgotSubtitle: "输入你的注册邮箱，我们会向该邮箱发送重置密码链接。",
    sendResetEmail: "发送重置密码邮件",
    sendingResetEmail: "发送中…",
    resetEmailFail: "发送失败：",
    resetEmailSent: "如果该邮箱可用于重置密码，你会收到一封重置邮件。请打开最新邮件中的链接。",
    backToLogin: "返回登录",
    resetTitle: "重置密码",
    resetSubtitle: "请设置一个新的登录密码。",
    checkingResetLink: "正在验证重置链接…",
    resetLinkInvalid: "重置链接无效、已过期或没有建立恢复会话。请重新申请一封重置密码邮件。",
    resetPasswordButton: "重置密码",
    savingPassword: "保存中…",
    resetPasswordOk: "密码重置成功 ✅ 现在可以返回首页使用新密码登录。",
  },


  account: {
    title: "账户设置",
    subtitle: "管理头像、公开用户名/ID、简介和登录密码。",
    loginRequired: "请先使用邮箱登录后管理账户。",
    avatar: "头像（图片最大 5 MB）",
    username: "公开用户名 / ID（3–24 位，仅小写字母、数字和下划线）",
    displayName: "显示名称 / 昵称",
    bio: "个人简介",
    authId: "系统用户 ID（不可修改）",
    saveProfile: "保存个人资料",
    saved: "个人资料已保存 ✅",
    saveFailed: "保存失败：",
    usernameRule: "用户名需为 3–24 位，只能包含小写字母、数字和下划线。",
    safetyReminder: "免责声明提醒",
    safetyReminderHint: "如果你之前选择了“以后不再提醒”，可以在这里清除该账号的选择并重新测试弹窗。",
    showDisclaimerAgain: "重新显示免责声明",
  },

  report: {
    button: "投诉 / 举报",
    title: "提交投诉 / 举报",
    subtitle: "投诉会保存到平台，并在邮件服务配置完成后自动发送给管理员。",
    descriptionPlaceholder: "请说明发生了什么、时间、金额或其他关键信息（至少 10 个字）。",
    loginRequired: "请登录后提交投诉。",
    detailTooShort: "请至少填写 10 个字的详细说明。",
    submit: "提交投诉",
    submitting: "提交中…",
    success: "投诉已提交 ✅",
    failed: "提交失败：",
    reasons: {
      fraud: "疑似诈骗", payment: "付款 / 退款纠纷", service: "服务质量 / 履约问题", harassment: "骚扰 / 不当行为", spam: "垃圾信息 / 虚假发布", other: "其他",
    },
  },

  transaction: {
    title: "交易记录 / 聊天", listTitle: "我的交易", listSubtitle: "进行中和已完成交易都会保留，可点击进入查看历史记录并继续聊天。", noneActive: "暂无进行中的交易。", noneCompleted: "暂无已完成的交易。", back: "返回我的发布 / 对话", loginRequired: "请先登录后查看交易记录。", notFound: "找不到该交易，或你不是该交易参与者。",
    activeNotice: "交易进行中：你可以查看历史记录并继续聊天。", completedNotice: "该交易已完成：历史记录保留，仍可继续沟通。", completedChatHint: "此交易已完成，以下消息属于完成后的继续沟通记录。",
    historyChat: "历史聊天", noMessages: "暂无消息。", messagePlaceholder: "输入消息…", sendFailed: "发送失败：", confirm: "确认成交 / 完成", otherUser: "对方用户",
  },

  userProfile: { unnamed: "未设置名称的用户", noBio: "该用户暂无简介。", reviews: "历史评价", noReviews: "暂无评价。" },

  categories: {
    allValue: ALL_VALUE,
    allLabel: "全部分类",
    other: "其他",
    items: ["家政", "维修", "搬家", "跑腿", "教育", "设计", "其他"] as const,
  },

  servicesHall: {
    title: "服务大厅",
    subtitle: "未登录可浏览；邮箱登录后可发布并查看联系方式。",
    current: "当前：",
    loggedEmail: "已登录",
    notLogged: "未登录/匿名",
    realtimeOn: "实时更新：已开启",

    searchPlaceholder: "搜索服务（标题/描述）",
    publishTitle: "发布服务",
    titlePlaceholder: "标题：我能提供什么服务？",
    descPlaceholder: "描述：内容、时间、地点（可简写）",
    contactPlaceholder: "联系方式（微信/电话，仅邮箱登录用户可见）",
    pricePlaceholder: "价格（可选）",
    publishBtn: "发布",
    publishNeedLogin: "需要邮箱登录后才能发布。",
    needEmailToPublish: "请使用邮箱登录后发布（匿名仅可浏览）。",
    needEmailToViewContact: "请使用邮箱登录后查看联系方式（匿名仅可浏览）。",

    readFail: "读取失败：",
    publishFail: "发布失败：",
    publishOk: "发布成功 ✅",
    titleEmpty: "标题不能为空。",
    priceMustNumber: "价格必须是数字。",
    contactReadFail: "读取联系方式失败：",
    contactEmpty: "对方未留下联系方式。",
    contactLabel: "联系方式：",
    viewContact: "查看联系方式",
    latest: "最新服务",
    noResult: "暂无内容。",
  },

  demandsHall: {
    title: "需求大厅",
    subtitle: "未登录可浏览；邮箱登录后可发布并查看联系方式。",
    current: "当前：",
    logged: "已登录",
    guest: "未登录/匿名",
    realtimeOn: "实时更新：已开启",

    searchPlaceholder: "搜索需求（标题/描述）",
    publishBlockTitle: "发布需求",
    latestTitle: "最新需求",
    empty: "暂无内容。",

    form: {
      titlePh: "标题：我需要什么帮助？",
      descPh: "描述：需求内容、时间、地点（可简写）",
      contactPh: "联系方式（微信/电话，仅邮箱登录用户可见）",
      budgetPh: "预算（可选）",
      publish: "发布",
      needEmail: "需要邮箱登录后才能发布。",
    },

    item: {
      viewContact: "查看联系方式",
      contact: "联系方式：",
      contactRealtime: "实时更新",
      noContact: "对方未留下联系方式。",
    },
  },

  me: {
    title: "我的发布 / 对话",
    subtitle: "",
    loggedEmail: "已登录",
    loggedAnon: "匿名登录",
    notLogged: "未登录",

    needEmailTip: "提示：部分功能需要邮箱登录（如保存简介、发消息、成交确认、互评等）。",

    tabPosts: "我的发布",
    tabChat: "对话",

    profileCard: "个人资料",
    bioLabel: "一句话简介（可选）",
    bioPh: "写一句话让对方更了解你…",
    saveBio: "保存简介",
    savingBio: "保存中…",

    myServices: "我的服务",
    myDemands: "我的需求",
    active: "进行中",
    completed: "已完成",
    noneActiveService: "暂无进行中的服务。",
    noneDoneService: "暂无已完成的服务。",
    noneActiveDemand: "暂无进行中的需求。",
    noneDoneDemand: "暂无已完成的需求。",

    deleteConfirmService: "确定删除这条服务吗？",
    deleteConfirmDemand: "确定删除这条需求吗？",

    editModalTitleService: "编辑服务",
    editModalTitleDemand: "编辑需求",
    editHint: "修改后保存即可。",

    status: {
      needEmail: "需要邮箱登录后才能操作。",
      saved: "已保存 ✅",
      deleted: "已删除 ✅",
      titleEmpty: "标题不能为空。",
      moneyNan: "金额必须是数字。",
      bioTooLong: "简介太长（最多 300 字）。",
      bioSaveFail: "保存失败：",
      bioSaved: "简介已保存 ✅",
      openConvFail: "打开对话失败。",
      confirmNeedLogin: "需要邮箱登录后才能确认成交。",
      confirmOk: "已确认 ✅ 等待对方确认。",
      confirmMissingOwner: "缺少对方信息。",
      sendNeedLogin: "需要邮箱登录后才能发消息。",
      sendFail: "发送失败：",
      reviewNeedLogin: "需要邮箱登录后才能评价。",
      reviewNeedConv: "请先选择一个对话。",
      reviewNeedDone: "成交完成后才能评价。",
      reviewDup: "你已经评价过了。",
    },

    chats: {
      listTitle: "对话列表",
      messagesTitle: "消息",
      selectTip: "选择一个对话查看消息与成交状态。",
      none: "暂无对话。",
      sendPh: "输入消息，回车发送…",
      send: "发送",
      sending: "发送中…",
    },

    deal: {
      otherInfo: "对方信息",
      otherBio: "对方简介",
      otherBioEmpty: "暂无简介。",
      otherDeals: "对方历史成交/评价数：",
      confirmingPrefix: "我方确认",
      other: "对方确认",
      notStarted: "尚未发起成交确认",
      rule: "规则：双方都确认后，自动完成并把大厅里的发布标记为已完成。",
      confirmBtn: "确认成交",
      doneBtn: "已完成",
      done: "已完成 ✅",
      recentReviews: "最近评价",
      noReviews: "暂无评价。",
      rating: "评分：",
    },

    review: {
      title: "评价",
      needDone: "成交完成后可评价。",
      already: "你已评价：",
      yourTextPrefix: "内容：",
      noText: "（无文字评价）",
      ratingLabel: "评分",
      textPh: "写点评价（可选）",
      submit: "提交评价",
      submitting: "提交中…",
    },
  },
};

const en = {
  common: {
    services: "Services",
    demands: "Demands",
    me: "My Posts / Chats",
    backHome: "Back Home",
    refresh: "Refresh",
    manualRefresh: "Refresh",
    loading: "Loading…",
    details: "Details",
    edit: "Edit",
    delete: "Delete",
    confirm: "Mark Done",
    cancel: "Cancel",
    save: "Save",
    realtimeOn: "Realtime: ON",
    categoryAll: "All categories",
    footerLine: "Contact:",
    disclaimerLink: "Disclaimer / Transaction Safety",
    account: "Account Settings",
  },

  disclaimer: {
    title: "Transaction Safety & Disclaimer",
    badge: "Please read before trading",
    intro: "This platform only provides listing, matching and communication services. It is not a party to any transaction and does not guarantee any user, product, service or payment.",
    sections: [
      {
        title: "1. Assess transaction risks yourself",
        body: "The platform cannot guarantee users’ identities, listing content, product or service quality, ability to perform, or the accuracy of information. Please verify relevant information before trading.",
      },
      {
        title: "2. Risks of private transactions and payments",
        body: "Be cautious with private transfers, advance payments, deposits, cash transactions or other payments. Fraud, financial loss, failure to perform or other disputes arising from such transactions are the responsibility of the parties involved. The platform does not provide escrow, payment guarantees or refund guarantees, and cannot guarantee recovery of funds already paid.",
      },
      {
        title: "3. Beware of scams",
        body: "Be cautious of large advance-payment requests, unusually low prices, pressure to pay immediately, suspicious links, unfamiliar payment methods, or requests for passwords, verification codes or bank-card details. Stop the transaction immediately if anything appears suspicious.",
      },
      {
        title: "4. Disputes between users",
        body: "Disputes concerning transactions, service quality, payment, refunds or breach should generally be resolved between the users involved. The platform may, where appropriate, review reports, restrict accounts or remove violating content, but does not guarantee resolution of disputes or recovery of losses.",
      },
      {
        title: "5. Platform liability",
        body: "To the extent permitted by applicable law, the platform is not liable for direct or indirect losses caused by private transactions, payments, false information, fraud or third-party conduct between users.",
      },
    ],
    safetyTitle: "Safety tips",
    safetyItems: [
      "Keep records of conversations on the platform whenever possible.",
      "Confirm the other party’s identity, transaction details and amount before paying.",
      "Never share passwords, verification codes or full bank-card details with other users.",
      "If you suspect fraud, stop making payments immediately and contact your bank, payment provider and relevant local authorities.",
    ],
    dontShowAgain: "Do not remind me again",
    close: "I have read this — close",
    note: "If selected, only this account will stop seeing the reminder automatically in this browser. Other accounts will still see it on first sign-in. You can always reopen the disclaimer from the footer.",
  },

  home: {
    title: "Home",
    subtitle: "Browse without login. Sign in with email to publish and view contacts.",
    footerLine1: "Contact: 3266506883@qq.com",
    footerLine2: "If you have any suggestions or are interested in this website, please let me know and I will reply as soon as possible.",
  },

  auth: {
    emailPlaceholder: "Email address",
    emailOnlyPlaceholder: "Enter your email address",
    passwordPlaceholder: "Password",
    passwordLogin: "Sign in with password",
    signingIn: "Signing in…",
    forgotPassword: "Forgot password?",
    or: "or",
    sendLink: "Send email login link",
    sendLinkSending: "Sending…",
    hint: "Never set a password? You can still use an email login link, then set a password after signing in.",
    msgNeedEmail: "Please enter your email.",
    msgNeedPassword: "Please enter your password.",
    msgPasswordLoginFail: "Sign in failed: ",
    msgPasswordLoginOk: "Signed in ✅",
    msgSendFail: "Send failed: ",
    msgLinkSent: "Login link sent. Please open the latest email.",
    loggedInAs: "Logged in: ",
    signOut: "Sign out",
    msgSignOutFail: "Sign out failed: ",
    msgSignOutOk: "Signed out ✅",
    setPasswordTitle: "Set / change password",
    setPasswordHint: "If you previously used email links only, you can set a password for this account here.",
    newPasswordPlaceholder: "New password (at least 6 characters)",
    confirmPasswordPlaceholder: "Confirm new password",
    updatePassword: "Save password",
    updatingPassword: "Saving…",
    passwordTooShort: "Password must be at least 6 characters.",
    passwordMismatch: "The two passwords do not match.",
    passwordUpdateFail: "Password update failed: ",
    passwordUpdateOk: "Password updated ✅ You can now sign in with email + password.",
    forgotTitle: "Forgot password",
    forgotSubtitle: "Enter your account email and we will send a password-reset link.",
    sendResetEmail: "Send reset email",
    sendingResetEmail: "Sending…",
    resetEmailFail: "Send failed: ",
    resetEmailSent: "If this email can be used for password recovery, a reset email will arrive shortly. Open the newest link.",
    backToLogin: "Back to sign in",
    resetTitle: "Reset password",
    resetSubtitle: "Choose a new password for your account.",
    checkingResetLink: "Checking reset link…",
    resetLinkInvalid: "This reset link is invalid, expired, or did not establish a recovery session. Please request a new reset email.",
    resetPasswordButton: "Reset password",
    savingPassword: "Saving…",
    resetPasswordOk: "Password reset successfully ✅ You can return to the home page and sign in with the new password.",
  },


  account: {
    title: "Account Settings", subtitle: "Manage your avatar, public username/ID, profile and password.", loginRequired: "Please sign in with email to manage your account.",
    avatar: "Avatar (max 5 MB)", username: "Public username / ID (3–24 lowercase letters, numbers or underscores)", displayName: "Display name", bio: "Bio", authId: "System user ID (cannot be changed)", saveProfile: "Save profile", saved: "Profile saved ✅", saveFailed: "Save failed: ", usernameRule: "Username must be 3–24 characters using lowercase letters, numbers or underscores.",
    safetyReminder: "Disclaimer reminder",
    safetyReminderHint: "If you previously selected “do not remind me again”, clear that choice here to test the sign-in disclaimer again for this account.",
    showDisclaimerAgain: "Show disclaimer again",
  },

  report: {
    button: "Report", title: "Submit a report", subtitle: "Reports are stored on the platform and, once email delivery is configured, automatically sent to the administrator.", descriptionPlaceholder: "Describe what happened, including dates, amounts or other useful details (at least 10 characters).", loginRequired: "Please sign in before submitting a report.", detailTooShort: "Please provide at least 10 characters of detail.", submit: "Submit report", submitting: "Submitting…", success: "Report submitted ✅", failed: "Submit failed: ",
    reasons: { fraud: "Suspected fraud", payment: "Payment / refund dispute", service: "Service quality / fulfilment issue", harassment: "Harassment / inappropriate behaviour", spam: "Spam / false listing", other: "Other" },
  },

  transaction: {
    title: "Transaction History / Chat", listTitle: "My Transactions", listSubtitle: "Both active and completed transactions are retained. Open any transaction to review the history and continue chatting.", noneActive: "No active transactions.", noneCompleted: "No completed transactions.", back: "Back to My Posts / Chats", loginRequired: "Please sign in to view transaction history.", notFound: "This transaction could not be found, or you are not a participant.", activeNotice: "Transaction in progress: review the history and continue chatting here.", completedNotice: "This transaction is completed. The history is retained and you can still communicate.", completedChatHint: "This transaction is completed. Messages below are post-completion communication.", historyChat: "Chat history", noMessages: "No messages yet.", messagePlaceholder: "Type a message…", sendFailed: "Send failed: ", confirm: "Confirm deal / completion", otherUser: "Other user",
  },

  userProfile: { unnamed: "Unnamed user", noBio: "This user has no bio yet.", reviews: "Reviews", noReviews: "No reviews yet." },

  categories: {
    allValue: ALL_VALUE,
    allLabel: "All categories",
    other: "Other",
    // 注意：如果你数据库里 category 存的是中文，这里也保持中文，避免过滤/匹配失效
    items: ["家政", "维修", "搬家", "跑腿", "教育", "设计", "其他"] as const,
  },

  servicesHall: {
    title: "Services Hall",
    subtitle: "Browse without login. Email login required to publish & view contacts.",
    current: "Current:",
    loggedEmail: "Logged in",
    notLogged: "Guest/Anonymous",
    realtimeOn: "Realtime: ON",

    searchPlaceholder: "Search services (title/description)",
    publishTitle: "Publish a service",
    titlePlaceholder: "Title: What service can you provide?",
    descPlaceholder: "Description: details/time/location (optional)",
    contactPlaceholder: "Contact (WeChat/Phone, visible to email users only)",
    pricePlaceholder: "Price (optional)",
    publishBtn: "Publish",
    publishNeedLogin: "Email login required to publish.",
    needEmailToPublish: "Please sign in with email to publish (anonymous can only browse).",
    needEmailToViewContact: "Please sign in with email to view contacts.",

    readFail: "Load failed: ",
    publishFail: "Publish failed: ",
    publishOk: "Published ✅",
    titleEmpty: "Title is required.",
    priceMustNumber: "Price must be a number.",
    contactReadFail: "Load contact failed: ",
    contactEmpty: "No contact provided.",
    contactLabel: "Contact: ",
    viewContact: "View contact",
    latest: "Latest services",
    noResult: "No results.",
  },

  demandsHall: {
    title: "Demands Hall",
    subtitle: "Browse without login. Email login required to publish & view contacts.",
    current: "Current:",
    logged: "Logged in",
    guest: "Guest/Anonymous",
    realtimeOn: "Realtime: ON",

    searchPlaceholder: "Search demands (title/description)",
    publishBlockTitle: "Publish a demand",
    latestTitle: "Latest demands",
    empty: "No results.",

    form: {
      titlePh: "Title: What do you need?",
      descPh: "Description: details/time/location (optional)",
      contactPh: "Contact (WeChat/Phone, visible to email users only)",
      budgetPh: "Budget (optional)",
      publish: "Publish",
      needEmail: "Email login required to publish.",
    },

    item: {
      viewContact: "View contact",
      contact: "Contact: ",
      contactRealtime: "realtime",
      noContact: "No contact provided.",
    },
  },

  me: {
    title: "My Posts / Chats",
    subtitle: "",
    loggedEmail: "Logged in",
    loggedAnon: "Anonymous",
    notLogged: "Not logged in",

    needEmailTip: "Tip: Some actions require email login (bio, messaging, deal confirmation, review).",

    tabPosts: "My posts",
    tabChat: "Chats",

    profileCard: "Profile",
    bioLabel: "Bio (optional)",
    bioPh: "Write a short bio…",
    saveBio: "Save bio",
    savingBio: "Saving…",

    myServices: "My services",
    myDemands: "My demands",
    active: "Active",
    completed: "Completed",
    noneActiveService: "No active services.",
    noneDoneService: "No completed services.",
    noneActiveDemand: "No active demands.",
    noneDoneDemand: "No completed demands.",

    deleteConfirmService: "Delete this service?",
    deleteConfirmDemand: "Delete this demand?",

    editModalTitleService: "Edit service",
    editModalTitleDemand: "Edit demand",
    editHint: "Edit and save.",

    status: {
      needEmail: "Email login required.",
      saved: "Saved ✅",
      deleted: "Deleted ✅",
      titleEmpty: "Title is required.",
      moneyNan: "Amount must be a number.",
      bioTooLong: "Bio too long (max 300 chars).",
      bioSaveFail: "Save failed: ",
      bioSaved: "Bio saved ✅",
      openConvFail: "Failed to open conversation.",
      confirmNeedLogin: "Email login required to confirm a deal.",
      confirmOk: "Confirmed ✅ Waiting for the other side.",
      confirmMissingOwner: "Missing other user.",
      sendNeedLogin: "Email login required to send messages.",
      sendFail: "Send failed: ",
      reviewNeedLogin: "Email login required to review.",
      reviewNeedConv: "Select a conversation first.",
      reviewNeedDone: "Complete the deal before reviewing.",
      reviewDup: "You already reviewed.",
    },

    chats: {
      listTitle: "Conversations",
      messagesTitle: "Messages",
      selectTip: "Select a conversation to view messages & deal status.",
      none: "No conversations.",
      sendPh: "Type a message, press Enter to send…",
      send: "Send",
      sending: "Sending…",
    },

    deal: {
      otherInfo: "Other side",
      otherBio: "Bio",
      otherBioEmpty: "No bio.",
      otherDeals: "Reviews count: ",
      confirmingPrefix: "Me",
      other: "Other",
      notStarted: "Deal not started",
      rule: "Rule: once both confirm, it becomes done and the post is marked completed.",
      confirmBtn: "Confirm deal",
      doneBtn: "Done",
      done: "Done ✅",
      recentReviews: "Recent reviews",
      noReviews: "No reviews yet.",
      rating: "Rating:",
    },

    review: {
      title: "Review",
      needDone: "You can review after the deal is done.",
      already: "You reviewed:",
      yourTextPrefix: "Text: ",
      noText: "(no text)",
      ratingLabel: "Rating",
      textPh: "Write something (optional)",
      submit: "Submit review",
      submitting: "Submitting…",
    },
  },
};

export type T = typeof zh;

export function getT(lang: Lang): T {
  return (lang === "en" ? en : zh) as T;
}
