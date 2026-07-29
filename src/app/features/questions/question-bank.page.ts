import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { DebounceDirective } from '@shared/directives';
import { QuestionBankFacade } from './data-access/question-bank.facade';
import { QuestionSummary } from '@core/models/question-version.model';
import { QuestionType, Difficulty, QuestionVersionStatus } from '@core/models/enums';
import { QuestionEditorComponent, QuestionFormValue } from '@shared/components/question-editor/question-editor.component';
import { ConfirmDialogComponent, ErrorStateComponent } from '@shared/components';


@Component({
  selector: 'app-question-bank',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    DebounceDirective,

    ErrorStateComponent,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Soru Bankası</h1>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon>
          Yeni Soru
        </button>
      </div>

      <div class="bg-white rounded-lg shadow-sm p-3">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Ara</mat-label>
            <input matInput [value]="searchTerm()" [appDebounce]="300" (debouncedChange)="onSearch($event)" placeholder="Soru ara...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Tür</mat-label>
            <mat-select [value]="typeFilter()" (selectionChange)="onTypeFilter($event.value)">
              <mat-option value="">Tümü</mat-option>
              <mat-option [value]="QuestionType.MULTIPLE_CHOICE">Çoktan Seçmeli</mat-option>
              <mat-option [value]="QuestionType.TRUE_FALSE">Doğru/Yanlış</mat-option>
              <mat-option [value]="QuestionType.SHORT_ANSWER">Kısa Cevap</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Zorluk</mat-label>
            <mat-select [value]="difficultyFilter()" (selectionChange)="onDifficultyFilter($event.value)">
              <mat-option value="">Tümü</mat-option>
              <mat-option [value]="Difficulty.EASY">Kolay</mat-option>
              <mat-option [value]="Difficulty.MEDIUM">Orta</mat-option>
              <mat-option [value]="Difficulty.HARD">Zor</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Durum</mat-label>
            <mat-select [value]="statusFilter()" (selectionChange)="onStatusFilter($event.value)">
              <mat-option value="">Tümü</mat-option>
              <mat-option [value]="QuestionVersionStatus.DRAFT">Taslak</mat-option>
              <mat-option [value]="QuestionVersionStatus.PUBLISHED">Yayında</mat-option>
              <mat-option [value]="QuestionVersionStatus.ARCHIVED">Arşiv</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-sm overflow-x-auto">
        @if (loading()) {
          <div class="flex justify-center py-12">
            <mat-spinner diameter="40" />
          </div>
        } @else if (error(); as err) {
          <app-error-state [title]="'Hata'" [message]="err" [retryable]="true" (retry)="loadData()" />
        } @else if (filteredQuestions().length === 0) {
          <div class="text-center p-8 text-gray-500">
            <mat-icon class="text-4xl mb-2">quiz</mat-icon>
            <p>Henüz soru bulunmuyor</p>
          </div>
        } @else {
          <table mat-table [dataSource]="paginatedQuestions()" matSort (matSortChange)="onSort($event)" class="w-full">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
              <td mat-cell *matCellDef="let q">{{ q.id }}</td>
            </ng-container>

            <ng-container matColumnDef="stem">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Soru</th>
              <td mat-cell *matCellDef="let q" class="max-w-xs truncate">{{ q.stem }}</td>
            </ng-container>

            <ng-container matColumnDef="type">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Tür</th>
              <td mat-cell *matCellDef="let q">{{ typeLabel(q.type) }}</td>
            </ng-container>

            <ng-container matColumnDef="difficulty">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Zorluk</th>
              <td mat-cell *matCellDef="let q">
                <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="difficultyClass(q.difficulty)">
                  {{ difficultyLabel(q.difficulty) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="points">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Puan</th>
              <td mat-cell *matCellDef="let q">{{ q.points }}</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Durum</th>
              <td mat-cell *matCellDef="let q">
                <span class="px-2 py-1 rounded-full text-xs font-medium" [class]="statusClass(q.status)">
                  {{ statusLabel(q.status) }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="version">
              <th mat-header-cell *matHeaderCellDef mat-sort-header>Versiyon</th>
              <td mat-cell *matCellDef="let q">v{{ q.currentVersion }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>İşlemler</th>
              <td mat-cell *matCellDef="let q">
                <button mat-icon-button matTooltip="Düzenle" (click)="openEditDialog(q)">
                  <mat-icon>edit</mat-icon>
                </button>
                <a mat-icon-button matTooltip="Detay" [routerLink]="['/questions', q.id]" color="primary">
                  <mat-icon>visibility</mat-icon>
                </a>
                @if (q.status === QuestionVersionStatus.DRAFT) {
                  <button mat-icon-button matTooltip="Yayınla" color="primary" (click)="confirmPublish(q)">
                    <mat-icon>publish</mat-icon>
                  </button>
                }
                <button mat-icon-button matTooltip="Sil" color="warn" (click)="confirmDelete(q)">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 25]"
            [length]="filteredQuestions().length"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      </div>
    </div>
  `,
})
export class QuestionBankPage implements OnInit {
  private facade = inject(QuestionBankFacade);
  private dialog = inject(MatDialog);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly QuestionType = QuestionType;
  readonly Difficulty = Difficulty;
  readonly QuestionVersionStatus = QuestionVersionStatus;

  loading = signal(true);
  error = signal<string | null>(null);

  allQuestions = signal<QuestionSummary[]>([]);

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    this.searchTerm.set(params.get('search') || '');
    this.typeFilter.set(params.get('type') || '');
    this.difficultyFilter.set(params.get('difficulty') || '');
    this.statusFilter.set(params.get('status') || '');
    if (params.get('page')) this.pageIndex.set(Number(params.get('page')));
    if (params.get('pageSize')) this.pageSize.set(Number(params.get('pageSize')));
    if (params.get('sortColumn')) this.sortColumn.set(params.get('sortColumn')!);
    if (params.get('sortDirection')) this.sortDirection.set(params.get('sortDirection') as 'asc' | 'desc');
    this.loadData();
  }

  ngOnInit(): void {}

  searchTerm = signal('');
  typeFilter = signal<string>('');
  difficultyFilter = signal<string>('');
  statusFilter = signal<string>('');
  pageSize = signal(10);
  pageIndex = signal(0);
  sortColumn = signal<string>('id');
  sortDirection = signal<'asc' | 'desc'>('asc');

  displayedColumns = ['id', 'stem', 'type', 'difficulty', 'points', 'status', 'version', 'actions'];

  filteredQuestions = computed(() => {
    let result = [...this.allQuestions()];

    const search = this.searchTerm().toLowerCase();
    if (search) {
      result = result.filter(q => q.stem.toLowerCase().includes(search));
    }

    const type = this.typeFilter();
    if (type) {
      result = result.filter(q => q.type === type);
    }

    const difficulty = this.difficultyFilter();
    if (difficulty) {
      result = result.filter(q => q.difficulty === difficulty);
    }

    const status = this.statusFilter();
    if (status) {
      result = result.filter(q => q.status === status);
    }

    const sortCol = this.sortColumn();
    const sortDir = this.sortDirection();
    result = [...result].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortCol] as number | string;
      const bVal = (b as unknown as Record<string, unknown>)[sortCol] as number | string;
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  });

  paginatedQuestions = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredQuestions().slice(start, start + this.pageSize());
  });

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getAll().subscribe({
      next: (data) => {
        this.allQuestions.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Sorular yüklenirken hata oluştu');
        this.loading.set(false);
      },
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onTypeFilter(value: string): void {
    this.typeFilter.set(value);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onDifficultyFilter(value: string): void {
    this.difficultyFilter.set(value);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  private syncUrl(): void {
    const params: Record<string, string> = {};
    if (this.searchTerm()) params['search'] = this.searchTerm();
    if (this.typeFilter()) params['type'] = this.typeFilter();
    if (this.difficultyFilter()) params['difficulty'] = this.difficultyFilter();
    if (this.statusFilter()) params['status'] = this.statusFilter();
    if (this.pageIndex()) params['page'] = String(this.pageIndex());
    if (this.pageSize() !== 10) params['pageSize'] = String(this.pageSize());
    if (this.sortColumn() !== 'id') params['sortColumn'] = this.sortColumn();
    if (this.sortDirection() !== 'asc') params['sortDirection'] = this.sortDirection();
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  onSort(sort: Sort): void {
    this.pageIndex.set(0);
    this.sortColumn.set(sort.active || 'id');
    this.sortDirection.set(sort.direction || 'asc');
    this.syncUrl();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.syncUrl();
  }

  typeLabel(type: QuestionType): string {
    switch (type) {
      case QuestionType.MULTIPLE_CHOICE: return 'Çoktan Seçmeli';
      case QuestionType.TRUE_FALSE: return 'Doğru/Yanlış';
      case QuestionType.SHORT_ANSWER: return 'Kısa Cevap';
      default: return type;
    }
  }

  difficultyLabel(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'Kolay';
      case Difficulty.MEDIUM: return 'Orta';
      case Difficulty.HARD: return 'Zor';
      default: return d;
    }
  }

  difficultyClass(d: Difficulty): string {
    switch (d) {
      case Difficulty.EASY: return 'bg-green-100 text-green-700';
      case Difficulty.MEDIUM: return 'bg-yellow-100 text-yellow-700';
      case Difficulty.HARD: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  statusLabel(s: QuestionVersionStatus): string {
    switch (s) {
      case QuestionVersionStatus.DRAFT: return 'Taslak';
      case QuestionVersionStatus.PUBLISHED: return 'Yayında';
      case QuestionVersionStatus.ARCHIVED: return 'Arşiv';
      default: return s;
    }
  }

  statusClass(s: QuestionVersionStatus): string {
    switch (s) {
      case QuestionVersionStatus.DRAFT: return 'bg-gray-100 text-gray-700';
      case QuestionVersionStatus.PUBLISHED: return 'bg-green-100 text-green-700';
      case QuestionVersionStatus.ARCHIVED: return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(QuestionEditorComponent, {
      width: '700px',
      data: { question: null, type: QuestionType.MULTIPLE_CHOICE, outcomes: this.facade.getOutcomes() },
    });

    dialogRef.afterClosed().subscribe((result: QuestionFormValue | undefined) => {
      if (result) {
        this.facade.create({
          stem: result.stem,
          type: result.type,
          difficulty: result.difficulty,
          points: result.points,
          options: result.options,
          correctAnswer: result.correctAnswer,
          outcomeIds: result.outcomeIds,
          tags: result.tags,
        }).subscribe(() => this.loadData());
      }
    });
  }

  openEditDialog(q: QuestionSummary): void {
    if (q.status === QuestionVersionStatus.PUBLISHED) {
      const warnRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Yayındaki Soru',
          message: 'Bu soru yayında. Düzenlediğinizde mevcut versiyon korunacak ve yeni bir versiyon oluşturulacak. Devam etmek istiyor musunuz?',
          confirmLabel: 'Yeni Versiyon Oluştur',
          cancelLabel: 'İptal',
        },
      });

      warnRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.openEditorWithData(q);
        }
      });
    } else {
      this.openEditorWithData(q);
    }
  }

  private openEditorWithData(q: QuestionSummary): void {
    const dialogRef = this.dialog.open(QuestionEditorComponent, {
      width: '700px',
      data: { question: q, type: q.type, outcomes: this.facade.getOutcomes() },
    });

    dialogRef.afterClosed().subscribe((result: QuestionFormValue | undefined) => {
      if (result) {
        this.facade.update(q.id, {
          stem: result.stem,
          type: result.type,
          difficulty: result.difficulty,
          points: result.points,
          options: result.options,
          correctAnswer: result.correctAnswer,
          outcomeIds: result.outcomeIds,
          tags: result.tags,
        }).subscribe(() => this.loadData());
      }
    });
  }

  confirmPublish(q: QuestionSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Soruyu Yayınla',
        message: `"${q.stem}" sorusunu yayınlamak istediğinize emin misiniz?`,
        confirmLabel: 'Yayınla',
        cancelLabel: 'İptal',
      },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.facade.publish(q.id).subscribe(() => this.loadData());
      }
    });
  }

  confirmDelete(q: QuestionSummary): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Soruyu Sil',
        message: `"${q.stem}" sorusunu silmek istediğinize emin misiniz?`,
        confirmLabel: 'Sil',
        cancelLabel: 'İptal',
      },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.facade.delete(q.id).subscribe(() => this.loadData());
      }
    });
  }
}
