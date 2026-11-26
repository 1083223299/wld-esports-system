import { field, reasonField, recordVersionField, shiftField } from './shared.js';

export const managementForms = {
  employees: [
    {
      title: '维护员工',
      path: '/employees',
      fields: [
        field('name', '姓名'),
        field('number', '工号'),
        field('accountId', '后台账号', 'select', true, {
          source: 'accounts',
          help: '选择后台账号；提交使用账号数字编号，不要填写手机号。',
        }),
        shiftField,
        field('state', '业务状态', 'select', true, {
          options: [
            { value: 'active', label: '在岗' },
            { value: 'disabled', label: '业务停用' },
            { value: 'left', label: '离职' },
          ],
        }),
        field('entryDate', '入职日期', 'date', false),
      ],
    },
  ],
  settings: [
    {
      title: '休班规则配置',
      path: '/settings',
      fields: [
        field('applyGapDays', '提交间隔天数', 'number'),
        field('restGapDays', '休班间隔天数', 'number'),
        field('leadDays', '提前申请天数', 'number'),
        recordVersionField,
      ],
      defaults: {
        applyGapDays: 4,
        restGapDays: 7,
        leadDays: 2,
        expectedVersion: '0',
      },
    },
  ],
  accounts: [
    {
      title: '已有账号操作',
      path: '/accounts/command',
      fields: [
        field('accountId', '后台账号编号'),
        field('action', '操作', 'select', true, {
          options: [
            { value: 'disable', label: '停用新登录' },
            { value: 'revokeSessions', label: '主动撤销会话' },
            { value: 'resetPassword', label: '重置并强制改密' },
            { value: 'role', label: '修改授权角色' },
          ],
        }),
        reasonField,
        recordVersionField,
      ],
    },
  ],
};
