// libs/shared-models/src/lib/shared-models.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export function sharedModels(): string {
  return 'shared-models';
}
