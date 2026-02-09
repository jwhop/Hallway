import * as THREE from 'three';
import { CalibrationSettings2VP, CalibrationSettingsBase } from './calibration-settings'
import CoordinatesUtil , { ImageCoordinateFrame } from "./coordinates-util.ts"
import MathUtil from './math-util.ts';
import { PerspectiveLinePair } from '../perspective-line-pair.ts';
import { Image } from '../image.ts';
import { SolverResult, CameraParameters, Axis } from './solver-result.ts';

export class Solver{

    static readonly DEFAULT_CAMERA_DISTANCE_SCALE = 10
    
    static defaultSolverResult: SolverResult = {
    errors: [],
    warnings: [],
    cameraParameters: null
    }


    private static blankSolverResult(): SolverResult {
        let result = { ...this.defaultSolverResult }
        result.errors = []
        result.warnings = []
        return result
    }

    static solve2VP(
        settingsBase: CalibrationSettingsBase,
        settings2VP: CalibrationSettings2VP,
        xAxisLinePair : PerspectiveLinePair,
        zAxisLinePair : PerspectiveLinePair,

        image: Image
        ): SolverResult {
        let result = this.blankSolverResult()

        let errors = this.validateImageDimensions(image)
        if (errors.length > 0) {
            result.errors = errors
            return result
        }
        let imageWidth = image.width!
        let imageHeight = image.height!

        // Compute the two input vanishing points from the provided control points
        let inputVanishingPoints = this.computeVanishingPointsFromControlPoints(
            image,
            [xAxisLinePair, zAxisLinePair],
            errors
        )

        if (!inputVanishingPoints) {
            result.errors = errors
            return result
        }

        // Get the principal point
        let principalPoint = new THREE.Vector2(0,0);
        

        let fRelative = this.computeFocalLength(
            inputVanishingPoints[0], inputVanishingPoints[1], principalPoint
        )

        if (fRelative === null) {
            result.errors.push('Invalid vanishing point configuration. Failed to compute focal length.')
            return result
        }

        // Check vanishing point accuracy
        
        //const vanishingPointStatesToCheck = [controlPointsBase.firstVanishingPoint, secondVanishingPointControlState]
        //this.validateVanishingPointAccuracy(vanishingPointStatesToCheck, result.warnings)

        // compute camera parameters
        result.cameraParameters = this.computeCameraParameters(
            result,
            settingsBase,
            principalPoint,
            inputVanishingPoints[0],
            inputVanishingPoints[1],
            fRelative,
            imageWidth,
            imageHeight
        )

        return result
    }

    private static validateImageDimensions(image: Image): string[] {
        let errors: string[] = []
        if (image.width === null || image.height === null) {
        errors.push('No image loaded')
        }
        return errors
    }

    /**
     * Computes the focal length based on two vanishing points and a center of projection.
     * See 3.2 "Determining the focal length from a single image"
     * @param Fu the first vanishing point in image plane coordinates.
     * @param Fv the second vanishing point in image plane coordinates.
     * @param P the center of projection in image plane coordinates.
     * @returns The relative focal length.
     */
    static computeFocalLength(Fu:  THREE.Vector2, Fv:  THREE.Vector2, P:  THREE.Vector2): number | null {
        // compute Puv, the orthogonal projection of P onto FuFv
        let dirFuFv = new THREE.Vector3(Fu.x - Fv.x, Fu.y - Fv.y).clone().normalize()
        let FvP = new THREE.Vector3(P.x - Fv.x, P.y - Fv.y)
        let proj = dirFuFv.clone().dot(FvP)
        let Puv = {
            x: proj * dirFuFv.x + Fv.x,
            y: proj * dirFuFv.y + Fv.y
        }

        let PPuv = new THREE.Vector3(P.x - Puv.x, P.y - Puv.y).length();
        let FvPuv = new THREE.Vector3(Fv.x - Puv.x, Fv.y - Puv.y).length();
        let FuPuv = new THREE.Vector3(Fu.x - Puv.x, Fu.y - Puv.y).length();

        let fSq = FvPuv * FuPuv - PPuv * PPuv

        if (fSq <= 0) {
            return null
        }

        return Math.sqrt(fSq)
    }

    // private static validateVanishingPointAccuracy(
    // controlPointStates: VanishingPointControlState[],
    // warnings: string[]
    // ) {
    //     controlPointStates.forEach((controlPointState, stateIndex) => {
    //         const line1Direction = MathUtil.normalized(
    //         MathUtil.difference(controlPointState.lineSegments[0][1], controlPointState.lineSegments[0][0])
    //         )
    //         const line2Direction = MathUtil.normalized(
    //         MathUtil.difference(controlPointState.lineSegments[1][1], controlPointState.lineSegments[1][0])
    //         )
    //         const dot = MathUtil.dot(line1Direction, line2Direction)
    //         if (Math.abs(dot) > 0.99995) {
    //         warnings.push('Near parallel lines for VP ' + (stateIndex + 1))
    //         }
    //     })
    // }

    static computeVanishingPointsFromControlPoints(
        image : Image,
        perspectiveLinePairs: PerspectiveLinePair[],
        errors: string[]
    ){
        let result: THREE.Vector2[] = []
        for (let i = 0; i < perspectiveLinePairs.length; i++) {
        
            let vanishingPoint = MathUtil.lineIntersection(
            perspectiveLinePairs[i].getLine1() as [THREE.Vector2, THREE.Vector2],
            perspectiveLinePairs[i].getLine2() as [THREE.Vector2, THREE.Vector2],
        )
        if (vanishingPoint) {
            result.push(
            CoordinatesUtil.convert(
                vanishingPoint,
                ImageCoordinateFrame.Absolute,
                ImageCoordinateFrame.ImagePlane,
                image!.width,
                image!.height
            )
            );
        } else {
            errors.push('Failed to compute vanishing point');
        }
        }

        return errors.length == 0 ? result : null;
    }

    static computeCameraRotationMatrix(Fu: THREE.Vector2, Fv: THREE.Vector2, f: number, P: THREE.Vector2): THREE.Matrix4 {
        let OFu = new THREE.Vector3(Fu.x - P.x, Fu.y - P.y, -f);
        let OFv = new THREE.Vector3(Fv.x - P.x, Fv.y - P.y, -f);

        let s1 = OFu.length();
        let upRc = OFu.clone().normalize();

        let s2 = OFv.length();
        let vpRc = OFv.clone().normalize();

        let wpRc = upRc.clone().cross(vpRc);

        let M = new THREE.Matrix4();
        M.elements[0] = OFu.x / s1;
        M.elements[1] = OFv.x / s2;
        M.elements[2] = wpRc.x;

        M.elements[4] = OFu.y / s1;
        M.elements[5] = OFv.y / s2;
        M.elements[6] = wpRc.y;

        M.elements[8] = -f / s1;
        M.elements[9] = -f / s2;
        M.elements[10] = wpRc.z;

        return M;
    }

    private static computeFieldOfView(
        imageWidth: number,
        imageHeight: number,
        fRelative: number,
        vertical: boolean
    ): number {
        let aspectRatio = imageWidth / imageHeight
        let d = vertical ? 1 / aspectRatio : 1
        return 2 * Math.atan(d / fRelative)
    }

    static referenceDistanceHandlesWorldPositions(
        referenceAxis: Axis,
        imageWidth: number,
        imageHeight: number,
        cameraParameters: CameraParameters
    ): [THREE.Vector3, THREE.Vector3] {
        let handlePositionsRelative = this.referenceDistanceHandlesRelativePositions(
            referenceAxis,
            cameraParameters.vanishingPoints,
            cameraParameters.vanishingPointAxes,
            imageWidth,
            imageHeight
        )

        // handle positions in image plane coordinates
        let handlePositions = [
            CoordinatesUtil.convert(
            handlePositionsRelative[0],
            ImageCoordinateFrame.Relative,
            ImageCoordinateFrame.ImagePlane,
            imageWidth,
            imageHeight
            ),
            CoordinatesUtil.convert(
            handlePositionsRelative[1],
            ImageCoordinateFrame.Relative,
            ImageCoordinateFrame.ImagePlane,
            imageWidth,
            imageHeight
            )
        ]

        // anchor position in image plane coordinates
        let anchorPosition = CoordinatesUtil.convert(
            new THREE.Vector2(0.5080116846430406, 0.6779647921622778),
            ImageCoordinateFrame.Relative,
            ImageCoordinateFrame.ImagePlane,
            imageWidth,
            imageHeight
        )

        // Two vectors u, v spanning the reference plane, i.e the plane
        // perpendicular to the reference axis w
        let origin = new THREE.Vector3()
        let u = new THREE.Vector3()
        let v = new THREE.Vector3()
        let w = new THREE.Vector3()
        switch (referenceAxis) {
            case Axis.PositiveX:
            u.y = 1
            v.z = 1
            w.x = 1
            break
            case Axis.PositiveY:
            u.x = 1
            v.z = 1
            w.y = 1
            break
            case Axis.PositiveZ:
            u.x = 1
            v.y = 1
            w.z = 1
            break
        }

        // The reference distance anchor is defined to lie in the reference plane p.
        // Let rayAnchor be a ray from the camera through the anchor position in the image plane.
        // The intersection of p and rayAnchor give us two coordinate values u0 and v0.
        let rayAnchorStart = MathUtil.perspectiveUnproject(
            new THREE.Vector3(anchorPosition.x, anchorPosition.y, 1),
            cameraParameters.viewTransform,
            cameraParameters.principalPoint,
            cameraParameters.horizontalFieldOfView
        )
        let rayAnchorEnd = MathUtil.perspectiveUnproject(
            new THREE.Vector3(anchorPosition.x, anchorPosition.y, 2),
            cameraParameters.viewTransform,
            cameraParameters.principalPoint,
            cameraParameters.horizontalFieldOfView
        )
        let referencePlaneIntersection = MathUtil.linePlaneIntersection(
            origin, u, v,
            rayAnchorStart, rayAnchorEnd
        )

        // Compute the world positions of the reference distance handles
        let result: THREE.Vector3[] = []

        for (let handlePosition of handlePositions) {
            let handleRayStart = MathUtil.perspectiveUnproject(
            new THREE.Vector3(handlePosition.x, handlePosition.y, 1),
            cameraParameters.viewTransform,
            cameraParameters.principalPoint,
            cameraParameters.horizontalFieldOfView
            )
            let handleRayEnd = MathUtil.perspectiveUnproject(
            new THREE.Vector3(handlePosition.x, handlePosition.y, 2),
            cameraParameters.viewTransform,
            cameraParameters.principalPoint,
            cameraParameters.horizontalFieldOfView
            )

            let handlePosition3D = MathUtil.shortestLineSegmentBetweenLines(
            handleRayStart,
            handleRayEnd,
            referencePlaneIntersection,
            referencePlaneIntersection.add(w)
            )[0]

            result.push(handlePosition3D)
        }

        return [result[0], result[1]]
    }

    static vanishingPointIndexForAxis(positiveAxis: Axis, vanishingPointAxes: [Axis, Axis, Axis]): number {
        let negativeAxis = Axis.NegativeX;
        switch (positiveAxis) {
            case Axis.PositiveY:
            negativeAxis = Axis.NegativeY;
            break;
            case Axis.PositiveZ:
            negativeAxis = Axis.NegativeZ;
            break;
        }

        for (let vpIndex = 0; vpIndex < 3; vpIndex++) {
            let vpAxis = vanishingPointAxes[vpIndex];
            if (vpAxis == positiveAxis || vpAxis == negativeAxis) {
            return vpIndex;
            }
        }

        return 0;
    }

    static referenceDistanceHandlesRelativePositions(
        referenceAxis: Axis,
        vanishingPoints: [THREE.Vector2, THREE.Vector2, THREE.Vector2],
        vanishingPointAxes: [Axis, Axis, Axis],
        imageWidth: number,
        imageHeight: number
    ): [THREE.Vector2, THREE.Vector2] {
        // The position of the reference distance anchor in relative coordinates
        let anchor = new THREE.Vector2(0.5080116846430406, 0.6779647921622778);
        // The index of the vanishing point corresponding to the reference axis
        let vpIndex = this.vanishingPointIndexForAxis(referenceAxis, vanishingPointAxes)
        // The position of the vanishing point in relative coordinates
        let vp = CoordinatesUtil.convert(
            vanishingPoints[vpIndex],
            ImageCoordinateFrame.ImagePlane,
            ImageCoordinateFrame.Relative,
            imageWidth,
            imageHeight
        )
        // A unit vector pointing from the anchor to the vanishing point
        let anchorToVp = MathUtil.normalized(new THREE.Vector2( vp.x - anchor.x, vp.y - anchor.y ));

        // The handles lie on the line from the anchor to the vanishing point
        let handleOffsets = [
            0.13108430697783005,
            0.065990108556575
        ];
        return [
            new THREE.Vector2(
            anchor.x + handleOffsets[0] * anchorToVp.x,
            anchor.y + handleOffsets[0] * anchorToVp.y
            ),
            new THREE.Vector2(
             anchor.x + handleOffsets[1] * anchorToVp.x,
             anchor.y + handleOffsets[1] * anchorToVp.y
            )
        ]
    }


    private static computeTranslationVector(
        settings: CalibrationSettingsBase,
        imageWidth: number,
        imageHeight: number,
        cameraParameters: CameraParameters
    ): void {
        // The 3D origin in image plane coordinates
        let origin = CoordinatesUtil.convert(
            new THREE.Vector2(0.502536594761171, 0.96081762673040585),
            ImageCoordinateFrame.Relative,
            ImageCoordinateFrame.ImagePlane,
            imageWidth,
            imageHeight
        )

        let k = Math.tan(0.5 * cameraParameters.horizontalFieldOfView)
        let origin3D = new THREE.Vector3(
            k * (origin.x - cameraParameters.principalPoint.x),
            k * (origin.y - cameraParameters.principalPoint.y),
            -1
        ).multiplyScalar(this.DEFAULT_CAMERA_DISTANCE_SCALE)

        // Set a default translation vector
        cameraParameters.viewTransform.elements[3] = origin3D.x
        cameraParameters.viewTransform.elements[7] = origin3D.y
        cameraParameters.viewTransform.elements[11] = origin3D.z

        // if (settings.referenceDistanceAxis) {
        //     // If requested, scale the translation vector so that
        //     // the distance between the 3d handle positions equals the
        //     // specified reference distance

        //     // See what the distance between the 3d handle positions is given the current,
        //     // default, translation vector
        //     let referenceDistanceHandles3D = this.referenceDistanceHandlesWorldPositions(
        //     settings.referenceDistanceAxis,
        //     imageWidth,
        //     imageHeight,
        //     cameraParameters
        //     )
        //     let defaultHandleDistance = referenceDistanceHandles3D[0].sub(referenceDistanceHandles3D[1]).length()

        //     // Scale the translation vector by the ratio of the reference distance to the computed distance
        //     let referenceDistance = settings.referenceDistance
        //     let scale = referenceDistance / defaultHandleDistance
        //     origin3D.multiplyScalar(scale)
        // }

        cameraParameters.viewTransform.elements[3] = origin3D.x
        cameraParameters.viewTransform.elements[7] = origin3D.y
        cameraParameters.viewTransform.elements[11] = origin3D.z
    }

    private static vectorAxis(vector: THREE.Vector3): Axis {
    if (vector.x == 0 && vector.y == 0) {
        return vector.z > 0 ? Axis.PositiveZ : Axis.NegativeZ
    } else if (vector.x == 0 && vector.z == 0) {
        return vector.y > 0 ? Axis.PositiveY : Axis.NegativeY
    } else if (vector.y == 0 && vector.z == 0) {
        return vector.x > 0 ? Axis.PositiveX : Axis.NegativeX
    }

    throw new Error('Invalid axis vector')
    }

    private static axisVector(axis: Axis): THREE.Vector3 {
        debugger
        switch (axis) {
        case Axis.NegativeX:
            return new THREE.Vector3(-1, 0, 0)
        case Axis.PositiveX:
            return new THREE.Vector3(1, 0, 0)
        case Axis.NegativeY:
            return new THREE.Vector3(0, -1, 0)
        case Axis.PositiveY:
            return new THREE.Vector3(0, 1, 0)
        case Axis.NegativeZ:
            return new THREE.Vector3(0, 0, -1)
        case Axis.PositiveZ:
            return new THREE.Vector3(0, 0, 1)
        }
    }
    
    private static computeCameraParameters(
        result: SolverResult,
        settings: CalibrationSettingsBase,
        principalPoint:  THREE.Vector2,
        vp1:  THREE.Vector2,
        vp2:  THREE.Vector2,
        relativeFocalLength: number,
        imageWidth: number,
        imageHeight: number
    ): CameraParameters | null {

        let cameraParameters: CameraParameters = {
            principalPoint: new THREE.Vector2(0, 0),
            viewTransform: new THREE.Matrix4(),
            cameraTransform: new THREE.Matrix4(),
            horizontalFieldOfView: 0,
            verticalFieldOfView: 0,
            vanishingPoints: [new THREE.Vector2(0, 0 ), new THREE.Vector2(0, 0), new THREE.Vector2(0, 0)],
            vanishingPointAxes: [Axis.NegativeX, Axis.NegativeX, Axis.NegativeX],
            relativeFocalLength: 0,
            imageWidth: imageWidth,
            imageHeight: imageHeight
        }

        // Assing vanishing point axes
        let axisAssignmentMatrix = new THREE.Matrix4()
        let row1 = this.axisVector(settings.firstVanishingPointAxis)
        let row2 = this.axisVector(settings.secondVanishingPointAxis)
        let row3 = row1.clone().cross(row2)
        axisAssignmentMatrix.elements[0] = row1.x
        axisAssignmentMatrix.elements[1] = row1.y
        axisAssignmentMatrix.elements[2] = row1.z
        axisAssignmentMatrix.elements[4] = row2.x
        axisAssignmentMatrix.elements[5] = row2.y
        axisAssignmentMatrix.elements[6] = row2.z
        axisAssignmentMatrix.elements[8] = row3.x
        axisAssignmentMatrix.elements[9] = row3.y
        axisAssignmentMatrix.elements[10] = row3.z
        if (Math.abs(1 - axisAssignmentMatrix.determinant()) > 1e-7) { // TODO: eps
            result.errors.push('Invalid axis assignment')
            return null
        }
        cameraParameters.vanishingPointAxes = [
            settings.firstVanishingPointAxis,
            settings.secondVanishingPointAxis,
            this.vectorAxis(row3)
        ]

        // principal point
        cameraParameters.principalPoint = principalPoint
        // focal length
        cameraParameters.relativeFocalLength = relativeFocalLength
        // vanishing points
        cameraParameters.vanishingPoints = [
            vp1,
            vp2,
            MathUtil.thirdTriangleVertex(
            vp1,
            vp2,
            principalPoint
            )
        ]
        // horizontal field of view
        cameraParameters.horizontalFieldOfView = this.computeFieldOfView(
            imageWidth,
            imageHeight,
            relativeFocalLength,
            false
        )
        // vertical field of view
        cameraParameters.verticalFieldOfView = this.computeFieldOfView(
            imageWidth,
            imageHeight,
            relativeFocalLength,
            true
        )

        // compute camera rotation matrix
        let cameraRotationMatrix = this.computeCameraRotationMatrix(
            vp1, vp2, relativeFocalLength, principalPoint
        )
        if (Math.abs(cameraRotationMatrix.determinant() - 1) > 1e-7) { // TODO: eps
            result.errors.push('Invalid vanishing point configuration. Rotation determinant ' + cameraRotationMatrix.determinant().toFixed(5))
            return null
        }

        cameraParameters.viewTransform.multiplyMatrices(axisAssignmentMatrix, cameraRotationMatrix);

        this.computeTranslationVector(
            settings,
            imageWidth,
            imageHeight,
            cameraParameters
        )

        cameraParameters.cameraTransform = cameraParameters.viewTransform.clone().invert()

        return cameraParameters
    }
}