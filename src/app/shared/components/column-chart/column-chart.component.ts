import { Component,  input,  effect,  ElementRef,  inject,  viewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-column-chart',
  standalone: true,
  template: `<div class="w-full h-full relative"><canvas #canvas></canvas></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class ColumnChartComponent {
  labels = input.required<string[]>();
  values = input.required<number[]>();
  title = input('');
  colors = input<string[]>([]);

  private canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;
  private initialized = false;

  constructor() {
    effect(() => {
      const canvas = this.canvasEl();
      const lbls = this.labels();
      const vals = this.values();
      if (!canvas || lbls.length === 0) return;

      if (!this.initialized) {
        this.initialized = true;
        const backgroundColors = this.colors().length > 0
          ? this.colors()
          : ['#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6'];

        this.chart = new Chart(canvas.nativeElement, {
          type: 'bar',
          data: {
            labels: lbls,
            datasets: [{
              label: this.title(),
              data: vals,
              backgroundColor: backgroundColors.slice(0, lbls.length),
              borderRadius: 6,
              borderSkipped: false,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.parsed.y}`
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { font: { size: 11 } },
                grid: { color: '#f3f4f6' }
              },
              x: {
                ticks: { font: { size: 11 } }
              }
            }
          }
        });
      } else if (this.chart) {
        this.chart.data.labels = lbls;
        this.chart.data.datasets[0].data = vals;
        this.chart.data.datasets[0].label = this.title();
        if (this.colors().length > 0) {
          this.chart.data.datasets[0].backgroundColor = this.colors().slice(0, lbls.length);
        }
        this.chart.update('none');
      }
    });
  }
}
