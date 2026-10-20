<template>
  <div class="container">
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">推荐策略配置</h2>
        <p class="page-desc">本配置用于管理所有话题热度相关的加分、扣分、衰减规则参数，控制话题在排行榜中的排序表现。</p>
      </div>
      <div class="header-right">
        <el-button :loading="loading" :disabled="loading" @click="handleResetDefault">重置默认</el-button>
        <el-button :loading="loading" :disabled="loading" type="primary" @click="handleSaveAll"
          style="background-color: #2F68FF; border-color: #2F68FF;">
          保存全部配置
        </el-button>
      </div>
    </div>

    <el-card class="config-card" shadow="never">
      <el-form ref="form" :model="form" :rules="rules" label-width="140px" label-position="left">
        <div class="config-section">
          <div class="section-header">
            <span class="section-title">永久基础配置</span>
            <el-tag type="success" size="small" class="decay-tag">新贴观察期</el-tag>
          </div>

          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="观察时长" prop="observationHours">
                <el-input v-model="form.observationHours" type="number">
                  <template slot="append">小时</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row :gutter="24">
            <el-col :span="8">
              <el-form-item label="达标计算方式" prop="thresholdMode">
                <el-select v-model="form.thresholdMode" placeholder="请选择" style="width: 100%;">
                  <el-option label="全站均值对比" value="AVERAGE"></el-option>
                  <el-option label="固定阈值" value="FIXED"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row v-if="form.thresholdMode === 'AVERAGE'" :gutter="24">
            <el-col :span="8">
              <el-form-item label="统计区间" prop="statisticsHours">
                <el-input v-model="form.statisticsHours" type="number">
                  <template slot="append">小时</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="统计范围" prop="statisticsScope">
                <el-select v-model="form.statisticsScope" placeholder="请选择" style="width: 100%;">
                  <el-option label="全部帖子" value="ALL_POST"></el-option>
                  <el-option label="同话题" value="SAME_TOPIC"></el-option>
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="对比系数" label-width="80px" prop="comparisonCoefficient">
                <el-input v-model="form.comparisonCoefficient" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="保障阈值" label-width="80px" prop="guaranteeThreshold">
                <el-input v-model="form.guaranteeThreshold" type="number">
                  <template slot="append">分</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>

          <div v-else class="fixed-threshold-wrapper">
            <div class="fixed-threshold-box">
              <el-row :gutter="24">
                <el-col :span="8">
                  <el-form-item label="达标阈值" prop="fixedThreshold">
                    <el-input v-model="form.fixedThreshold" type="number">
                      <template slot="append">分</template>
                    </el-input>
                  </el-form-item>
                </el-col>
                <el-col :span="8">
                  <el-form-item label="保障阈值" prop="guaranteeThreshold">
                    <el-input v-model="form.guaranteeThreshold" type="number">
                      <template slot="append">分</template>
                    </el-input>
                  </el-form-item>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>

        <div class="config-section">
          <div class="section-header">
            <span class="section-title">冷启动综合分权重</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="4">
              <el-form-item label="阅读" label-width="50px" class="compact-item" prop="coldReadWeight">
                <el-input v-model="form.coldReadWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="点赞" label-width="50px" class="compact-item" prop="coldLikeWeight">
                <el-input v-model="form.coldLikeWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="评论" label-width="50px" class="compact-item" prop="coldCommentWeight">
                <el-input v-model="form.coldCommentWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="收藏" label-width="50px" class="compact-item" prop="coldCollectWeight">
                <el-input v-model="form.coldCollectWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="转发" label-width="50px" class="compact-item" prop="coldShareWeight">
                <el-input v-model="form.coldShareWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="踩" label-width="30px" class="compact-item" prop="coldDislikeWeight">
                <el-input v-model="form.coldDislikeWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="section-note">
            综合得分 = 阅读量 × {{ form.coldReadWeight }} + 点赞量 × {{ form.coldLikeWeight }} + 评论量 × {{
              form.coldCommentWeight
            }} + 收藏量 × {{ form.coldCollectWeight }} + 转发量 × {{ form.coldShareWeight }} + 踩量 × {{
              form.coldDislikeWeight
            }}（仅冷启动准入）
          </div>
        </div>

        <div class="config-section">
          <div class="section-header">
            <span class="section-title">首页排序规则</span>
          </div>
          <el-row :gutter="16">
            <el-col :span="6">
              <el-form-item label="点赞权重" label-width="80px" class="compact-item" prop="rankLikeWeight">
                <el-input v-model="form.rankLikeWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="评论权重" label-width="80px" class="compact-item" prop="rankCommentWeight">
                <el-input v-model="form.rankCommentWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="完读率权重" label-width="90px" class="compact-item" prop="rankCompletionWeight">
                <el-input v-model="form.rankCompletionWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="踩权重" label-width="60px" class="compact-item" prop="rankDislikeWeight">
                <el-input v-model="form.rankDislikeWeight" type="number"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <div class="section-note">
            互动综合分 = 点赞量 × {{ form.rankLikeWeight }} + 评论量 × {{ form.rankCommentWeight }} + 完读率 × {{
              form.rankCompletionWeight
            }} + 踩量 × {{ form.rankDislikeWeight }}（负向）
          </div>
        </div>

        <div class="config-section">
          <div class="section-header">
            <span class="section-title">多样化推荐</span>
          </div>
          <el-row :gutter="24">
            <el-col :span="6">
              <el-form-item label="感兴趣话题比例" label-width="120px" class="compact-item" prop="interestedTopicRatio">
                <el-input v-model="form.interestedTopicRatio" type="number">
                  <template slot="append">%</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="陌生话题比例" label-width="110px" class="compact-item" prop="unfamiliarTopicRatio">
                <el-input v-model="form.unfamiliarTopicRatio" type="number">
                  <template slot="append">%</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="踩触发下调阈值" label-width="120px" class="compact-item" prop="dislikeDowngradeThreshold">
                <el-input v-model="form.dislikeDowngradeThreshold" type="number">
                  <template slot="append">次</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="6">
              <el-form-item label="下调比例" label-width="80px" class="compact-item" prop="dislikeDowngradeRatio">
                <el-input v-model="form.dislikeDowngradeRatio" type="number">
                  <template slot="append">%</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="config-section">
          <div class="section-header">
            <span class="section-title">生命周期</span>
          </div>
          <el-row :gutter="24">
            <el-col :span="6">
              <el-form-item label="推荐有效期" label-width="90px" class="compact-item" prop="recommendValidDays">
                <el-input v-model="form.recommendValidDays" type="number">
                  <template slot="append">天</template>
                </el-input>
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="提前衰减踩阈值" label-width="120px" class="compact-item" prop="earlyDecayDislikeThreshold">
                <el-input v-model="form.earlyDecayDislikeThreshold" type="number">
                  <template slot="append">次</template>
                </el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </div>

        <div class="config-section">
          <div class="section-header">
            <span class="section-title">强制去重</span>
          </div>
          <el-row :gutter="24">
            <el-col :span="6">
              <el-form-item label="推荐页刷新去重" label-width="120px" class="compact-item" prop="dedupEnabled">
                <el-switch v-model="form.dedupEnabled" active-value="1" inactive-value="0"></el-switch>
              </el-form-item>
            </el-col>
            <el-col v-if="form.dedupEnabled === '1'" :span="6">
              <el-form-item label="缓存时长" label-width="80px" class="compact-item" prop="dedupCacheHours">
                <el-input v-model="form.dedupCacheHours" type="number">
                  <template slot="append">小时</template>
                </el-input>
              </el-form-item>
            </el-col>

            <el-col v-if="form.dedupEnabled === '1'" :span="6">
              <el-form-item label="去重范围" label-width="80px" class="compact-item" prop="dedupScope">
                <el-select v-model="form.dedupScope" placeholder="请选择去重范围">
                  <el-option label="当前会话" value="CURRENT_SESSION"></el-option>
                
                </el-select>
              </el-form-item>
            </el-col>

          </el-row>
        </div>
      </el-form>
    </el-card>

  </div>
</template>

<script>
import { getRecommendationConfigDetail, resetRecommendationConfigToDefault, saveRecommendationConfig } from '@/api/community'

const createRules = (getForm) => {
  const isEmpty = (v) => v === '' || v === null || v === undefined
  const isNumber = (v) => !Number.isNaN(Number(v))

  const requiredNumber = (message) => (rule, value, callback) => {
    if (isEmpty(value)) return callback(new Error(message))
    if (!isNumber(value)) return callback(new Error(message))
    return callback()
  }

  const requiredNumberWhen = (predicate, message) => (rule, value, callback) => {
    if (!predicate(getForm())) return callback()
    return requiredNumber(message)(rule, value, callback)
  }

  const requiredPercent = (message) => (rule, value, callback) => {
    if (isEmpty(value)) return callback(new Error(message))
    const n = Number(value)
    if (Number.isNaN(n)) return callback(new Error(message))
    if (n < 0 || n > 100) return callback(new Error('请输入 0~100 的数值'))
    return callback()
  }

  return {
    observationHours: [{ validator: requiredNumber('请输入观察时长'), trigger: 'blur' }],
    thresholdMode: [{ required: true, message: '请选择达标计算方式', trigger: 'change' }],
    statisticsHours: [{
      validator: requiredNumberWhen((f) => f.thresholdMode === 'AVERAGE', '请输入统计区间'),
      trigger: 'blur'
    }],
    statisticsScope: [{
      validator: (rule, value, callback) => {
        const f = getForm()
        if (f.thresholdMode !== 'AVERAGE') return callback()
        if (isEmpty(value)) return callback(new Error('请选择统计范围'))
        return callback()
      },
      trigger: 'change'
    }],
    comparisonCoefficient: [{
      validator: requiredNumberWhen((f) => f.thresholdMode === 'AVERAGE', '请输入对比系数'),
      trigger: 'blur'
    }],
    guaranteeThreshold: [{ validator: requiredNumber('请输入保障阈值'), trigger: 'blur' }],
    fixedThreshold: [{
      validator: requiredNumberWhen((f) => f.thresholdMode === 'FIXED', '请输入达标阈值'),
      trigger: 'blur'
    }],

    coldReadWeight: [{ validator: requiredNumber('请输入阅读权重'), trigger: 'blur' }],
    coldLikeWeight: [{ validator: requiredNumber('请输入点赞权重'), trigger: 'blur' }],
    coldCommentWeight: [{ validator: requiredNumber('请输入评论权重'), trigger: 'blur' }],
    coldCollectWeight: [{ validator: requiredNumber('请输入收藏权重'), trigger: 'blur' }],
    coldShareWeight: [{ validator: requiredNumber('请输入转发权重'), trigger: 'blur' }],
    coldDislikeWeight: [{ validator: requiredNumber('请输入踩权重'), trigger: 'blur' }],

    rankLikeWeight: [{ validator: requiredNumber('请输入点赞权重'), trigger: 'blur' }],
    rankCommentWeight: [{ validator: requiredNumber('请输入评论权重'), trigger: 'blur' }],
    rankCompletionWeight: [{ validator: requiredNumber('请输入完读率权重'), trigger: 'blur' }],
    rankDislikeWeight: [{ validator: requiredNumber('请输入踩权重'), trigger: 'blur' }],

    interestedTopicRatio: [{ validator: requiredPercent('请输入感兴趣话题比例'), trigger: 'blur' }],
    unfamiliarTopicRatio: [{ validator: requiredPercent('请输入陌生话题比例'), trigger: 'blur' }],
    dislikeDowngradeThreshold: [{ validator: requiredNumber('请输入踩触发下调阈值'), trigger: 'blur' }],
    dislikeDowngradeRatio: [{ validator: requiredPercent('请输入下调比例'), trigger: 'blur' }],

    recommendValidDays: [{ validator: requiredNumber('请输入推荐有效期'), trigger: 'blur' }],
    earlyDecayDislikeThreshold: [{ validator: requiredNumber('请输入提前衰减踩阈值'), trigger: 'blur' }],

    dedupEnabled: [{ required: true, message: '请选择去重开关', trigger: 'change' }],
    dedupCacheHours: [{
      validator: requiredNumberWhen((f) => f.dedupEnabled === '1', '请输入缓存时长'),
      trigger: 'blur'
    }]
  }
}

const getDefaultForm = () => ({
  observationHours: 6,
  thresholdMode: 'AVERAGE',
  statisticsHours: 24,
  statisticsScope: 'ALL_POST',
  comparisonCoefficient: 1,
  guaranteeThreshold: 10,
  fixedThreshold: 50,
  coldReadWeight: 0.5,
  coldLikeWeight: 2,
  coldCommentWeight: 5,
  coldCollectWeight: 10,
  coldShareWeight: 8,
  coldDislikeWeight: -3,
  rankLikeWeight: 0.5,
  rankCommentWeight: 2,
  rankCompletionWeight: 100,
  rankDislikeWeight: -2,
  interestedTopicRatio: 70,
  unfamiliarTopicRatio: 30,
  dislikeDowngradeThreshold: 3,
  dislikeDowngradeRatio: 20,
  recommendValidDays: 7,
  earlyDecayDislikeThreshold: 50,
  dedupEnabled: '1',
  dedupCacheHours: 72
})

export default {
  name: 'RecommendationStrategy',
  data() {
    return {
      loading: false,
      rules: {},
      form: getDefaultForm()
    }
  },
  created() {
    this.rules = createRules(() => this.form)
    this.fetchConfig()
  },
  methods: {
    validateForm() {
      const formRef = this.$refs.form
      if (!formRef) return Promise.resolve(true)
      return new Promise((resolve) => {
        formRef.validate((valid) => resolve(valid))
      })
    },
    handleResetDefault() {
      this.$confirm('确定要重置为默认配置吗？', '提示', {
        type: 'warning'
      }).then(() => this.handleResetToServerDefault()).catch(() => { })
    },
    normalizeFormPayload() {
      const source = { ...this.form }
      const numberKeys = [
        'observationHours',
        'statisticsHours',
        'comparisonCoefficient',
        'guaranteeThreshold',
        'fixedThreshold',
        'coldReadWeight',
        'coldLikeWeight',
        'coldCommentWeight',
        'coldCollectWeight',
        'coldShareWeight',
        'coldDislikeWeight',
        'rankLikeWeight',
        'rankCommentWeight',
        'rankCompletionWeight',
        'rankDislikeWeight',
        'interestedTopicRatio',
        'unfamiliarTopicRatio',
        'dislikeDowngradeThreshold',
        'dislikeDowngradeRatio',
        'recommendValidDays',
        'earlyDecayDislikeThreshold',
        'dedupCacheHours'
      ]

      numberKeys.forEach((key) => {
        if (source[key] === '' || source[key] === null || source[key] === undefined) return
        const n = Number(source[key])
        if (!Number.isNaN(n)) source[key] = n
      })

      if (source.thresholdMode === 'AVERAGE') {
        delete source.fixedThreshold
      } else if (source.thresholdMode === 'FIXED') {
        delete source.statisticsHours
        delete source.statisticsScope
        delete source.comparisonCoefficient
      }

      if (source.dedupEnabled !== '1') {
        delete source.dedupCacheHours
      }

      return source
    },
    async fetchConfig(options = {}) {
      const { keepLoading = false } = options
      if (this.loading && !keepLoading) return
      if (!keepLoading) this.loading = true
      try {
        const res = await getRecommendationConfigDetail({})
        const data = (res && res.data) || {}
        this.form = { ...getDefaultForm(), ...data }
      } finally {
        if (!keepLoading) this.loading = false
      }
    },
    async handleSaveAll() {
      if (this.loading) return
      const valid = await this.validateForm()
      if (!valid) {
        this.$message.warning('请完善必填项')
        return
      }
      this.loading = true
      try {
        await saveRecommendationConfig(this.normalizeFormPayload())
        this.$message.success('保存全部配置成功')
        await this.fetchConfig({ keepLoading: true })
      } finally {
        this.loading = false
      }
    },
    async handleResetToServerDefault() {
      if (this.loading) return
      this.loading = true
      try {
        const res = await resetRecommendationConfigToDefault({})
        const data = (res && res.data) || null
        if (data && typeof data === 'object') {
          this.form = { ...getDefaultForm(), ...data }
        } else {
          await this.fetchConfig({ keepLoading: true })
        }
        this.$message.success('已重置为默认配置')
      } finally {
        this.loading = false
      }
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
  line-height: 22px;
}

.header-right {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.config-card {
  margin-bottom: 20px;
}

::v-deep .config-card .el-card__body {
  padding: 20px;
}

.config-section {
  margin-bottom: 16px;
  padding: 18px 16px;
  background-color: #ffffff;
  border-radius: 6px;
  border: 1px solid #ebeef5;
}

.config-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.decay-tag {
  margin-left: 4px;
}

::v-deep .el-form-item {
  margin-bottom: 14px;
}

.compact-item {
  margin-bottom: 8px;
}

.section-note {
  font-size: 12px;
  color: #606266;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  line-height: 18px;
}

.fixed-threshold-wrapper {
  margin-top: 10px;
}

/* .fixed-threshold-box {
  border: 1px dashed #ff9f3f;
  border-radius: 6px;
  padding: 12px 12px 0 12px;
  background: rgba(255, 159, 63, 0.06);
} */
</style>
