<template>
  <div class="container">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">话题热度加减分规则配置</h2>
        <p class="page-desc">配置所有话题热度相关的加分、扣分、衰减规则参数</p>
      </div>
      <div class="header-right">
        <el-button @click="handleResetDefault">重置默认</el-button>
        <el-button type="primary" @click="handleSaveAll"
          style="background-color: #6A35FF; border-color: #6A35FF;">
          保存全部配置
        </el-button>
      </div>
    </div>

    <!-- 图一：加分配置 -->
    <el-card class="config-card" shadow="never">
      <el-form ref="form1" :model="form" label-width="260px" label-position="right">
        <!-- 永久基础分配 -->
        <div class="config-section">
          <div class="section-header">
            <span class="section-icon" style="background-color: #e8f5e9;"></span>
            <span class="section-title">永久基础分配</span>
            <el-tag type="success" size="small" class="decay-tag">无衰减</el-tag>
          </div>
          <div class="section-desc">
            发帖绑定话题加分规则：帖子完成审核、合规正常发布后执行加分，该分数永久留存不参与衰减
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="单次发帖加分值">
                <el-input v-model="form.postScore" type="number">
                  <template slot="append">分/篇</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单用户单日同话题最大有效发帖数">
                <el-input v-model="form.dailyTopicPostLimit" type="number">
                  <template slot="append">篇</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="section-note">
            <i class="el-icon-info"></i>
            帖子下架/作者删除后不回溯扣减已发放分数
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="帖子下架/删除后不回溯扣减">
                <el-switch v-model="form.postScoreNoRollback" active-value="1" inactive-value="0" active-color="#8F03FF" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 浏览类行为加分配置 -->
        <div class="config-section">
          <div class="section-header">
            <span class="section-icon" style="background-color: #e3f2fd;"></span>
            <span class="section-title">浏览类行为加分配置</span>
            <el-tag type="warning" size="small" class="decay-tag">7天衰减</el-tag>
          </div>
          <div class="section-desc">
            浏览类行为产生的分数7天内按比例衰减，满7天自动清零
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="进入话题主页单次加分">
                <el-input v-model="form.topicViewScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="浏览帖子最低有效时长">
                <el-input v-model="form.effectiveViewSeconds" type="number">
                  <template slot="append">秒</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="有效浏览帖子单次加分">
                <el-input v-model="form.postViewScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单用户单日浏览类行为累计加分上限">
                <el-input v-model="form.dailyBrowseScoreLimit" type="number">
                  <template slot="append">分</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 深度互动类行为加分配置 -->
        <div class="config-section">
          <div class="section-header">
            <span class="section-icon" style="background-color: #f3e5f5;"></span>
            <span class="section-title">深度互动类行为加分配置</span>
            <el-tag type="warning" size="small" class="decay-tag">7天衰减</el-tag>
          </div>
          <div class="section-desc">
            互动类行为（点赞、评论、收藏、分享）产生的分数7天内按比例衰减，满7天自动清零
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="点赞单次加分">
                <el-input v-model="form.likeScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="重复点赞有效周期">
                <el-input v-model="form.likeDedupHours" type="number">
                  <template slot="append">小时</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="有效评论单次加分">
                <el-input v-model="form.commentScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="收藏单次加分">
                <el-input v-model="form.collectScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分享单次加分">
                <el-input v-model="form.shareScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="分享重复有效周期">
                <el-input v-model="form.shareDedupHours" type="number">
                  <template slot="append">小时</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="用户单日同话题全部互动行为累计加分上限">
                <el-input v-model="form.dailyInteractionScoreLimit" type="number">
                  <template slot="append">分</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="section-note">
            <i class="el-icon-info"></i>
            同一用户对同一帖子，24小时内仅首次有效性发计分，同用户同帖子不重复累加
          </div>
          <div class="section-note">
            <i class="el-icon-info"></i>
            用户取消收藏后不回溯扣减已发放分数
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="取消收藏后不回溯扣减">
                <el-switch v-model="form.collectScoreNoRollback" active-value="1" inactive-value="0" active-color="#8F03FF" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </el-card>

    <!-- 图二：扣分与衰减配置 -->
    <el-card class="config-card" shadow="never">
      <el-form ref="form2" :model="form" label-width="260px" label-position="right">
        <!-- 负面扣分行为配置 -->
        <div class="config-section">
          <div class="section-header">
            <span class="section-icon" style="background-color: #ffebee;"></span>
            <span class="section-title">负面扣分行为配置</span>
            <el-tag type="warning" size="small" class="decay-tag">7天衰减</el-tag>
          </div>
          <div class="section-desc">
            快速划走等负面行为产生的扣分项7天内按比例衰减，满七天自动清零，避免单劣质帖子影响整体话题热度
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="快速划走判定最大停留时长">
                <el-input v-model="form.quickSkipMaxSeconds" type="number">
                  <template slot="append">秒</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="推荐场景快速划走单次扣分值">
                <el-input v-model="form.feedQuickSkipScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="话题内快速划走单次扣分值">
                <el-input v-model="form.topicQuickSkipScore" type="number">
                  <template slot="append">分/次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单用户单日同话题快速划走累计扣分上限">
                <el-input v-model="form.dailyQuickSkipScoreLimit" type="number">
                  <template slot="append">分</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="单帖子24小时内最大扣分值">
                <el-input v-model="form.postDailyQuickSkipLimit" type="number">
                  <template slot="append">分</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <!-- 分数时间衰减规则配置 -->
        <div class="config-section">
          <div class="section-header">
            <span class="section-icon" style="background-color: #fff3e0;"></span>
            <span class="section-title">分数时间衰减规则配置</span>
            <el-tag type="warning" size="small" class="decay-tag">7天衰减</el-tag>
          </div>
          <div class="section-desc">
            全局定时任务配置，每日自动重新计算所有话题的短期动态分数。
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="每日衰减任务执行时间">
                <el-input v-model="form.decayTaskTime" placeholder="HH:mm"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="每日衰减比例">
                <el-input v-model="form.dailyDecayRate" type="number">
                  <template slot="append">%</template>
                </el-input>
                <div class="field-hint">默认1/7 ≈ 14.29%，7天衰减至0</div>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="行为分数自动清零周期">
                <el-input v-model="form.dynamicScoreValidDays" type="number">
                  <template slot="append">天</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="section-note">
            <i class="el-icon-info"></i>
            永久基础分不受衰减规则影响，永久留存
          </div>
          <el-row :gutter="40">
            <el-col :span="12">
              <el-form-item label="永久基础分不受衰减规则影响">
                <el-switch v-model="form.permanentScoreNeoDecay" active-value="1" inactive-value="0" active-color="#8F03FF" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getTopicHeatConfigDetail, saveTopicHeatConfig, resetTopicHeatConfigToDefault } from '@/api/community'
export default {
  name: 'HeatScoreConfiguration',
  data() {
    return {
      form: {
        // 永久基础分配
        postScore: 25,
        dailyTopicPostLimit: 3,
        postScoreNoRollback: '1',
        // 浏览类行为加分
        topicViewScore: 3,
        effectiveViewSeconds: 3,
        postViewScore: 1,
        dailyBrowseScoreLimit: 20,
        // 深度互动类行为加分
        likeScore: 8,
        likeDedupHours: 24,
        commentScore: 18,
        collectScore: 12,
        shareScore: 15,
        shareDedupHours: 24,
        dailyInteractionScoreLimit: 100,
        collectScoreNoRollback: '1',
        // 负面扣分行为
        quickSkipMaxSeconds: 1,
        feedQuickSkipScore: 5,
        topicQuickSkipScore: 2,
        dailyQuickSkipScoreLimit: 20,
        postDailyQuickSkipLimit: 50,
        // 分数时间衰减规则
        decayTaskTime: '02:00',
        dailyDecayRate: 14.29,
        dynamicScoreValidDays: 7,
        permanentScoreNeoDecay: '1'
      }
    }
  },
  mounted() {
    this.fetchConfig()
  },
  methods: {
    async fetchConfig() {
      try {
        const res = await getTopicHeatConfigDetail()
        if (res.success && res.data) {
          this.form = { ...this.form, ...res.data }
        }
      } catch (error) {
        console.error('获取话题热度配置失败:', error)
      }
    },
    handleResetDefault() {
      this.$confirm('确定要重置为默认配置吗？', '提示', {
        type: 'warning'
      }).then(async () => {
        try {
          const res = await resetTopicHeatConfigToDefault({})
          if (res.success) {
            this.$message.success('已重置为默认配置')
            this.fetchConfig()
          } else {
            this.$message.error(res.errorMessage || '重置失败')
          }
        } catch (error) {
          this.$message.error('重置失败')
        }
      }).catch(() => {})
    },
    handleSaveAll() {
      const params = {
        postScore: Number(this.form.postScore),
        dailyTopicPostLimit: Number(this.form.dailyTopicPostLimit),
        postScoreNoRollback: this.form.postScoreNoRollback,
        topicViewScore: Number(this.form.topicViewScore),
        effectiveViewSeconds: Number(this.form.effectiveViewSeconds),
        postViewScore: Number(this.form.postViewScore),
        dailyBrowseScoreLimit: Number(this.form.dailyBrowseScoreLimit),
        likeScore: Number(this.form.likeScore),
        likeDedupHours: Number(this.form.likeDedupHours),
        commentScore: Number(this.form.commentScore),
        collectScore: Number(this.form.collectScore),
        shareScore: Number(this.form.shareScore),
        shareDedupHours: Number(this.form.shareDedupHours),
        dailyInteractionScoreLimit: Number(this.form.dailyInteractionScoreLimit),
        collectScoreNoRollback: this.form.collectScoreNoRollback,
        quickSkipMaxSeconds: Number(this.form.quickSkipMaxSeconds),
        feedQuickSkipScore: Number(this.form.feedQuickSkipScore),
        topicQuickSkipScore: Number(this.form.topicQuickSkipScore),
        dailyQuickSkipScoreLimit: Number(this.form.dailyQuickSkipScoreLimit),
        postDailyQuickSkipLimit: Number(this.form.postDailyQuickSkipLimit),
        decayTaskTime: this.form.decayTaskTime,
        dailyDecayRate: Number(this.form.dailyDecayRate),
        dynamicScoreValidDays: Number(this.form.dynamicScoreValidDays),
        permanentScoreNoDecay: this.form.permanentScoreNeoDecay
      }
      saveTopicHeatConfig(params).then(res => {
        if (res.success) {
          this.$message.success('保存全部配置成功')
        } else {
          this.$message.error(res.errorMessage || '保存失败')
        }
      }).catch(() => {
        this.$message.error('保存失败')
      })
    }
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  box-sizing: border-box;
  overflow: auto;
  height: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-desc {
  font-size: 14px;
  color: #909399;
  margin: 0;
}

.header-right {
  display: flex;
  gap: 10px;
}

.config-card {
  margin-bottom: 20px;
}

::v-deep .config-card .el-card__body {
  padding: 24px;
}

.config-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #fafafa;
  border-radius: 8px;
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-icon {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  display: inline-block;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.decay-tag {
  margin-left: 8px;
}

.section-desc {
  font-size: 13px;
  color: #909399;
  margin-bottom: 20px;
  padding: 8px 12px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

::v-deep .config-section .el-form-item {
  margin-bottom: 20px;
}

::v-deep .config-section .el-form-item__label {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

::v-deep .config-section .el-input-group__append {
  background-color: #f5f7fa;
  color: #909399;
  border-color: #dcdfe6;
}

.section-note {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #909399;
  margin-top: 8px;
}

.section-note i {
  color: #409eff;
  font-size: 14px;
}

.field-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}
</style>
