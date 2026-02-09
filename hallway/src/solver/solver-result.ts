/**
 * fSpy
 * Copyright (c) 2020 - Per Gantelius
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as THREE from 'three';

export enum Axis {
  PositiveX = 'xPositive',
  NegativeX = 'xNegative',
  PositiveY = 'yPositive',
  NegativeY = 'yNegative',
  PositiveZ = 'zPositive',
  NegativeZ = 'zNegative'
}

export interface CameraParameters {
  principalPoint: THREE.Vector2
  viewTransform: THREE.Matrix4
  cameraTransform: THREE.Matrix4 // the inverse of the view transform
  horizontalFieldOfView: number
  verticalFieldOfView: number
  vanishingPoints: [THREE.Vector2, THREE.Vector2, THREE.Vector2]
  vanishingPointAxes: [Axis, Axis, Axis]
  relativeFocalLength: number,
  imageWidth: number,
  imageHeight: number
}

export interface SolverResult {
  errors: string[]
  warnings: string[]
  cameraParameters: CameraParameters | null
}
