import { Image } from './image.ts';
import {PerspectiveLine} from './perspective-line.ts';
import { PerspectiveManager } from './perspective-manager.ts';
import { Solver } from './solver/solver.ts';

export class PerspectiveLinePair{

    private line1: PerspectiveLine;
    private line2: PerspectiveLine;
    private image : Image;
    private manager! : PerspectiveManager | null;

    constructor(color: string, image : Image){
        this.line1 = new PerspectiveLine(color, this);
        this.line2 = new PerspectiveLine(color, this);
        this.image = image;
        this.manager = null;
    }

    assignManager(m : PerspectiveManager){
        this.manager = m;
    }

    callSolver(){
        this.manager?.compute();
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