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
    'This is a test of the phone line, not a real mission. The operative is checking that calls, ' +
    'orders and reports all get through to the handler.',
  decisionTree: {
    startNodeId: 'line-check',
    nodes: {
      'line-check': {
        type: 'choice',
        situation:
          "You're running a line check with the handler. You need one order to confirm the line " +
          'works: either knock on the door at the end of the hall, or tiptoe past it.',
        choices: [
          {
            id: 'knock-on-door',
            description: 'Knock on the door at the end of the hall',
            stat: 'muscle',
          },
          {
            id: 'tiptoe-past',
            description: 'Tiptoe past the door without making a sound',
            stat: 'stealth',
          },
        ],
        onSuccess: 'line-clear',
        onFailure: 'line-crackly',
      },
      'line-clear': {
        type: 'ending',
        situation: 'It worked. The order came through loud and clear. Line check complete.',
      },
      'line-crackly': {
        type: 'ending',
        situation:
          "It didn't work, but the order still came through, so the line works. Line check " +
          'complete.',
      },
    },
  },
  npcs: [
    {
      name: 'Agent Dial Tone',
      persona: 'A cheerful, by-the-book communications officer. Brief and upbeat.',
      voiceId: null,
      stats: { stealth: 50, charm: 50, muscle: 50 },
    },
  ],
};
