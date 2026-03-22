// Pre-op checklist is now stored as JSONB on OtBooking.preOpChecklist.
// This file is kept so that any legacy imports of OtChecklist still compile.
// OtChecklist is NOT registered as a TypeORM entity anywhere.

export class OtChecklist {
  id: string;
}

export enum ChecklistType {
  PREOP = 'PREOP',
  INTRAOP = 'INTRAOP',
  POSTOP = 'POSTOP',
}
