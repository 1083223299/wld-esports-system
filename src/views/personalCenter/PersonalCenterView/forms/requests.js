import { field, reasonField } from './shared.js';

export const requestForms = {
  rest: [
    {
      title: '申请休班',
      path: '/rests',
      fields: [
        field('restDate', '休班日期', 'date'),
        field('reason', '说明', 'textarea', false),
      ],
    },
  ],
  leave: [
    {
      title: '申请请假',
      path: '/leaves',
      fields: [
        field('type', '请假类型', 'select', true, {
          options: [
            { value: 'PERSONAL', label: '事假' },
            { value: 'SICK', label: '病假' },
            { value: 'ANNUAL', label: '年假' },
            { value: 'COMPENSATORY', label: '调休' },
          ],
        }),
        field('startDate', '开始日期', 'date'),
        field('endDate', '结束日期', 'date'),
        reasonField,
        field('attachmentIds', '证明材料', 'attachments', false),
        field('authorizedOverrideIds', '已有特批休班记录编号', 'text', false, {
          help: '有冲突时填写，可用逗号分隔；不提供绕过请假重叠的能力。',
        }),
        field('overrideReason', '特批共存说明', 'textarea', false),
      ],
    },
  ],
};
