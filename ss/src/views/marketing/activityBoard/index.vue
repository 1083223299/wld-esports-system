<template>
  <div class="activity-board-wrapper">
    <el-card class="board-card" shadow="never" v-loading="pageLoading">
      <div class="board-header">
        <div>
          <div class="page-title">活动统计看板</div>
        </div>
        <div class="header-actions">
          <span class="date-filter-label">日期范围：</span>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始年月日"
            end-placeholder="结束年月日"
            format="yyyy-MM-dd"
            value-format="yyyy-MM-dd"
            :picker-options="datePickerOptions"
            @change="handleDateRangeChange"
          />
        </div>
      </div>

      <el-tabs
        v-model="activeActivityId"
        class="activity-tabs"
        @tab-click="handleActivityTabChange"
      >
        <el-tab-pane
          v-for="item in activityBoards"
          :key="item.activityId"
          :label="item.activityName"
          :name="item.activityId"
        />
      </el-tabs>

      <div class="activity-section-header">
        <span class="activity-badge">{{ activeBoard.badge }}</span>
        <span class="activity-name">{{ activeBoard.activityName }}</span>
        <span class="activity-online">{{ activeBoard.onlineLabel }}</span>
        <span class="activity-desc">{{ activeBoard.description }}</span>
      </div>

      <div class="activity-panel">
        <div class="metric-grid" v-loading="boardLoading">
          <div
            v-for="metric in activeBoard.metrics"
            :key="metric.key"
            class="metric-card"
          >
            <div class="metric-top">
              <div class="metric-label">{{ metric.label }}</div>
              <div class="metric-icon" :class="'is-' + metric.theme">
                <i :class="metric.icon"></i>
              </div>
            </div>
            <div class="metric-value">
              {{ formatMetricValue(metric) }}
              <span v-if="metric.unit" class="metric-unit">{{ metric.unit }}</span>
            </div>
            <div class="metric-desc">{{ metric.desc }}</div>
          </div>
        </div>

        <div class="chart-grid" :class="{ 'is-coupon': isCouponActivity }" v-loading="boardLoading">
          <el-card class="chart-card" shadow="never">
            <div class="chart-title-row">
              <div>
                <div class="chart-title">{{ mainChartTitle }}</div>
              </div>
              <div v-if="isInviteActivity" class="chart-actions">
                <el-button
                  type="primary"
                  size="mini"
                  icon="el-icon-download"
                  :loading="exportLoading"
                  :disabled="!activeBoard.activityId"
                  @click="handleExport"
                >
                  导出
                </el-button>
              </div>
            </div>
            <div ref="mainTrendChart" class="chart-box"></div>
          </el-card>

          <el-card v-if="isInviteActivity" class="chart-card" shadow="never">
            <div class="chart-title-row">
              <div>
                <div class="chart-title">用户活跃趋势</div>
              </div>
            </div>
            <div class="active-trend-split">
              <div ref="activeDauChart" class="split-chart-box"></div>
              <div ref="activeWauChart" class="split-chart-box"></div>
            </div>
          </el-card>

          <div v-else class="chart-card coupon-funnel-card">
            <div class="chart-title-row">
              <div>
                <div class="chart-title">优惠券转化</div>
              </div>
            </div>
            <div class="conversion-funnel">
              <div class="funnel-step is-receive">
                <div>
                  <span>领取人数</span>
                  <strong>{{ formatNumber(conversionData.receiveUserCount) }}</strong>
                </div>
                <em>100%</em>
              </div>
              <div class="funnel-arrow">↓</div>
              <div class="funnel-step is-use">
                <div>
                  <span>使用 / 核销人数</span>
                  <strong>{{ formatNumber(conversionData.useUserCount) }}</strong>
                </div>
                <em>{{ conversionData.useRate }}%</em>
              </div>
              <div class="funnel-summary">
                <div class="funnel-summary-item">
                  <span>领取 → 使用转化率</span>
                  <strong>{{ conversionData.useRate }}%</strong>
                </div>
                <div class="funnel-summary-item is-unused">
                  <span>领取未使用</span>
                  <strong>{{ formatNumber(conversionData.unusedUserCount) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import * as echarts from "echarts";
import {
  activityBoardActivityOptions,
  activityBoardOverview,
  activityBoardTrend,
  activityBoardCouponConversion,
  activityBoardExport,
} from "@/api/activity";

export default {
  name: "ActivityBoard",
  data() {
    return {
      activeActivityId: "",
      activityBoards: [],
      dateRange: [],
      pageLoading: false,
      boardLoading: false,
      exportLoading: false,
      boardRequestSeq: 0,
      chartColors: {
        axisText: "#86909C",
        splitLine: "#EEF0F6",
        primary: "#6A35FF",
        blue: "#2F7CF6",
        cyan: "#18C7C8",
        pink: "#FF6FAE",
        orange: "#C68A3D",
      },
      activityMetricMap: {
        INVITE_RECHARGE: {
          badge: "活动A",
          description: "推荐人邀请新用户注册并充值，双方获得未来币返利",
          metrics: [
            {
              key: "totalOrderCount",
              label: "总订单数",
              unit: "单",
              theme: "blue",
              icon: "el-icon-tickets",
              desc: "通过拉新活动注册的新人产生的订单总数(按订单计，不去重)",
            },
            {
              key: "paidUserCount",
              label: "有效订单人数",
              unit: "人",
              theme: "cyan",
              icon: "el-icon-user",
              desc: "拉新注册后实际下单的用户数(按用户去重)",
            },
            {
              key: "inviteParticipantCount",
              label: "参与拉新人数",
              unit: "人",
              theme: "orange",
              icon: "el-icon-connection",
              desc: "发起推荐邀请的用户数(推荐人，按用户去重)",
            },
            {
              key: "newRegisteredUserCount",
              label: "新增注册用户",
              unit: "人",
              theme: "purple",
              icon: "el-icon-user-solid",
              desc: "通过拉新链接/码注册的新用户数(按用户去重)",
            },
            {
              key: "rebateCoinAmount",
              label: "返利币额",
              unit: "未来币",
              theme: "green",
              icon: "el-icon-coin",
              desc: "平台发放的未来币总额(含推荐人与被推荐人)",
            },
          ],
        },
        NEW_USER_COUPON: {
          badge: "活动B",
          description: "新用户领取优惠券，下单核销后平台补贴金额",
          metrics: [
            {
              key: "couponOrderCount",
              label: "订单总数",
              unit: "单",
              theme: "blue",
              icon: "el-icon-document-checked",
              desc: "使用本活动优惠券下单的订单总数(不去重)",
            },
            {
              key: "platformSubsidyAmount",
              label: "平台补贴金额",
              unit: "元",
              theme: "orange",
              icon: "el-icon-money",
              desc: "仅统计已核销券的补贴金额合计(未核销不计)",
              money: true,
            },
            {
              key: "couponReceiveUserCount",
              label: "优惠券领取人数",
              unit: "人",
              theme: "purple",
              icon: "el-icon-present",
              desc: "领取本活动优惠券的去重用户数",
            },
            {
              key: "couponUseUserCount",
              label: "优惠券使用人数",
              unit: "人",
              theme: "cyan",
              icon: "el-icon-finished",
              desc: "优惠券已核销的去重用户数",
            },
          ],
        },
      },
      charts: {
        mainTrend: null,
        activeDau: null,
        activeWau: null,
        couponConversion: null,
      },
      resizeObserver: null,
      resizeTimer: null,
      datePickerOptions: {
        disabledDate(time) {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          return time.getTime() >= todayStart.getTime();
        },
      },
    };
  },
  computed: {
    activeBoard() {
      return (
        this.activityBoards.find((item) => item.activityId === this.activeActivityId) ||
        this.activityBoards[0] ||
        this.getEmptyActivity()
      );
    },
    isInviteActivity() {
      return this.activeBoard.activityType === "INVITE_RECHARGE";
    },
    isCouponActivity() {
      return this.activeBoard.activityType === "NEW_USER_COUPON";
    },
    mainChartTitle() {
      return this.isInviteActivity ? "每日订单量 / DAU" : "优惠券领取 / 使用趋势";
    },
    mainTrendRows() {
      return this.activeBoard.mainTrendRows || [];
    },
    activeTrendRows() {
      return this.activeBoard.activeTrendRows || [];
    },
    conversionData() {
      return this.activeBoard.conversion || this.getEmptyConversion();
    },
  },
  mounted() {
    this.fetchActivityOptions();
    this.bindResizeObserver();
    window.addEventListener("resize", this.resizeCharts);
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.resizeCharts);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.resizeTimer) {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    Object.keys(this.charts).forEach((key) => {
      this.disposeChart(key);
    });
  },
  methods: {
    async fetchActivityOptions() {
      this.pageLoading = true;
      try {
        const response = await activityBoardActivityOptions({ activityType: "" });
        const data = this.getBusinessData(response);
        const activities = Array.isArray(data.activities) ? data.activities : [];
        const defaultActivityId = data.defaultActivityId !== undefined && data.defaultActivityId !== null
          ? String(data.defaultActivityId)
          : "";

        this.activityBoards = activities.map((item, index) => this.normalizeActivity(item, index));
        this.activeActivityId =
          defaultActivityId && this.activityBoards.some((item) => item.activityId === defaultActivityId)
            ? defaultActivityId
            : (this.activityBoards[0] && this.activityBoards[0].activityId) || "";
        this.setActiveDefaultDateRange();

        if (this.activeActivityId) {
          await this.fetchBoardData();
        } else {
          this.renderChartsAfterLayout();
        }
      } catch (error) {
        console.error("获取活动看板活动列表失败:", error);
        this.$message.error("获取活动列表失败");
      } finally {
        this.pageLoading = false;
      }
    },
    async fetchBoardData() {
      if (!this.activeBoard.activityId) {
        return;
      }
      const requestSeq = ++this.boardRequestSeq;
      this.boardLoading = true;
      try {
        const params = this.buildBoardQueryParams();
        const requests = [
          activityBoardOverview(params),
          activityBoardTrend(params),
        ];
        if (this.isCouponActivity) {
          requests.push(activityBoardCouponConversion({
            activityId: params.activityId,
            startDate: params.startDate,
            endDate: params.endDate,
          }));
        }

        const [overviewResponse, trendResponse, extraResponse] = await Promise.all(requests);
        if (requestSeq !== this.boardRequestSeq) {
          return;
        }

        this.applyBoardData({
          overview: this.getBusinessData(overviewResponse),
          mainTrend: this.getBusinessData(trendResponse),
          activeTrend: this.isInviteActivity ? this.getBusinessData(trendResponse) : null,
          conversion: this.isCouponActivity && extraResponse
            ? this.getBusinessData(extraResponse)
            : this.getEmptyConversion(),
        });
      } catch (error) {
        console.error("获取活动看板数据失败:", error);
        this.$message.error("获取活动看板数据失败");
      } finally {
        if (requestSeq === this.boardRequestSeq) {
          this.boardLoading = false;
          this.renderChartsAfterLayout();
        }
      }
    },
    handleActivityTabChange() {
      this.setActiveDefaultDateRange();
      this.fetchBoardData();
    },
    handleDateRangeChange() {
      if (!this.dateRange || this.dateRange.length !== 2) {
        this.setActiveDefaultDateRange();
      }
      this.fetchBoardData();
    },
    async handleExport() {
      if (!this.activeBoard.activityId) {
        return;
      }
      this.exportLoading = true;
      try {
        const response = await activityBoardExport(this.buildBoardQueryParams());
        const exportResult = await this.downloadExportResponse(response);
        this.$message.success(exportResult === "task" ? "导出任务已生成" : "导出成功");
      } catch (error) {
        console.error("导出活动看板失败:", error);
        this.$message.error("导出失败");
      } finally {
        this.exportLoading = false;
      }
    },
    normalizeActivity(activity, index) {
      const activityType = activity.activityType || "INVITE_RECHARGE";
      const meta = this.activityMetricMap[activityType] || {};
      return {
        ...this.getEmptyActivity(),
        ...activity,
        activityId: String(activity.activityId || ""),
        activityType,
        badge: activity.badge || meta.badge || `活动${index + 1}`,
        onlineLabel: activity.onlineLabel || this.formatOnlineLabel(activity.onlineTime),
        description: activity.description || meta.description || "",
        metrics: this.buildMetrics(activityType, {}),
        mainTrendRows: [],
        activeTrendRows: [],
        conversion: this.getEmptyConversion(),
      };
    },
    applyBoardData({ overview, mainTrend, activeTrend, conversion }) {
      const index = this.activityBoards.findIndex((item) => item.activityId === this.activeActivityId);
      if (index < 0) {
        return;
      }

      const current = this.activityBoards[index];
      const activity = overview.activity || {};
      const activityType = activity.activityType || current.activityType;
      const meta = this.activityMetricMap[activityType] || {};
      const normalizedMainTrendRows = this.normalizeTrendRows(mainTrend);
      const normalizedActiveTrendRows = this.normalizeTrendRows(activeTrend);
      const updated = {
        ...current,
        ...activity,
        activityType,
        badge: current.badge || meta.badge || "",
        onlineLabel: current.onlineLabel || this.formatOnlineLabel(activity.onlineTime || current.onlineTime),
        description: current.description || meta.description || "",
        metrics: this.buildMetrics(activityType, overview.metrics || {}),
        mainTrendRows: normalizedMainTrendRows,
        activeTrendRows: activityType === "INVITE_RECHARGE"
          ? (normalizedActiveTrendRows.length ? normalizedActiveTrendRows : normalizedMainTrendRows)
          : [],
        conversion: activityType === "NEW_USER_COUPON"
          ? this.normalizeConversion(conversion)
          : this.getEmptyConversion(),
      };

      this.$set(this.activityBoards, index, updated);
    },
    buildMetrics(activityType, metrics) {
      const meta = this.activityMetricMap[activityType] || {};
      return (meta.metrics || []).map((item) => ({
        ...item,
        value: this.toNumber(metrics[item.key]),
      }));
    },
    getEmptyConversion() {
      return {
        receiveUserCount: 0,
        useUserCount: 0,
        unusedUserCount: 0,
        useRate: 0,
        unusedRate: 0,
      };
    },
    getEmptyActivity() {
      return {
        activityId: "",
        activityCode: "",
        activityName: "",
        activityType: "INVITE_RECHARGE",
        badge: "",
        onlineLabel: "",
        description: "",
        onlineTime: "",
        endTime: "",
        statisticsStartDate: "",
        statisticsEndDate: "",
        metrics: [],
        mainTrendRows: [],
        activeTrendRows: [],
        conversion: this.getEmptyConversion(),
      };
    },
    normalizeTrendRows(trend) {
      if (!trend) {
        return [];
      }

      const xAxis = Array.isArray(trend.xAxis) ? trend.xAxis : [];
      const series = trend.series || {};
      const rowList = Array.isArray(trend.rows) ? trend.rows : [];
      const maxLength = rowList.length || xAxis.length;

      if (!maxLength) {
        return [];
      }

      // 图表字段以 series 为准，rows 作为补充字段，避免 DAU/WAU 被错误兜成同一组数据。
      const chartKeys = [
        "orderCount",
        "dau",
        "wau",
        "couponReceiveUserCount",
        "couponUseUserCount",
        "couponOrderCount",
        "platformSubsidyAmount",
        "couponUnusedUserCount",
        "paidUserCount",
        "rebateCoinAmount",
      ];

      return Array.from({ length: maxLength }).map((_, index) => {
        const item = rowList[index] || {};
        const row = {
          ...item,
          statDate: item.statDate || item.date || xAxis[index] || "",
        };

        chartKeys.forEach((key) => {
          if (Array.isArray(series[key])) {
            row[key] = this.toNumber(series[key][index]);
            return;
          }

          row[key] = this.toNumber(item[key]);
        });

        return row;
      });
    },
    normalizeConversion(conversion) {
      const receiveUserCount = this.toNumber(conversion.receiveUserCount);
      const useUserCount = this.toNumber(conversion.useUserCount);
      const unusedUserCount = conversion.unusedUserCount !== undefined
        ? this.toNumber(conversion.unusedUserCount)
        : Math.max(receiveUserCount - useUserCount, 0);
      const useRate = conversion.useRate !== undefined
        ? this.toNumber(conversion.useRate)
        : this.calcRate(useUserCount, receiveUserCount);
      const unusedRate = conversion.unusedRate !== undefined
        ? this.toNumber(conversion.unusedRate)
        : this.calcRate(unusedUserCount, receiveUserCount);

      return {
        receiveUserCount,
        useUserCount,
        unusedUserCount,
        useRate,
        unusedRate,
      };
    },
    setActiveDefaultDateRange() {
      const { statisticsStartDate, statisticsEndDate } = this.activeBoard;
      const maxSelectableDate = this.getMaxSelectableDate();
      const normalizedEndDate = this.getEarlierDate(statisticsEndDate, maxSelectableDate);

      this.dateRange = statisticsStartDate && normalizedEndDate && statisticsStartDate <= normalizedEndDate
        ? [statisticsStartDate, normalizedEndDate]
        : [];
    },
    buildBoardQueryParams() {
      const [startDate, endDate] = this.getDateRangeParams();
      return {
        activityId: this.activeBoard.activityId,
        activityType: this.activeBoard.activityType,
        startDate,
        endDate,
      };
    },
    getDateRangeParams() {
      if (Array.isArray(this.dateRange) && this.dateRange.length === 2) {
        return this.dateRange;
      }
      const startDate = this.activeBoard.statisticsStartDate || "";
      const endDate = this.getEarlierDate(
        this.activeBoard.statisticsEndDate || "",
        this.getMaxSelectableDate()
      );

      if (startDate && endDate && startDate <= endDate) {
        return [startDate, endDate];
      }

      return ["", ""];
    },
    getMaxSelectableDate() {
      const date = new Date();
      date.setDate(date.getDate() - 1);
      return this.formatDateValue(date);
    },
    getEarlierDate(firstDate, secondDate) {
      if (!firstDate) {
        return secondDate || "";
      }
      if (!secondDate) {
        return firstDate;
      }
      return firstDate <= secondDate ? firstDate : secondDate;
    },
    formatDateValue(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    getBusinessData(res) {
      if (!res) {
        return {};
      }
      if (res instanceof Blob) {
        return res;
      }
      if (res.data instanceof Blob) {
        return res.data;
      }
      if (res.data && (res.success === true || res.errorCode !== undefined || res.code !== undefined)) {
        return res.data.data || res.data;
      }
      return res.data || res;
    },
    calcRate(part, total) {
      if (!total) {
        return 0;
      }
      return Number(((part / total) * 100).toFixed(1));
    },
    toNumber(value) {
      const number = Number(value || 0);
      return Number.isNaN(number) ? 0 : number;
    },
    async downloadExportResponse(response) {
      const blob = response?.data instanceof Blob ? response.data : response;
      if (!(blob instanceof Blob)) {
        const data = this.getBusinessData(response);
        if (data.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
          return "url";
        }
        if (data.exportTaskId) {
          return "task";
        }
        throw new Error("导出响应格式错误");
      }

      if (blob.type && blob.type.indexOf("application/json") > -1) {
        const text = await blob.text();
        const json = text ? JSON.parse(text) : {};
        const data = this.getBusinessData(json);
        if (data.downloadUrl) {
          window.open(data.downloadUrl, "_blank");
          return "url";
        }
        if (data.exportTaskId) {
          return "task";
        }
        throw new Error(data.errorMessage || data.msg || "导出失败");
      }

      const fileName = this.getExportFileName(response) || `活动统计看板_${this.formatDateForFile(new Date())}.xlsx`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      return "file";
    },
    getExportFileName(response) {
      const disposition = response?.headers?.["content-disposition"] || response?.headers?.["Content-Disposition"];
      if (!disposition) {
        return "";
      }
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (utf8Match && utf8Match[1]) {
        return decodeURIComponent(utf8Match[1]);
      }
      const fileNameMatch = disposition.match(/filename="?([^";]+)"?/i);
      return fileNameMatch && fileNameMatch[1] ? decodeURIComponent(fileNameMatch[1]) : "";
    },
    formatDateForFile(date) {
      const pad = (num) => String(num).padStart(2, "0");
      return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
    },
    formatOnlineLabel(date) {
      if (!date) {
        return "";
      }
      return `${date.replace(/-/g, " ")} 上线`;
    },
    renderCharts() {
      this.renderMainTrendChart();
      if (this.isInviteActivity) {
        this.disposeChart("couponConversion");
        this.renderActiveTrendCharts();
      } else {
        this.disposeChart("activeDau");
        this.disposeChart("activeWau");
        this.disposeChart("couponConversion");
      }
    },
    renderChartsAfterLayout() {
      this.$nextTick(() => {
        this.renderCharts();
        this.scheduleResizeCharts();
      });
    },
    bindResizeObserver() {
      if (!window.ResizeObserver || !this.$el) {
        return;
      }
      this.resizeObserver = new window.ResizeObserver(() => {
        this.scheduleResizeCharts();
      });
      this.resizeObserver.observe(this.$el);
    },
    scheduleResizeCharts() {
      if (this.resizeTimer) {
        window.clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = window.setTimeout(() => {
        this.resizeCharts();
        this.resizeTimer = null;
      }, 80);
    },
    getChart(refName, chartName) {
      const el = this.$refs[refName];
      if (!el) {
        return null;
      }
      if (!this.charts[chartName]) {
        this.charts[chartName] = echarts.init(el);
      }
      return this.charts[chartName];
    },
    disposeChart(chartName) {
      if (this.charts[chartName]) {
        this.charts[chartName].dispose();
        this.charts[chartName] = null;
      }
    },
    resizeCharts() {
      Object.keys(this.charts).forEach((key) => {
        if (this.charts[key]) {
          this.charts[key].resize();
        }
      });
    },
    renderMainTrendChart() {
      const chart = this.getChart("mainTrendChart", "mainTrend");
      if (!chart) {
        return;
      }
      if (!this.mainTrendRows.length && this.boardLoading) {
        chart.showLoading("default", {
          text: "加载中",
          color: this.chartColors.primary,
          textColor: "#909399",
          maskColor: "rgba(255, 255, 255, 0.75)",
        });
        return;
      }
      chart.hideLoading();

      if (this.isInviteActivity) {
        chart.setOption(this.getInviteMainOption(), true);
      } else {
        chart.setOption(this.getCouponTrendOption(), true);
      }
    },
    renderActiveTrendCharts() {
      const dauChart = this.getChart("activeDauChart", "activeDau");
      const wauChart = this.getChart("activeWauChart", "activeWau");
      if (!dauChart || !wauChart) {
        return;
      }
      if (!this.activeTrendRows.length && this.boardLoading) {
        const loadingOption = {
          text: "加载中",
          color: this.chartColors.primary,
          textColor: "#909399",
          maskColor: "rgba(255, 255, 255, 0.75)",
        };
        dauChart.showLoading("default", loadingOption);
        wauChart.showLoading("default", loadingOption);
        return;
      }
      dauChart.hideLoading();
      wauChart.hideLoading();
      const rows = this.activeTrendRows;
      dauChart.setOption(
        {
          color: [this.chartColors.primary],
          tooltip: {
            trigger: "axis",
          },
          legend: {
            show: false,
          },
          grid: {
            left: 42,
            right: 28,
            top: 22,
            bottom: 20,
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: rows.map((item) => item.statDate),
            axisLine: { lineStyle: { color: this.chartColors.splitLine } },
            axisTick: { show: false },
            axisLabel: {
              color: this.chartColors.axisText,
              hideOverlap: true,
              formatter: this.formatAxisDate,
            },
          },
          yAxis: this.getValueAxis("DAU"),
          series: [
            {
              name: "DAU",
              type: "bar",
              barWidth: 12,
              itemStyle: {
                borderRadius: [6, 6, 0, 0],
              },
              data: rows.map((item) => item.dau),
            },
          ],
        },
        true
      );
      wauChart.setOption(
        {
          color: [this.chartColors.cyan],
          tooltip: {
            trigger: "axis",
          },
          legend: {
            show: false,
          },
          grid: {
            left: 42,
            right: 28,
            top: 22,
            bottom: 20,
            containLabel: true,
          },
          xAxis: {
            type: "category",
            boundaryGap: false,
            data: rows.map((item) => item.statDate),
            axisLine: { lineStyle: { color: this.chartColors.splitLine } },
            axisTick: { show: false },
            axisLabel: {
              color: this.chartColors.axisText,
              hideOverlap: true,
              formatter: this.formatAxisDate,
            },
          },
          yAxis: this.getValueAxis("WAU"),
          series: [
            {
              name: "WAU",
              type: "line",
              smooth: true,
              symbolSize: 5,
              lineStyle: { width: 3 },
              areaStyle: {
                color: this.getAreaGradient(this.chartColors.cyan),
              },
              data: rows.map((item) => item.wau),
            },
          ],
        },
        true
      );
    },
    getInviteMainOption() {
      const rows = this.mainTrendRows;
      return {
        color: [this.chartColors.blue, this.chartColors.primary],
        tooltip: {
          trigger: "axis",
        },
        legend: {
          top: 0,
          left: "center",
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 18,
          textStyle: { color: "#606266" },
        },
        grid: {
          left: 42,
          right: 48,
          top: 54,
          bottom: 28,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: rows.map((item) => item.statDate),
          axisLine: { lineStyle: { color: this.chartColors.splitLine } },
          axisTick: { show: false },
          axisLabel: {
            color: this.chartColors.axisText,
            hideOverlap: true,
            formatter: this.formatAxisDate,
          },
        },
        yAxis: [
          this.getValueAxis("订单量"),
          this.getValueAxis("DAU", "right"),
        ],
        series: [
          {
            name: "订单量",
            type: "bar",
            barWidth: 14,
            itemStyle: {
              borderRadius: [6, 6, 0, 0],
            },
            data: rows.map((item) => item.orderCount),
          },
          {
            name: "DAU",
            type: "line",
            yAxisIndex: 1,
            smooth: true,
            symbolSize: 6,
            lineStyle: { width: 3 },
            data: rows.map((item) => item.dau),
          },
        ],
      };
    },
    getCouponTrendOption() {
      const rows = this.mainTrendRows;
      return {
        color: [this.chartColors.pink, this.chartColors.blue, this.chartColors.orange],
        tooltip: {
          trigger: "axis",
        },
        legend: {
          type: "scroll",
          top: 0,
          left: "center",
          right: 0,
          itemWidth: 10,
          itemHeight: 10,
          itemGap: 14,
          textStyle: { color: "#606266" },
        },
        grid: {
          left: 42,
          right: 60,
          top: 58,
          bottom: 28,
          containLabel: true,
        },
        xAxis: {
          type: "category",
          data: rows.map((item) => item.statDate),
          axisLine: { lineStyle: { color: this.chartColors.splitLine } },
          axisTick: { show: false },
          axisLabel: {
            color: this.chartColors.axisText,
            hideOverlap: true,
            formatter: this.formatAxisDate,
          },
        },
        yAxis: [
          this.getValueAxis("人数"),
          this.getValueAxis("补贴金额", "right"),
        ],
        series: [
          {
            name: "领取人数",
            type: "line",
            smooth: true,
            symbolSize: 6,
            lineStyle: { width: 3 },
            data: rows.map((item) => item.couponReceiveUserCount),
          },
          {
            name: "使用人数",
            type: "line",
            smooth: true,
            symbolSize: 6,
            lineStyle: { width: 3 },
            data: rows.map((item) => item.couponUseUserCount),
          },
          {
            name: "平台补贴金额",
            type: "bar",
            yAxisIndex: 1,
            barWidth: 14,
            itemStyle: { borderRadius: [6, 6, 0, 0] },
            data: rows.map((item) => item.platformSubsidyAmount),
          },
        ],
      };
    },
    getValueAxis(name, position) {
      return {
        type: "value",
        name: "",
        position: position || "left",
        axisLabel: { color: this.chartColors.axisText },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: position !== "right",
          lineStyle: { color: this.chartColors.splitLine },
        },
      };
    },
    formatAxisDate(value) {
      if (typeof value !== "string") {
        return value;
      }
      if (value.indexOf("~") > -1) {
        return value.replace(/-/g, "/");
      }
      const parts = value.split("-");
      if (parts.length === 2) {
        return `${Number(parts[1])}月`;
      }
      if (parts.length === 3) {
        return `${Number(parts[1])}/${Number(parts[2])}`;
      }
      return value;
    },
    getAreaGradient(color) {
      return new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: `${color}33` },
        { offset: 1, color: `${color}00` },
      ]);
    },
    formatMetricValue(metric) {
      if (metric.key === "platformSubsidyAmount") {
        return this.formatMoney(metric.value);
      }
      return this.formatNumber(metric.value);
    },
    formatMoney(value) {
      return `¥${this.formatNumber(value)}`;
    },
    formatNumber(value) {
      const number = Number(value || 0);
      return number.toLocaleString("zh-CN");
    },
  },
};
</script>

<style scoped lang="scss">
.activity-board-wrapper {
  height: 100%;
  padding: 20px;
  box-sizing: border-box;
  overflow: auto;
  background: #f5f7fb;
}

.board-card {
  min-height: 100%;
  border: none;
  border-radius: 24px;
}

::v-deep .board-card > .el-card__body {
  padding: 20px;
}

.board-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.page-title {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}

.date-filter-label {
  color: #606266;
  font-size: 13px;
  white-space: nowrap;
}

::v-deep .header-actions .el-range-editor.el-input__inner {
  width: 320px;
}

.activity-tabs {
  margin-top: 8px;
}

::v-deep .activity-tabs .el-tabs__header {
  margin-bottom: 14px;
}

::v-deep .activity-tabs .el-tabs__item {
  height: 38px;
  line-height: 38px;
  color: #606266;
  font-weight: 500;
}

::v-deep .activity-tabs .el-tabs__item.is-active {
  color: #6a35ff;
}

::v-deep .activity-tabs .el-tabs__active-bar {
  background-color: #6a35ff;
}

.activity-panel {
  padding: 16px;
  border: 1px solid #edf0f7;
  border-radius: 16px;
  background: #fff;
}

.activity-section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.activity-badge {
  height: 24px;
  padding: 0 10px;
  border-radius: 12px;
  color: #fff;
  background: #6a35ff;
  font-size: 12px;
  line-height: 24px;
}

.activity-name {
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.activity-online,
.activity-desc {
  color: #909399;
  font-size: 13px;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(150px, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.metric-card {
  padding: 16px;
  border: 1px solid #edf0f7;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(38, 45, 71, 0.04);
}

.metric-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.metric-label {
  color: #606266;
  font-size: 13px;
  font-weight: 500;
}

.metric-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 17px;

  &.is-blue {
    color: #2f7cf6;
    background: #ecf4ff;
  }

  &.is-cyan {
    color: #18c7c8;
    background: #e9fbfb;
  }

  &.is-orange {
    color: #c68a3d;
    background: #fff6e8;
  }

  &.is-purple {
    color: #6a35ff;
    background: #f2edff;
  }

  &.is-green {
    color: #21b36b;
    background: #eaf8f1;
  }
}

.metric-value {
  margin-top: 12px;
  color: #303133;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.25;
}

.metric-unit {
  margin-left: 4px;
  color: #909399;
  font-size: 12px;
  font-weight: 400;
}

.metric-desc {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 16px;
}

.chart-card {
  min-width: 0;
  border: 1px solid #edf0f7;
  border-radius: 16px;
  background: #fff;
}

::v-deep .chart-card > .el-card__body {
  padding: 18px;
  min-height: 394px;
  box-sizing: border-box;
}

.coupon-funnel-card {
  min-height: 394px;
  padding: 18px;
  box-sizing: border-box;
}

.chart-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.chart-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.chart-title {
  color: #303133;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.chart-box {
  width: 100%;
  height: 320px;
}

.active-trend-split {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  width: 100%;
  height: 320px;
}

.split-chart-box {
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.conversion-funnel {
  display: flex;
  flex-direction: column;
  min-height: 320px;
  padding: 22px 4px 0;
  box-sizing: border-box;
}

.funnel-step {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 74px;
  padding: 0 22px;
  margin: 0 auto;
  border-radius: 8px;
  box-sizing: border-box;

  span,
  em {
    display: block;
    color: rgba(255, 255, 255, 0.9);
    font-size: 13px;
    font-style: normal;
    font-weight: 600;
  }

  strong {
    display: block;
    margin-top: 7px;
    color: #fff;
    font-size: 24px;
    line-height: 1;
  }

  &.is-receive {
    width: 100%;
    background: #ff6fae;
  }

  &.is-use {
    width: 42%;
    min-width: 260px;
    background: #4da3ff;
  }
}

.funnel-arrow {
  height: 22px;
  color: #a8abb2;
  font-size: 18px;
  line-height: 22px;
  text-align: center;
}

.funnel-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 18px;
  width: 100%;
}

.funnel-summary-item {
  height: 66px;
  padding: 12px;
  border: 1px solid #edf0f7;
  border-radius: 8px;
  background: #fbfcff;
  box-sizing: border-box;
  text-align: center;

  span {
    display: block;
    color: #909399;
    font-size: 12px;
    line-height: 1;
  }

  strong {
    display: block;
    margin-top: 10px;
    color: #10b981;
    font-size: 18px;
    line-height: 1;
  }

  &.is-unused strong {
    color: #ff5f7d;
  }
}

@media (max-width: 1440px) {
  .metric-grid {
    grid-template-columns: repeat(3, minmax(150px, 1fr));
  }
}

@media (max-width: 1200px) {
  .board-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    justify-content: flex-start;
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }

  .chart-title-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .activity-board-wrapper {
    padding: 12px;
  }

  .metric-grid,
  .funnel-summary {
    grid-template-columns: 1fr;
  }

  .funnel-step.is-use {
    width: 70%;
    min-width: 0;
  }

  ::v-deep .header-actions .el-range-editor.el-input__inner {
    width: 100%;
  }
}
</style>
