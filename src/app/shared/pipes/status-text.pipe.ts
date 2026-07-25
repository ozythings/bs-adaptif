import { Pipe,  PipeTransform } from '@angular/core';
import {
  CourseStatus,
  EnrollmentStatus,
  ExamStatus,
  QuestionStatus,
  Difficulty,
  ResultStatus,
  AttendanceStatus,
  CertificateStatus,
  AuditAction,
  UserRole,
  OutcomeLevel,
  BlueprintStatus
} from '@core/models/enums';

const STATUS_MAP = new Map<string, string>([
  [CourseStatus.ACTIVE, 'Aktif'],
  [CourseStatus.INACTIVE, 'Pasif'],
  [CourseStatus.COMPLETED, 'Tamamlandı'],
  [EnrollmentStatus.PENDING, 'Beklemede'],
  [EnrollmentStatus.APPROVED, 'Onaylandı'],
  [EnrollmentStatus.REJECTED, 'Reddedildi'],
  [EnrollmentStatus.COMPLETED, 'Tamamlandı'],
  [EnrollmentStatus.CANCELLED, 'İptal Edildi'],
  [ExamStatus.DRAFT, 'Taslak'],
  [ExamStatus.PUBLISHED, 'Yayında'],
  [ExamStatus.ARCHIVED, 'Arşivde'],
  [QuestionStatus.ACTIVE, 'Aktif'],
  [QuestionStatus.INACTIVE, 'Pasif'],
  [Difficulty.EASY, 'Kolay'],
  [Difficulty.MEDIUM, 'Orta'],
  [Difficulty.HARD, 'Zor'],
  [ResultStatus.DRAFT, 'Taslak'],
  [ResultStatus.FINALIZED, 'Kesinleşti'],
  [AttendanceStatus.ATTENDED, 'Katıldı'],
  [AttendanceStatus.ABSENT, 'Katılmadı'],
  [AttendanceStatus.EXCUSED, 'Mazeretli'],
  [CertificateStatus.NOT_ELIGIBLE, 'Uygun Değil'],
  [CertificateStatus.ELIGIBLE, 'Uygun'],
  [CertificateStatus.ISSUED, 'Verildi'],
  [AuditAction.CREATE, 'Oluşturma'],
  [AuditAction.UPDATE, 'Güncelleme'],
  [AuditAction.DELETE, 'Silme'],
  [AuditAction.APPROVE, 'Onaylama'],
  [AuditAction.REJECT, 'Reddetme'],
  [AuditAction.CANCEL, 'İptal'],
  [AuditAction.RESTORE, 'Geri Yükleme'],
  [AuditAction.SWITCH, 'Rol Değiştirme'],
  [AuditAction.PUBLISH, 'Yayınlama'],
  [AuditAction.GRADE, 'Notlandırma'],
  [AuditAction.OVERRIDE, 'Not Düzeltme'],
  [AuditAction.VIEW, 'Görüntüleme'],
  [AuditAction.SUBMIT, 'Gönderim'],
  [AuditAction.SESSION_END, 'Oturum Sonlandırma'],
  [AuditAction.SESSION_EXPIRE, 'Oturum Süre Aşımı'],
  [UserRole.ADMIN, 'Yönetici'],
  [UserRole.INSTRUCTOR, 'Eğitmen'],
  [UserRole.PARTICIPANT, 'Katılımcı'],
  [UserRole.ASSESSMENT_SPECIALIST, 'Değerlendirme Uzmanı'],
  [UserRole.PROGRAM_MANAGER, 'Program Yöneticisi'],
  [UserRole.OBSERVER, 'Gözlemci'],
  [UserRole.PLATFORM_ADMIN, 'Platform Yöneticisi'],
  [OutcomeLevel.REMEMBER, 'Hatırlama'],
  [OutcomeLevel.UNDERSTAND, 'Anlama'],
  [OutcomeLevel.APPLY, 'Uygulama'],
  [OutcomeLevel.ANALYZE, 'Çözümleme'],
  [OutcomeLevel.EVALUATE, 'Değerlendirme'],
  [OutcomeLevel.CREATE, 'Yaratma'],
  [BlueprintStatus.DRAFT, 'Taslak'],
  [BlueprintStatus.READY, 'Hazır'],
  [BlueprintStatus.VIOLATED, 'İhlal'],
]);

@Pipe({
  name: 'statusText',
  standalone: true
})
export class StatusTextPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return STATUS_MAP.get(value) || String(value);
  }
}
