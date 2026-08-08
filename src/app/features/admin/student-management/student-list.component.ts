import { Component, inject, signal, computed, viewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Participant } from '@core/models/participant.model';
import { UserRole } from '@core/models/enums';
import { EntityStore } from '@core/state/entity.store';
import { CurrentUserService } from '@core/auth/current-user.service';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatTableModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSortModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Öğrenci Yönetimi</h1>
        @if (canEdit()) {
          <button mat-raised-button color="primary" (click)="openCreateDialog()">
            <mat-icon>add</mat-icon> Yeni Öğrenci Ekle
          </button>
        }
      </div>

      <ng-template #studentFormDialog>
        <h2 mat-dialog-title>{{ editingId() ? 'Öğrenci Düzenle' : 'Yeni Öğrenci Ekle' }}</h2>
        <mat-dialog-content class="min-w-[420px] !pt-4 !pb-2">
          <form [formGroup]="studentForm" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Ad</mat-label>
              <input matInput formControlName="firstName" placeholder="Ad">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Soyad</mat-label>
              <input matInput formControlName="lastName" placeholder="Soyad">
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>E-posta</mat-label>
              <input matInput formControlName="email" placeholder="ornek@eposta.com" type="email">
              @if (studentForm.get('email')?.hasError('email')) {
                <mat-error>Geçerli bir e-posta adresi girin</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Telefon</mat-label>
              <input matInput formControlName="phone" placeholder="05XXXXXXXXX">
              @if (studentForm.get('phone')?.hasError('pattern')) {
                <mat-error>05 ile başlayan 11 haneli telefon numarası</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Okul Numarası</mat-label>
              <input matInput formControlName="schoolNumber" placeholder="2024001">
              @if (studentForm.get('schoolNumber')?.hasError('pattern')) {
                <mat-error>4-10 haneli sayısal okul numarası</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Doğum Tarihi</mat-label>
              <input matInput [matDatepicker]="bdPicker" formControlName="birthDate">
              <mat-datepicker-toggle matIconSuffix [for]="bdPicker"></mat-datepicker-toggle>
              <mat-datepicker #bdPicker></mat-datepicker>
            </mat-form-field>
          </form>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
          <button mat-button mat-dialog-close>İptal</button>
          <button mat-raised-button color="primary" (click)="saveStudent()" [disabled]="studentForm.invalid">Kaydet</button>
        </mat-dialog-actions>
      </ng-template>

      <mat-card class="overflow-x-auto">
        <div class="p-4">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Öğrenci Ara</mat-label>
            <input matInput [value]="searchTerm()" (input)="onSearch($any($event.target).value)" placeholder="İsim, numara veya e-posta ile ara...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
        </div>
        @if (filteredStudents().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">people</mat-icon>
            <p>{{ students().length === 0 ? 'Henüz öğrenci bulunmuyor' : 'Sonuç bulunamadı' }}</p>
          </div>
        } @else {
          <table mat-table matSort [dataSource]="paginatedStudents()" (matSortChange)="onSort($event)" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="w-16">ID</th>
              <td mat-cell *matCellDef="let s">{{ s.id }}</td>
            </ng-container>
            <ng-container matColumnDef="schoolNumber">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Okul No</th>
              <td mat-cell *matCellDef="let s">{{ s.schoolNumber }}</td>
            </ng-container>
            <ng-container matColumnDef="firstName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Ad</th>
              <td mat-cell *matCellDef="let s">{{ s.firstName }}</td>
            </ng-container>
            <ng-container matColumnDef="lastName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Soyad</th>
              <td mat-cell *matCellDef="let s">{{ s.lastName }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>E-posta</th>
              <td mat-cell *matCellDef="let s">{{ s.email }}</td>
            </ng-container>
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Telefon</th>
              <td mat-cell *matCellDef="let s">{{ s.phone }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="w-24"></th>
              <td mat-cell *matCellDef="let s">
                <div class="flex items-center gap-1">
                  @if (canEdit()) {
                    <button mat-icon-button matTooltip="Düzenle" (click)="editStudent(s)">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                  <a mat-icon-button matTooltip="Detay" color="primary" [routerLink]="['/student', s.id, 'analytics']" [queryParams]="{returnUrl: '/admin/students'}">
                    <mat-icon>visibility</mat-icon>
                  </a>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 25]"
            [length]="filteredStudents().length"
            [pageIndex]="pageIndex()"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </mat-card>
    </div>
  `
})
export class StudentListComponent {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private store = inject(EntityStore);
  private currentUser = inject(CurrentUserService);

  readonly students = this.store.participants.asReadonly();

  canEdit = computed(() => {
    const role = this.currentUser.user().role;
    return role === UserRole.PLATFORM_ADMIN || role === UserRole.PROGRAM_MANAGER;
  });

  studentFormDialogTpl = viewChild<TemplateRef<any>>('studentFormDialog');
  editingId = signal<number | null>(null);
  displayedColumns = ['id', 'schoolNumber', 'firstName', 'lastName', 'email', 'phone', 'actions'];

  searchTerm = signal('');
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc' | ''>('asc');
  pageSize = signal(10);
  pageIndex = signal(0);

  studentForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.pattern(/^05[0-9]{9}$/)]],
    schoolNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)]],
    birthDate: [null as Date | null, Validators.required],
  });

  filteredStudents = computed(() => {
    let result = [...this.students()].filter(s => !s.deletedAt);
    const search = this.searchTerm().toLowerCase();
    if (search) {
      result = result.filter(s =>
        s.firstName.toLowerCase().includes(search) ||
        s.lastName.toLowerCase().includes(search) ||
        s.schoolNumber.includes(search) ||
        s.email.toLowerCase().includes(search)
      );
    }
    const col = this.sortColumn();
    const dir = this.sortDirection();
    if (dir) {
      result.sort((a, b) => {
        let va: any = (a as any)[col];
        let vb: any = (b as any)[col];
        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  });

  paginatedStudents = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredStudents().slice(start, start + this.pageSize());
  });

  openCreateDialog(): void {
    const tpl = this.studentFormDialogTpl();
    if (!tpl) return;
    this.editingId.set(null);
    this.studentForm.reset({ firstName: '', lastName: '', email: '', phone: '', schoolNumber: '', birthDate: null });
    this.dialog.open(tpl, { width: '480px' });
  }

  editStudent(student: Participant): void {
    const tpl = this.studentFormDialogTpl();
    if (!tpl) return;
    this.editingId.set(student.id);
    const bd = student.birthDate ? new Date(student.birthDate) : null;
    this.studentForm.reset({
      firstName: student.firstName,
      lastName: student.lastName,
      email: student.email,
      phone: student.phone,
      schoolNumber: student.schoolNumber,
      birthDate: bd,
    });
    this.dialog.open(tpl, { width: '480px' });
  }

  saveStudent(): void {
    if (this.studentForm.invalid) return;
    const fv = this.studentForm.value;
    const birthDateStr = this.toDateString(fv.birthDate!);

    const editId = this.editingId();
    if (editId) {
      this.store.updateParticipant(editId, {
        firstName: fv.firstName!,
        lastName: fv.lastName!,
        email: fv.email!,
        phone: fv.phone!,
        schoolNumber: fv.schoolNumber!,
        birthDate: birthDateStr,
      });
    } else {
      const now = new Date().toISOString();
      const nextId = Math.max(...this.store.participants().map(p => p.id), 0) + 1;
      const newStudent: Participant = {
        id: nextId,
        schoolNumber: fv.schoolNumber!,
        firstName: fv.firstName!,
        lastName: fv.lastName!,
        email: fv.email!,
        phone: fv.phone!,
        birthDate: birthDateStr,
        createdAt: now,
        updatedAt: now,
      };
      this.store.addParticipant(newStudent);
    }
    this.dialog.closeAll();
  }

  private toDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
  }

  onSort(sort: Sort): void {
    this.sortColumn.set(sort.active);
    this.sortDirection.set(sort.direction);
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }
}
