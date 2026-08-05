/**
 * Pure dialogue graph model + validation (docs/05 §6). The scene renders it;
 * this module owns structure and traversal rules so CI can verify every
 * shipped conversation.
 */
export interface DialogueChoice {
  text: string;
  next: string;
  flags?: string[];
}

export interface DialogueNode {
  speaker: string;
  text: string;
  next?: string;
  end?: boolean;
  setFlags?: string[];
  choices?: DialogueChoice[];
}

export interface DialogueGraph {
  start: string;
  nodes: Record<string, DialogueNode>;
}

export class DialogueError extends Error {}

export function validateDialogueFile(
  raw: unknown,
  knownSpeakers: Set<string>,
): Record<string, DialogueGraph> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new DialogueError('dialogue file must be an object of graphs');
  }
  const out: Record<string, DialogueGraph> = {};
  for (const [graphId, graphRaw] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof graphRaw !== 'object' || graphRaw === null) {
      throw new DialogueError(`${graphId}: graph must be an object`);
    }
    const graph = graphRaw as { start?: unknown; nodes?: unknown };
    if (typeof graph.start !== 'string') throw new DialogueError(`${graphId}: missing start`);
    if (typeof graph.nodes !== 'object' || graph.nodes === null) {
      throw new DialogueError(`${graphId}: missing nodes`);
    }
    const nodes = graph.nodes as Record<string, DialogueNode>;
    const ids = new Set(Object.keys(nodes));
    if (!ids.has(graph.start)) throw new DialogueError(`${graphId}: start node not found`);
    const reachable = new Set<string>();
    for (const [nodeId, node] of Object.entries(nodes)) {
      const path = `${graphId}.${nodeId}`;
      if (!knownSpeakers.has(node.speaker)) {
        throw new DialogueError(`${path}: unknown speaker '${node.speaker}'`);
      }
      if (typeof node.text !== 'string' || node.text.length === 0) {
        throw new DialogueError(`${path}: missing text`);
      }
      const exits: string[] = [];
      if (node.next !== undefined) exits.push(node.next);
      for (const choice of node.choices ?? []) {
        if (typeof choice.text !== 'string' || choice.text.length > 44) {
          throw new DialogueError(`${path}: choice text missing or >44 chars`);
        }
        exits.push(choice.next);
      }
      for (const target of exits) {
        if (!ids.has(target)) throw new DialogueError(`${path}: broken link → '${target}'`);
        reachable.add(target);
      }
      if (!node.end && exits.length === 0) {
        throw new DialogueError(`${path}: dead end (no next/choices and not marked end)`);
      }
      if (node.choices && node.choices.length > 0 && node.choices.length !== 2) {
        throw new DialogueError(`${path}: choices must come in pairs (docs/02 §4)`);
      }
    }
    // Orphan check: every node except start must be reachable from some exit.
    for (const nodeId of ids) {
      if (nodeId !== graph.start && !reachable.has(nodeId)) {
        throw new DialogueError(`${graphId}.${nodeId}: orphan node`);
      }
    }
    out[graphId] = { start: graph.start, nodes };
  }
  return out;
}
