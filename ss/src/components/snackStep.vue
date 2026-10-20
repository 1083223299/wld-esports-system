<template>
  <div class="snakeFlowchart">
    <div class="snake-flow-inner">
      <!-- 左侧曲线 -->
      <div class="snake-side" :style="{ width: sideWidth + 'vw' }">
        <span :style="{ marginTop: ItemHeight / 2 + 'px', opacity: 0 }" class="headerRadio"></span>
        <div v-if="experienceData.length > Index">
          <span
            v-for="(num, index) in leftRows"
            :key="'left-' + index"
            class="hingelisHeard"
            :style="sideCurveStyle"
          ></span>
        </div>
      </div>

      <!-- 中间流程 -->
      <div class="snake-flow-main">
        <div
          v-for="rowNum in rowCount"
          v-if="getRowItems(rowNum).length"
          :key="'row-' + rowNum"
          class="snake-row"
          :class="{
            'is-single': getRowItems(rowNum).length === 1,
            'is-reverse': rowNum % 2 === 0
          }"
        >
          <div
            v-for="(v, i) in getRowItems(rowNum)"
            :key="'col-' + v.index"
            class="snake-col"
          >
            <div class="snake-col-track">
              <div
                class="track-line track-line-left"
                :class="{ 'is-empty': i === 0 }"
                :style="i === 0 ? null : connectorStyle"
              ></div>
              <div class="snake-dot" :style="dotStyle(v)">
                <span class="node-number">{{ v.index }}</span>
              </div>
              <div
                class="track-line track-line-right"
                :class="{ 'is-empty': i === getRowItems(rowNum).length - 1 }"
                :style="i === getRowItems(rowNum).length - 1 ? null : connectorStyle"
              ></div>
            </div>

            <div class="snake-col-body">
              <div class="timeNodes">
                <div class="timeContent">{{ v.content }}</div>
                <div class="nodeTimes" v-if="v.reviewerName">审核人：{{ v.reviewerName }}</div>
                <div class="nodeTimes node-ellipsis" v-if="v.riskWords" :title="v.riskWords">
                  命中敏感词：{{ v.riskWords }}
                </div>
                <div class="node-line-expand" v-if="getReasonText(v) || v.expandable">
                  <span
                    v-if="getReasonText(v)"
                    class="node-line-expand-text"
                    :title="getReasonTitle(v)"
                  >{{ getReasonText(v) }}</span>
                  <span v-else class="node-line-expand-text">帖子详情</span>
                  <el-button
                    v-if="v.expandable"
                    class="node-expand-btn"
                    type="text"
                    size="small"
                    @click="handleExpand(v)"
                  >
                    {{ v.expanded ? '收起' : '展开' }}
                    <i class="el-icon-arrow-down" :class="{ 'rotate-icon': v.expanded }"></i>
                  </el-button>
                </div>
                <div class="nodeTimes node-time">{{ v.createTime }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧曲线 -->
      <div class="snake-side" :style="{ width: sideWidth + 'vw' }">
        <span
          v-if="experienceData.length > Index"
          class="hingelis"
          :style="{
            marginTop: ItemHeight / 2 + 'px',
            height: ItemHeight + 'px',
            borderTop: `${LineWidth}px ${LineType} ${LineColor}`,
            borderRight: `${LineWidth}px ${LineType} ${LineColor}`,
            borderBottom: `${LineWidth}px ${LineType} ${LineColor}`
          }"
        ></span>
        <div v-if="experienceData.length > Index * 2">
          <span
            v-for="(num, index) in rightRows"
            :key="'right-' + index"
            class="hingelis"
            :style="sideCurveStyleRight"
          ></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SnakeFlowchart',
  props: {
    chartData: { type: Array, default: () => [] },
    Index: { type: Number, default: 5 },
    ItemHeight: { type: String, default: '80' },
    LineWidth: { type: Number, default: 1 },
    LineType: { type: String, default: 'dashed' },
    LineColor: { type: String, default: '#a0a0a5' },
    DoneItemColor: { type: String, default: '#a0a0a5' },
    CurrentItemColor: { type: String, default: '#8F5EFF' },
    IconWidth: { type: String, default: '1' }
  },
  data() {
    return {
      experienceData: this.chartData,
      leftRows: 0,
      rightRows: 0,
      sideWidth: ''
    }
  },
  computed: {
    rowCount() {
      return Math.max(1, Math.ceil(this.experienceData.length / this.Index))
    },
    sideCurveStyle() {
      return {
        height: this.ItemHeight + 'px',
        marginTop: this.ItemHeight + 'px',
        borderTop: `${this.LineWidth}px ${this.LineType} ${this.LineColor}`,
        borderLeft: `${this.LineWidth}px ${this.LineType} ${this.LineColor}`,
        borderBottom: `${this.LineWidth}px ${this.LineType} ${this.LineColor}`
      }
    },
    sideCurveStyleRight() {
      return {
        height: this.ItemHeight + 'px',
        marginTop: this.ItemHeight + 'px',
        borderTop: `${this.LineWidth}px ${this.LineType} ${this.LineColor}`,
        borderRight: `${this.LineWidth}px ${this.LineType} ${this.LineColor}`,
        borderBottom: `${this.LineWidth}px ${this.LineType} ${this.LineColor}`
      }
    },
    connectorStyle() {
      return { borderBottom: `${this.LineWidth}px ${this.LineType} ${this.LineColor}` }
    }
  },
  watch: {
    chartData: {
      handler(newVal) {
        this.experienceData = newVal.map((item, idx) => ({
          ...item,
          index: idx + 1,
          isFirst: idx === 0,
          expandable: idx === 0 ? true : (item.expandable !== undefined ? item.expandable : false),
          expanded: item.expanded || false
        }))
        const rows = Math.ceil(newVal.length / this.Index) || 1
        this.leftRows = rows === 2 ? 0 : rows % 2 === 0 ? parseInt(rows / 2) - 1 : parseInt(rows / 2)
        this.rightRows = rows === 4 ? 1 : rows % 2 === 0 ? parseInt(rows / 2) % 2 === 0 ? parseInt(rows / 2) >= 4
                  ? parseInt(rows / 2) - 1
                  : parseInt(rows / 2)
                : parseInt(rows / 2) - 1
              : parseInt(rows / 2) - 1
      },
      immediate: true
    }
  },
  mounted() {
    this.initWidth()
  },
  methods: {
    initWidth() {
      const el = document.querySelector('.snakeFlowchart')
      if (!el || !el.parentNode) return
      const VW = window.innerWidth / 100
      this.sideWidth = ((Number(el.parentNode.clientWidth)) * 0.30 / VW) / 2
    },
    getRowItems(rowNum) {
      let arr = this.experienceData.slice(this.Index * (rowNum - 1), this.Index * rowNum)
      if (rowNum % 2 === 0) arr = arr.reverse()
      return arr
    },
    dotStyle(node) {
      return {
        width: `${this.IconWidth}vw`,
        height: `${this.IconWidth}vw`,
        minWidth: '28px',
        minHeight: '28px',
        backgroundColor: node.last ? this.CurrentItemColor : this.DoneItemColor
      }
    },
    getReasonText(node) {
      if (node.rejectReasonDescription) return `拒绝原因：${node.rejectReasonDescription}`
      if (node.reviewOpinion) return `审核意见：${node.reviewOpinion}`
      return ''
    },
    getReasonTitle(node) {
      return node.rejectReasonDescription || node.reviewOpinion || ''
    },
    handleExpand(item) {
      const nextExpanded = !item.expanded
      this.experienceData.forEach(node => {
        this.$set(node, 'expanded', node === item ? nextExpanded : false)
      })
      this.$emit('expand-change', item)
    }
  }
}
</script>

<style scoped lang="scss">
.snake-flow-inner {
  display: flex;
  width: 100%;
  margin-top: 12px;
}

.snake-side {
  flex-shrink: 0;
}

.snake-flow-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.snake-row {
  display: flex;
  width: 100%;
  align-items: flex-start;

  &.is-single {
    justify-content: center;

    .snake-col {
      flex: 0 1 200px;
    }
  }

  &.is-reverse {
    flex-direction: row-reverse;
  }
}

.snake-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.snake-col-track {
  width: 100%;
  display: flex;
  align-items: center;
  height: 32px;
}

.track-line {
  flex: 1;
  min-width: 0;
  height: 0;

  &.is-empty {
    border: none !important;
  }
}

.snake-dot {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  padding: 6px;
  box-sizing: content-box;
  z-index: 2;
  background: #a0a0a5;
}

.snake-col-body {
  width: 100%;
  max-width: 160px;
  padding: 6px 4px 0;
  box-sizing: border-box;
}

.timeNodes {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeContent {
  width: 100%;
  text-align: center;
  font-size: 12px;
  line-height: 18px;
  color: #303133;
  font-weight: 500;
  word-break: break-all;
}

.nodeTimes {
  width: 100%;
  margin-top: 4px;
  text-align: center;
  font-size: 12px;
  line-height: 18px;
  color: #606266;
}

.node-time {
  color: #909399;
  font-size: 11px;
}

.node-ellipsis {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-line-expand {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 4px;
  gap: 2px;
}

.node-line-expand-text {
  flex: 0 1 auto;
  max-width: calc(100% - 44px);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  line-height: 18px;
  color: #606266;
  text-align: center;
}

.node-expand-btn {
  flex-shrink: 0;
  padding: 0;
  font-size: 12px;
  color: #409eff;
}

.node-number {
  color: #fff;
  font-size: 12px;
  font-weight: bold;
  line-height: 1;
}

.rotate-icon {
  transform: rotate(180deg);
  transition: transform 0.2s;
}

.hingelis {
  display: block;
  width: 100%;
  border-radius: 0 35px 35px 0;
  border-left: 0 !important;
}

.hingelisHeard {
  display: block;
  width: 100%;
  border-radius: 35px 0 0 35px;
  border-right: 0 !important;
}

.headerRadio {
  display: block;
  width: 100%;
}
</style>
