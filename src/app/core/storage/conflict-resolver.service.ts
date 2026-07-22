
export interface VersionedItem {
  id: number;
  version: number;
  updatedAt: string;
  data: Record<string, unknown>;
}
export class ConflictResolverService {
  resolve(local: VersionedItem, server: VersionedItem): { resolution: 'local' | 'server' | 'merge'; result: Record<string, unknown> } {
    if (server.version > local.version) {
      return { resolution: 'server', result: server.data };
    }
    if (local.version > server.version) {
      return { resolution: 'local', result: local.data };
    }
    return { resolution: 'merge', result: { ...server.data, ...local.data } };
  }
}
