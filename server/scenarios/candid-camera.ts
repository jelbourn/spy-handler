import type { Scenario } from './scenario.ts';

/**
 * Operation Candid Camera: get a candid photo of Jason Lengstorf at his compound in Dunthorpe, past
 * his security guards, dogs, defense drones and robot butler. Three decisions, each handled by
 * whichever operative calls:
 *
 * - Big Rob: muscle
 * - Pippy: charm
 *
 * Neither is strong at stealth, so stealth challenges are the risky picks. One failed roll is
 * allowed, so failure branches stop after the first failure. Every ending gets the photo; the path
 * decides how good it is.
 */
export const candidCamera: Scenario = {
  title: 'Operation Candid Camera',
  agentId: 'agent_0801m4sf68fxfqhs06v4ym0jhjeg',
  allowedFailures: 1,
  scenario:
    'Nobody has ever caught Jason Lengstorf off guard on camera. He lives in a multi-million ' +
    'dollar compound in Dunthorpe, Portland, behind security guards, guard dogs, defense drones ' +
    'and a robot butler. The team has one job: get a candid photo of him without getting caught. ' +
    'The team can afford one mistake. A second one blows the mission.',
  decisionTree: {
    startNodeId: 'front-gate',
    nodes: {
      'front-gate': {
        type: 'choice',
        situation:
          "You're outside Jason Lengstorf's compound in Dunthorpe. Two security guards are in " +
          'the gatehouse, and the hedge around the grounds is taller than a delivery truck.',
        choices: [
          {
            id: 'pose-as-courier',
            description:
              'Walk up to the gatehouse as a courier with a signed-for package of rare coffee beans',
            stat: 'charm',
          },
          {
            id: 'slip-through-hedge',
            description: 'Wait for the guards to change shifts and slip through a gap in the hedge',
            stat: 'stealth',
          },
        ],
        onSuccess: 'drone-lawn',
        onFailure: 'dogs-released',
      },
      'drone-lawn': {
        type: 'choice',
        situation:
          'It worked: the team is inside the grounds. Between the hedge and the house is a long ' +
          'lawn patrolled by defense drones sweeping it with spotlights. The back door is open.',
        choices: [
          {
            id: 'crawl-blind-spots',
            description: "Crawl across the lawn in the drones' blind spots",
            stat: 'stealth',
          },
          {
            id: 'sprint-for-door',
            description: 'Sprint across the lawn and dive through the back door before they turn',
            stat: 'muscle',
          },
        ],
        onSuccess: 'robot-butler',
        onFailure: 'drone-alarm',
      },
      'dogs-released': {
        type: 'choice',
        situation:
          "It didn't work: the guards spotted the team and let the dogs out. You're up a tree at " +
          'the edge of the grounds with three very large, very good dogs barking below. The pool ' +
          'house roof is one branch away. There is no room for another mistake.',
        choices: [
          {
            id: 'win-over-dogs',
            description: 'Win the dogs over with baby talk and the treats in your pocket',
            stat: 'charm',
          },
          {
            id: 'swing-to-roof',
            description: 'Climb out along the branch and drop onto the pool house roof',
            stat: 'muscle',
          },
        ],
        onSuccess: 'pool-house-roof',
      },
      'robot-butler': {
        type: 'choice',
        situation:
          'It worked: the team is in the house. Jason is in his studio down the hall, mid-stream. ' +
          'Between you and the studio door is the robot butler, offering snacks and asking every ' +
          'visitor for their name.',
        choices: [
          {
            id: 'pose-as-stream-guest',
            description: "Tell the butler you're today's stream guest and ask it to show you in",
            stat: 'charm',
          },
          {
            id: 'slip-past-butler',
            description: 'Wait for the butler to turn away to refill the snacks, then slip past',
            stat: 'stealth',
          },
        ],
        onSuccess: 'perfect-candid',
        onFailure: 'blurry-candid',
      },
      'drone-alarm': {
        type: 'choice',
        situation:
          "It didn't work: a drone spotted the team and the alarm is going off. You're pressed " +
          "against the house right under Jason's studio window, and he's at his desk. There is " +
          'no room for another mistake.',
        choices: [
          {
            id: 'climb-trellis',
            description:
              'Climb the trellis to the window and get the shot before the guards arrive',
            stat: 'muscle',
          },
          {
            id: 'hide-in-hedge',
            description: 'Hide in the hedge under the window until the drones move on',
            stat: 'stealth',
          },
        ],
        onSuccess: 'window-candid',
      },
      'pool-house-roof': {
        type: 'choice',
        situation:
          "It worked: the dogs aren't a problem anymore, and the team is up on the pool house " +
          'roof with a clear view of the back deck. Jason has just come out with a mug, and the ' +
          'robot butler is rolling over to ' +
          'him. There is no room for another mistake.',
        choices: [
          {
            id: 'distract-butler',
            description:
              'Call down to the butler and ask it to get Jason to turn around for a quick picture',
            stat: 'charm',
          },
          {
            id: 'wait-for-shot',
            description: 'Lie flat and still on the roof until the perfect moment',
            stat: 'stealth',
          },
        ],
        onSuccess: 'poolside-candid',
      },
      'perfect-candid': {
        type: 'ending',
        situation:
          'Mission accomplished, without a single slip. The team got a perfect candid of Jason ' +
          'mid-stream, laughing at something in chat, headphones askew. Nobody even knows you ' +
          'were there.',
      },
      'blurry-candid': {
        type: 'ending',
        situation:
          'Mission accomplished, barely. The robot butler raised the alarm, but the team got one ' +
          'slightly blurry shot of a very confused Jason before running for it. It still counts.',
      },
      'window-candid': {
        type: 'ending',
        situation:
          'Mission accomplished. Through the studio window, the team caught Jason in fuzzy ' +
          'slippers, mid-sip of coffee, a second before the drones came back around.',
      },
      'poolside-candid': {
        type: 'ending',
        situation:
          'Mission accomplished. From the pool house roof, the team got a candid of Jason on the ' +
          'deck being handed a smoothie by his robot butler. The dogs are your friends now too.',
      },
    },
  },
  npcs: [
    {
      name: 'Big Rob',
      persona:
        'An Australian climbing enthusiast who sees every wall, tree and drainpipe as a route ' +
        'waiting to be sent. Laid-back, upbeat and full of climbing slang, and calls the handler ' +
        '"mate". Can haul himself up anything, but is about as quiet as a kangaroo in a kitchen ' +
        'and tells everyone exactly what he is up to.',
      voiceId: 'bVxvWZpqo0NXHobrj0ri',
      stats: { stealth: 30, charm: 45, muscle: 85 },
    },
    {
      name: 'Pippy',
      persona:
        'A Scottish gardener with green fingers and a gift of the gab. Warm, chatty and full of ' +
        'opinions about hedges, and on first-name terms with everyone within five minutes. Can ' +
        'charm her way past anyone, but tramples every flowerbed she crosses and has never once ' +
        'climbed a fence.',
      voiceId: 'AMNzDFTtLuyoKAL3YPnu',
      stats: { stealth: 40, charm: 85, muscle: 35 },
    },
  ],
};
