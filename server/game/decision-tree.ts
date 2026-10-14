import { randomInt } from 'node:crypto';
import type {
  Challenge,
  ChallengeRoll,
  ChoiceNode,
  DecisionNode,
  DecisionTree,
  Stats,
} from '../../shared/models.ts';

export function getNode(tree: DecisionTree, nodeId: string): DecisionNode {
  const node = tree.nodes[nodeId];
  if (!node) {
    throw new Error(`Decision tree has no node "${nodeId}"`);
  }
  return node;
}

/** Rolls 1 to 100; the operative succeeds if the roll is at most their stat. */
export function rollChallenge(
  challenge: Challenge,
  stats: Stats,
  pickedBy: ChallengeRoll['pickedBy'],
): ChallengeRoll {
  const statValue = stats[challenge.stat];
  const roll = randomInt(1, 101);
  return {
    challengeId: challenge.id,
    pickedBy,
    stat: challenge.stat,
    statValue,
    roll,
    succeeded: roll <= statValue,
  };
}

/** What the operative does when the handler gives no order. */
export function tossCoin(node: ChoiceNode): Challenge {
  return node.choices[randomInt(2)]!;
}

/**
 * Checks an operative for authoring mistakes, throwing with every problem found. Their tree must be
 * a strict tree, so each briefing can rely on how the previous attempt went.
 */
export function validateOperative(npc: { name: string; stats: Stats; decisionTree: DecisionTree }) {
  const { name, stats, decisionTree: tree } = npc;
  const problems: string[] = [];
  for (const [stat, value] of Object.entries(stats)) {
    if (!Number.isInteger(value) || value < 1 || value > 100) {
      problems.push(`${stat} is ${value}, not 1 to 100`);
    }
  }

  const parents = new Map<string, number>();
  const visit = (nodeId: string) => parents.set(nodeId, (parents.get(nodeId) ?? 0) + 1);
  visit(tree.startNodeId);
  for (const [nodeId, node] of Object.entries(tree.nodes)) {
    if (node.type === 'ending') {
      continue;
    }
    const [first, second] = node.choices;
    if (first.stat === second.stat) {
      problems.push(`"${nodeId}" offers two ${first.stat} challenges`);
    }
    if (first.id === second.id) {
      problems.push(`"${nodeId}" has two challenges with ID "${first.id}"`);
    }
    if (node.onSuccess === node.onFailure) {
      problems.push(`"${nodeId}" leads to "${node.onSuccess}" on both success and failure`);
    }
    visit(node.onSuccess);
    visit(node.onFailure);
  }

  for (const [nodeId, count] of parents) {
    if (!tree.nodes[nodeId]) {
      problems.push(`"${nodeId}" is referenced but doesn't exist`);
    } else if (count > 1) {
      problems.push(`"${nodeId}" is reached ${count} ways; each node needs exactly one parent`);
    }
  }
  for (const nodeId of Object.keys(tree.nodes)) {
    if (!parents.has(nodeId)) {
      problems.push(`"${nodeId}" is unreachable`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`${name}'s decision tree is invalid:\n- ${problems.join('\n- ')}`);
  }
}
