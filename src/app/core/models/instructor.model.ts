export interface Instructor {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  expertise: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
