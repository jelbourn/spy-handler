import type { Scenario } from './scenario.ts';

/**
 * Operation Golden Grill: the team works its way along Captain Hanks's supply chain, from the spice
 * supplier to the delivery fleet to the test kitchen, to steal his recipe binder. Four decisions,
 * each handled by whichever operative calls. Each operative is strong in one stat and weak in
 * another, so the player does best by picking the challenge that suits who's on the line:
 *
 * - Juniper: charm
 * - Bishop: muscle
 * - Moss: stealth
 *
 * One failed roll is allowed, so failure branches stop after the first failure.
 */
export const captainHanks: Scenario = {
  title: 'Operation Golden Grill',
  agentId: 'agent_0801m4sf68fxfqhs06v4ym0jhjeg',
  allowedFailures: 1,
  scenario:
    "Captain Hanks's Tandori Halloumi is the most imitated dish in fast-casual dining, and nobody " +
    "has ever gotten it right. The recipe is kept in a binder in the Captain's office safe at his " +
    'flagship test kitchen in Portland. The team is working its way along his supply chain (the ' +
    'spice supplier, the refrigerated delivery fleet, then the test kitchen itself) to steal the ' +
    "recipe before Friday's franchise launch in Pioneer Courthouse Square. The team can afford one " +
    'mistake. A second one blows the mission.',
  decisionTree: {
    startNodeId: 'spice-yard',
    nodes: {
      'spice-yard': {
        type: 'choice',
        situation:
          'The mission starts at Saraswati & Sons Spice Traders in Old Town, right under the ' +
          "glowing Portland Oregon sign. They supply Captain Hanks's masala, and their delivery " +
          'manifest lists everyone allowed into his test kitchen. The team needs to get onto it, ' +
          "but the guard at the gate won't let anyone in without an appointment.",
        choices: [
          {
            id: 'talk-past-guard',
            description: 'Talk your way past the guard as a big-spending buyer from a rival chain',
            stat: 'charm',
          },
          {
            id: 'climb-fence',
            description:
              'Go round the back, climb the fence, and find the office with the manifest',
            stat: 'muscle',
          },
        ],
        onSuccess: 'on-the-manifest',
        onFailure: 'off-the-manifest',
      },
      'on-the-manifest': {
        type: 'choice',
        situation:
          "It worked: the team is on the spice manifest as Captain Hanks's new delivery crew. Next " +
          'stop is Hanks Cold Chain on Swan Island, where the marinade truck to the test kitchen ' +
          'is being loaded. The dock supervisor is checking everyone against the manifest, and the ' +
          'truck is nearly full.',
        choices: [
          {
            id: 'outwork-the-dock',
            description:
              'Grab a dolly and outwork everyone on the dock until the supervisor waves you aboard',
            stat: 'muscle',
          },
          {
            id: 'stow-away',
            description: 'Slip into the back among the marinade tubs before the doors close',
            stat: 'stealth',
          },
        ],
        onSuccess: 'loading-bay',
        onFailure: 'missed-the-truck',
      },
      'off-the-manifest': {
        type: 'choice',
        situation:
          "It didn't work: the team got chased out of the spice yard without getting onto the " +
          "manifest, and Saraswati's guard has your descriptions. The fallback is the marinade " +
          'truck at Hanks Cold Chain on Swan Island, which goes straight to the test kitchen. It ' +
          'leaves in ten minutes, nobody on it is expecting you, and there is no room for another ' +
          'mistake.',
        choices: [
          {
            id: 'hide-among-tubs',
            description:
              'Slip into the back of the truck among the marinade tubs before the doors close',
            stat: 'stealth',
          },
          {
            id: 'bluff-the-driver',
            description: "Tell the driver you're the new hire he's supposed to be training today",
            stat: 'charm',
          },
        ],
        onSuccess: 'stowed-away',
      },
      'loading-bay': {
        type: 'choice',
        situation:
          "It worked: the team rolled into Captain Hanks's test kitchen in the Pearl District, " +
          "around the corner from Powell's City of Books, with the morning marinade delivery. " +
          "You're in the loading bay. The Captain's office is upstairs, past a busy kitchen full " +
          'of line cooks.',
        choices: [
          {
            id: 'carry-tubs-upstairs',
            description:
              'Shoulder two tubs of marinade and walk them through the kitchen like you belong',
            stat: 'muscle',
          },
          {
            id: 'back-stairs',
            description: 'Slip up the back stairs while the cooks are busy',
            stat: 'stealth',
          },
        ],
        onSuccess: 'office-door',
        onFailure: 'kitchen-alarm',
      },
      'missed-the-truck': {
        type: 'choice',
        situation:
          "It didn't work: the supervisor bumped the team off the truck, and it left without you. " +
          "You've caught up on foot outside the test kitchen in the Pearl District, near Powell's " +
          "City of Books. There's a receptionist with a sign-in sheet at the front door, and a " +
          'drainpipe running up to a roof vent. There is no room for another mistake.',
        choices: [
          {
            id: 'pose-as-inspector',
            description: 'Walk in the front door as a health inspector',
            stat: 'charm',
          },
          {
            id: 'climb-to-vent',
            description: 'Climb the drainpipe and drop in through the roof vent',
            stat: 'muscle',
          },
        ],
        onSuccess: 'captain-at-his-desk',
      },
      'stowed-away': {
        type: 'choice',
        situation:
          "It worked: the team made it into Captain Hanks's test kitchen in the Pearl District, " +
          "hidden among the marinade tubs. The Captain's office is upstairs, and the head chef is " +
          'standing at the bottom of the stairs tasting sauces. There is no room for another ' +
          'mistake.',
        choices: [
          {
            id: 'distract-head-chef',
            description:
              'Ask the head chef for his secret to the perfect halloumi sear, and keep him talking',
            stat: 'charm',
          },
          {
            id: 'slip-past-chef',
            description: 'Wait for him to turn to the stove, then slip past him up the stairs',
            stat: 'stealth',
          },
        ],
        onSuccess: 'alone-in-the-office',
      },
      'office-door': {
        type: 'choice',
        situation:
          "It worked: the team is upstairs outside Captain Hanks's office, and nobody suspects a " +
          "thing. The recipe binder is in the safe, and the Captain's assistant is at her desk " +
          'beside the door.',
        choices: [
          {
            id: 'wait-for-break',
            description: "Wait for the assistant's coffee break, slip in, and crack the safe",
            stat: 'stealth',
          },
          {
            id: 'pose-as-it',
            description: 'Pose as IT and talk the assistant into reading you the safe combination',
            stat: 'charm',
          },
        ],
        onSuccess: 'clean-getaway',
        onFailure: 'grabbed-and-ran',
      },
      'kitchen-alarm': {
        type: 'choice',
        situation:
          "It didn't work: a line cook spotted the team and is calling security. Down the hall, " +
          "the Captain's office door is open and the recipe binder is on his desk. This is the " +
          'last chance: there is no room for another mistake.',
        choices: [
          {
            id: 'dash-for-binder',
            description: 'Sprint down the hall, grab the binder, and run for the fire exit',
            stat: 'muscle',
          },
          {
            id: 'hide-in-freezer',
            description:
              'Hide in the walk-in freezer until security passes, then slip into the office',
            stat: 'stealth',
          },
        ],
        onSuccess: 'lost-them-at-powells',
      },
      'captain-at-his-desk': {
        type: 'choice',
        situation:
          'It worked: the team is inside the test kitchen at last. But Captain Hanks is in his ' +
          "office with the binder open on his desk, rehearsing Friday's launch speech. There is " +
          'no room for another mistake.',
        choices: [
          {
            id: 'fake-fire-drill',
            description:
              "Convince the Captain there's a fire drill and he has to evacuate right now",
            stat: 'charm',
          },
          {
            id: 'lift-binder',
            description: 'Lift the binder off his desk while he takes a phone call',
            stat: 'stealth',
          },
        ],
        onSuccess: 'launch-day-surprise',
      },
      'alone-in-the-office': {
        type: 'choice',
        situation:
          "It worked: the team is alone in Captain Hanks's office. The binder is in a safe bolted " +
          'to the floor, there is a skylight overhead, and footsteps are coming up the stairs. ' +
          'There is no room for another mistake.',
        choices: [
          {
            id: 'pry-open-safe',
            description: 'Wrench the safe open with a crowbar before the footsteps arrive',
            stat: 'muscle',
          },
          {
            id: 'crack-by-ear',
            description: 'Crack the safe by ear, quietly, before the footsteps arrive',
            stat: 'stealth',
          },
        ],
        onSuccess: 'out-the-skylight',
      },
      'clean-getaway': {
        type: 'ending',
        situation:
          'Mission accomplished, without a single slip. The team photographed every page of the ' +
          "binder and put it back, so the Captain won't know until the knockoffs hit the shelves. " +
          'Maple bacon bars from Voodoo Doughnut are on the team.',
      },
      'grabbed-and-ran': {
        type: 'ending',
        situation:
          'Mission accomplished, barely. The safe went wrong, so the team grabbed the whole binder ' +
          'and ran. Security chased them to the Burnside Bridge and lost them in the crowds at ' +
          'Saturday Market.',
      },
      'lost-them-at-powells': {
        type: 'ending',
        situation:
          'Mission accomplished. The team got the binder out the fire exit and lost security in ' +
          "the stacks at Powell's City of Books. It smells faintly of halloumi.",
      },
      'launch-day-surprise': {
        type: 'ending',
        situation:
          "Mission accomplished. The team got the binder off the Captain's desk, and he'll be " +
          'presenting a very confused recipe in Pioneer Courthouse Square on Friday.',
      },
      'out-the-skylight': {
        type: 'ending',
        situation:
          'Mission accomplished. The team got the safe open, climbed out through the skylight ' +
          'with the binder, and rode the streetcar out of the Pearl like tourists.',
      },
    },
  },
  npcs: [
    {
      name: 'Agent Juniper',
      persona:
        'A smooth, overconfident former sommelier who describes every spice like a fine wine. ' +
        'Talks fast, name-drops constantly, and calls the handler "darling". Can talk her way into ' +
        'anywhere, but trips over her own feet and has never climbed anything taller than a bar stool.',
      voiceId: 'eXpIbVcVbLo8ZJQDlDnl',
      stats: { stealth: 35, charm: 85, muscle: 20 },
    },
    {
      name: 'Agent Bishop',
      persona:
        'An anxious rookie on their first field assignment. Overshares, apologizes constantly, and ' +
        'narrates their own heartbeat. Built like a refrigerator and strong as one, but about as ' +
        'subtle as one too, and goes to pieces when they have to lie.',
      voiceId: 'cjVigY5qzO86Huf0OWal',
      stats: { stealth: 30, charm: 45, muscle: 80 },
    },
    {
      name: 'Agent Moss',
      persona:
        'A deadpan veteran who has been undercover too long. Speaks in short, clipped sentences. ' +
        'Mildly disappointed in everyone, including the handler. Moves like a ghost, but no one ' +
        'has ever believed a word Moss says.',
      voiceId: 'M5t0724ORuAGCh3p3DUR',
      stats: { stealth: 85, charm: 25, muscle: 55 },
    },
  ],
};
