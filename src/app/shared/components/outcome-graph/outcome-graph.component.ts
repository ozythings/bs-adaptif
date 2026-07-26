import { Component,  input,  output,  signal,  computed,  effect,  ElementRef,  viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LearningOutcome } from '@core/models/learning-outcome.model';
import { memoizeWithKey } from '@shared/utils/memoize';

const NODE_LIMIT_WARN = 100;

const memoizedLayout = memoizeWithKey(
  (items: LearningOutcome[]) => {
    const levels: Map<number, number> = new Map();
    const cache = new Map<number, number>();
    const assignLevel = (id: number): number => {
      if (cache.has(id)) return cache.get(id)!;
      cache.set(id, 0);
      const node = items.find(o => o.id === id);
      if (!node || node.prerequisiteIds.length === 0) {
        levels.set(id, 0);
        cache.set(id, 0);
        return 0;
      }
      const maxPrereqLevel = Math.max(0, ...node.prerequisiteIds.map(assignLevel));
      const level = maxPrereqLevel + 1;
      levels.set(id, level);
      cache.set(id, level);
      return level;
    };
    items.forEach(o => assignLevel(o.id));
    const maxLevel = Math.max(0, ...Array.from(levels.values()));
    const levelHeight = Math.max(90, 320 / (maxLevel + 1));
    const levelWidth = 140;
    const levelCounts = new Map<number, number>();
    const levelIndices = new Map<number, number>();
    const slotSpacing = 60;

    const nodes: GraphNode[] = items.map(o => {
      const lvl = levels.get(o.id) ?? 0;
      levelCounts.set(lvl, (levelCounts.get(lvl) ?? 0) + 1);
      const idx = levelIndices.get(lvl) ?? 0;
      levelIndices.set(lvl, idx + 1);
      const count = levelCounts.get(lvl)!;
      const spacing = Math.max(slotSpacing, 320 / Math.max(count, 1));
      return {
        id: o.id,
        label: o.code,
        x: 100 + lvl * levelWidth,
        y: 50 + idx * spacing,
        level: lvl,
        highlighted: false
      };
    });

    const edges: GraphEdge[] = [];
    items.forEach(o => {
      o.prerequisiteIds.forEach(prereqId => {
        edges.push({ from: prereqId, to: o.id });
      });
    });

    const maxY = Math.max(400, ...nodes.map(n => n.y + 40));
    return { nodes, edges, width: Math.max(800, (maxLevel + 1) * levelWidth + 100), height: maxY };
  },
  (items: LearningOutcome[]) => items.map(o => o.id).sort().join(',')
);

interface GraphNode {
  id: number;
  label: string;
  x: number;
  y: number;
  level: number;
  highlighted: boolean;
}

interface GraphEdge {
  from: number;
  to: number;
}

@Component({
  selector: 'app-outcome-graph',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative bg-gray-50 rounded-lg border overflow-hidden" [style.minHeight.px]="400">
      @if (outcomes().length >= NODE_LIMIT_WARN) {
        <div class="absolute top-2 left-2 z-10 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-sm text-amber-700">
          {{ outcomes().length }} kazanım görüntüleniyor. Filtreleme veya odak modu önerilir.
        </div>
      }
      <div class="absolute top-2 right-2 z-10 flex flex-col gap-1 bg-white/90 rounded-lg shadow-sm p-1">
        <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700" (click)="zoomBy(1.2)" aria-label="Yakınlaştır">
          <span class="text-lg leading-none">+</span>
        </button>
        <span class="text-center text-xs text-gray-600 font-medium">{{ (zoomLevel() * 100) | number:'1.0-0' }}%</span>
        <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700" (click)="zoomBy(0.833)" aria-label="Uzaklaştır">
          <span class="text-lg leading-none">−</span>
        </button>
        <button class="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-700" (click)="resetView()" aria-label="Sıfırla">
          <span class="text-xs">⟲</span>
        </button>
      </div>

      <div class="w-full h-full overflow-auto" #viewport
        (wheel)="onWheel($event)"
        (mousedown)="onPanStart($event)"
        (mousemove)="onPanMove($event)"
        (mouseup)="onPanEnd()"
        (mouseleave)="onPanEnd()">
        <svg [attr.width]="svgWidth()" [attr.height]="svgHeight()" class="block" [style.transform]="'scale(' + zoomLevel() + ')'" style="transform-origin: 0 0">
          @for (edge of edges(); track edge.from + '-' + edge.to) {
            <line
              [attr.x1]="getNode(edge.from)?.x ?? 0"
              [attr.y1]="getNode(edge.from)?.y ?? 0"
              [attr.x2]="getNode(edge.to)?.x ?? 0"
              [attr.y2]="getNode(edge.to)?.y ?? 0"
              stroke="#94a3b8" stroke-width="2"
              [class.stroke-red-400]="edge.from === selectedId()"
              [class.stroke-blue-400]="edge.to === selectedId()" />
          }
          @for (node of nodes(); track node.id) {
            <g (click)="selectNode(node.id)" class="cursor-pointer">
              <rect [attr.x]="node.x - 60" [attr.y]="node.y - 18"
                width="120" height="36" rx="6"
                [attr.fill]="node.highlighted ? '#dbeafe' : '#ffffff'"
                [attr.stroke]="node.id === selectedId() ? '#3b82f6' : '#cbd5e1'"
                stroke-width="2" />
              <text [attr.x]="node.x" [attr.y]="node.y + 5"
                text-anchor="middle" class="text-xs fill-gray-700"
                font-size="11">{{ node.label }}</text>
            </g>
          } @empty {
            <text x="400" y="200" text-anchor="middle" class="text-sm fill-gray-400">Kazanım bulunmuyor</text>
          }
        </svg>
      </div>
    </div>
  `
})
export class OutcomeGraphComponent {
  outcomes = input<LearningOutcome[]>([]);
  selectedId = input<number | null>(null);
  focusNodeId = input<number | null>(null);
  nodeSelect = output<number>();

  protected nodes = signal<GraphNode[]>([]);
  protected edges = signal<GraphEdge[]>([]);
  protected svgWidth = signal(800);
  protected svgHeight = signal(400);
  protected zoomLevel = signal(1);
  protected readonly NODE_LIMIT_WARN = NODE_LIMIT_WARN;

  private panOffset = { x: 0, y: 0 };
  private isPanning = false;
  private panStart = { x: 0, y: 0 };

  private viewport = viewChild<ElementRef<HTMLDivElement>>('viewport');

  constructor() {
    effect(() => {
      let items = this.outcomes();
      const focusId = this.focusNodeId();
      if (items.length === 0) {
        this.nodes.set([]);
        this.edges.set([]);
        return;
      }
      if (focusId !== null) {
        const related = new Set<number>([focusId]);
        items.forEach(o => {
          if (o.prerequisiteIds.includes(focusId)) related.add(o.id);
          if (o.id === focusId) o.prerequisiteIds.forEach(id => related.add(id));
        });
        items = items.filter(o => related.has(o.id));
      }
      const layout = memoizedLayout(items);
      this.nodes.set(layout.nodes);
      this.edges.set(layout.edges);
      this.svgWidth.set(layout.width);
      this.svgHeight.set(layout.height);
    });
  }

  zoomBy(factor: number): void {
    this.zoomLevel.set(Math.max(0.3, Math.min(3, this.zoomLevel() * factor)));
  }

  resetView(): void {
    this.zoomLevel.set(1);
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const scale = event.deltaY > 0 ? 0.9 : 1.1;
    this.zoomLevel.set(Math.max(0.3, Math.min(3, this.zoomLevel() * scale)));
  }

  onPanStart(event: MouseEvent): void {
    if (event.button !== 0) return;
    this.isPanning = true;
    this.panStart = { x: event.clientX, y: event.clientY };
    event.preventDefault();
  }

  onPanMove(event: MouseEvent): void {
    if (!this.isPanning) return;
    const dx = event.clientX - this.panStart.x;
    const dy = event.clientY - this.panStart.y;
    this.panStart = { x: event.clientX, y: event.clientY };
    const viewportEl = this.viewport();
    if (viewportEl) {
      viewportEl.nativeElement.scrollLeft -= dx;
      viewportEl.nativeElement.scrollTop -= dy;
    }
  }

  onPanEnd(): void {
    this.isPanning = false;
  }

  protected getNode(id: number): GraphNode | undefined {
    return this.nodes().find(n => n.id === id);
  }

  protected selectNode(id: number): void {
    this.nodeSelect.emit(id);
  }
}
