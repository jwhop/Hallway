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

export default class MathUtil {

  static normalized(vector: THREE.Vector2): THREE.Vector2 {
    let l = this.distance(new THREE.Vector2(0,0), vector)
    if (l != 0) {
      return new THREE.Vector2(
        vector.x / l,
        vector.y / l
      )
    }

    // zero length vector. really undefined, but return something anyway
    return new THREE.Vector2(
        0,
        0
    )
  }

  static dot(a: THREE.Vector2, b: THREE.Vector2): number {
    return a.dot(b);
  }

  static difference(a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 {
    return a.clone().sub(b);
  }

  static distance(a: THREE.Vector2, b: THREE.Vector2): number {
    return a.distanceTo(b);
  }

  static lineSegmentMidpoint(segment: [THREE.Vector2, THREE.Vector2]): THREE.Vector2 {
    return new THREE.Vector2(
      0.5 * (segment[0].x + segment[1].x),
      0.5 * (segment[0].y + segment[1].y)
    )
  }

  static lineIntersection(line1: [THREE.Vector2, THREE.Vector2], line2: [THREE.Vector2, THREE.Vector2]): THREE.Vector2 | null {
    let d1 = this.distance(line1[0], line1[1])
    let d2 = this.distance(line2[0], line2[1])

    let epsilon = 1e-8
    if (Math.abs(d1) < epsilon || Math.abs(d2) < epsilon) {
      return null
    }

    // https://en.wikipedia.org/wiki/Line–line_intersection
    let x1 = line1[0].x
    let y1 = line1[0].y

    let x2 = line1[1].x
    let y2 = line1[1].y

    let x3 = line2[0].x
    let y3 = line2[0].y

    let x4 = line2[1].x
    let y4 = line2[1].y

    let denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if (Math.abs(denominator) < epsilon) {
      return null
    }

    return new THREE.Vector2(
      ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denominator,
      ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denominator
    )
  }

  static triangleOrthoCenter(k: THREE.Vector2, l: THREE.Vector2, m: THREE.Vector2): THREE.Vector2 {
    let a = k.x
    let b = k.y
    let c = l.x
    let d = l.y
    let e = m.x
    let f = m.y

    let N = b * c + d * e + f * a - c * f - b * e - a * d
    let x = ((d - f) * b * b + (f - b) * d * d + (b - d) * f * f + a * b * (c - e) + c * d * (e - a) + e * f * (a - c)) / N
    let y = ((e - c) * a * a + (a - e) * c * c + (c - a) * e * e + a * b * (f - d) + c * d * (b - f) + e * f * (d - b)) / N

    return new THREE.Vector2(
      x, y
    )
  }

  static thirdTriangleVertex(firstVertex: THREE.Vector2, secondVertex: THREE.Vector2, orthocenter: THREE.Vector2): THREE.Vector2 {
    let a = firstVertex
    let b = secondVertex
    let o = orthocenter

    // compute p, the orthogonal projection of the orthocenter onto the line through a and b
    let aToB = this.normalized(new THREE.Vector2(b.x - a.x, b.y - a.y ))
    let proj = this.dot(aToB, this.difference(o, a))
    let p = new THREE.Vector2(
      a.x + proj * aToB.x,
      a.y + proj * aToB.y
    )

    // the vertex c can be expressed as p + hn, where n is orthogonal to ab.
    let n = new THREE.Vector2( aToB.y, -aToB.x );
    let h = this.dot(this.difference(a, p), this.difference(o, b)) / (this.dot(n, this.difference(o, b)))

    return new THREE.Vector2(
      p.x + h * n.x,
      p.y + h * n.y
    )
  }

  static linePlaneIntersection(
    p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, la: THREE.Vector3, lb: THREE.Vector3
  ): THREE.Vector3 {
    // https://en.wikipedia.org/wiki/Line–plane_intersection
    let p01 = p1.clone().sub(p0)
    let p02 = p2.clone().sub(p0)
    let lab = lb.clone().sub(la)
    let numerator = (p01.clone().cross(p02)).dot(la.sub(p0))
    let denominator = -(lab.dot(p01.clone().cross(p02)))
    let t = numerator / denominator
    return new THREE.Vector3(
      la.x + t * lab.x,
      la.y + t * lab.y,
      la.z + t * lab.z
    )
  }

  static shortestLineSegmentBetweenLines(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, p4: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
    // TODO: gracefully handle parallel lines
    // http://paulbourke.net/geometry/pointlineplane/

    function d(m: number, n: number, o: number, p: number): number {
      // dmnop = (xm - xn)(xo - xp) + (ym - yn)(yo - yp) + (zm - zn)(zo - zp)
      let allPoints = [p1, p2, p3, p4]
      let pm = allPoints[m - 1]
      let pn = allPoints[n - 1]
      let po = allPoints[o - 1]
      let pp = allPoints[p - 1]
      return (pm.x - pn.x) * (po.x - pp.x) + (pm.y - pn.y) * (po.y - pp.y) + (pm.z - pn.z) * (po.z - pp.z)
    }

    let muaNumerator = d(1, 3, 4, 3) * d(4, 3, 2, 1) - d(1, 3, 2, 1) * d(4, 3, 4, 3)
    let muaDenominator = d(2, 1, 2, 1) * d(4, 3, 4, 3) - d(4, 3, 2, 1) * d(4, 3, 2, 1)
    let mua = muaNumerator / muaDenominator
    let mub = (d(1, 3, 4, 3) + mua * d(4, 3, 2, 1)) / d(4, 3, 4, 3)

    return [
      new THREE.Vector3(
        p1.x + mua * (p2.x - p1.x),
        p1.y + mua * (p2.y - p1.y),
        p1.z + mua * (p2.z - p1.z)
      ),
      new THREE.Vector3(
        p3.x + mub * (p4.x - p3.x),
        p3.y + mub * (p4.y - p3.y),
        p3.z + mub * (p4.z - p3.z)
      )
    ]
  }

  static perspectiveUnproject(
    point: THREE.Vector3,
    viewTransform: THREE.Matrix4,
    principalPoint: THREE.Vector2,
    horizontalFieldOfView: number
  ): THREE.Vector3 {
    let transform = this.modelViewProjection(
      viewTransform,
      principalPoint,
      horizontalFieldOfView
    ).clone().invert()
    return transform.transformedVector(point, true)
  }

  static perspectiveProject(
    point: THREE.Vector3,
    viewTransform: THREE.Matrix4,
    principalPoint: THREE.Vector2,
    horizontalFieldOfView: number
  ): THREE.Vector2 {
    let projected = this.modelViewProjection(
      viewTransform,
      principalPoint,
      horizontalFieldOfView
    ).transformedVector(
      point,
      true
    )
    return projected
  }

  static pointsAreOnTheSameSideOfLine(l1: THREE.Vector2, l2: THREE.Vector2, p1: THREE.Vector2, p2: THREE.Vector2): boolean {
    let lineDirection = {
      x: l2.x - l1.x,
      y: l2.y - l1.y
    }

    let lineNormal = {
      x: lineDirection.y,
      y: -lineDirection.x
    }

    let l1ToP1 = {
      x: p1.x - l1.x,
      y: p1.y - l1.y
    }

    let l1ToP2 = {
      x: p2.x - l1.x,
      y: p2.y - l1.y
    }

    let dot1 = l1ToP1.x * lineNormal.x + l1ToP1.y * lineNormal.y
    let dot2 = l1ToP2.x * lineNormal.x + l1ToP2.y * lineNormal.y

    return dot1 * dot2 > 0
  }

  static matrixToAxisAngle(transform: THREE.Matrix4): [number, number, number, number] {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToAngle/
    const m00 = transform.elements[0];
    const m01 = transform.elements[1];
    const m02 = transform.elements[2];
    const m10 = transform.elements[4];
    const m11 = transform.elements[5];
    const m12 = transform.elements[6];
    const m20 = transform.elements[8];
    const m21 = transform.elements[9];
    const m22 = transform.elements[10];

    const x = (m21 - m12) / Math.sqrt((m21 - m12) * (m21 - m12) + (m02 - m20) * (m02 - m20) + (m10 - m01) * (m10 - m01))
    const y = (m02 - m20) / Math.sqrt((m21 - m12) * (m21 - m12) + (m02 - m20) * (m02 - m20) + (m10 - m01) * (m10 - m01))
    const z = (m10 - m01) / Math.sqrt((m21 - m12) * (m21 - m12) + (m02 - m20) * (m02 - m20) + (m10 - m01) * (m10 - m01))
    const angle = Math.acos((m00 + m11 + m22 - 1) / 2)
    
    // threejs only method
    //const vector = new THREE.Vector3(0,0,0);
    //const angle = 0;
    //return transform.makeRotationAxis(vector, angle);
    
    return [x, y, z, angle]
  }

  static matrixToQuaternion(transform: THREE.Matrix4): THREE.Quaternion {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/
    const m00 = transform.elements[0];
    const m01 = transform.elements[1];
    const m02 = transform.elements[2];
    const m10 = transform.elements[4];
    const m11 = transform.elements[5];
    const m12 = transform.elements[6];
    const m20 = transform.elements[8];
    const m21 = transform.elements[9];
    const m22 = transform.elements[10];

    const qw = Math.sqrt(1 + m00 + m11 + m22) / 2
    const qx = (m21 - m12) / (4 * qw)
    const qy = (m02 - m20) / (4 * qw)
    const qz = (m10 - m01) / (4 * qw)
    return new THREE.Quaternion(qx, qy, qz, qw);
  }

  private static modelViewProjection(
    viewTransform: THREE.Matrix4,
    principalPoint: THREE.Vector2,
    horizontalFieldOfView: number
  ): THREE.Matrix4 {
    let s = 1 / Math.tan(0.5 * horizontalFieldOfView)
    let n = 0.01
    let f = 10
    let projectionTransform = new THREE.Matrix4(
      s, 0, -principalPoint.x, 0,
      0, s, -principalPoint.y, 0,
      0, 0, -(f + n) / (f - n), -2 * f * n / (f - n),
      0, 0, -1, 0
    )
    return viewTransform.clone().premultiply(projectionTransform)
  }


}
