import type { Scenario } from './scenario.ts';

/**
 * Operation Golden Grill: three operatives infiltrate Captain Hanks's supply chain from different
 * directions, two decisions each. Each operative is strong in one stat and weak in another, so the
 * player does best by reading the dossiers and picking the challenge that suits who's on the line:
 *
 * - Juniper (charm): the spice supplier, after the masala blend.
 * - Bishop (muscle): the delivery fleet, after a tub of the marinade.
 * - Moss (stealth): the test kitchen, after the recipe binder itself.
 *
 * The first decision decides whether the operative gets in cleanly or has to recover; the second
 * decides whether they get what they came for.
 */
export const captainHanks: Scenario = {
  title: 'Operation Golden Grill',
  agentId: 'agent_0801m4sf68fxfqhs06v4ym0jhjeg',
  scenario:
    "Captain Hanks's Tandori Halloumi is the most imitated dish in fast-casual dining, and nobody " +
    "has ever gotten it right. The recipe is kept in a binder in the Captain's office safe at his " +
    'flagship test kitchen in Portland. The team is infiltrating his supply chain from three ' +
    'directions (the spice supplier, the refrigerated delivery fleet, and the test kitchen itself) ' +
    "to steal the recipe before Friday's franchise launch in Pioneer Courthouse Square.",
  npcs: [
    {
      name: 'Agent Juniper',
      persona:
        'A smooth, overconfident former sommelier who describes every spice like a fine wine. ' +
        'Talks fast, name-drops constantly, and calls the handler "darling". Can talk her way into ' +
        'anywhere, but trips over her own feet and has never climbed anything taller than a bar stool.',
      voiceId: 'eXpIbVcVbLo8ZJQDlDnl',
      stats: { stealth: 35, charm: 85, muscle: 20 },
      decisionTree: {
        startNodeId: 'warehouse-gate',
        nodes: {
          'warehouse-gate': {
            type: 'choice',
            situation:
              "You're at the gate of Saraswati & Sons Spice Traders in Old Town, right under the " +
              "glowing Portland Oregon sign. They're the only supplier of Captain Hanks's tandoori " +
              "masala, and the guard won't let anyone in without an appointment.",
            choices: [
              {
                id: 'talk-past-guard',
                description:
                  'Talk your way past the guard as a big-spending buyer from a rival chain',
                stat: 'charm',
              },
              {
                id: 'climb-fence',
                description: 'Go round the back, climb the fence, and drop into the yard',
                stat: 'muscle',
              },
            ],
            onSuccess: 'tasting-room',
            onFailure: 'turned-away',
          },
          'tasting-room': {
            type: 'choice',
            situation:
              "It worked: you're inside. Old Mr. Saraswati spotted you in the corridor, took you for " +
              'a buyer, and insisted on a private tasting. He keeps hinting at a special blend he ' +
              'makes for "a certain sea captain", and the ledger with every blend recipe is sticking ' +
              'out of his jacket pocket.',
            choices: [
              {
                id: 'flatter-saraswati',
                description:
                  'Flatter him until he brags about exactly what goes into the special blend',
                stat: 'charm',
              },
              {
                id: 'lift-ledger',
                description: 'Lift the ledger from his jacket pocket during the toast',
                stat: 'stealth',
              },
            ],
            onSuccess: 'juniper-blend',
            onFailure: 'juniper-exposed',
          },
          'turned-away': {
            type: 'choice',
            situation:
              "It didn't work: the guard marched you off the property and is watching the gate. " +
              "You're across the street, where a delivery driver has left his van open while he " +
              'signs paperwork. The van is going straight onto the blending floor.',
            choices: [
              {
                id: 'hide-in-van',
                description: 'Slip into the back of the open van without being seen',
                stat: 'stealth',
              },
              {
                id: 'chat-up-driver',
                description:
                  'Chat up the driver and talk him into bringing you along as his trainee',
                stat: 'charm',
              },
            ],
            onSuccess: 'juniper-back-door',
            onFailure: 'juniper-caught',
          },
          'juniper-blend': {
            type: 'ending',
            situation:
              'Success. Mr. Saraswati gave up the whole special blend, down to the pinch of smoked ' +
              "fenugreek, and you're out with the recipe for Captain Hanks's masala.",
            result: 'success',
          },
          'juniper-exposed': {
            type: 'ending',
            situation:
              "Failure. Mr. Saraswati's nephew recognized you from a rival chain's launch party. " +
              "You were shown out, and the Captain's people now know someone is after the masala.",
            result: 'failure',
          },
          'juniper-back-door': {
            type: 'ending',
            situation:
              'Success. You rode the van onto the blending floor, found the recipe card clipped to ' +
              'the mixer, photographed it, and disappeared into the crowds at Saturday Market under ' +
              'the Burnside Bridge.',
            result: 'success',
          },
          'juniper-caught': {
            type: 'ending',
            situation:
              'Failure. The driver caught you and called the guard back. Security escorted you off ' +
              "the property, and you won't get near the masala again.",
            result: 'failure',
          },
        },
      },
    },
    {
      name: 'Agent Bishop',
      persona:
        'An anxious rookie on their first field assignment. Overshares, apologizes constantly, and ' +
        'narrates their own heartbeat. Built like a refrigerator and strong as one, but about as ' +
        'subtle as one too, and goes to pieces when they have to lie.',
      voiceId: 'cjVigY5qzO86Huf0OWal',
      stats: { stealth: 30, charm: 45, muscle: 80 },
      decisionTree: {
        startNodeId: 'depot-interview',
        nodes: {
          'depot-interview': {
            type: 'choice',
            situation:
              "You're in a job interview at Hanks Cold Chain, the depot on Swan Island that delivers to every " +
              'Captain Hanks restaurant, including tubs of his secret marinade. The hiring manager ' +
              "doesn't look convinced, and you're stalling in the bathroom.",
            choices: [
              {
                id: 'bluff-experience',
                description: 'Convince the manager you drove ice-road trucks in northern Canada',
                stat: 'charm',
              },
              {
                id: 'unload-by-hand',
                description:
                  'Offer to prove yourself by unloading a whole truck by hand, right now',
                stat: 'muscle',
              },
            ],
            onSuccess: 'loading-dock',
            onFailure: 'rejected',
          },
          'loading-dock': {
            type: 'choice',
            situation:
              "It worked: you're hired, and you're on the loading dock for your first shift. Tubs " +
              'of the marinade are being loaded into a refrigerated truck, and the supervisor is ' +
              'counting every one.',
            choices: [
              {
                id: 'carry-out-tub',
                description:
                  'Hoist a full tub onto your shoulder and walk it out with the empty crates',
                stat: 'muscle',
              },
              {
                id: 'swap-labels',
                description:
                  "Quietly swap a full tub's label with an empty one's while the supervisor is counting",
                stat: 'stealth',
              },
            ],
            onSuccess: 'bishop-marinade',
            onFailure: 'bishop-fired',
          },
          rejected: {
            type: 'choice',
            situation:
              "It didn't work: the manager showed you the door. You're outside the depot fence, " +
              'and the marinade truck is pulling out of the yard with its back doors half shut.',
            choices: [
              {
                id: 'chase-truck',
                description: 'Run after the truck, grab the back doors, and pull yourself in',
                stat: 'muscle',
              },
              {
                id: 'flag-down-driver',
                description:
                  "Flag down the driver and convince him you're the new hire he's training",
                stat: 'charm',
              },
            ],
            onSuccess: 'bishop-hitched-ride',
            onFailure: 'bishop-arrested',
          },
          'bishop-marinade': {
            type: 'ending',
            situation:
              'Success. You walked a full tub of the marinade right past the supervisor, and it is ' +
              'now in the trunk of your car, sweating slightly. You celebrated with a maple bacon ' +
              'bar from Voodoo Doughnut.',
            result: 'success',
          },
          'bishop-fired': {
            type: 'ending',
            situation:
              'Failure. The supervisor caught you on your first shift. You were fired on the spot ' +
              'and your face is now on the depot noticeboard.',
            result: 'failure',
          },
          'bishop-hitched-ride': {
            type: 'ending',
            situation:
              'Success. You made it into the back of the truck and rolled out a tub of the marinade ' +
              'at a red light in the shadow of the Fremont Bridge.',
            result: 'success',
          },
          'bishop-arrested': {
            type: 'ending',
            situation:
              'Failure. The driver called the depot, and security held you until the police came. ' +
              "You're calling from the station.",
            result: 'failure',
          },
        },
      },
    },
    {
      name: 'Agent Moss',
      persona:
        'A deadpan veteran who has been undercover too long. Speaks in short, clipped sentences. ' +
        'Mildly disappointed in everyone, including the handler. Moves like a ghost, but no one ' +
        'has ever believed a word Moss says.',
      voiceId: 'M5t0724ORuAGCh3p3DUR',
      stats: { stealth: 85, charm: 25, muscle: 55 },
      decisionTree: {
        startNodeId: 'kitchen-exterior',
        nodes: {
          'kitchen-exterior': {
            type: 'choice',
            situation:
              "You're outside Captain Hanks's flagship test kitchen in the Pearl District, around " +
              "the corner from Powell's City of Books. The front entrance has a " +
              'receptionist and a sign-in sheet. There is a drainpipe running up to a roof vent.',
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
            onSuccess: 'office-hallway',
            onFailure: 'spotted-in-kitchen',
          },
          'office-hallway': {
            type: 'choice',
            situation:
              "It worked: you're in, and nobody knows. You're in the hallway outside the Captain's " +
              "office. The recipe binder is in the safe, and the Captain's assistant is at her desk " +
              'beside the door.',
            choices: [
              {
                id: 'wait-for-break',
                description:
                  "Wait for the assistant's coffee break, slip into the office, and crack the safe",
                stat: 'stealth',
              },
              {
                id: 'pose-as-it',
                description:
                  'Pose as IT and talk the assistant into reading you the safe combination',
                stat: 'charm',
              },
            ],
            onSuccess: 'moss-recipe',
            onFailure: 'moss-caught',
          },
          'spotted-in-kitchen': {
            type: 'choice',
            situation:
              "It didn't work: you got in, but a line cook spotted you and is calling security. " +
              "Down the hall, the Captain's office door is open and the recipe binder is on the desk.",
            choices: [
              {
                id: 'dash-for-binder',
                description: 'Sprint down the hall, grab the binder, and run for the fire exit',
                stat: 'muscle',
              },
              {
                id: 'hide-and-wait',
                description:
                  'Hide in the walk-in freezer until security passes, then slip into the office',
                stat: 'stealth',
              },
            ],
            onSuccess: 'moss-escaped-with-binder',
            onFailure: 'moss-thrown-out',
          },
          'moss-recipe': {
            type: 'ending',
            situation:
              'Success. You photographed every page of the binder and put it back. The Captain ' +
              "won't know until the knockoffs hit the shelves.",
            result: 'success',
          },
          'moss-caught': {
            type: 'ending',
            situation:
              'Failure. The assistant came back early and found you at the safe. Security walked ' +
              'you out, and the binder has been moved.',
            result: 'failure',
          },
          'moss-escaped-with-binder': {
            type: 'ending',
            situation:
              'Success. You got the binder and out of the building before security reached the ' +
              "office, and lost them in the stacks at Powell's. It smells faintly of halloumi.",
            result: 'success',
          },
          'moss-thrown-out': {
            type: 'ending',
            situation:
              "Failure. Security found you before you reached the office and threw you out. You're " +
              'banned from the Pearl District, apparently.',
            result: 'failure',
          },
        },
      },
    },
  ],
};
