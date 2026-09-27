/**
 * The map. World units are roughly metres; +X is east, +Z is south, and the
 * follow camera looks north — so "up" on the keyboard walks toward −Z.
 *
 *            [ EXPERIENCE ]      [ WORK wall ]       [ SKILLS ]
 *   [ABOUT goal]           RAHUL V S (centre)          [TROPHIES goal]
 *                              spawn
 *                            [ CONTACT ]
 */

export type P = { x: number; z: number };

export const SPAWN: P = { x: 0, z: 11 };

export const GOAL = { halfWidth: 3.5, height: 2.6, depth: 2.4, lineX: 48 } as const;

export const ABOUT = {
  ball: { x: -37, z: 0 },
  label: { x: -37, z: 8.6 },
  centre: { x: -39, z: 0 },
  radius: 11,
} as const;

export const EXPERIENCE = {
  ball: { x: -10, z: -20 },
  /** Gate X positions, dribbled through westward, first to last. */
  gates: [-17, -25, -33],
  z: -20,
  halfWidth: 2.4,
  label: { x: -25, z: -27.6 },
  centre: { x: -22, z: -20 },
  radius: 12,
} as const;

export const WORK = {
  ball: { x: 0, z: -19 },
  wall: { minX: -15, maxX: 15, z: -33.1, depth: 0.6, height: 5 },
  targets: [-10.5, -3.5, 3.5, 10.5],
  targetY: 2.2,
  targetR: 1.25,
  label: { x: 0, z: -12.8 },
  centre: { x: 0, z: -24 },
  radius: 10,
} as const;

export const SKILLS = {
  centre: { x: 30, z: -19 },
  ring: 6.5,
  label: { x: 30, z: -19 },
  radius: 10,
} as const;

export const TROPHIES = {
  ball: { x: 37, z: 0 },
  keeperX: 47.1,
  label: { x: 37, z: 8.6 },
  centre: { x: 39, z: 0 },
  radius: 11,
} as const;

export const CONTACT = {
  pad: { x: 0, z: 27 },
  padR: 2.4,
  label: { x: 0, z: 21.2 },
  centre: { x: 0, z: 26 },
  radius: 6,
} as const;

/** Easter egg: a rack of bowling pins east of the spawn. */
export const PINS = { x: 13, z: 12, label: { x: 15.2, z: 16.4 } } as const;

/** Where the guide beacon points for each zone. */
export const ZONE_ANCHORS: Record<string, P> = {
  about: ABOUT.ball,
  experience: EXPERIENCE.ball,
  work: WORK.ball,
  skills: SKILLS.centre,
  trophies: TROPHIES.ball,
  contact: CONTACT.pad,
};
