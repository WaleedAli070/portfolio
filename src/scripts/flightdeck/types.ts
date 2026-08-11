// Shared types for the flight-deck game (ported from design/Home.dc.html).

export interface Keys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
}

export interface FlightDeckConfig {
  /** Asteroids crash the ship (vs. bounce off). */
  lethalAsteroids: boolean;
  /** Target number of asteroids on screen. */
  asteroidCount: number;
  /** Ship acceleration per frame. */
  thrustPower: number;
  /** Flying into a planet starts the lander mini-game. */
  planetsLaunchLander: boolean;
}

export interface NodeDef {
  key: string;
  label: string;
  sigil: string;
  color: string;
  /** Position as fraction of viewport width/height. */
  fx: number;
  fy: number;
}
