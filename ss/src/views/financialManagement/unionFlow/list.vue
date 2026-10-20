<template>
  <div class="union-flow-page">
    <!-- 筛选区 -->
    <div ref="responsiveModule">
      <SearchForm ref="searchForm" :fields="searchItems" :initial-values="queryForm" :gutter="20" @search="handleSearch"
        @reset="handleReset"></SearchForm>
    </div>

    <!-- 数据表格 -->
    <el-card class="list-card" shadow="never">
      <el-table :data="tableData" stripe row-key="id" v-loading="loading" :border="false"
        :header-row-style="{ backgroundColor: '#F6F6FB' }" :height="`calc(100vh - ${moduleHeight}px - 214px)`">
        <el-table-column prop="serialCode" label="流水号" width="170"></el-table-column>
        <el-table-column prop="tradeName" label="公会名称" min-width="80" v-if="!checkPermission(['laborunion'])"></el-table-column>
        <el-table-column prop="tradeId" label="公会ID" width="170" v-if="!checkPermission(['laborunion'])"></el-table-column>
        <el-table-column prop="waiterName" label="陪陪昵称" min-width="80"></el-table-column>
        <el-table-column prop="waiterId" label="陪陪ID" width="120"></el-table-column>
        <el-table-column prop="type" label="收支方向" width="80">
          <template slot-scope="scope">
            {{ scope.row.type === 0 ? '支出' : '收入' }}
          </template>
        </el-table-column>
        <el-table-column prop="transactionType" label="流水类型" width="80">
          <template slot-scope="scope">
            {{ scope.row.transactionType === 0 ? '公会提现' : 1 ? '公会收入' : '公会提现拒绝' }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template slot-scope="scope">
            <!-- <span :class="scope.row.amount >= 0 ? 'income' : 'expense'">
              {{ scope.row.amount >= 0 ? '+' : '' }}{{ scope.row.amount }}
            </span> -->
            {{ scope.row.type === 0 ? '-' : '+' }}{{ scope.row.amount }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="160"></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200"></el-table-column>
      </el-table>

      <!-- 分页 -->
      <PaginationSimple :current-page="pagination.pageNum" :page-size="pagination.pageSize" :total="pagination.total"
        @current-change="handleCurrentChange"></PaginationSimple>
    </el-card>
  </div>
</template>

<script>
// 导入权限判断工具函数：checkPermission，配合v-if使用
import checkPermission from '@/utils/permission'
import SearchForm from "@/components/SearchComponent/index.vue"; // 搜索表单组件
import PaginationSimple from "@/components/PaginationSimple/index.vue"; // 分页组件
// 导入API接口
import {
  unionAccountLogList
} from "@/api/unionFlow";
export default {
  name: 'ListCompanion',
  components: {
    SearchForm,
    PaginationSimple,
  },
  data() {
    return {
      queryForm: {
        serialCode: '',
        tradeName: '',
        tradeId: '',
        type: '',
        transactionType: '',
        createTimeRange: []
      },
      // 搜索表单配置项
      searchItems: [
        {
          type: "input",
          prop: "serialCode",
          label: "流水号",
          placeholder: "请输入完整流水号",
          clearable: true,
        },
        {
          type: "input",
          prop: "tradeName",
          label: "公会名称",
          placeholder: "请输入公会名称",
          clearable: true,
        },
        {
          type: "input",
          prop: "tradeId",
          label: "公会ID",
          placeholder: "请输入完整公会ID",
          clearable: true,
        },
        {
          type: "select",
          prop: "type",
          label: "收支方向",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "支出", value: 0 },
            { label: "收入", value: 1 },
          ],
          clearable: true,
        },
        {
          type: "select",
          prop: "transactionType",
          label: "流水类型",
          placeholder: "全部",
          options: [
            { label: "全部", value: null },
            { label: "公会提现", value: 0 },
            { label: "公会收入", value: 1 },
            { label: "公会提现拒绝", value: 2 },
          ],
          clearable: true,
        },
        {
          type: "daterange",
          prop: "createTimeRange",
          label: "创建时间",
          valueFormat: "yyyy-MM-dd HH:mm:ss",
          startPlaceholder: "开始日期",
          endPlaceholder: "结束日期",
          pickerOptions: {
            onPick: ({ maxDate, minDate }) => {
              if (minDate && !maxDate) {
                this.searchItems.find(item => item.prop === 'createTimeRange').pickerOptions.disabledDate = (time) => {
                  const selectedDate = minDate;
                  const current = new Date(time);
                  const timeDiff = Math.abs(current.getTime() - selectedDate.getTime());
                  const dayDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

                  // 如果日期差大于31天，则禁用
                  return dayDiff > 31;
                };
              } else {
                // 当选择了两个日期后，重置禁用规则
                this.searchItems.find(item => item.prop === 'createTimeRange').pickerOptions.disabledDate = null;
              }
            },
            disabledDate: null,
            // 快捷选择配置
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
      tableData: [],
      loading: false,
      pagination: { pageNum: 1, pageSize: 10, total: 0 }, // 分页参数
      pickerOptions: {
        disabledDate: (time) => {
          // 限制最大跨度31天
          if (this.queryForm.createTimeRange && this.queryForm.createTimeRange.length === 1) {
            const startDate = new Date(this.queryForm.createTimeRange[0]);
            const maxDate = new Date(startDate.getTime() + 31 * 24 * 3600 * 1000);
            return time.getTime() > maxDate.getTime();
          }
          return false;
        }
      },
			moduleHeight: 0, // 搜索模块高度
    };
  },
  mounted() {
    // 判断是否是公会管理员，显示搜索元素
    if (this.checkPermission(['laborunion'])) { // laborunion
      this.searchItems = [this.searchItems[0], this.searchItems[3], this.searchItems[4], this.searchItems[5]]
    }
    this.fetchData();
    /**获取搜索框高度 ***/
    this.updateModuleHeight();
    // 监听窗口大小变化
    window.addEventListener('resize', this.updateModuleHeight);
  },

  beforeDestroy() {
    // 移除监听器
    window.removeEventListener('resize', this.updateModuleHeight);
  },
  methods: {
    // 将权限判断函数挂载到组件方法，方便模板中v-if直接调用
    checkPermission,
    /**获取搜索框高度计算 ***/
    updateModuleHeight() {
      this.$nextTick(() => {
        if (this.$refs.responsiveModule) {
          this.moduleHeight = this.$refs.responsiveModule.offsetHeight;
          console.log('当前高度:', this.moduleHeight);
        }
      });
    },
    handleSearch(e) {
      if (e) {
        const formValues = e;
        // 处理日期范围
        if (formValues.createTime && formValues.createTime.length === 2) {
          this.queryForm.startTime = formValues.createTime[0];
          this.queryForm.endTime = formValues.createTime[1];
        } else {
          this.queryForm.startTime = "";
          this.queryForm.endTime = "";
        }
        delete formValues.createTime;
        this.queryForm = { ...this.queryForm, ...formValues };
      }
      this.pagination.pageNum = 1;
      this.fetchData();
    },
    handleReset() {
      this.$refs.queryForm.resetFields();
      this.pagination.pageNum = 1;
      this.fetchData();
    },
    handleCurrentChange(val) {
      this.pagination.pageNum = val;
      this.fetchData();
    },
    fetchData() {
      this.loading = true;
      // 构造查询参数
      const params = {
        ...this.queryForm,
        pageNum: this.pagination.pageNum,
        pageSize: this.pagination.pageSize
      };
      // 将日期范围拆成 startTime / endTime
      if (params.createTimeRange && params.createTimeRange.length === 2) {
        params.startTime = params.createTimeRange[0];
        params.endTime = params.createTimeRange[1];
      }
      delete params.createTimeRange;

      // TODO: 替换为真实接口
      unionAccountLogList(params).then((res) => {
        if (res.data && res.data.rows) {
          // 处理表格数据，添加手机号显示状态和语音默认配置
          this.tableData = res.data.rows
          this.pagination.total = res.data.total || 0; // 设置总记录数
        } else {
          this.tableData = [];
          this.pagination.total = 0;
        }
        this.loading = false; // 关闭加载状态
      })
      .catch((error) => {
        console.error("获公会流水列表失败:", error);
        this.tableData = [];
        this.pagination.total = 0;
        this.loading = false; // 关闭加载状态
        this.$message.error("获取数据失败，请稍后重试");
      });
    }
  }
};
</script>

<style scoped>
.income {
  color: #1BC286;
  font-weight: bold;
}

.expense {
  color: #FF4D4F;
  font-weight: bold;
}
</style>
