import type { ClientFolderRow, ClientFolderTree } from "@/lib/supabase/types";

export function buildFolderTree(folders: ClientFolderRow[]): ClientFolderTree[] {
  const map = new Map<string, ClientFolderTree>();
  const roots: ClientFolderTree[] = [];

  for (const f of folders) map.set(f.id, { ...f, children: [] });

  for (const f of folders) {
    const node = map.get(f.id)!;
    if (f.parent_id && map.has(f.parent_id)) {
      map.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  function sortChildren(nodes: ClientFolderTree[]) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const n of nodes) sortChildren(n.children);
  }
  sortChildren(roots);
  return roots;
}

export function getFolderBreadcrumbs(folderId: string, folders: ClientFolderRow[]): ClientFolderRow[] {
  const map = new Map(folders.map((f) => [f.id, f]));
  const path: ClientFolderRow[] = [];
  let current = map.get(folderId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? map.get(current.parent_id) : undefined;
  }
  return path;
}

export function getDescendantIds(folderId: string, folders: ClientFolderRow[]): string[] {
  const childrenMap = new Map<string, string[]>();
  for (const f of folders) {
    const pid = f.parent_id ?? "__root__";
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(f.id);
  }
  const result: string[] = [];
  const queue = [folderId];
  while (queue.length) {
    const id = queue.pop()!;
    const kids = childrenMap.get(id) ?? [];
    result.push(...kids);
    queue.push(...kids);
  }
  return result;
}

export function getFolderPathString(folderId: string, folders: ClientFolderRow[]): string {
  return getFolderBreadcrumbs(folderId, folders).map((f) => f.name).join(" > ");
}
