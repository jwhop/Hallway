import { PerspectiveLinePair } from "./perspective-line-pair";
import { Image } from "./image";
import { Solver } from "./solver/solver";
import { CalibrationSettingsBase, CalibrationSettings2VP, ReferenceDistanceUnit, Axis, PrincipalPointMode2VP } from "./solver/calibration-settings";
import * as THREE from 'three';

export class PerspectiveManager{
    private xPair : PerspectiveLinePair;
    private zPair : PerspectiveLinePair;
    private calibrationSettingsBase : CalibrationSettingsBase;
    private calibrationSettings2VP : CalibrationSettings2VP;
    private image : Image;
    private camera! : THREE.PerspectiveCamera;
    
    constructor(x : PerspectiveLinePair, z: PerspectiveLinePair, i : Image){
        this.xPair = x;
        this.zPair = z;
        this.image = i;
        this.calibrationSettings2VP = {
            principalPointMode: PrincipalPointMode2VP.Default,
            quadModeEnabled: false
        }
        this.calibrationSettingsBase = { 
            referenceDistanceUnit: ReferenceDistanceUnit.Centimeters,
            referenceDistance: 4,
            referenceDistanceAxis: null,
            cameraData: {
                presetId: null,
                customSensorWidth: 36,
                customSensorHeight: 24
            },
            firstVanishingPointAxis: Axis.PositiveX,
            secondVanishingPointAxis: Axis.NegativeZ}
    }

    assignCamera(c : THREE.PerspectiveCamera){
        this.camera = c;
    }

    compute(){
        let test = Solver.solve2VP(this.calibrationSettingsBase, this.calibrationSettings2VP, this.xPair, this.zPair, this.image);
        if ( test.errors.length == 0){
            console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
            console.log(test.cameraParameters?.vanishingPoints[0]);
            console.log(test.cameraParameters?.vanishingPoints[1]);
            console.log(test.cameraParameters?.vanishingPoints[2]);

            this.camera.matrixWorldAutoUpdate = false;

            // field of view (in vertical degrees)
            const fov = (test.cameraParameters!.verticalFieldOfView * 180) / Math.PI;

            // aspect ratio
            const aspect = test.cameraParameters!.imageWidth / test.cameraParameters!.imageHeight;

            this.camera.fov = fov;
            this.camera.aspect = aspect;

            // Position the camera
            const m = test.cameraParameters?.cameraTransform!;
            this.camera.matrixWorld.set(
                m.elements[0],m.elements[1], m.elements[2], m.elements[3],
                m.elements[4], m.elements[5], m.elements[6], m.elements[7],
                m.elements[8], m.elements[9], m.elements[10], m.elements[11],
                m.elements[12], m.elements[13], m.elements[14], m.elements[15]
            );
            const m2 = test.cameraParameters?.viewTransform!;
            this.camera.matrixWorldInverse.set(
                m2.elements[0],m2.elements[1],  m2.elements[2], m2.elements[3],
                m2.elements[4], m2.elements[5], m2.elements[6], m2.elements[7],
                m2.elements[8], m2.elements[9], m2.elements[10], m2.elements[11],
                m2.elements[12], m2.elements[13], m2.elements[14], m2.elements[15]
            );
            //this.camera.setFocalLength(test.cameraParameters?.relativeFocalLength!);

            // camera.setFocalLength(25.049);

            // fix the offset, in order the principal point to be the center of the image
            this.camera.setViewOffset(
                test.cameraParameters!.imageWidth,
                test.cameraParameters!.imageHeight,
                -(test.cameraParameters!.principalPoint.x * test.cameraParameters!.imageWidth) / 2,
                (test.cameraParameters!.principalPoint.y * test.cameraParameters!.imageHeight) / 2,
                test.cameraParameters!.imageWidth,
                test.cameraParameters!.imageHeight
            );

            this.camera.updateMatrixWorld(true);
        }
    }
}