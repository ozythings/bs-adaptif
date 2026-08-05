import { Component, input, effect, ElementRef, inject, viewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';

Chart.register(...registerables, zoomPlugin);

@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `<div class="w-full h-full relative"><canvas #canvas></canvas></div>`,
  styles: [`:host { display: block; width: 100%; height: 100%; }`]
})
export class LineChartComponent {
  labels = input.required<string[]>();
  datasets = input.required<{ label: string; values: number[]; color?: string }[]>();
  title = input('');
  yMin = input(0);
  yMax = input(100);

  private canvasEl = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;
  private initialized = false;

  private static PALETTE = [
    '#3b82f6', '#16a34a', '#f59e0b', '#8b5cf6',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  ];

  constructor() {
    effect(() => {
      const canvas = this.canvasEl();
      const lbls = this.labels();
      const ds = this.datasets();
      if (!canvas || lbls.length === 0 || ds.length === 0) return;

      const chartDatasets = ds.map((d, i) => ({
        label: d.label,
        data: d.values,
        borderColor: d.color ?? LineChartComponent.PALETTE[i % LineChartComponent.PALETTE.length],
        backgroundColor: (d.color ?? LineChartComponent.PALETTE[i % LineChartComponent.PALETTE.length]) + '20',
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: false,
      }));

      if (!this.initialized) {
        this.initialized = true;
        this.chart = new Chart(canvas.nativeElement, {
          type: 'line',
          data: { labels: lbls, datasets: chartDatasets },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: ds.length > 1, position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
              tooltip: {
                callbacks: {
                  label: (ctx) => ` ${ctx.dataset.label}: %${ctx.parsed.y}`
                }
              },
              zoom: {
                zoom: {
                  wheel: { enabled: true },
                  pinch: { enabled: true },
                  mode: 'x',
                },
                pan: {
                  enabled: true,
                  mode: 'x',
                }
              }
            },
            scales: {
              y: {
                min: this.yMin(),
                max: this.yMax(),
                ticks: { font: { size: 11 }, callback: (v) => `%${v}` },
                grid: { color: '#f3f4f6' }
              },
              x: {
                ticks: { font: { size: 11 } },
                grid: { display: false }
              }
            }
          }
        });
      } else if (this.chart) {
        this.chart.data.labels = lbls;
        this.chart.data.datasets = chartDatasets;
        this.chart.update('none');
      }
    });
  }
}
