export interface InstructorSpec {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  expertise: string;
}

export const INSTRUCTOR_SPECS: InstructorSpec[] = [
  { firstName: 'Ahmet', lastName: 'Yılmaz', email: 'ahmet.yilmaz@akademi.com', phone: '05321234567', expertise: 'Angular, TypeScript' },
  { firstName: 'Ayşe', lastName: 'Demir', email: 'ayse.demir@akademi.com', phone: '05331234567', expertise: 'RxJS, Node.js' },
  { firstName: 'Mehmet', lastName: 'Kaya', email: 'mehmet.kaya@akademi.com', phone: '05341234567', expertise: 'Backend, Database' },
  { firstName: 'Fatma', lastName: 'Öztürk', email: 'fatma.ozturk@akademi.com', phone: '05351234567', expertise: 'UI/UX, CSS' },
];
