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

    constructor(color : string, pairParent: PerspectiveLinePair){
        this.perspectiveLineGroup = new Container();
        this.color = color;

        this.pointACircle = new PerspectiveLineEndpoint(this, this.color);
        this.pointACircleGraphic = this.pointACircle.getCircle();
        this.pointACirclePosition = new THREE.Vector2(0,0);

        this.pointBCircle = new PerspectiveLineEndpoint(this, this.color);
        this.pointBCircleGraphic = this.pointBCircle.getCircle();
        this.pointBCirclePosition = new THREE.Vector2(0,0);
        
        
        this.perspectiveLineGroup.addChild(this.pointACircle.getCircle());
        this.perspectiveLineGroup.addChild(this.pointBCircle.getCircle());
        this.line = new Graphics();
        //console.log(this.pointACircle.getCircle().position.x)
        this.line.moveTo(this.pointACircle.getCircle().position.x, this.pointACircle.getCircle().position.y).lineTo(this.pointBCircle.getCircle().position.x, this.pointBCircle.getCircle().position.y).stroke({width:30, color:color});;
        this.perspectiveLineGroup.addChild(this.line);
        this.lineArray = [this.pointACirclePosition, this.pointBCirclePosition];
        this.parent = pairParent;
    }

    redrawLine(){
        this.line.clear(); 
        this.line.moveTo(this.pointACircleGraphic.position.x, this.pointACircleGraphic.position.y).lineTo(this.pointBCircle.getCircle().position.x, this.pointBCircle.getCircle().position.y).stroke({width:30, color:this.color});;
        
        //update the threejs vectors which will be passed to the solver
        this.pointACirclePosition.x = this.pointACircleGraphic.position.x;
        this.pointACirclePosition.y = this.pointACircleGraphic.position.y;

        this.pointBCirclePosition.x = this.pointBCircleGraphic.position.x;
        this.pointBCirclePosition.y = this.pointBCircleGraphic.position.y;

        //call solver
        this.parent.callSolver();
    }

    getContainer(){
        return this.perspectiveLineGroup;
    }

    getLineArray(){
        return this.lineArray;
    }

}