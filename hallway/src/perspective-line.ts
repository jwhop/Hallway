import { Graphics, Container, GraphicsContext} from 'pixi.js';
import { PerspectiveLineEndpoint } from './perspective-line-endpoint';
import * as THREE from 'three';
import { Solver } from './solver/solver';
import { PerspectiveLinePair } from './perspective-line-pair';

export class PerspectiveLine{
    
    private perspectiveLineGroup: Container;
    
    private pointACircle: PerspectiveLineEndpoint;
    private pointACircleGraphic: Graphics;
    private pointACirclePosition: THREE.Vector2;
    
    private pointBCircle: PerspectiveLineEndpoint;
    private pointBCircleGraphic: Graphics;
    private pointBCirclePosition: THREE.Vector2;
    
    private line: Graphics;
    private lineArray: THREE.Vector2[];
    private color: string;
    private parent: PerspectiveLinePair;
    private canvas: HTMLCanvasElement;

    constructor(color : string, pairParent: PerspectiveLinePair, c: HTMLCanvasElement, p0 : THREE.Vector2, p1 : THREE.Vector2){
        this.perspectiveLineGroup = new Container();
        this.color = color;

        this.pointACircle = new PerspectiveLineEndpoint(this, this.color, c, p0);
        this.pointACircleGraphic = this.pointACircle.getCircle();
        this.pointACirclePosition = new THREE.Vector2(0,0);

        this.pointBCircle = new PerspectiveLineEndpoint(this, this.color, c, p1);
        this.pointBCircleGraphic = this.pointBCircle.getCircle();
        this.pointBCirclePosition = new THREE.Vector2(0,0);
        
        
        this.perspectiveLineGroup.addChild(this.pointACircle.getCircle());
        this.perspectiveLineGroup.addChild(this.pointBCircle.getCircle());
        this.line = new Graphics();
        //console.log(this.pointACircle.getCircle().position.x)
        this.line.moveTo(this.pointACircle.getCircle().position.x, this.pointACircle.getCircle().position.y).lineTo(this.pointBCircle.getCircle().position.x, this.pointBCircle.getCircle().position.y).stroke({width:6, color:color});;
        this.perspectiveLineGroup.addChild(this.line);
        this.lineArray = [this.pointACirclePosition, this.pointBCirclePosition];
        this.parent = pairParent;
        this.canvas = c;
    }

    assignPoints(p0: THREE.Vector2, p1: THREE.Vector2){
        this.pointACirclePosition.x = p0.x;
        this.pointACirclePosition.y = p0.y;

        this.pointBCirclePosition.x = p1.x;
        this.pointBCirclePosition.y = p1.y;

        this.pointACircle.assignPoint(p0.x, p0.y);
        this.pointBCircle.assignPoint(p1.x, p1.y);
        this.redrawLine();
    }

    getPoints() :  [THREE.Vector2, THREE.Vector2]{
        return [this.pointACirclePosition, this.pointBCirclePosition];
    }

    redrawLine(){
        this.line.clear(); 
        this.line.moveTo(this.pointACircle.getCircle().position.x, this.pointACircle.getCircle().position.y).lineTo(this.pointBCircle.getCircle().position.x, this.pointBCircle.getCircle().position.y).stroke({width:6, color:this.color});;
        
        //update the threejs vectors which will be passed to the solver
        this.pointACirclePosition.x = this.pointACircleGraphic.position.x;
        this.pointACirclePosition.y = this.pointACircleGraphic.position.y;

        this.pointBCirclePosition.x = this.pointBCircleGraphic.position.x;
        this.pointBCirclePosition.y = this.pointBCircleGraphic.position.y;

        //call solver
        this.parent.callSolver();
    }

    setColor(s : string){
        this.color = s;
        this.redrawLine();
        this.pointACircle.setColor(s);
        this.pointBCircle.setColor(s);
        this.pointACircleGraphic = this.pointACircle.getCircle();
        this.pointBCircleGraphic = this.pointBCircle.getCircle();
    }

    getContainer(){
        return this.perspectiveLineGroup;
    }

    getLineArray(){
        return this.lineArray;
    }

}