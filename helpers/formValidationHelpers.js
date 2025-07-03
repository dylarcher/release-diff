export function validateRequiredFields(fields) {
  const missingFields = [];

  Object.entries(fields).forEach(([fieldName, value]) => {
    if (!value || value.trim() === '') {
      missingFields.push(fieldName);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

export function extractFormFieldValues(...inputs) {
  return inputs.map(input => input.value.trim());
}
