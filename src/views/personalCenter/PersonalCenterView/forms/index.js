import { assessmentForms, assessmentMetrics } from './assessment.js';
import { communityForms } from './community.js';
import { fileForms } from './files.js';
import { managementForms } from './management.js';
import { requestForms } from './requests.js';
import { schedulingForms } from './scheduling.js';
import { employeeField, reasonField, recordVersionField, shiftField } from './shared.js';

export const forms = {
  ...requestForms,
  ...communityForms,
  ...fileForms,
  ...schedulingForms,
  ...assessmentForms,
  ...managementForms,
};

export const metrics = assessmentMetrics;
export const employee = employeeField;
export const reason = reasonField;
export const version = recordVersionField;
export const shift = shiftField;

export function cleanForm(input) {
  const body = structuredClone(input);

  for (const key of ['attachmentIds', 'authorizedOverrideIds', 'externalImages']) {
    if (typeof body[key] === 'string') {
      body[key] = body[key].split(',').map((value) => value.trim()).filter(Boolean);
    }
  }

  return body;
}
