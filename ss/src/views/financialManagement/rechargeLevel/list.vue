<template>
  <div class="list-wrapper">
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="filterForm" :gutter="20" :confirm-reset="true"
        confirm-reset-message="确定要重置所有筛选条件吗？" @search="handleSearch" @reset="handleReset"></SearchForm>
    </div>
    <el-card class="list-card" shadow="never">
      <div class="action-bar-fixed">
        <el-button type="primary" icon="el-icon-plus" class="add-btn" @click="handleAdd"
          v-permission="'system:rechargeLevel:add'">新增充值档位</el-button>
      </div>
      <!-- 表格包裹层 - 核心滚动区域 -->
      <div class="table-wrapper">
        <el-table :data="tableData" stripe row-key="rechargeId" v-loading="loading" :border="false"
          :header-row-style="{ backgroundColor: '#F6F6FB' }" ref="table" :cell-style="{ textAlign: 'center' }"
          :header-cell-style="{ textAlign: 'center' }">
          <el-table-column prop="rechargeId" label="商品ID"></el-table-column>
          <el-table-column prop="type" label="渠道">
            <template slot-scope="scope">
              {{ getChannelLabel(scope.row.type) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态">
            <!-- <template slot-scope="scope">
            <el-tag :type="scope.row.status === 1 ? 'success' : 'info'" size="small">
              {{ scope.row.status === 1 ? '已上架' : '未上架' }}
            </el-tag>
          </template> -->
            <template slot-scope="scope">
              <div class="status-badge" :class="scope.row.status === 2 ? 'status-offline' : 'status-online'">
                <span class="status-dot"></span>
                <span class="status-text">{{ scope.row.status === 2 ? '下架' : '上架' }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="档位">
            <template slot-scope="scope">
              <span style="font-weight: 700;">{{ scope.row.amount }} 元={{ scope.row.wlbCoin }} 未来币</span>
            </template>
          </el-table-column>

          <el-table-column prop="createTime" label="创建时间"></el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template slot-scope="scope">
              <div class="action-buttons">
                <!-- 未上架状态：显示上架和删除 -->
                <template v-if="scope.row.status === 2">
                  <el-button type="text" style="color: #1FB753" @click="handlePutOn(scope.row)"
                    v-permission="'system:rechargeLevel:status'">
                    上架
                  </el-button>
                  <el-button type="text" style="color: #D63D28" @click="handleDelete(scope.row)"
                    v-permission="'system:rechargeLevel:remove'">
                    删除
                  </el-button>
                </template>
                <!-- 已上架状态：显示下架 -->
                <template v-else-if="scope.row.status === 1">
                  <el-button type="text" size="small" style="color: #9047f8" @click="handleTakeOff(scope.row)"
                    v-permission="'system:rechargeLevel:status'">
                    下架
                  </el-button>
                </template>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="pagination-container">
        <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
          @current-change="handleCurrentChange" />
      </div>
    </el-card>
  </div>
</template>

<script>
import SearchForm from "@/components/SearchComponent/index.vue";
import PaginationSimple from "@/components/PaginationSimple/index.vue";
import { RechargeConfigList, updateRechargeConfig, deleteRechargeConfig } from "@/api/rechargeLevel";

export default {
  name: "LevelCompanionList",
  components: { SearchForm, PaginationSimple },
  inject: ["switchToAdd", "getSharedRefresh"],
  data() {
    return {
      searchItems: [
        {
          type: "select",
          prop: "type",
          label: "渠道",
          placeholder: "全部渠道",
          options: [
            { label: "全部", value: null },
            { label: "小程序", value: "tb_xcx" },
            { label: "安卓", value: "android" },
            { label: "iOS", value: "ios" },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "status",
          label: "状态",
          placeholder: "全部状态",
          options: [
            { label: "全部", value: null },
            { label: "已上架", value: "1" },
            { label: "未上架", value: "2" },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTime",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            // 日期范围限制31天
            onPick: ({ maxDate, minDate }) => {
              // 选择了开始日期后，限制结束日期范围
              if (minDate && !maxDate) {
                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = (time) => {
                  const selectedDate = new Date(minDate);
                  const current = new Date(time);
                  const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
                  // 日期差大于31天，则禁用
                  return dayDiff > 30;
                };
              } else {
                // 选择了两个日期后，重置禁用规则
                this.searchItems.find(item => item.prop === 'createTime').pickerOptions.disabledDate = null;
              }
            },
            disabledDate: null,
            shortcuts: [
              {
                text: "最近一周",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 7);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
              {
                text: "最近一个月",
                onClick(picker) {
                  const end = new Date();
                  end.setHours(23, 59, 59, 999);
                  const start = new Date();
                  start.setTime(end.getTime() - 3600 * 1000 * 24 * 30);
                  start.setHours(0, 0, 0, 0);
                  picker.$emit("pick", [start, end]);
                },
              },
            ],
          },
        },
      ],
      filterForm: { type: null, status: null, startTime: "", endTime: "" },
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 },
      moduleHeight: 0,
    };
  },
  created() {
    this.fetchTableData();
  },
  mounted() {
    this.updateModuleHeight();
    window.addEventListener('resize', this.updateModuleHeight);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateModuleHeight);
  },
  activated() {
    if (this.getSharedRefresh && this.getSharedRefresh()) {
      this.fetchTableData();
    }
  },
  methods: {
    updateModuleHeight() {
      this.$nextTick(() => {
        if (this.$refs.responsiveModule) {
          this.moduleHeight = this.$refs.responsiveModule.offsetHeight;
        }
      });
    },

    getChannelLabel(type) {
      const map = { tb_xcx: '小程序', android: '安卓', ios: 'iOS' };
      return map[type] || type || '-';
    },

    getChannelTagType(type) {
      const map = { tb_xcx: 'primary', android: 'success', ios: 'danger' };
      return map[type] || 'info';
    },

    handleSearch(e) {
      if (e) {
        const formValues = e;
        if (formValues.createTime && formValues.createTime.length === 2) {
          this.filterForm.startTime = formValues.createTime[0];
          this.filterForm.endTime = formValues.createTime[1];
        } else {
          this.filterForm.startTime = "";
          this.filterForm.endTime = "";
        }
        delete formValues.createTime;
        this.filterForm = { ...this.filterForm, ...formValues };
      }
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleReset() {
      this.filterForm = { type: null, status: null, startTime: "", endTime: "" };
      this.pagination.pageNum = 1;
      this.fetchTableData();
    },

    handleAdd() {
      this.switchToAdd();
    },

    // 上架
    handlePutOn(row) {
      this.$confirm(`确定上架档位 ${row.amount} 元吗？`, "提示", { type: "info" })
        .then(async () => {
          try {
            const res = await updateRechargeConfig({ rechargeId: row.rechargeId, status: 1 });
            if (res.code === 200) {
              this.$message.success("上架成功");
              this.fetchTableData();
            } else {
              this.$message.error(res.msg || "上架失败");
            }
          } catch (error) {
            console.error("上架失败:", error);
            this.$message.error("上架失败");
          }
        })
        .catch(() => { });
    },

    // 下架
    handleTakeOff(row) {
      this.$confirm("确定下架此档位？下架后，用户将无法再进行充值。", "提示", { type: "warning" })
        .then(async () => {
          try {
            const res = await updateRechargeConfig({ rechargeId: row.rechargeId, status: 2 });
            if (res.code === 200) {
              this.$message.success("下架成功");
              this.fetchTableData();
            } else {
              this.$message.error(res.msg || "下架失败");
            }
          } catch (error) {
            console.error("下架失败:", error);
            this.$message.error("下架失败");
          }
        })
        .catch(() => { });
    },

    // 删除
    handleDelete(row) {
      this.$confirm("确定删除当前档位吗？", "提示", { type: "warning" })
        .then(async () => {
          try {
            const res = await deleteRechargeConfig(row.rechargeId);
            if (res.code === 200) {
              this.$message.success("删除成功");
              this.fetchTableData();
            } else {
              this.$message.error(res.msg || "删除失败");
            }
          } catch (error) {
            console.error("删除失败:", error);
            this.$message.error("删除失败");
          }
        })
        .catch(() => { });
    },

    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchTableData();
    },

    fetchTableData() {
      this.loading = true;
      const params = {
        ...this.filterForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize,
      };
      // 移除空值
      Object.keys(params).forEach(key => {
        if (params[key] === null || params[key] === undefined || params[key] === "") {
          delete params[key];
        }
      });

      RechargeConfigList(params)
        .then((res) => {
          if (res.code === 200 && res.data) {
            this.tableData = res.data.rows || [];
            this.pagination.total = res.data.total || 0;
          } else {
            this.tableData = [];
            this.pagination.total = 0;
          }
          this.loading = false;
        })
        .catch((error) => {
          console.error("获取列表失败:", error);
          this.tableData = [];
          this.pagination.total = 0;
          this.loading = false;
          this.$message.error("获取数据失败，请稍后重试");
        });
    },
  },
};
</script>

<style scoped>
/* 页面容器 */
.list-wrapper {
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 列表卡片 */
.list-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

::v-deep .el-card__body {
  height: 100%;
  display: flex;
  flex-direction: column;
}


/* 操作栏 */
.action-bar-fixed {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  margin-bottom: 20px;
}

/* 表格包裹层 - 核心滚动区域 */
.table-wrapper {
  flex: 1;
  overflow-y: auto !important;
  min-height: 0;
  position: relative;
}

/* 分页区域 */
.pagination-fixed {
  flex-shrink: 0;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: flex-end;
}

/* 操作按钮组 */
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 10px;
}

/* 状态徽章样式 */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  animation: pulse 2s infinite;
}

.status-online {
  background-color: rgba(27, 194, 134, 0.1);
  color: #1BC286;
}

.status-online .status-dot {
  background-color: #1BC286;
}

.status-offline {
  background-color: rgba(255, 77, 79, 0.1);
  color: #FF4D4F;
}

.status-offline .status-dot {
  background-color: #FF4D4F;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(27, 194, 134, 0.7);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(27, 194, 134, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(27, 194, 134, 0);
  }
}

.status-offline .status-dot {
  animation: pulse-offline 2s infinite;
}

@keyframes pulse-offline {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0.7);
  }

  70% {
    box-shadow: 0 0 0 6px rgba(255, 77, 79, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(255, 77, 79, 0);
  }
}
</style>
