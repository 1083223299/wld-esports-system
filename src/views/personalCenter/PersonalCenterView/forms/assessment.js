// requests.js：休班、请假
// community.js：社区发帖
// files.js：文件分类
// scheduling.js：调班、工位、座次
// assessment.js：考核指标与表单
// management.js：员工、规则、账号
// shared.js：各业务共用字段
// index.js：汇总配置，并处理提交字段格式
import { field, employeeField, reasonField } from './shared.js';

export const assessmentMetrics = [
  ['avg_response', '平均响应秒数'],
  ['reply_3min_rate', '三分钟回复率（0～1）'],
  ['satisfaction_rate', '满意度（0～1）'],
  ['inquiry_conversion', '询单转化率（0～1）'],
  ['qa_score_rate', '质检得分率（0～1）'],
  ['complaints', '投诉次数'],
  ['game_knowledge', '知识错误次数'],
  ['handle_ability', '独立处理率（0～1）'],
  ['platform_risk', '平台风险分（0～6）'],
  ['attendance', '考勤违规次数'],
  ['work_standard', '工作规范违规次数'],
  ['execution', '执行违规次数'],
  ['teamwork', '协作违规次数'],
];

export const assessmentForms = {
  templates: [
    {
      title: '创建考核模板版本',
      path: '/assessments/templates',
      fields: [field('name', '版本名称')],
    },
  ],
  periods: [
    {
      title: '创建考核周期',
      path: '/assessments/periods',
      fields: [
        field('name', '周期名称'),
        field('templateId', '模板版本', 'select', true, { source: 'templates' }),
        field('startDate', '开始日期', 'date'),
        field('endDate', '结束日期', 'date'),
      ],
    },
  ],
  scores: [
    {
      title: '保存评分草稿',
      path: '/assessments/scores',
      fields: [
        employeeField,
        field('periodId', '考核周期', 'select', true, { source: 'periods' }),
        field('values', '指标输入', 'metrics'),
        field('evidence', '人工指标证据', 'evidence'),
        field('adjustments', '人工调整分', 'adjustments', false),
      ],
      defaults: {
        values: {},
        evidence: {},
        adjustments: {},
      },
    },
  ],
  vetoes: [
    {
      title: '登记待核实否决',
      path: '/vetoes',
      fields: [
        employeeField,
        field('periodId', '关联周期', 'select', true, { source: 'periods' }),
        field('description', '事件说明', 'textarea'),
        field('evidence', '材料', 'textarea'),
      ],
    },
  ],
  reviews: [
    {
      title: '记录转正评审裁定',
      path: '/reviews',
      fields: [
        field('assessmentId', '已锁定考核', 'select', true, { source: 'lockedAssessments' }),
        field('suggestionId', '最新建议', 'select', true, { source: 'suggestions' }),
        field('decision', '管理裁定', 'select', true, {
          options: [
            { value: 'PASS', label: '通过' },
            { value: 'DELAY', label: '延期' },
            { value: 'FAIL', label: '不通过' },
          ],
        }),
        reasonField,
        field('nextReviewDate', '下次评审日期', 'date', false),
      ],
    },
  ],
};
