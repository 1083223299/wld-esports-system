# wlddj-esports-system

未来洞电竞桌面应用程序

## 个人中心

个人中心页面按 `src/views/personalCenter/PersonalCenterView` 组织，二级路由分别加载 `pages/` 下的独立 Vue 页面；页面模板各自维护，通用业务状态位于 `usePersonalCenterPage.js`，表单定义按申请、社区、文件、排班、考核和管理拆在 `forms/` 中，表单控件及列表操作位于 `components/`。页面复用当前登录会话和主项目请求层，切换时会缓存输入状态。

个人中心桌面端业务接口根路径为 `/api/admin/pc/v1`，复用主后台登录 JWT，并由主项目 API 地址拼接此前缀；写请求携带 `Idempotency-Key`。部署并启用个人中心服务后才能使用业务数据和操作；当前项目保留已有订单、用户及财务页面，不以个人中心页面替代它们。