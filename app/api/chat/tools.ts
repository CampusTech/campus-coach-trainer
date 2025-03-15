export const updatePreferenceTool = {
  type: 'function' as const,
  function: {
    name: 'saveUserPreference',
    description: 'Stores the user\'s preferred name',
    parameters: {
      type: 'object',
      properties: {
        preferredName: {
          type: 'string',
          description: 'The user\'s preferred name'
        }
      },
      required: ['preferredName']
    }
  }
};