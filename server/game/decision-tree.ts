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
 * Checks a scenario for authoring mistakes, throwing with every problem found. The tree must be a
 * strict tree, so each briefing can rely on how the previous attempt went. A failure branch must
 * exist exactly when it's reachable: when failing there wouldn't pass `allowedFailures`.
 */
export function validateScenario(scenario: {
  title: string;
  allowedFailures: number;
  decisionTree: DecisionTree;
  npcs: { name: string; stats: Stats }[];
}): void {
  const { decisionTree: tree, allowedFailures } = scenario;
  const problems: string[] = [];
  for (const { name, stats } of scenario.npcs) {
    for (const [stat, value] of Object.entries(stats)) {
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        problems.push(`${name}'s ${stat} is ${value}, not 1 to 100`);
      }
    }
  }

  const visited = new Set<string>();
  const visit = (nodeId: string, failures: number) => {
    const node = tree.nodes[nodeId];
    if (!node) {
      problems.push(`"${nodeId}" is referenced but doesn't exist`);
      return;
    }
    if (visited.has(nodeId)) {
      problems.push(`"${nodeId}" is reached more than one way; each node needs exactly one parent`);
      return;
    }
    visited.add(nodeId);
    if (node.type === 'ending') {
      return;
    }

    const [first, second] = node.choices;
    if (first.stat === second.stat) {
      problems.push(`"${nodeId}" offers two ${first.stat} challenges`);
    }
    if (first.id === second.id) {
      problems.push(`"${nodeId}" has two challenges with ID "${first.id}"`);
    }
    visit(node.onSuccess, failures);
    const failureReachable = failures + 1 <= allowedFailures;
    if (failureReachable && node.onFailure === undefined) {
      problems.push(`"${nodeId}" needs an onFailure: the team can still afford a failure there`);
    } else if (!failureReachable && node.onFailure !== undefined) {
      problems.push(`"${nodeId}" has an onFailure, but failing there always loses the game`);
    } else if (node.onFailure !== undefined) {
      visit(node.onFailure, failures + 1);
    }
  };
  visit(tree.startNodeId, 0);

  for (const nodeId of Object.keys(tree.nodes)) {
    if (!visited.has(nodeId)) {
      problems.push(`"${nodeId}" is unreachable`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`"${scenario.title}" is invalid:\n- ${problems.join('\n- ')}`);
  }
}
