import { PerspectiveLinePair } from "./perspective-line-pair";
import { Image } from "./image";
import { Solver } from "./solver/solver";
import { CalibrationSettingsBase, CalibrationSettings2VP, ReferenceDistanceUnit, Axis, PrincipalPointMode2VP } from "./solver/calibration-settings";
import * as THREE from 'three';
import { SceneData } from "./main";

export class PerspectiveManager{
    private xPair : PerspectiveLinePair;
    private zPair : PerspectiveLinePair;
    private calibrationSettingsBase : CalibrationSettingsBase;
    private calibrationSettings2VP : CalibrationSettings2VP;
    private image : Image | null;
    private camera! : THREE.PerspectiveCamera;
    private currentSceneData!: SceneData | null;
    
    constructor(x : PerspectiveLinePair, z: PerspectiveLinePair, i : Image | null){
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
            firstVanishingPointAxis: Axis.NegativeX,
            secondVanishingPointAxis: Axis.PositiveZ
        }
    }

    assignSceneData(sd: SceneData | null){
        this.currentSceneData = sd;
    }
    
    assignImage(i : Image){
        this.image = i;
    }

    assignCamera(c : THREE.PerspectiveCamera){
        this.camera = c;
    }

    compute(){
        if(this.image == null) return;
        if(this.currentSceneData){
            //todo maybe need to assign this on axes change instead
            this.currentSceneData.axes1Type = this.xPair.getAxis();
            this.currentSceneData.axes2Type = this.zPair.getAxis();

            const points1 = this.xPair.getPoints();
            const points2 = this.zPair.getPoints();
            this.currentSceneData.axes1LinePoints[0] = points1[0].clone();
            this.currentSceneData.axes1LinePoints[1] = points1[1].clone();
            this.currentSceneData.axes1LinePoints[2] = points1[2].clone();
            this.currentSceneData.axes1LinePoints[3] = points1[3].clone();
            this.currentSceneData.axes2LinePoints[0] = points2[0].clone();
            this.currentSceneData.axes2LinePoints[1] = points2[1].clone();
            this.currentSceneData.axes2LinePoints[2] = points2[2].clone();
            this.currentSceneData.axes2LinePoints[3] = points2[3].clone();
        }
        this.calibrationSettingsBase.firstVanishingPointAxis = this.xPair.getAxis();
        this.calibrationSettingsBase.secondVanishingPointAxis = this.zPair.getAxis();
        let test = Solver.solve2VP(this.calibrationSettingsBase, this.calibrationSettings2VP, this.xPair, this.zPair, this.image);
        if ( test.errors.length == 0){
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
            //this.camera.setFocalLength(test.cameraParameters?.relativeFocalLength! + 24.0);

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
            this.camera.matrixWorld.decompose(this.camera.position, this.camera.quaternion, this.camera.scale);
        }
    }
}