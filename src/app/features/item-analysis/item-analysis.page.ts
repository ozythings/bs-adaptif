import { Component,  inject,  signal,  computed,  OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ItemAnalysisFacade } from './data-access/item-analysis.facade';
import { ItemAnalysis } from '@core/models/item-analysis.model';
import { EntityStore } from '@core/state/entity.store';
import { Question } from '@core/models/question.model';
import { QuestionType, Difficulty } from '@core/models/enums';
import { ErrorStateComponent } from '@shared/components';

interface ItemAnalysisDisplay extends ItemAnalysis {
  questionText?: string;
  examTitle?: string;
  questionType?: string;
  questionDifficulty?: string;
}

@Component({
  selector: 'app-item-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatTooltipModule, ErrorStateComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Madde Analizi</h1>
        <button mat-stroked-button (click)="recompute()">
          <mat-icon>refresh</mat-icon> Yeniden Hesapla
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div class="bg-white rounded-lg shadow-sm p-3 text-center">
          <div class="text-2xl font-bold text-blue-600">{{ filteredCount() }}</div>
          <div class="text-xs text-gray-500">Toplam Madde</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-3 text-center">
          <div class="text-2xl font-bold text-green-600">{{ easyCount() }}</div>
          <div class="text-xs text-gray-500">Kolay (&ge; 0.70)</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-3 text-center">
          <div class="text-2xl font-bold text-yellow-600">{{ mediumCount() }}</div>
          <div class="text-xs text-gray-500">Orta (0.40–0.70)</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-3 text-center">
          <div class="text-2xl font-bold text-red-600">{{ hardCount() }}</div>
          <div class="text-xs text-gray-500">Zor (&lt; 0.40)</div>
        </div>
        <div class="bg-white rounded-lg shadow-sm p-3 text-center">
          <div class="text-2xl font-bold text-orange-600">{{ weakDiscrimCount() }}</div>
          <div class="text-xs text-gray-500">Zayıf Ayırt Edici (&lt; 0.30)</div>
        </div>
      </div>

      @if (filteredCount() > 0) {
        <div class="bg-white rounded-lg shadow-sm p-3 flex flex-wrap gap-2 text-xs text-gray-600">
          <span class="font-medium text-gray-800">Ort. Zorluk: {{ avgDifficulty() | number:'1.2' }}</span>
          <span class="text-gray-300">|</span>
          <span class="font-medium text-gray-800">Ort. Ayırt Edicilik: {{ avgDiscrimination() | number:'1.2' }}</span>
          <span class="text-gray-300">|</span>
          <span class="font-medium text-gray-800">Toplam Örneklem: {{ totalSampleSize() }}</span>
          <span class="text-gray-300">|</span>
          <span class="font-medium text-gray-800">İncelenmesi Gereken: {{ reviewCount() }}</span>
        </div>
      }

      <div class="bg-white rounded-lg shadow-sm p-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Sınav</mat-label>
          <mat-select [value]="selectedExamId()" (selectionChange)="onExamChange($event.value)">
            <mat-option [value]="0">Tüm Sınavlar</mat-option>
            @for (e of examOptions(); track e.id) {
              <mat-option [value]="e.id">{{ e.title }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Güçlük</mat-label>
          <mat-select [value]="difficultyFilter()" (selectionChange)="onDifficultyChange($event.value)">
            <mat-option value="">Tümü</mat-option>
            <mat-option value="easy">Kolay</mat-option>
            <mat-option value="medium">Orta</mat-option>
            <mat-option value="hard">Zor</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Soru Ara</mat-label>
          <input matInput [(ngModel)]="searchText" (ngModelChange)="onSearch()" placeholder="Soru metni veya ID ile ara...">
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
      }

      @if (error(); as err) {
        <app-error-state [message]="err" (retry)="loadData()" />
      }

      @if (!loading() && !error()) {
        @if (pagedItems().length === 0) {
          <div class="text-center p-8 text-gray-500">Madde analizi kaydı bulunamadı</div>
        } @else {
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
            @defer (on viewport) {
            @for (item of pagedItems(); track item.id) {
              <mat-card appearance="outlined" class="p-0 overflow-hidden">
                <div class="p-4 space-y-3">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="font-mono text-xs text-gray-900">#{{ item.questionId }}</span>
                        <h2 class="text-lg font-semibold text-gray-900 truncate">{{ item.questionText || 'Soru #' + item.questionId }}</h2>
                        @if (item.questionType) {
                          <span class="px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 shrink-0">{{ item.questionType }}</span>
                        }
                      </div>
                      <p class="text-sm text-gray-500"><span class="font-mono text-xs text-gray-400">#{{ item.examId }}</span> {{ item.examTitle || 'Sınav #' + item.examId }}</p>
                    </div>
                    @if (item.sampleSize < 3) {
                      <span class="px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700 shrink-0" matTooltip="Güvenilir analiz için en az 3 yanıt gerekli">
                        Yetersiz Veri
                      </span>
                    }
                  </div>

                  <div class="flex flex-wrap gap-4">
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500">Güçlük:</span>
                      <span [style.background]="difficultyColor(item.difficultyIndex)" class="text-white px-2 py-0.5 rounded text-xs font-medium">
                        {{ difficultyLabel(item.difficultyIndex) }} ({{ item.difficultyIndex | number:'1.2' }})
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500">Ayırt Edicilik:</span>
                      <span class="text-xs font-medium"
                        [class.text-green-600]="item.discriminationIndex >= 0.40"
                        [class.text-yellow-600]="item.discriminationIndex >= 0.30 && item.discriminationIndex < 0.40"
                        [class.text-red-600]="item.discriminationIndex < 0.30">
                        {{ discriminationLabel(item.discriminationIndex) }} ({{ item.discriminationIndex | number:'1.2' }})
                      </span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500">Nokta Çift Seri:</span>
                      <span class="text-xs font-medium text-gray-700">{{ item.pointBiserial | number:'1.2' }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs text-gray-500">Örneklem:</span>
                      <span class="text-xs font-medium text-gray-700">{{ item.sampleSize }}</span>
                    </div>
                  </div>

                  @if (item.distractorAnalysis.length > 0) {
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-2">Çeldirici Analizi</h3>
                      <table class="w-full text-sm">
                        <thead>
                          <tr class="border-b text-left text-gray-400 text-xs">
                            <th class="pb-1 pr-2">Seçenek</th>
                            <th class="pb-1 pr-2">Değer</th>
                            <th class="pb-1 pr-2">Seçilme</th>
                            <th class="pb-1 w-20">Dağılım</th>
                            <th class="pb-1">Doğru</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (d of item.distractorAnalysis; track d.optionKey) {
                            <tr class="border-b border-gray-50">
                              <td class="py-1 pr-2 font-mono text-xs">{{ d.optionKey }}</td>
                              <td class="py-1 pr-2 text-xs truncate max-w-[120px]">{{ d.optionValue }}</td>
                              <td class="py-1 pr-2 text-xs">{{ d.selectionRate | percent }}</td>
                              <td class="py-1 pr-2">
                                <div class="w-full bg-gray-100 rounded-full h-1.5">
                                  <div class="h-full rounded-full"
                                    [class.bg-green-500]="d.isCorrect"
                                    [class.bg-gray-400]="!d.isCorrect"
                                    [style.width.%]="d.selectionRate * 100">
                                  </div>
                                </div>
                              </td>
                              <td class="py-1">
                                @if (d.isCorrect) {
                                  <mat-icon class="!text-green-500 text-sm">check</mat-icon>
                                } @else {
                                  <mat-icon class="!text-gray-300 text-sm">remove</mat-icon>
                                }
                              </td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    </div>
                  }

                  <div class="flex gap-4 text-xs text-gray-400 pt-1 border-t border-gray-50">
                    <span>Üst Grup Doğru: {{ (item.upperGroupRate * 100) | number:'1.0' }}%</span>
                    <span>Alt Grup Doğru: {{ (item.lowerGroupRate * 100) | number:'1.0' }}%</span>
                    <span class="ml-auto">{{ item.calculatedAt | date:'short' }}</span>
                  </div>
                </div>
              </mat-card>
            }
            } @placeholder {
            <div class="col-span-2 h-32 bg-gray-100 rounded animate-pulse"></div>
            }
          </div>
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="[6, 12, 24]"
            [length]="filteredCount()"
            [pageIndex]="pageIndex()"
            (page)="onPage($event)"
            showFirstLastButtons>
          </mat-paginator>
        }
      }
    </div>
  `
})
export class ItemAnalysisPage implements OnInit {
  private facade = inject(ItemAnalysisFacade);
  private store = inject(EntityStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  allItems = signal<ItemAnalysis[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedExamId = signal(0);
  difficultyFilter = signal('');
  searchText = '';
  pageSize = signal(6);
  pageIndex = signal(0);

  examOptions = signal<{ id: number; title: string }[]>([]);

  private questionMap = computed(() => {
    const map = new Map<number, Question>();
    for (const q of this.store.questions()) {
      map.set(q.id, q);
    }
    return map;
  });

  private examMap = computed(() => {
    const map = new Map<number, string>();
    for (const e of this.store.exams()) {
      map.set(e.id, e.title);
    }
    return map;
  });

  displayItems = computed<ItemAnalysisDisplay[]>(() => {
    const qMap = this.questionMap();
    const eMap = this.examMap();
    return this.allItems().map(item => {
      const q = qMap.get(item.questionId);
      return {
        ...item,
        questionText: q?.questionText,
        examTitle: eMap.get(item.examId),
        questionType: q ? this.questionTypeLabel(q.type) : undefined,
        questionDifficulty: q?.difficulty,
      };
    });
  });

  filteredItems = computed(() => {
    let items = this.displayItems();
    if (this.selectedExamId() !== 0) {
      items = items.filter(i => i.examId === this.selectedExamId());
    }
    const diff = this.difficultyFilter();
    if (diff === 'easy') {
      items = items.filter(i => i.difficultyIndex >= 0.7);
    } else if (diff === 'medium') {
      items = items.filter(i => i.difficultyIndex >= 0.4 && i.difficultyIndex < 0.7);
    } else if (diff === 'hard') {
      items = items.filter(i => i.difficultyIndex < 0.4);
    }
    const s = this.searchText.toLowerCase();
    if (s) {
      items = items.filter(i =>
        i.questionId.toString().includes(s) ||
        (i.questionText?.toLowerCase().includes(s)) ||
        (i.examTitle?.toLowerCase().includes(s))
      );
    }
    return items;
  });

  filteredCount = computed(() => this.filteredItems().length);

  pagedItems = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.filteredItems().slice(start, start + this.pageSize());
  });

  easyCount = computed(() => this.filteredItems().filter(i => i.difficultyIndex >= 0.7).length);
  mediumCount = computed(() => this.filteredItems().filter(i => i.difficultyIndex >= 0.4 && i.difficultyIndex < 0.7).length);
  hardCount = computed(() => this.filteredItems().filter(i => i.difficultyIndex < 0.4).length);
  weakDiscrimCount = computed(() => this.filteredItems().filter(i => i.discriminationIndex < 0.30).length);

  avgDifficulty = computed(() => {
    const items = this.filteredItems();
    return items.length ? items.reduce((s, i) => s + i.difficultyIndex, 0) / items.length : 0;
  });

  avgDiscrimination = computed(() => {
    const items = this.filteredItems();
    return items.length ? items.reduce((s, i) => s + i.discriminationIndex, 0) / items.length : 0;
  });

  totalSampleSize = computed(() => this.filteredItems().reduce((s, i) => s + i.sampleSize, 0));

  reviewCount = computed(() => this.filteredItems().filter(i =>
    i.discriminationIndex < 0.30 || i.difficultyIndex < 0.20 || i.difficultyIndex > 0.90
  ).length);

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    if (qp.get('exam')) this.selectedExamId.set(Number(qp.get('exam')));
    if (qp.get('difficulty')) this.difficultyFilter.set(qp.get('difficulty')!);
    if (qp.get('search')) this.searchText = qp.get('search')!;
    if (qp.get('page')) this.pageIndex.set(Number(qp.get('page')));
    if (qp.get('pageSize')) this.pageSize.set(Number(qp.get('pageSize')));
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.facade.getAll().subscribe({
      next: (data) => {
        this.allItems.set(data);
        const examIds = [...new Set(data.map(d => d.examId))];
        const eMap = this.examMap();
        this.examOptions.set(examIds.map(id => ({ id, title: eMap.get(id) || `Sınav #${id}` })));
        this.loading.set(false);
      },
      error: () => { this.error.set('Madde analizi verileri yüklenirken hata oluştu'); this.loading.set(false); }
    });
  }

  recompute(): void {
    this.facade.recompute();
    this.loadData();
  }

  onExamChange(examId: number): void {
    this.selectedExamId.set(examId);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onDifficultyChange(value: string): void {
    this.difficultyFilter.set(value);
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onSearch(): void {
    this.pageIndex.set(0);
    this.syncUrl();
  }

  onPage(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.syncUrl();
  }

  syncUrl(): void {
    const params: Record<string, any> = {};
    if (this.selectedExamId() !== 0) params['exam'] = this.selectedExamId();
    if (this.difficultyFilter()) params['difficulty'] = this.difficultyFilter();
    if (this.searchText) params['search'] = this.searchText;
    if (this.pageIndex() > 0) params['page'] = this.pageIndex();
    if (this.pageSize() !== 6) params['pageSize'] = this.pageSize();
    this.router.navigate([], { queryParams: params, replaceUrl: true });
  }

  questionTypeLabel(t: QuestionType): string {
    switch (t) {
      case QuestionType.MULTIPLE_CHOICE: return 'Çoktan Seçmeli';
      case QuestionType.TRUE_FALSE: return 'Doğru/Yanlış';
      case QuestionType.SHORT_ANSWER: return 'Kısa Cevap';
      case QuestionType.ESSAY: return 'Kompozisyon';
      default: return '';
    }
  }

  difficultyLabel(index: number): string {
    if (index >= 0.7) return 'Kolay';
    if (index >= 0.4) return 'Orta';
    return 'Zor';
  }

  difficultyColor(index: number): string {
    if (index >= 0.7) return '#16a34a';
    if (index >= 0.4) return '#ca8a04';
    return '#dc2626';
  }

  discriminationLabel(index: number): string {
    if (index >= 0.40) return 'İyi';
    if (index >= 0.30) return 'Orta';
    return 'Zayıf';
  }
}
