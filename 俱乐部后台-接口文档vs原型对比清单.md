# 未来洞电竞·俱乐部后台 — 接口 vs 原型 对齐检查清单（v4，并入后端 2026-10-23 最新字段定义）

> 接口来源（Apifox，实际后端接口）：https://s.apifox.cn/f785dd2b-0fd1-4e7c-b23a-3680b4820cec
> 原型来源（墨刀，基准）：https://modao.cc/proto/H4JsJOMttlp8yvGjNLbrDo/sharing?view_mode=read_only （俱乐部后台 9 项）
> 判定基准：**字段与交互以原型为主**；接口与原型不一致 / 缺失处按下面清单与后端对齐。
> 版本：2026-10-23 · v4（后端回复最新字段定义：settings 含百分比分润 playerRate、player-profits 服务端分页、withdraw-rules 全字段；6 模块直开链接已核对；前端已全部对齐）

---

## 〇、总体结论

1. **9 项功能接口后端已全部提供**。后端回复：分享页不用另开，侧边栏进入「未来洞电竞→俱乐部后台」6 个模块里都有接口，并给出 6 个模块**直接打开链接**（见第一节 B），可接列表已写入 grabState/hallAmount，派单消息已带完整 order。
2. **本轮（后端 aa99193c 字段定义）已逐字段对齐**：
   - **settings**：publicGrab(1/0)、**profitMode(PERCENT|FIXED 仅响应)**、**playerRate(打手分润，>0 且 <100 的整数，保存传)**、clubShareRate=100-playerRate（只展示不提交）→ 接单设置与百分比分润**共用 PUT /api/club/settings**；
   - **player-profits**：服务端分页 keyword/page/pageSize → {total,page,pageSize,list}，list 每项 gameId/gameName/specId/specName/playerFixed/**configured(0未填/1已填)**；保存体 **{items:[{specId,playerFixed}]}**，空行跳过、0 和正数、最多两位小数；
   - **withdraw-rules**：dailyLimit/usedToday/remainToday/windowStart/windowEnd/inWindow/minAmount/…/showWithdraw，收益与押金同一结构（收益 minAmount=90、showWithdraw=true；押金 minAmount 空、showWithdraw 需退店满14天且未冻结才 true）。
3. **前端已按上述定义全部改完并通过 `npm run build`**（详见第六节）。剩余待后端确认项见第三节。
4. 差异记录：原型批注「打手分润 0≤值<100」，后端要求「大于0、小于100的整数」——**前端按后端口径校验 1-99**，如产品口径允许 0% 请告知。
5. **【已解决】游戏名称/规格名称**：后端确认固定值表格名称已在 GET /api/club/settings/player-profits 的 list（gameName「三角洲行动」/ specName「护航」，表格用 gameName + " / " + specName 拼）；**GET /api/club/specs/mine 只返回授权的 gameId/specId、不要用它渲染这张表**。前端当前即按 player-profits list 渲染（名称直接显示、缺失回退 #ID），无需改动。

---

## 一、接口总览

### A. Apifox 已核 9 个接口

| # | 接口 | 方法/路径 | 原型功能 | 对齐情况 |
|---|------|----------|---------|---------|
| 1 | 登录（俱乐部） | POST /api/club/auth/login | 登录 | ✅（client 可不传/传则必须 CLUB/直连必传 CLUB） |
| 2 | 当前登录用户 | GET /api/club/me | 登录后信息/实名状态 | ✅ |
| 3 | 实名认证 | POST /api/club/me/real-name | 提现前置 | ✅ |
| 4 | 可接列表 | GET /api/club/orders/grab-hall | 抢单大厅 | ✅（另需含 grabState/hallAmount，见第三节①） |
| 5 | 整单接下 | POST /api/club/orders/{id}/club-take | 立即抢单 | ✅ |
| 6 | 上传文件 | POST /api/club/files/upload | 进度截图/完成凭证 | ✅（CLUB token） |
| 7 | 待处理派单消息 | GET /api/club/dispatch-messages | 派单消息 | ✅（每项带完整 order，新增 order.hallAmount） |
| 8 | 接受派单 | POST /api/club/dispatch-messages/{id}/accept | 接单 | ✅ |
| 9 | 拒绝派单 | POST /api/club/dispatch-messages/{id}/reject | 拒绝（reason 可选） | ✅ |

### B. 后端回复确认已存在的接口（2026-10-23 最新字段定义，6 模块直开链接已逐一核对）

| 模块 | 直开链接 | 接口 | 核对结果 |
|------|---------|------|---------|
| 打手列表 | s.apifox.cn/f785dd2b-0fd1-4e7c-b23a-3680b4820cec/**526572935e0** | GET/POST /api/club/players、PUT /players/{id}/flags、POST /players/{id}/wallet-adjust | ✅ 已核：筛选 id(完全)/name(模糊)/phone(完全)/clubId/clubName/createdFrom/createdTo/**accountStatus**（可接单/禁止接单/未冻结/冻结/在店/退店）；列表含收益余额/押金余额/已完成/未通过/冻结订单数 |
| 我的订单 | …/**526320879e0** | GET /api/club/orders/mine、GET /orders/{id}、POST /orders/{id}/submit | ✅ 已核：**tab=ALL/ONGOING(含WAIT_TAKE+IN_PROGRESS)/DONE/CLOSED**、keyword(订单号/ID)、sort=createdAt|dispatchedAt|takenAt|completedAt、order=desc/asc、page/pageSize；「进行中且已驳回」接口不置顶、前端自己排 |
| 我的钱包 | …/**526320893e0** | GET /api/club/wallets/me、GET /wallets/txns、GET /wallets/withdraw-rules、POST /wallets/withdraw | ✅ 已核：me 返回 data={**income(可提现收益), deposit(押金), walletFrozen**}，无 Query 参数 |
| 我的押金 | …/**526572984e0** | GET /api/club/wallets/me（同钱包）、GET /wallets/withdraw-rules?walletType=DEPOSIT | ✅ 已核：押金余额=同一接口 data.deposit；提现按钮看 DEPOSIT 规则 showWithdraw |
| 配置管理 | …/**526572953e0** | GET/PUT /api/club/settings、GET/PUT /api/club/settings/player-profits | ✅ 已核（后端截图给全字段）：见第二节 8 |
| 消息通知 | …/**526320900e0** | GET /api/club/notifications、GET /notifications/unread、POST /notifications/{id}/read、/ws/notify | ✅ 已核：列表 title/content/timeText/orderId；实时 /ws/notify?token=&client=CLUB（打手 PLAYER、后台 ADMIN，token 需 URL 编码且与 client 同端）；推送 NOTIFICATION（含 title/content/orderId/timeText/unread/badge）/已读回执 UNREAD（只含 unread/badge） |
| 可接列表 | …/**526320878e0** | GET /api/club/orders/grab-hall | ✅ 已核（后端已把 grabState/hallAmount 写入响应） |
| 派单消息 | …/**526320885e0** / accept …/**526320886e0** / reject …/**526320887e0** | GET /api/club/dispatch-messages、POST …/accept、POST …/reject | ✅ 已核：每项带完整 order（含 hallAmount、ownerName） |
| 上传文件 | …/**526990274e0** | POST /api/club/files/upload | ✅ 已核：multipart 字段 file、≤10MB、返回 url/fileName/ossId、下载 GET /api/club/files/{ossId}/content；三端各一份（admin/player/club），JWT 互不通用 |

> ✅ 上表 6 模块字段已按后端直开链接 + 字段定义逐一核对，前端已全部对齐；不再存在"分享页为空无法核对"的问题。

---

## 二、逐功能对齐检查（原型 ↔ 接口，v2 已按后端回复更新）

### 1. 登录
| 原型要求 | 接口/口径 | 对齐 |
|---------|------|------|
| 帐号、密码、记住密码 | POST /api/club/auth/login：username（俱乐部账号）+ password；记住密码=前端本地 | ✅ |
| 登录 client 参数 | 后端明确：**可不传；传则必须 CLUB；直连必传 CLUB** | ✅ 前端固定传 CLUB |
| 登录后角色/菜单 | 响应含 role（ADMIN/KEFU/AUDITOR/FINANCE）、name、accountId、clubId | ✅ 菜单按 role 控制（前端已做） |
| 提现实名前置 | POST /api/club/me/real-name：realName（2-32字）+idNo（18位，校验格式与校验位）；通过后 realNameVerified=true；重复提交返回当前结果；已认证改信息 CONFLICT「已完成实名，不能修改」；响应只回打码身份证号 | ✅ |
| 提现未实名错误 | HTTP200 code=4033 bizCode=**NOT_REALNAME** 文案「请先完成实名认证后再提现」 | ✅ 前端已接（Wallet/Deposit 提现前弹实名） |

### 2. 抢单大厅
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 订单号（平台订单非第三方） | orderNo | ✅ |
| 游戏名称 / 规格（一单一规格） | gameName / specName | ✅ |
| 转单标签 | transferred | ✅ |
| 游戏客户端（端游/手游可并存） | clients | ✅ |
| 购买项目 | itemName | ✅ |
| 派单客服（实名非昵称） | ownerName | ✅（后端口径：用 ownerName，不是 ownerWecomName） |
| 接单人数（当前/总） | takenCount / playerCount | ✅ |
| 派单备注（无时不展示） | remark | ✅ |
| **到手金额（本俱乐部收益）** | **hallAmount**（=本俱乐部到手；打手视角 hallAmount=playerAmount）；未配俱乐部部分润时 hallAmount 空 | ✅ 前端改展示 hallAmount，空显 "—"，不再乘打手分润 |
| 立即抢单（仅待抢）/已被抢标识 | **grabState：OPEN 待抢 / TAKEN 已抢**（status 是 WAIT_TAKE 或 IN_PROGRESS，不会是 WAIT_PAY） | ✅ 前端改按 grabState 判断 |
| 订单倒计时 | takeDeadlineAt | ✅ |
| 抢单冲突 | HTTP200 code=4093 bizCode=**ORDER_TAKEN** 文案「很抱歉，该订单已被其他人领取」→ 弹「我知道了」置已被抢 | ✅ 前端已接（bizCode 精确匹配） |
| 禁止接单 | 抢单接口校验：HTTP403 code=4031 bizCode=**ACCOUNT_BLOCKED** 文案「您的账号状态异常，请联系客服咨询」 | ✅ request.js 透出文案 toast |
| 抢单成功 | 「恭喜你，抢单成功」 | ✅ |
| 列表筛选/分页 | keyword（订单号/ID）、page/pageSize（默认20最大100） | ✅ |

### 3. 派单消息
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 完整订单卡片 | 后端回复：每项带**完整 order 对象** | ✅ |
| 预估到手（=俱乐部到手收益） | **order.hallAmount**（后端已补，测试环境已更新）；固定值超订单金额取订单金额、含平台加减价、最小 0 | ✅ 前端直接展示，不再 amount+clubAdjust 自算，空显 "—" |
| 派单客服（实名） | **order.ownerName** | ✅ |
| 订单标签（售后中/冻结） | frozen / afterSaleFlag | ✅ |
| 接单/拒绝 | accept / reject（reason 可选） | ✅ |

### 4. 打手列表
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 筛选：打手ID（完全）、名称（模糊）、手机号（完全）、状态、创建时间 | GET /api/club/players：**id / name / phone / clubId / clubName / createdFrom / createdTo / accountStatus** | ✅ 前端已改（原来误用 keyword/status，现按接口字段透传；accountStatus 取值与文档枚举一致：可接单/禁止接单/未冻结/冻结/在店/退店） |
| 列表：ID/名称/俱乐部名称/收益余额/押金余额/已完成/未通过/冻结/状态/操作（编辑/退店） | 列表含**收益余额、押金余额、已完成、未通过、冻结订单数**，以及**可接单/冻结/在店**三个状态；字段名已确认（2026-10-26）：`incomeBalance`/`depositBalance`/`completedCount`/`rejectedCount`/`frozenCount`，状态用 `canTake`/`inStore`/`walletFrozen`；无单独 accountStatus 返回字段 | ✅ 前端已全部改接 |
| 编辑/新增：名称*（唯一）、手机号*（唯一）、密码*（≥6位）、可接单规格* | POST/PUT players + specs；编辑回显 GET /players/{id}（名称/手机/俱乐部/备注/文件/可接单规格） | ⚠️ 字段名待分享页响应示例 |
| **退店（仅"在店"展示，二次确认）** | **PUT /api/club/players/{id}/flags，body 只传 {"inStore":0}** | ✅ 前端已接入（AppModal 二次确认） |
| 新数据默认：可接单+未冻结+在店 | 后端保证 | ✅ |
| 资产管理 | POST /players/{id}/wallet-adjust（后端新增） | ✅ 前端预留 |

### 5. 我的订单
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 列表 Tab：全部/进行中/已完成 | GET /api/club/orders/mine：**tab=ALL/ONGOING(待接单WAIT_TAKE+进行中IN_PROGRESS)/DONE/CLOSED**、keyword(订单号/ID)、sort=createdAt(默认)/dispatchedAt/takenAt/completedAt、order=desc/asc、page/pageSize；**服务端分页** | ✅ 前端已改服务端分页（状态筛选项对齐 tab 枚举，下拉「进行中（含待接单）」） |
| 说明「进行中且已驳回」不置顶 | 接口不排，**前端当前页内置顶** | ✅ 前端已实现 |
| 详情 | GET /api/club/orders/{id} | ⚠️ 详情页未建（弹窗详情已用列表数据） |
| **申请验收**（coverUrl/endUrl/progressUrls + 备注 0/200） | POST /api/club/orders/{id}/submit（body：remark、coverUrl、endUrl、progressUrls；仅本俱乐部锁定的订单可交） | ✅ 前端提交格式已对齐 |
| 状态：待接单/进行中/已完成/交易关闭 | mine/detail 返回 status（WAIT_TAKE/IN_PROGRESS/COMPLETED/CLOSED） | ✅ |
| 收益 7 日后入账 | 账期说明（原型文案） | ✅（结算规则后端保证） |

### 6. 我的钱包
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 可提现余额 | GET /api/club/wallets/me → data={**income**(可提现收益), **deposit**(押金), **walletFrozen**} | ✅ 前端已对齐（income 为可提现余额） |
| 明细（类型/金额/原因/关联订单号） | GET /api/club/wallets/txns（walletType/page/pageSize；时间筛选 **createdFrom/createdTo**，后端已确认将补此参数；**类型筛选 bizType 传中文枚举**：订单收入/提现成功/提现失败/平台扣除/转单扣除/余额抵扣/平台充值/充值，2026-10-26 接口校验提示确认） | ✅ 2026-10-26 押金页由本地筛全量改为服务端筛选，两页改条件即调接口 |
| 提现条件 | GET /api/club/wallets/withdraw-rules?walletType=INCOME：**dailyLimit(次数上限)/usedToday/remainToday/windowStart/windowEnd/inWindow/minAmount(90)/showWithdraw(true)** | ✅ 前端已改接后端新字段（原来 dailyMaxTimes/availableHourStart/End，已废弃）；inWindow 后端算好直接读，缺失回退本地解析时段 |
| 提现 | POST /api/club/wallets/withdraw | ✅ 前端已接（实名校验+规则校验+二次确认） |
| 提现失败原因映射 | 提现记录/通知 | ⚠️ 待核 |
| 冻结不可提现「您的钱包已被冻结，请联系客服咨询」 | wallets/me walletFrozen | ✅ 前端已有 |

### 7. 我的押金
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 押金余额/明细 | wallets/me（data.deposit）+ wallets/txns?walletType=DEPOSIT | ✅ |
| **提现按钮展示条件** | **withdraw-rules?walletType=DEPOSIT 的 showWithdraw**（已退店满14天且钱包未冻结才 true） | ✅ 前端已改（接口优先，失败回退本地计算） |
| 押金提现无 90 元限制 | 后端明确：押金没有 90 元限制（仅收益有，minAmount 为空） | ✅ 押金页无 min 校验 |
| 提现前实名校验 | NOT_REALNAME / real-name | ✅ |

### 8. 配置管理
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 打手接单设置：可直接接公共订单 / 必须先由俱乐部接单 | GET/PUT /api/club/settings（publicGrab 1/0） | ✅ 前端已接；**切换不自动保存**（原型无实时生效标注），与分润设置一起由分润区「提交/保存」按钮统一提交（按脏标记分别调接口） |
| **打手分润设置·百分比**：打手分润（原型 0≤值<100；后端 2026-10-26 确认 **≥0 且 <100 的整数，允许 0**）/ 俱乐部分润=100-打手分润 | **settings：profitMode(PERCENT，仅响应)、playerRate(保存传)、clubShareRate(100-playerRate 只展示不提交)**；保存 = PUT /api/club/settings 同时带 publicGrab+playerRate | ✅ 前端已改：初始分润模式取 settings.profitMode；百分比保存并入 settings（playerRate 校验 0-99，与原型一致） |
| **打手分润设置·固定值**：仅本俱乐部规格、金额0及正数、未配置优先展示、搜索、分页 | GET /api/club/settings/player-profits：**服务端分页 keyword/page/pageSize → {total,page,pageSize,list}**；list 每项 **gameId/gameName/specId/specName/playerFixed/configured(0未填1已填)**（**名称已由接口下发**，如「三角洲行动」「护航」；表格显示 gameName + " / " + specName；**不要用 GET /api/club/specs/mine 渲染此表**——它只返回授权的 gameId/specId 无名称）；保存 PUT **{items:[{specId,playerFixed}]}**，空行跳过、0 和正数、最多两位小数 | ✅ 前端已改：服务端分页+搜索防抖；行内金额编辑 playerFixed；未配置(configured=0)当前页置顶；保存只提交已填项；名称直接显示、缺失回退 #ID |

### 9. 消息通知
| 原型字段/交互 | 接口/口径 | 对齐 |
|--------------|---------|------|
| 通知列表 | GET /api/club/notifications（2026-10-23 已补全字段：id/scene/sceneLabel/title/content/bizKey/readFlag/createdAt/**orderId/jumpTarget/orderNo/timeText**，分页 page 从 1、pageSize 默认20最大100，响应 {total,page,pageSize,list,**unread,badge**}） | ✅ 前端已按最新字段更新 |
| 未读数（超99显示99+） | **GET /api/club/notifications/unread** 返回 **{unread,badge}**（badge 超 99 为字符串 '99+'） | ✅ 前端已接（铃铛角标+列表页；展示层优先用后端 badge 字符串） |
| **实时推送** | **/ws/notify?token={token}&client=CLUB**（token URL 编码；client 必须与 token 同端，不传按后台；**网关原样转发需保留基础路径前缀**，如 ws://sys.test.weilaidong.com/wld-dj/ws/notify） | ✅ 前端已接；TEST 环境 env.js 已显式填真实地址，token/client 连接时自动注入（重连刷新最新 token）；其余环境占位时按 apibaseURL 同域推导 |
| 实时推送 JSON | 新通知 **type=NOTIFICATION**（含 id/scene/sceneLabel/title/content/orderId/jumpTarget/timeText/unread/badge）；标记已读后 **type=UNREAD**（只含 unread/badge） | ✅ 前端已接（NOTIFICATION 入列+同步未读角标；UNREAD 只更新未读角标） |
| 单条已读 | POST /api/club/notifications/{id}/read → {ok}；已读后 WS 推 type=UNREAD | ✅ |
| 查看跳转 | 有订单时 **jumpTarget=ORDER**，用 orderId 打开订单详情 | ⚠️ **俱乐部端暂无订单详情页**：前端暂按现有规则跳「订单列表并搜索 orderNo」，详情页上线后再改 /orders/{orderId}（见第三节④） |
| 后台弹框 | 后台需要弹框的通知仍走 **/ws/admin**，内容为「标题：内容」纯文本，**不是这套 JSON** | ✅ 仅平台后台（ADMIN 端），俱乐部端不受影响 |

---

## 三、接口问题清单（转后端确认/补充）

1. **【已解决】6 模块分享页可见性**：后端回复分享页不用另开（侧边栏「未来洞电竞→俱乐部后台」），并给出 6 模块直接打开链接；grabState/hallAmount 已写入可接列表响应，派单消息已带完整 order。前端已按直开链接+字段定义核对完成。
2. **【已解决】固定值表格名称**：后端确认 player-profits list 已带 gameName/specName（"三角洲行动 / 护航"），不要用 specs/mine 渲染此表；前端当前实现即为该口径，无需改动。
3. **【已解决】我的订单「俱乐部接单时间」筛选**：后端确认接口已有 **takenFrom/takenTo** 参数（对应原型该筛选项，**非 createdFrom/createdTo**），前端已恢复该筛选项并改接这两个参数（2026-10-26）。
4. **【已解决】打手列表响应示例残缺**：后端已补全 Apifox 526572935，测试服已返回 id/name/phone。**字段名确认（勿用旧名）**：统计列 = `incomeBalance`(收益余额)/`depositBalance`(押金余额)/`completedCount`(已完成)/`rejectedCount`(未通过)/`frozenCount`(冻结订单数)，**不要用 income/deposit/finished/failed/freezeCount**；列表无单独 accountStatus 返回字段，**accountStatus 只用于筛选**（枚举 CAN_TAKE/BLOCK_TAKE/UNFROZEN/FROZEN/IN_STORE/QUIT）；列表状态用 `canTake`(1/0)/`inStore`(1/0)/`walletFrozen`(1/0)；转单弹窗用 name/id。前端已全部改接（2026-10-26）。
5. **【已解决】orders/mine 详情展示字段**：后端 2026-10-26 确认并补齐——派单备注 `dispatchRemark`（与历史 remark 同值）、完成时间 `completedAt`（验收通过时间，未完成为空）、取消时间 `closedAt`（交易关闭时间，未关闭为空）、收益入账天数 `settleDays`（已验收用快照，未完成用当前分润配置，都没有为空；**勿绑 settleDaysSnapshot**）；详情接口 GET /api/club/orders/{id} 同样带。Apifox「我的订单（俱乐部）」526320879 已同步。前端已按此绑定（列表+详情通用，mapOrder 一处映射），详情弹窗：派单备注（有值显示）/完成时间（已完成）/取消时间（交易关闭）/「收益将在 X 日后入账」提示（已完成，settleDays 缺失默认 7 日）。
6. **提交验收功能不存在（2026-10-26 核实）**：俱乐部后台「我的订单」原型（n44 屏）**无「提交验收/申请验收」入口**——该功能在 C 端打手「我的订单」屏。前端原有「提交验收」按钮+弹窗（含进度截图上传 coverUrl/endUrl/progressUrls）为按 C 端原型误加，**已从俱乐部后台删除**（保留 clubOrder.submit 接口不动）。
7. **【已解决】打手分润 0% 口径差异**：后端 2026-10-26 确认**允许 0**，口径 = 大于等于 0、小于 100 的整数（Apifox 保存配置已改同一句说明）。前端校验已放开 0（0-99，与原型一致）。
8. **【已解决】俱乐部订单详情页**：GET /api/club/orders/{id} 接口已有；**详情页已由前端建成**（2026-10-26）：路由 `/orders/order-detail/:orderId`（OrderDetailView，复用「我的订单」详情弹窗结构：订单信息/打手信息/分润信息/存单信息/订单日志/完成凭证/订单备注）；通知 jumpTarget=ORDER 已改跳该页（优先 orderId，缺失回退订单列表搜索 orderNo）。
9. **【已解决】上传文件三端 token**：后端 2026-10-26 确认三端隔离已生效——`/api/admin/files/upload`（ADMIN 平台后台）、`/api/club/files/upload`（CLUB 俱乐部端）、`/api/player/files/upload`（打手 C 端）各验各端 JWT、密钥不同，拿错端 token 返回 401。前端已按端使用对应地址，无需改动。
10. **【已解决】钱包流水时间筛选参数**：原型「钱包明细/押金明细」筛选 = 类型 + 时间（开始~结束）。后端确认补参数，**参数名即用前端已透传的 createdFrom/createdTo**（与其它列表接口一致），前端零改动；改完推分支并更新 Apifox（2026-10-26）。**押金页已同步改为服务端筛选**（改条件即调接口）；**类型筛选 bizType 传中文枚举**（订单收入/提现成功/提现失败/平台扣除/转单扣除/余额抵扣/平台充值/充值，接口校验提示即此列表，2026-10-26 确认）。
11. **【已解决】抢单大厅子订单过滤**：后端 2026-10-26 确认 grabHall 已在服务端过滤——查询条件 `parent_order_id IS NULL`（子订单不出现）+ `frozen = 0` + `after_sale_flag = 0`；子订单挂在主订单上跟着接单人走。前端「售后中/冻结」隐藏保留，子订单过滤无需再加。
12. **我的订单「已转单」字段确认（2026-10-26 新增，转后端）**：原型批注（n44 屏，杨子杰）「①若订单已转单，不在此处展示」——指已转单订单的**转单按钮不展示**。前端已按此实现（canTransfer 加 !transferred，兼容 o.transferred / o.transfer），但 **orders/mine 响应示例未见 transferred/transfer 字段**——请后端确认该订单是否已转单的字段名（Apifox 526320879 补一下示例），未返回时前端默认未转单（按钮照常显示）。

---

## 四、前端已改清单（2026-10-26 v5，均通过 `npm run build`）

| # | 文件 | 改动 |
|---|------|------|
| 1 | `src/api/request.js` | 支持 FormData 上传；**错误对象挂载 code/bizCode/status**（供 ORDER_TAKEN/ACCOUNT_BLOCKED/NOT_REALNAME 精确分支） |
| 2 | `src/api/modules/file.js` | 新增 POST /api/club/files/upload（CLUB token） |
| 3 | `src/api/modules/clubAccount.js` | 新增 me / real-name |
| 4 | `src/api/modules/clubOrder.js` | grabHall 支持 keyword/page/pageSize；submit 改 {coverUrl,endUrl,progressUrls,remark}；**myOrders 改服务端分页参数 {tab,keyword,sort,order,page,pageSize}** |
| 5 | `src/api/modules/dispatch.js` | list 支持 createdAt |
| 6 | `src/api/modules/player.js` | **新增 quitStore(id) → PUT /api/club/players/{id}/flags {"inStore":0}** |
| 7 | `src/api/modules/wallet.js` | withdrawRules(walletType) 注释按后端新字段更新：dailyLimit/usedToday/remainToday/windowStart/windowEnd/inWindow/minAmount/showWithdraw |
| 8 | `src/api/modules/clubConfig.js` | **按后端 aa99193c 字段定义全量重写**：get() 读 publicGrab/profitMode/playerRate/clubShareRate；save({publicGrab, playerRate})；getPlayerProfits({keyword,page,pageSize})；savePlayerProfits({items}) |
| 9 | `src/api/modules/notify.js` | **新增 unread()** → GET /api/club/notifications/unread |
| 10 | `src/api/notifySocket.js` | **真实推送地址改 /ws/notify?token={token}&client=CLUB**（同域 ws 推导；websocketURL 配置非占位时优先；仅 local useMock 回落 mock） |
| 11 | `src/stores/notify.js` | 未读数改走后端 unread 接口（未拉取时回退本地推导）；已读/全部已读后刷新未读数 |
| 12 | `src/views/orderManagement/ClaimHallView` | **金额改 hallAmount**（本俱乐部收益，空显"—"，不再乘分润）；**待抢/已抢改 grabState（OPEN/TAKEN）**，缺失回退 status；冲突按 bizCode=ORDER_TAKEN/code=4093 精确命中弹「我知道了」置已抢 |
| 13 | `src/views/orderManagement/DispatchMessageView` | **预估到手改 order.hallAmount**（不再 amount+clubAdjust 自算，空显"—"）；客服姓名 ownerName |
| 14 | `src/views/orderManagement/MyOrdersView` | **改服务端分页**：myOrders 传 {tab:ALL/ONGOING/DONE/CLOSED, keyword, page, pageSize}，total/list 渲染；状态下拉对齐 tab 枚举（「进行中（含待接单）」）；「进行中且已驳回」当前页内置顶；**恢复「俱乐部接单时间」筛选项并改接 takenFrom/takenTo**（后端 2026-10-26 确认存在）；**转单弹窗候选打手改接 GET /api/club/players（原 mock 写死，接口失败回退 mock）**；**2026-10-26 按俱乐部后台原型（n44 屏）纠正**：①**删除「提交验收」按钮+弹窗**（原型无，属 C 端功能）；②详情弹窗回滚为原型结构（订单信息[订单金额=amount/购买项目/派单客服/订单状态/角色名/游戏规格/打手人数/客户端/组队码/创单时间/俱乐部接单时间]+打手信息+分润信息+存单信息[非三角洲仅备注]+订单日志[仅状态变动]+完成凭证+订单备注）；③操作列按批注①「冻结/售后中标签下无操作按钮」→ 显示「—」；④加减价弹窗恢复批注③提示「加：最多为俱乐部真实收益值」并加校验；⑤**绑定后端确认字段**：派单备注 dispatchRemark（与 remark 同值）/完成时间 completedAt/取消时间 closedAt/收益入账天数 settleDays（勿绑 settleDaysSnapshot），详情弹窗按状态展示；⑥**操作列按批注①「若订单已转单，不在此处展示」→ 转单按钮加 !transferred 判断**（已转单不展示，字段名转后端确认见第三节-12）
| 15 | `src/views/userManagement/PlayerListView` | **筛选参数改接口字段**：id(完全)/name(模糊)/phone(完全)/accountStatus(状态，**枚举 IN_STORE/QUIT**)/createdFrom/createdTo(创建时间)，替换原 keyword/status；退店接入真实接口（PUT flags {"inStore":0}）；**2026-10-26 补「俱乐部名称」列（原型列表字段表有）+筛选状态文案「离店」→「退店」+统计列改接后端确认字段名 incomeBalance/depositBalance/completedCount/rejectedCount/frozenCount（勿用 income/deposit/finished/failed/freezeCount）+状态推导补 walletFrozen** |
| 16 | `src/views/financialManagement/MyWalletView` | **提现规则改后端新字段**：dailyLimit(次数)/remainToday(剩余)/inWindow(时段内)/windowStart/windowEnd(时段展示)/minAmount(90)；inWindow 后端算好直接读、缺失回退本地解析；提现前实名；**2026-10-26 移除「提现金额不能超过可提现余额」校验**（原型批注③「支持将账号余额扣为负数」）；其余已对齐：类型+时间筛选（createdFrom/createdTo）、全部提现、二次确认（支付宝账号+姓名）、冻结/次数/时间/90元校验 |
| 17 | `src/views/financialManagement/MyDepositView` | **提现规则改后端新字段**（同上）；提现按钮看 DEPOSIT 规则 showWithdraw（接口失败回退本地：退店14天+未冻结）；押金无 90 元限制 |
| 18 | `src/views/configurationManagement/ClubConfigView` | **按后端 aa99193c 字段定义全量重写**：初始分润模式取 settings.profitMode(PERCENT/FIXED)；百分比提交并入 PUT settings {publicGrab, playerRate}（clubShareRate=100-playerRate 只展示）；固定值改**服务端分页**（keyword 防抖搜索、page/pageSize、total/list、configured 0置顶、playerFixed 行内编辑）；保存体 {items:[{specId,playerFixed}]} 空行跳过；删除原型没有的"从可接规格填充"按钮与"本俱乐部可接规格"独立区块；切换不自动保存、统一由提交/保存按钮按脏标记提交；**2026-10-26 打手分润校验放开 0**（后端确认 ≥0 且 <100 的整数，与原型批注一致） |
| 19 | `src/config/env.js` | uplobaseURL 标注废弃；websocketURL 为连接地址（token/client 连接时自动注入；占位则按 apibaseURL 同域推导）；TEST 环境显式填真实 ws 地址 |
| 20 | `src/api/modules/notify.js` | **列表接口补 page/pageSize 分页参数**；unread 返回结构改 {unread,badge} |
| 21 | `src/api/notifySocket.js` | **WS 地址推导保留 apibaseURL 基础路径前缀**；推送协议注释更新为 type=NOTIFICATION / type=UNREAD |
| 22 | `src/stores/notify.js` | **badge 状态（后端角标字符串）**；normalize/mapApiItem 补 sceneLabel/orderId/jumpTarget/orderNo/timeText；handleIncoming 按 type 分发 UNREAD/NOTIFICATION；loadFromApi/refreshUnread 适配 {list,unread,badge} |
| 23 | `src/views/handoverCenter/SystemNotifyView` | 相对时间优先用后端 **timeText**；类型标签优先用后端 **sceneLabel** |
| 24 | `src/layout/index.vue` | 铃铛角标优先显示后端 **badge 字符串**（超 99 为 99+） |
| 25 | `src/utils/notifyJump.js` | **jumpTarget=ORDER 跳转规则**：详情页上线前暂跳订单列表并搜索 orderNo；**2026-10-26 二改：跳「我的订单」列表 + 锁定订单号 + 自动打开查看弹窗**（/orders/my-orders?orderNo=xxx&openDetail=1；优先 orderNo 定位，缺失仅进列表）——弹窗字段与详情接口一致，关闭后可继续列表内加减价/转单等操作 |
| 26 | `src/stores/notify.js` | **ws 断连兜底机制**：①断连/重连等待期间每 60s 轮询一次未读角标（GET /api/club/notifications/unread），connected 后停止并立即追一次未读数，覆盖长时间断连/网关静默吞包的角标滞后；②监听 visibilitychange，回到前台（tab 可见）时刷新未读数+列表，覆盖挂后台回来角标旧；不做列表全量轮询（列表进页面才拉取） |
| 27 | `src/views/orderManagement/OrderDetailView` | **订单详情整页（2026-10-26 建，同日通知跳转改回列表+弹窗方案后暂无入口，路由/文件保留备用）**：路由 /orders/order-detail/:orderId（hidden）；数据源 GET /api/club/orders/{id}；字段与「我的订单」查看弹窗完全一致（复用同一套 mapOrder 映射） |
| 28 | `src/router/index.js` | **注册订单详情路由** /orders/order-detail/:orderId（hidden，2026-10-26 通知改回列表+弹窗后无入口，保留备用）；**2026-10-26 通知跳转：/orders/my-orders?orderNo=xxx&orderId=yyy&openDetail=1 → MyOrdersView 锁定订单号搜索（依次尝试 ALL→CLOSED→DONE→ONGOING，覆盖「交易关闭」等失效订单）→ 命中自动打开查看弹窗（openDetail 一次性标记）；全部状态未命中 → 用 orderId 调详情接口直接打开弹窗（列表外订单也能看详情，提示「该订单不在列表中，已为你打开详情」）；详情接口也失败才提示「订单不存在」并恢复全量列表** |
| 29 | `src/components/SearchComponent/index.vue` + `MyOrdersView` / `PlayerListView` | **2026-10-26 公共搜索组件修复（用户报"重置/清除单字段后查询条件还在"）**：①**新增 change 事件**——字段被**清除（el-input/@clear、el-select/el-cascader/el-radio/el-date-picker/@change）**时 emit 当前表单值，仅同步父组件 filter、不触发查询（保持"点搜索才查"）；②**touched 机制**——用户交互后不再被 initialValues 深监听重建覆盖（防父组件 filter 异步变化把旧条件回填）；③两页面绑定 `@change="handleFilterChange"`（Object.assign filter）。**效果**：点叉号/改选项后 filter 立即同步，之后搜索/翻页/切 Tab 不再带旧条件。运行时已验证（状态下拉选「已完成」→ 搜索 → 请求带 tab=DONE&keyword=123） |

**待后端补充**：无（6 项问题全部已解决：players 响应已补全、分润 0% 已放开、详情页前端已建、钱包/押金时间参数已落地分支 8898282、提交验收后端已知悉、上传三端隔离已生效）。

---

## 五、字段出处速查（原型 → 接口字段）

| 原型字段 | 接口字段 |
|---------|------------------------------|
| 订单号 | orderNo |
| 游戏名称/规格 | gameName / specName |
| 客户端 | clients |
| 购买项目 | itemName |
| 派单客服（实名） | ownerName（后端口径，非 ownerWecomName） |
| 接单人数（当前/总） | takenCount / playerCount |
| 派单备注 | remark |
| 转单标签 | transferred |
| **预估到手（俱乐部收益）** | **hallAmount**（抢单大厅与派单消息共用；空=未配俱乐部部分润） |
| **待抢/已被抢** | **grabState：OPEN / TAKEN** |
| 订单倒计时 | takeDeadlineAt |
| 进度截图 | coverUrl（首图）/ endUrl（尾图）/ progressUrls（进程图） |
| 企微群二维码 | groupQrUrl |
| 押金/保障 | hold{form:WARRANTY, stored, warrantyTarget, reason, rounds, shots, doneAmount, remainAmount, remark} |
| 订单总金额/加减价 | amount / platformAdjust / clubAdjust |
| 账期 | settleDueAt / settleDaysSnapshot |
| 冻结 | frozen / freezeReason |
| 售后中标签 | afterSaleFlag |
| 派单方式/范围 | dispatchType（SYSTEM）/ hallScope（PUBLIC） |
| 订单属性 | attribute（MAIN）/ parentOrderId |
| 拒绝原因 | rejectReason |
| 退店 | PUT /api/club/players/{id}/flags，body {"inStore":0} |
| 押金提现按钮 | withdraw-rules?walletType=DEPOSIT → showWithdraw |
| 提现规则（收益/押金同一结构） | withdraw-rules → dailyLimit(次数上限)/usedToday/remainToday/windowStart/windowEnd/**inWindow**(时段内)/minAmount(收益90、押金空)/realNameVerified/inStore/quitAt/depositReadyAt/depositReady/walletFrozen/channelReady/serverTime/balance/showWithdraw |
| 接单设置（可直接接公共/俱乐部先接单） | settings → publicGrab(1/0) |
| 百分比分润 | settings → profitMode(PERCENT，仅响应)/playerRate(保存传，1-99整数)/clubShareRate(100-playerRate，只展示) |
| 固定分润列表（服务端分页） | player-profits?keyword&page&pageSize → {total,page,pageSize,list}；list：gameId/gameName/specId/specName/playerFixed/configured(0未填/1已填) |
| 固定分润保存 | PUT player-profits → {items:[{specId,playerFixed}]}（空行跳过；0及正数、最多两位小数） |
| 钱包余额 | wallets/me → {income(可提现收益), deposit(押金), walletFrozen} |
| 我的订单筛选 | orders/mine → tab(ALL/ONGOING/DONE/CLOSED)/keyword/**takenFrom/takenTo(俱乐部接单时间)**/sort(createdAt|dispatchedAt|takenAt|completedAt)/order(desc/asc)/page/pageSize |
| 打手列表筛选 | players → id/name/phone/clubId/clubName/createdFrom/createdTo/accountStatus |
| 未读角标 99+ | GET /api/club/notifications/unread → {unread, badge}（badge 超 99 为 '99+'） |
| 实时推送 | /ws/notify?token={token}&client=CLUB（token URL 编码；保留基础路径前缀如 /wld-dj） |
| 实时推送 JSON | NOTIFICATION（含 orderId/jumpTarget/timeText/unread/badge）/ 已读回执 UNREAD（只含 unread/badge） |
| 通知相对时间 | timeText（刚刚/N分钟前/N小时前/N天前），后端下发 |
| 通知查看跳转 | jumpTarget=ORDER + orderId（订单详情；详情页未建，暂落订单列表搜索 orderNo） |
