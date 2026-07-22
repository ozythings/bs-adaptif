export interface Program {
  id: number;
  name: string;
  description: string;
  courseIds: number[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}
