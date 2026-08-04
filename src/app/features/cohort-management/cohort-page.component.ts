import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CohortListComponent } from './cohort-list.component';
import { CohortAnalyticsPage } from '../cohort-analytics/cohort-analytics.page';

@Component({
  selector: 'app-cohort-page',
  standalone: true,
  imports: [MatTabsModule, MatIconModule, CohortListComponent, CohortAnalyticsPage],
  template: `
    <div class="max-w-7xl mx-auto">
      <mat-tab-group animationDuration="200ms">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">group_add</mat-icon> Yönetim
          </ng-template>
          <div class="p-6">
            <app-cohort-list />
          </div>
        </mat-tab>
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="mr-2">analytics</mat-icon> Analiz
          </ng-template>
          <div class="p-6">
            <app-cohort-analytics />
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `
})
export class CohortPageComponent {}
