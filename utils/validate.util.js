"use strict";

export class ValidateInput {
  static validateRequiredFields(fields) {
    const missingFields = [];

    for (const [fieldName, value] of Object.entries(fields)) {
      if (!value || value.trim() === '') {
        missingFields.push(fieldName);
      }
    }

    return {
      isValid: !missingFields.length,
      missingFields
    };
  }

  static extractFormFieldValues(...inputs) {
    return inputs.map(input => input.value.trim());
  }
}

export const { validateRequiredFields, extractFormFieldValues } = ValidateInput || {};
export default new ValidateInput();
