import type { Scenario } from './scenario.ts';

/**
 * The smallest playable game, for testing the call flow end to end: one operative, one decision.
 * Either outcome leads to an ending (one failure is allowed), so a game is two calls: the decision,
 * then the report.
 */
export const telephoneTest: Scenario = {
  title: 'Telephone test',
  agentId: 'agent_0801m4sf68fxfqhs06v4ym0jhjeg',
  allowedFailures: 1,
  scenario:
    "A routine test of the handler's new secure line, dressed up as a mission. Agent Dial Tone " +
    'has slipped into the old city telephone exchange after hours to patch the line into the ' +
    "bureau's switchboard. If the handler's order gets through, the line works.",
  decisionTree: {
    startNodeId: 'line-check',
    nodes: {
      'line-check': {
        type: 'choice',
        situation:
          "You're inside the old city telephone exchange after hours, patching the handler's new " +
          "secure line into the bureau's switchboard. The junction box you need is in the switch " +
          'room at the end of the hall, but the door is stuck, and the night janitor is mopping ' +
          'right outside it, humming along to the radio. You need one order to get to that box.',
        choices: [
          {
            id: 'force-the-door',
            description: 'Put your shoulder into the stuck door and get to the junction box',
            stat: 'muscle',
          },
          {
            id: 'slip-past-janitor',
            description:
              "Wait for the janitor's back to turn, then slip into the switch room through the side hatch",
            stat: 'stealth',
          },
        ],
        onSuccess: 'line-clear',
        onFailure: 'line-crackly',
      },
      'line-clear': {
        type: 'ending',
        situation:
          'It worked. You patched the line in and the bureau switchboard lit up like a Christmas ' +
          "tree, and the janitor never looked up from his mop. The handler's line is live and " +
          'secure. Line check complete.',
      },
      'line-crackly': {
        type: 'ending',
        situation:
          "It didn't go smoothly. The janitor caught you in the switch room, and you had to " +
          'convince him you were from the phone company while you finished the patch. The line ' +
          'is live, if a little crackly. Line check complete.',
      },
    },
  },
  npcs: [
    {
      name: 'Agent Dial Tone',
      persona:
        'A cheerful, by-the-book communications officer who has wired more safehouses than ' +
        'anyone in the bureau. Talks in radio procedure ("copy that", "over"), gets excited about ' +
        'a good junction box, and stays upbeat even when things go sideways. Keeps calls short.',
      voiceId: null,
      stats: { stealth: 50, charm: 50, muscle: 50 },
    },
  ],
};
