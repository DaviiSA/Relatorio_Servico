
import { COLLABORATORS, WorkType, ActionType } from './constants';

export type Collaborator = typeof COLLABORATORS[number];

export interface LaborItemData {
  id: number;
  code: string;
  quantity: number;
  actionType: ActionType;
}

export interface FormData {
  workOrderNumber: string;
  workType: WorkType | '';
  collaborators: Collaborator[];
  images: File[];
  laborItems: LaborItemData[];
}
