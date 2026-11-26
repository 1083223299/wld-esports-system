import {
  computed,
  onActivated,
  onMounted,
  onBeforeUnmount,
  reactive,
  ref,
  toRaw,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { useConfirm } from "../../../composables/useConfirm";
import { handoverApi } from "../../../api/modules/handover";
import {
  request,
  mutate,
  upload,
  download,
  bytesUrl,
  hasHost,
  openHandover,
} from "./api";
import { forms, cleanForm, employee, reason, version } from "./forms/index.js";

let sharedContext;

function formatShanghaiDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const year = part("year");
  const month = part("month");
  const day = part("day");
  if (!year || !month || !day) {
    throw new Error("无法生成日历日期");
  }
  return `${year}-${month}-${day}`;
}

function getIsoDate(date) {
  const match =
    /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(date);
  if (
    !match ||
    new Date(`${date}T00:00:00.000Z`).toISOString().slice(0, 10) !== date
  ) {
    throw new Error("请选择有效日期");
  }
  return date;
}

function getCalendarMonth(date) {
  return getIsoDate(date).slice(0, 7);
}

function cloneFormData(value, seen = new WeakMap()) {
  const raw = value && typeof value === "object" ? toRaw(value) : value;
  if (!raw || typeof raw !== "object") return raw;
  if (raw instanceof Date) return new Date(raw.getTime());
  if (seen.has(raw)) return seen.get(raw);

  const clone = Array.isArray(raw) ? [] : {};
  seen.set(raw, clone);
  for (const [key, nestedValue] of Object.entries(raw)) {
    clone[key] = cloneFormData(nestedValue, seen);
  }
  return clone;
}

function createContext() {
  const identity = ref(null);
  const busy = ref(false),
    loading = ref(false),
    error = ref(""),
    notice = ref(""),
    dirty = ref(false);
  const tab = ref("home"),
    section = ref(""),
    data = ref(null),
    sources = ref({}),
    home = ref(null),
    activeForm = ref(null),
    initial = ref(),
    selected = ref([]),
    result = ref(null),
    seatingPreview = ref(null),
    filterDate = ref(formatShanghaiDate()),
    filterEnd = ref(filterDate.value),
    filterShift = ref("EARLY"),
    filterEmployee = ref(""),
    showTrash = ref(false),
    currentPage = ref(1),
    calendar = ref([]),
    pendingHandovers = ref([]),
    fileCategory = ref("");
  const manager = computed(() =>
      identity.value?.permissions?.includes("pc:manage") ?? false,
    ),
    highest = computed(() =>
      identity.value?.permissions?.includes("pc:highest") ?? false,
    ),
    hasLinkedEmployee = computed(() =>
      identity.value?.linked !== false && identity.value?.employeeId != null,
    );
  const route = useRoute(),
    router = useRouter();
  const { confirm } = useConfirm();
  let initializationReady = false;
  let routeRevision = 0;
  let loadedRouteRevision = -1;
  let loadRevision = 0;
  let connectionPromise = null;
  let connectionRevision = 0;
  let sourcesRevision = 0;
  function resetContext() {
    connectionRevision += 1;
    connectionPromise = null;
    sourcesRevision += 1;
    loadRevision += 1;
    initializationReady = false;
    loadedRouteRevision = -1;
    identity.value = null;
    busy.value = false;
    loading.value = false;
    error.value = "";
    notice.value = "";
    tab.value = "";
    section.value = "";
    activeForm.value = null;
    initial.value = undefined;
    dirty.value = false;
    data.value = null;
    sources.value = {};
    home.value = null;
    selected.value = [];
    showTrash.value = false;
    currentPage.value = 1;
    calendar.value = [];
    fileCategory.value = "";
    result.value = null;
    seatingPreview.value = null;
  }
  router.beforeEach(async (to, from) => {
    const leavingPersonalCenter = from.matched.some(
      (record) => record.name === "PersonalCenter",
    );
    if (!leavingPersonalCenter || to.fullPath === from.fullPath) return true;
    if (activeForm.value && dirty.value) {
      const shouldLeave = await confirm({
        title: "有未保存的修改",
        message: "离开个人中心将丢弃当前表单中的修改。",
        okText: "放弃修改",
        cancelText: "继续编辑",
      });
      if (!shouldLeave) return false;
    }
    resetContext();
    return true;
  });
  const subtabs = {
    content: [
      { id: "announcement", name: "公告" },
      { id: "post", name: "社区帖子" },
      { id: "comment", name: "评论" },
    ],
    files: [
      { id: "file", name: "文件" },
      { id: "category", name: "分类" },
    ],
    assessment: [
      { id: "assessment", name: "考核记录" },
      { id: "veto", name: "否决与申诉" },
      { id: "review", name: "评审决定" },
      { id: "suggestion", name: "建议版本" },
    ],
    manage: [
      { id: "employees", name: "员工关联" },
      { id: "approvalRest", name: "休班审批" },
      { id: "approvalLeave", name: "请假审批" },
      { id: "shifts", name: "立即调班" },
      { id: "seats", name: "工位配置" },
      { id: "templates", name: "考核模板" },
      { id: "periods", name: "考核周期" },
      { id: "scores", name: "考核评分" },
      { id: "vetoes", name: "否决核实" },
      { id: "reviews", name: "转正裁定" },
      { id: "settings", name: "休班规则" },
      { id: "accounts", name: "账号操作" },
    ],
  };
  const tabRoutes = {
    home: "PersonalCenterWorkbench",
    rest: "PersonalCenterRest",
    leave: "PersonalCenterLeave",
    seating: "PersonalCenterSeating",
    content: "PersonalCenterContent",
    files: "PersonalCenterFiles",
    assessment: "PersonalCenterAssessment",
    dashboard: "PersonalCenterDashboard",
    manage: "PersonalCenterManage",
  };
  function syncRoute(routeName, querySection, queryAction) {
      routeRevision += 1;
      const nextTab = Object.keys(tabRoutes).find(
        (key) => tabRoutes[key] === routeName,
      );
      if (!nextTab) {
        if (tabRoutes[tab.value]) resetContext();
        return;
      }
      const nextSection =
        typeof querySection === "string"
          ? querySection
          : subtabs[nextTab]?.[0]?.id || "";
      if (tab.value !== nextTab || section.value !== nextSection) {
        activeForm.value = null;
        initial.value = undefined;
        dirty.value = false;
        result.value = null;
        seatingPreview.value = null;
      }
      tab.value = nextTab;
      section.value = nextSection;
      if (identity.value) {
        if (initializationReady) {
          load();
          if (queryAction === "new") consumeCreateAction();
        }
      } else if (hasHost()) {
        connect();
      }
  }
  router.afterEach((to) =>
    syncRoute(to.name, to.query.section, to.query.action),
  );
  syncRoute(route.name, route.query.section, route.query.action);
  const rows = computed(() =>
    Array.isArray(data.value) ? data.value : data.value?.items || [],
  );
  const labels = {
    pending: "待审批",
    approved: "已批准",
    rejected: "已驳回",
    cancelled: "已撤回",
    revoked: "已撤销",
    active: "有效",
    disabled: "已停用",
    draft: "草稿",
    published: "已发布",
    archived: "已归档",
    deleted: "已删除",
    submitted: "待本人确认",
    confirmed: "已确认",
    disputed: "异议待处理",
    locked: "已锁定",
    valid: "已核实有效",
    invalid: "核实无效",
    unverified: "待核实",
    PASS: "通过",
    DELAY: "延期",
    DEFER: "延期",
    FAIL: "不通过",
    EARLY: "早班",
    MIDDLE: "中班",
    LATE: "晚班",
    PERSONAL: "事假",
    SICK: "病假",
    ANNUAL: "年假",
    COMPENSATORY: "调休",
  };
  function label(x) {
    return labels[x] || x || "—";
  }
  function restReason(reason) {
    return (
      {
        APPLY_GAP: "提交冷却",
        REST_GAP: "休班间隔",
        LEAD_DAYS: "未满足提前量",
        CURRENT_MONTH: "非当前月",
        PAST_DATE: "已过去",
        SHIFT_OFF: "班次轮休",
      }[reason] || "已有占位"
    );
  }
  function message(e) {
    error.value = e instanceof Error ? e.message : String(e);
  }
  async function closeForm() {
    if (
      dirty.value &&
      !(await confirm({
        title: "有未保存的修改",
        message: "关闭表单将丢弃当前填写的内容。",
        okText: "放弃修改",
        cancelText: "继续编辑",
      }))
    ) return;
    activeForm.value = null;
    dirty.value = false;
  }
  function name(id) {
    return sources.value.employees?.find((x) => x.id === id)?.name || id;
  }
  async function connect() {
    if (connectionPromise) return connectionPromise;
    const revision = ++connectionRevision;
    const pending = (async () => {
      error.value = "";
      try {
        const nextIdentity = await request("/identity/me");
        if (revision !== connectionRevision) return;
        identity.value = nextIdentity;
        const startingRouteRevision = routeRevision;
        const results = await Promise.allSettled([refreshSources(), load()]);
        if (revision !== connectionRevision) return;
        initializationReady = true;
        if (routeRevision !== startingRouteRevision) await load();
        const failures = results
          .filter((result) => result.status === "rejected")
          .map((result) =>
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
          );
        if (failures.length) {
          error.value = [error.value, ...failures].filter(Boolean).join("；");
        }
        consumeCreateAction();
      } catch (e) {
        if (revision === connectionRevision) message(e);
      }
    })();
    connectionPromise = pending;
    try {
      await pending;
    } finally {
      if (connectionPromise === pending) connectionPromise = null;
    }
  }
  async function refreshSources() {
    const revision = ++sourcesRevision;
    const paths = {
      categories: "/categories",
      seats: "/seats",
      templates: "/assessments/template?size=100",
      periods: "/assessments/period?size=100",
      suggestions: "/assessments/suggestion?size=100",
      assessments: "/assessments/assessment?size=100",
    };
    if (manager.value) paths.employees = "/employees?size=100";
    const entries = [
      ...Object.entries(paths),
      ...(manager.value ? [["accounts", null]] : []),
    ];
    const results = await Promise.allSettled(
      entries.map(([, path]) =>
        path ? request(path) : handoverApi.accounts(),
      ),
    );
    if (revision !== sourcesRevision) return;
    const nextSources = {};
    const failures = [];
    results.forEach((result, index) => {
      const [key, path] = entries[index];
      if (result.status === "fulfilled") {
        const value = result.value;
        if (key === "accounts") {
          nextSources.accounts = value.map((account) => {
            const id = String(account.accountId ?? "");
            if (!/^\d+$/.test(id)) {
              throw new Error("后台账号列表包含无效数字编号，无法用于员工关联。");
            }
            const name = account.accountName || "未命名账号";
            const phone = account.phone ? ` / ${account.phone}` : "";
            return {
              id,
              name: `${name} / ID ${id}${phone}`,
            };
          });
        } else {
          nextSources[key] = Array.isArray(value) ? value : value.items;
        }
      } else {
        const reason =
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason);
        failures.push(`${path}: ${reason}`);
      }
    });
    sources.value = nextSources;
    sources.value.lockedAssessments = (sources.value.assessments || []).filter(
      (x) => x.state === "locked",
    );
    if (failures.length) {
      throw new Error(`部分表单选项加载失败：${failures.join("；")}`);
    }
  }
  function endpoint() {
    if (tab.value === "rest") return "/requests/rest";
    if (tab.value === "leave") return "/requests/leave";
    if (tab.value === "content")
      return `/content/${section.value || "announcement"}?trash=${showTrash.value}`;
    if (tab.value === "files")
      return section.value === "category"
        ? `/categories?trash=${showTrash.value}`
        : `/files?trash=${showTrash.value}`;
    if (tab.value === "assessment")
      return `/assessments/${section.value || "assessment"}`;
    if (tab.value === "seating")
      return manager.value
        ? "/seating/drafts"
        : `/seating/current?date=${filterDate.value}&shiftId=${filterShift.value}`;
    if (tab.value === "manage") {
      const endpoints = {
        employees: "/employees",
        approvalRest: "/requests/rest",
        approvalLeave: "/requests/leave",
        shifts: "/employees",
        seats: "/seats",
        templates: "/assessments/template",
        periods: "/assessments/period",
        scores: "/assessments/assessment",
        vetoes: "/assessments/veto",
        reviews: "/assessments/review",
        settings: "/settings",
        accounts: "/employees",
      };
      return endpoints[section.value] || "/employees";
    }
    return "";
  }
  async function load() {
    loadedRouteRevision = routeRevision;
    const requestRevision = ++loadRevision;
    const currentTab = tab.value;
    const currentDate = filterDate.value;
    const currentEndDate = filterEnd.value;
    const currentEmployee = filterEmployee.value;
    const currentPageNumber = currentPage.value;
    let nextHome = home.value;
    let nextData = null;
    let nextCalendar = currentTab === "rest" ? [] : calendar.value;
    loading.value = true;
    error.value = "";
    data.value = null;
    if (currentTab === "rest") calendar.value = [];
    const failures = [];
    const failureMessage = (reason) =>
      reason instanceof Error ? reason.message : String(reason);
    try {
      if (currentTab === "home") {
        const [homeResult, notificationsResult, handoverResult] = await Promise.allSettled([
          request("/home"),
          request("/notifications"),
          handoverApi.list({ mine: 1, status: "PENDING", pageSize: 20 }),
        ]);
        if (homeResult.status === "fulfilled") nextHome = homeResult.value;
        else failures.push(`工作台数据：${failureMessage(homeResult.reason)}`);
        if (notificationsResult.status === "fulfilled")
          nextData = notificationsResult.value;
        else
          failures.push(
            `通知数据：${failureMessage(notificationsResult.reason)}`,
          );
        // 交接事项（工作协作 > 交接日志）：我作为关注人且仍待处理的事项，需要在工作台提醒
        if (handoverResult.status === "fulfilled")
          pendingHandovers.value = (handoverResult.value?.list || [])
            .filter((item) => item?.myWatcherStatus === "PENDING")
            .slice(0, 20);
        else pendingHandovers.value = [];
      } else if (currentTab === "dashboard")
        nextData = await request(
          `/dashboard?startDate=${getIsoDate(currentDate)}&endDate=${getIsoDate(currentEndDate)}${currentEmployee ? "&employeeId=" + encodeURIComponent(currentEmployee) : ""}`,
        );
      else {
        const ep = endpoint();
        if (currentTab === "rest" && ep) {
          const [recordsResult, calendarResult] = await Promise.allSettled([
            request(
              ep +
                (ep.includes("?") ? "&" : "?") +
                `page=${currentPageNumber}&size=50`,
            ),
            hasLinkedEmployee.value
              ? request(`/rests/calendar?month=${getCalendarMonth(currentDate)}`)
              : Promise.resolve([]),
          ]);
          if (recordsResult.status === "fulfilled")
            nextData = recordsResult.value;
          else
            failures.push(
              `休班记录：${failureMessage(recordsResult.reason)}`,
            );
          if (calendarResult.status === "fulfilled")
            nextCalendar = calendarResult.value;
          else
            failures.push(
              `休班日历：${failureMessage(calendarResult.reason)}`,
            );
        } else {
          nextData = ep
            ? await request(
                ep +
                  (ep.includes("?") ? "&" : "?") +
                  `page=${currentPageNumber}&size=50`,
              )
            : null;
        }
      }
      if (requestRevision !== loadRevision) return;
      home.value = nextHome;
      data.value = nextData;
      if (currentTab === "rest") calendar.value = nextCalendar;
      if (failures.length) message(new Error(failures.join("；")));
    } catch (e) {
      if (requestRevision === loadRevision) message(e);
    } finally {
      if (requestRevision === loadRevision) loading.value = false;
    }
  }
  function open(form, value) {
    activeForm.value = form;
    initial.value = value ? cloneFormData(value) : undefined;
    result.value = null;
    seatingPreview.value = null;
    error.value = "";
  }
  async function navigate(id, sub, openNew = false) {
    if (
      dirty.value &&
      !(await confirm({
        title: "有未保存的修改",
        message: "离开当前页面将丢弃表单中的修改。",
        okText: "放弃修改",
        cancelText: "继续编辑",
      }))
    ) return;
    activeForm.value = null;
    initial.value = undefined;
    dirty.value = false;
    showTrash.value = false;
    currentPage.value = 1;
    selected.value = [];
    result.value = null;
    seatingPreview.value = null;
    const targetTab = tabRoutes[id] ? id : "home";
    const targetRoute = tabRoutes[targetTab];
    const targetSection = sub || subtabs[targetTab]?.[0]?.id || "";
    const currentSection =
      typeof route.query.section === "string"
        ? route.query.section
        : subtabs[targetTab]?.[0]?.id || "";
    tab.value = targetTab;
    section.value = targetSection;
    if (route.name === targetRoute && currentSection === targetSection) {
      if (openNew) {
        defaultForm();
        return;
      }
      await load();
      return;
    }
    await router.push({
      name: targetRoute,
      query: {
        ...(targetSection ? { section: targetSection } : {}),
        ...(openNew ? { action: "new" } : {}),
      },
    });
  }
  function defaultForm() {
    let key = tab.value === "manage" ? section.value : tab.value;
    if (key === "files") key = "categories";
    const form = forms[key]?.[0];
    if (form) {
      let fields = [...form.fields];
      if (manager.value && ["rest", "leave"].includes(key))
        fields = [
          employee,
          ...fields,
          ...(key === "rest"
            ? [
                {
                  key: "override",
                  label: "最高管理显式特批",
                  type: "checkbox",
                  required: false,
                },
              ]
            : [
                {
                  key: "backfillReason",
                  label: "补录过去日期的原因",
                  type: "textarea",
                  required: false,
                },
              ]),
        ];
      open(
        { ...form, fields },
        key === "settings" && data.value
          ? { ...data.value, expectedVersion: data.value.version }
          : undefined,
      );
    }
  }
  function consumeCreateAction() {
    if (route.query.action !== "new" || !identity.value) return;
    defaultForm();
    const query = { ...route.query };
    delete query.action;
    router.replace({ name: route.name, query });
  }
  async function submit(input) {
    if (!activeForm.value || busy.value) return;
    busy.value = true;
    error.value = "";
    notice.value = "";
    try {
      const body = cleanForm(input);
      result.value = await mutate(activeForm.value.path, body);
      notice.value = "操作已完成";
      dirty.value = false;
      if (body.action === "purgePreview") {
        const preview = result.value;
        open(
          {
            title: "确认永久删除",
            path: activeForm.value.path,
            fields: [
              reason,
              version,
              { key: "confirmationId", label: "确认凭据", required: true },
            ],
          },
          {
            action: "purge",
            expectedVersion: body.expectedVersion,
            confirmationId: preview.id,
          },
        );
        result.value = preview;
        return;
      }
      if (activeForm.value.path === "/shift-changes/preview") {
        open(
          {
            title: "确认立即调班",
            path: "/shift-changes",
            fields: [
              employee,
              { key: "newShiftId", label: "新班次", required: true },
              reason,
              version,
              { key: "override", label: "最高管理显式特批", type: "checkbox" },
            ],
          },
          { ...body, expectedVersion: result.value.employeeVersion },
        );
        result.value = await mutate("/shift-changes/preview", body);
        return;
      }
      if (activeForm.value.path.endsWith("/preview")) {
        const preview = result.value;
        open(
          {
            title: "发布座次版本",
            path: activeForm.value.path.replace("/preview", "/publish"),
            fields: [
              version,
              { key: "previewToken", label: "预览凭据", required: true },
            ],
          },
          { expectedVersion: body.expectedVersion, previewToken: preview.id },
        );
        result.value = preview;
        return;
      }
      activeForm.value = null;
      await refreshSources();
      await load();
    } catch (e) {
      if (e?.code === "STALE_VERSION") {
        const conflictMessage = `${e.message}。列表已刷新，当前表单内容已保留；请关闭后重新打开该记录，再确认最新信息后保存。`;
        await load();
        const refreshError = error.value;
        message(
          new Error(
            refreshError
              ? `${conflictMessage} 刷新列表失败：${refreshError}`
              : conflictMessage,
          ),
        );
      } else {
        message(e);
      }
    } finally {
      busy.value = false;
    }
  }
  function actionForm(row, action) {
    const isRequests =
      ["rest", "leave"].includes(tab.value) ||
      ["approvalRest", "approvalLeave"].includes(section.value);
    let path = "",
      fields = [version],
      title = label(action);
    if (isRequests) {
      const kind =
        tab.value === "rest" || section.value === "approvalRest"
          ? "rest"
          : "leave";
      path = `/requests/${kind}/${row.id}/review`;
      title =
        {
          approve: "批准申请",
          reject: "驳回申请",
          cancel: "撤回申请",
          revoke: "撤销已批申请",
        }[action] || action;
      if (["reject", "revoke"].includes(action)) fields.push(reason);
      if (action === "approve" && highest.value && kind === "rest")
        fields.push(
          { key: "override", label: "休班显式特批", type: "checkbox" },
          { ...reason, required: false },
        );
    } else if (tab.value === "content") {
      path = `/content/${section.value}/${row.id}/actions`;
      title =
        { delete: "删除内容", restore: "恢复内容", read: "标为已读" }[action] ||
        action;
      if (action === "delete") fields.push(reason);
    } else if (
      tab.value === "assessment" ||
      (tab.value === "manage" && ["scores", "vetoes"].includes(section.value))
    ) {
      const veto = section.value === "veto" || section.value === "vetoes";
      path = veto
        ? `/vetoes/${row.id}/actions`
        : `/assessments/${row.id}/actions`;
      title =
        {
          submit: "提交完整考核",
          confirm: "确认考核",
          feedback: "提出异议",
          resolve: "处理异议",
          lock: "锁定考核",
          revise: "创建修订版本",
          appeal: "提交申诉",
          verify: "核实否决",
        }[action] || action;
      if (
        ["feedback", "resolve", "revise", "appeal", "verify"].includes(action)
      )
        fields.push(reason);
      if (action === "appeal")
        fields.push({
          key: "evidence",
          label: "申诉材料",
          required: true,
          type: "textarea",
        });
      if (action === "verify")
        fields.push({ key: "valid", label: "核实有效", type: "checkbox" });
    } else if (tab.value === "files") {
      const kind = section.value === "category" ? "category" : "file";
      path = `/trash/${kind}/${row.id}`;
      title =
        action === "delete"
          ? "移入回收站"
          : action === "restore"
            ? "恢复对象"
            : "永久删除范围预检";
      if (action === "restore")
        fields.push(
          {
            key: "targetCategoryId",
            label: "恢复目标分类",
            type: "select",
            source: "categories",
            required: false,
          },
          { key: "newName", label: "重命名（可选）" },
        );
    }
    open({ title, path, fields }, { action, expectedVersion: row.version });
  }
  async function previewDraft(row) {
    if (busy.value) return;
    busy.value = true;
    error.value = "";
    try {
      const path = `/seating/drafts/${row.id}/preview`;
      const body = { expectedVersion: row.version };
      const preview = await mutate(path, body);
      activeForm.value = null;
      initial.value = undefined;
      result.value = preview;
      seatingPreview.value = {
        draftId: row.id,
        expectedVersion: body.expectedVersion,
        previewToken: preview.id,
      };
    } catch (e) {
      message(e);
    } finally {
      busy.value = false;
    }
  }
  async function publishPreview() {
    const preview = seatingPreview.value;
    if (!preview || busy.value) return;

    busy.value = true;
    try {
      const shouldPublish = await confirm({
        title: "确认发布座次",
        message: "发布后将正式生效当前预览中的座次安排，确定继续吗？",
        okText: "确认发布",
      });
      if (!shouldPublish) return;

      await mutate(`/seating/drafts/${preview.draftId}/publish`, {
        expectedVersion: preview.expectedVersion,
        previewToken: preview.previewToken,
      });
      seatingPreview.value = null;
      result.value = null;
      notice.value = "座次版本已发布";
      await load();
    } catch (e) {
      message(e);
    } finally {
      busy.value = false;
    }
  }
  async function currentSeats() {
    try {
      result.value = await request(
        `/seating/current?date=${filterDate.value}&shiftId=${filterShift.value}`,
      );
    } catch (e) {
      message(e);
    }
  }
  async function uploadFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    busy.value = true;
    try {
      await upload("file", file, { categoryId: fileCategory.value });
      notice.value = "文件已上传";
      await load();
    } catch (err) {
      message(err);
    } finally {
      busy.value = false;
      e.target.value = "";
    }
  }
  /** 证明材料图片的本地预览地址（objectURL，由调用方负责回收） */
  async function attachmentSrc(file) {
    return bytesUrl("attachment", file);
  }
  /** 跳转到工作协作 > 交接日志处理待办事项 */
  function goHandover() {
    router.push("/handover/log");
  }
  async function fileDownload(row) {
    busy.value = true;
    try {
      await download("file", row);
      notice.value = "下载已交给桌面保存，请留意保存结果";
    } catch (e) {
      message(e);
    } finally {
      busy.value = false;
    }
  }
  async function batchApprove() {
    busy.value = true;
    try {
      const kind = section.value === "approvalRest" ? "rest" : "leave";
      result.value = await mutate(
        `/requests/${kind}/batch-review`,
        selected.value.map((x) => ({
          id: x.id,
          action: "approve",
          expectedVersion: x.version,
        })),
      );
      selected.value = [];
      await load();
    } catch (e) {
      message(e);
    } finally {
      busy.value = false;
    }
  }
  async function attachments(row) {
    try {
      result.value = await request(
        `/attachments?leaveId=${encodeURIComponent(row.id)}`,
      );
    } catch (e) {
      message(e);
    }
  }
  async function readNotice(row) {
    try {
      await mutate(`/notifications/${row.id}/read`, {
        expectedVersion: row.version,
      });
      await load();
    } catch (e) {
      message(e);
    }
  }
  function handover() {
    try {
      openHandover();
    } catch (e) {
      message(e);
    }
  }
  function beforeUnload(e) {
    if (dirty.value) {
      e.preventDefault();
      e.returnValue = "";
    }
  }
  function activate() {
    if (!identity.value && hasHost()) return connect();
    if (
      identity.value &&
      initializationReady &&
      loadedRouteRevision !== routeRevision
    ) {
      return load();
    }
  }
  onMounted(() => {
    window.addEventListener("beforeunload", beforeUnload);
    if (!initializationReady) connect();
  });
  onBeforeUnmount(() =>
    window.removeEventListener("beforeunload", beforeUnload),
  );

  return reactive({
    identity,
    busy,
    loading,
    error,
    notice,
    dirty,
    tab,
    section,
    data,
    sources,
    home,
    activeForm,
    initial,
    selected,
    result,
    seatingPreview,
    filterDate,
    filterEnd,
    filterShift,
    filterEmployee,
    showTrash,
    currentPage,
    calendar,
    fileCategory,
    manager,
    highest,
    hasLinkedEmployee,
    subtabs,
    rows,
    label,
    restReason,
    message,
    closeForm,
    name,
    connect,
    refreshSources,
    endpoint,
    load,
    open,
    navigate,
    defaultForm,
    consumeCreateAction,
    submit,
    actionForm,
    previewDraft,
    publishPreview,
    currentSeats,
    uploadFile,
    fileDownload,
    attachmentSrc,
    goHandover,
    pendingHandovers,
    batchApprove,
    attachments,
    readNotice,
    handover,
    download,
    activate,
  });
}

export function usePersonalCenterPage() {
  if (!sharedContext) sharedContext = createContext();
  onActivated(() => sharedContext.activate());
  return sharedContext;
}
