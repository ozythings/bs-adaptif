export interface Participant {
  id: number;
  schoolNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}
