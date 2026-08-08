import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '@core/api/mock-api.service';
import { Cohort, CohortComparisonMetric } from '@core/models/cohort.model';
import { ATTEMPTS_SEED, MASTERY_SEED } from '@core/data';
import { ResultStatus, AuditAction } from '@core/models/enums';
import { AuditService } from '@core/observability/audit.service';
import { DataScopeService } from '@core/auth/data-scope.service';
import { EntityStore } from '@core/state/entity.store';
import { memoizeWithKey } from '@shared/utils/memoize';

const MIN_COHORT_SIZE = 3;

const memoizedComparison = memoizeWithKey(
  (cohorts: Cohort[]): CohortComparisonMetric[] => {
    const valid = cohorts.filter(c => c.studentIds.length >= MIN_COHORT_SIZE);
    const metrics: CohortComparisonMetric[] = [];

    metrics.push(makeMetricFn('Öğrenci Sayısı', valid, c => c.studentIds.length));
    metrics.push(makeMetricFn('Ortalama Başarım (%)', valid, c => {
      const attempts = ATTEMPTS_SEED.filter(a => c.studentIds.includes(a.studentId) && a.status === ResultStatus.FINALIZED);
      if (!attempts.length) return 0;
      return Math.round(attempts.reduce((s, a) => s + a.scorePercentage, 0) / attempts.length * 100) / 100;
    }));
    metrics.push(makeMetricFn('Ortalama Puan', valid, c => {
      const attempts = ATTEMPTS_SEED.filter(a => c.studentIds.includes(a.studentId) && a.status === ResultStatus.FINALIZED);
      if (!attempts.length) return 0;
      return Math.round(attempts.reduce((s, a) => s + a.totalScore, 0) / attempts.length * 100) / 100;
    }));
    metrics.push(makeMetricFn('Tamamlama Oranı (%)', valid, c => {
      const all = ATTEMPTS_SEED.filter(a => c.studentIds.includes(a.studentId));
      const finalized = all.filter(a => a.status === ResultStatus.FINALIZED);
      return all.length ? Math.round((finalized.length / all.length) * 10000) / 100 : 0;
    }));
    metrics.push(makeMetricFn('Öğrenci Başı Deneme', valid, c => {
      const all = ATTEMPTS_SEED.filter(a => c.studentIds.includes(a.studentId));
      return c.studentIds.length ? Math.round((all.length / c.studentIds.length) * 100) / 100 : 0;
    }));
    metrics.push(makeMetricFn('Zayıf Kazanım (%)', valid, c => {
      const studentIds = c.studentIds;
      const weakMasteries = MASTERY_SEED.filter(m => studentIds.includes(m.studentId) && m.score < 50);
      const totalMasteries = MASTERY_SEED.filter(m => studentIds.includes(m.studentId));
      return totalMasteries.length ? Math.round((weakMasteries.length / totalMasteries.length) * 10000) / 100 : 0;
    }));

    return metrics;
  },
  (cohorts: Cohort[]) => JSON.stringify(cohorts.map(c => ({ id: c.id, studentIds: c.studentIds })))
);

function makeMetricFn(name: string, cohorts: Cohort[], fn: (c: Cohort) => number): CohortComparisonMetric {
  const values = cohorts.map(c => ({ cohortId: c.id, value: fn(c) }));
  const avg = values.length ? Math.round(values.reduce((s, v) => s + v.value, 0) / values.length * 100) / 100 : 0;
  return { metric: name, cohortValues: values, average: avg, minCohortSize: MIN_COHORT_SIZE };
}

const memoizedTrend = memoizeWithKey(
  (cohorts: Cohort[]) => {
    const valid = cohorts.filter(c => c.studentIds.length >= MIN_COHORT_SIZE);
    const attempts = ATTEMPTS_SEED.filter(a => a.status === ResultStatus.FINALIZED);
    const months = new Set<string>();
    for (const a of attempts) months.add((a.submittedAt ?? a.updatedAt).slice(0, 7));
    const sortedMonths = [...months].sort();

    const datasets = valid.map(c => ({
      name: c.name,
      values: sortedMonths.map(month => {
        const monthAttempts = attempts.filter(a => c.studentIds.includes(a.studentId) && (a.submittedAt ?? a.updatedAt).startsWith(month));
        if (!monthAttempts.length) return 0;
        return Math.round(monthAttempts.reduce((s, a) => s + a.scorePercentage, 0) / monthAttempts.length);
      }),
    }));

    const labels = sortedMonths.map(m => {
      const [y, mo] = m.split('-');
      const names = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
      return `${names[parseInt(mo) - 1]} ${y}`;
    });

    return { labels, datasets };
  },
  (cohorts: Cohort[]) => JSON.stringify(cohorts.map(c => ({ id: c.id, studentIds: c.studentIds })))
);

export interface CohortDetail {
  cohort: Cohort;
  studentCount: number;
}
export class CohortAnalyticsFacade {
  private mockApi = inject(MockApiService);
  private audit = inject(AuditService);
  private dataScope = inject(DataScopeService);
  private store = inject(EntityStore);

  getCohorts(): Observable<Cohort[]> {
    const scope = this.dataScope.getScope();
    let cohorts = [...this.store.cohorts()];
    if (scope.allowedCohortIds) {
      cohorts = cohorts.filter(c => scope.allowedCohortIds!.includes(c.id));
    }
    const filtered = cohorts.filter(c => c.studentIds.length >= MIN_COHORT_SIZE);
    this.audit.log({ action: AuditAction.VIEW, entity: 'Cohort', entityId: 0, description: 'Cohort listesi görüntülendi' });
    return this.mockApi.get(filtered);
  }

  getCohortDetail(cohortId: number): Observable<CohortDetail | undefined> {
    const cohort = this.store.cohorts().find(c => c.id === cohortId);
    if (!cohort) return this.mockApi.get(undefined);
    this.audit.log({ action: AuditAction.VIEW, entity: 'Cohort', entityId: cohortId, description: 'Cohort detayı görüntülendi' });
    return this.mockApi.get({ cohort, studentCount: cohort.studentIds.length });
  }

  getComparisonMetrics(cohortIds: number[]): Observable<CohortComparisonMetric[]> {
    this.audit.log({ action: AuditAction.VIEW, entity: 'Cohort', entityId: 0, description: 'Cohort karşılaştırma metrikleri görüntülendi' });
    const cohorts = this.store.cohorts().filter(c => cohortIds.includes(c.id));
    return this.mockApi.get(memoizedComparison(cohorts));
  }

  getMonthlyTrend(cohortIds: number[]): Observable<{ labels: string[]; datasets: { name: string; values: number[] }[] }> {
    const cohorts = this.store.cohorts().filter(c => cohortIds.includes(c.id));
    return this.mockApi.get(memoizedTrend(cohorts));
  }
}
