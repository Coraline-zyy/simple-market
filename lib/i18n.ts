// lib/i18n.ts
export const SUPPORTED_LANGS = ["zh", "en"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export function safeLang(x: any): Lang {
  return x === "en" ? "en" : "zh";
}

/**
 * 重要：分类/筛选用的“全部”建议用稳定值，不要用中英文文本本身
 */
export const ALL_VALUE = "__all__";

export const SITE_CONTACT = {
  textZh: "微信 / 电话",
  textEn: "WeChat / Phone",
  lineZh: "建议只在邮箱登录后展示给对方。",
  lineEn: "Recommended to show only after email login.",
};


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
  },

  home: {
    title: "首页",
    subtitle: "未登录可浏览；邮箱登录后可发布并查看联系方式。",
    footerLine1: "联系方式：3266506883@qq.com",
    footerLine2: "这只是一个大学生的奇思妙想，如果您有任何好的建议，请告诉我，我会尽快回复。",
  },

  auth: {
    emailPlaceholder: "输入邮箱登录（魔法链接）",
    sendLink: "发送登录链接",
    sendLinkSending: "发送中…",
    hint: "提示：只点最新邮件链接；不要在不同域名/端口之间切换。",
    msgNeedEmail: "请输入邮箱。",
    msgSendFail: "发送失败：",
    msgLinkSent: "登录链接已发送，请去邮箱打开最新那封邮件。",
    loggedInAs: "已登录：",
    signOut: "退出登录",
    msgSignOutFail: "退出失败：",
    msgSignOutOk: "已退出 ✅",
  },

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
    subtitle: "成交后双方可回溯，并可互评。",
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
  },

  home: {
    title: "Home",
    subtitle: "Browse without login. Sign in with email to publish and view contacts.",
    footerLine1: "Contact: 3266506883@qq.com",
    footerLine2: "This is just a blue-sky thinking of a college student. If you have any good suggestions, please let me know and I will reply as soon as possible.",
  },

  auth: {
    emailPlaceholder: "Email login (magic link)",
    sendLink: "Send login link",
    sendLinkSending: "Sending…",
    hint: "Tip: click the newest email link; don't switch domains/ports.",
    msgNeedEmail: "Please enter your email.",
    msgSendFail: "Send failed: ",
    msgLinkSent: "Login link sent. Please open the latest email.",
    loggedInAs: "Logged in: ",
    signOut: "Sign out",
    msgSignOutFail: "Sign out failed: ",
    msgSignOutOk: "Signed out ✅",
  },

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
    subtitle: "After a deal, both sides can trace and review.",
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
