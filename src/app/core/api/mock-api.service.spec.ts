import { describe, it, expect } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MockApiService } from './mock-api.service';
import { provideAnimations } from '@angular/platform-browser/animations';
import { APP_SERVICES } from '../../app.services';

describe('MockApiService', () => {
  let service: MockApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...APP_SERVICES, MockApiService, provideAnimations()],
    });
    service = TestBed.inject(MockApiService);
  });

  it('should resolve get with provided data', async () => {
    const data = { id: 1, title: 'Test' };
    const result = await firstValueFrom(service.get(data));
    expect(result).toEqual(data);
  });

  it('should resolve post with delay', async () => {
    service.setDelay(50);
    const data = { id: 2, name: 'PostTest' };
    const start = Date.now();
    const result = await firstValueFrom(service.post(data));
    expect(result).toEqual(data);
    expect(Date.now() - start).toBeGreaterThanOrEqual(40);
  });

  it('should paginate items correctly', async () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
    const result = await firstValueFrom(
      service.paginate(items, { page: 0, pageSize: 10 })
    );
    expect(result.items.length).toBe(10);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
  });

  it('should sort items asc', async () => {
    const items = [{ id: 2, name: 'B' }, { id: 1, name: 'A' }];
    const result = await firstValueFrom(
      service.paginate(items, { page: 0, pageSize: 10, sortColumn: 'name', sortDirection: 'asc' })
    );
    expect(result.items[0].name).toBe('A');
  });

  it('should filter by search term', async () => {
    const items = [{ id: 1, name: 'Angular' }, { id: 2, name: 'React' }];
    const result = await firstValueFrom(
      service.paginate(items, { page: 0, pageSize: 10, search: 'ang' })
    );
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe('Angular');
  });

  it('should reject version conflict on put', async () => {
    const existing = { id: 1, version: 5, name: 'Server' };
    const incoming = { id: 1, version: 3, name: 'Client' };
    await expect(
      firstValueFrom(service.put(incoming, existing))
    ).rejects.toThrow('Bu kayıt daha güncel bir versiyona sahip');
  });
});
