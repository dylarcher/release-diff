import { DEFAULT_VALUES } from '../shared/presetConstants.js';

class FormValidationHelpers {
  static validateRequiredFields(fields) {
    const missingFields = [];

    for (const [fieldName, value] of Object.entries(fields)) {
      if (!value || value.trim() === '') {
        missingFields.push(fieldName);
      }
    }

    return {
      isValid: missingFields.length === 0,
      missingFields
    };
  }

  static extractFormFieldValues(...inputs) {
    return inputs.map(input => input.value.trim());
  }
}
export const validateRequiredFields = FormValidationHelpers.validateRequiredFields;
export const extractFormFieldValues = FormValidationHelpers.extractFormFieldValues;
export default FormValidationHelpers;
