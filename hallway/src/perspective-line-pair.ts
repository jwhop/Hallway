import { Image } from './image.ts';
import {PerspectiveLine} from './perspective-line.ts';
import { PerspectiveManager } from './perspective-manager.ts';
import { Axis } from './solver/calibration-settings.ts';
import { Solver } from './solver/solver.ts';
import * as THREE from 'three';

export class PerspectiveLinePair{

    private line1: PerspectiveLine;
    private line2: PerspectiveLine;
    private image : Image | null;
    private manager! : PerspectiveManager | null;
    private axis : Axis;
    private canvas: HTMLCanvasElement;

    constructor(color: string, image : Image | null, a : Axis, c: HTMLCanvasElement, p0: THREE.Vector2, p1: THREE.Vector2, p2:THREE.Vector2, p3:THREE.Vector2){
        this.line1 = new PerspectiveLine(color, this, c, p0, p1);
        this.line2 = new PerspectiveLine(color, this, c, p2, p3);
        this.image = image;
        this.manager = null;
        this.axis = a;
        this.canvas = c;
    }

    assignManager(m : PerspectiveManager){
        this.manager = m;
    }

    assignAxis(a : Axis){
        this.axis = a;
        console.log(this.axis.toString());
        const axisString = this.axis.toString();
        this.line1.setColor(axisString.includes("x")? 'red' : axisString.includes("y")? 'green' : 'blue');
        this.line2.setColor(axisString.includes("x")? 'red' : axisString.includes("y")? 'green' : 'blue');
    }

    assignPoints(p :  [THREE.Vector2, THREE.Vector2, THREE.Vector2, THREE.Vector2]){
        debugger
        this.line1.assignPoints(p[0], p[1]);
        this.line2.assignPoints(p[2], p[3]);
    }

    getPoints() :  [THREE.Vector2, THREE.Vector2, THREE.Vector2, THREE.Vector2]{
        const line1pts = this.line1.getPoints();
        const line2pts = this.line2.getPoints();
        return [line1pts[0], line1pts[1], line2pts[0], line2pts[1]];
    }

    getAxis() : Axis {
        return this.axis;
    }

    callSolver(){
        this.manager?.compute();
    }

    resetPoints(axesType: Axis, points: [THREE.Vector2, THREE.Vector2, THREE.Vector2, THREE.Vector2]){
        this.assignAxis(axesType);
        this.assignPoints(points);
    }

    getLine1Object(){
        return this.line1.getContainer();
    }

    getLine2Object(){
        return this.line2.getContainer();
    }

    getLine1(){
        return this.line1.getLineArray();
    }

    getLine2(){
        return this.line2.getLineArray();
    }

}