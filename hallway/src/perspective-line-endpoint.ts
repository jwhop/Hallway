import { Graphics, Container } from 'pixi.js';
import { PerspectiveLine } from './perspective-line';

export class PerspectiveLineEndpoint{
    private Circle: Graphics;
    private isMouseDown: boolean;
    private perspectiveLineParent: PerspectiveLine;

    constructor(line : PerspectiveLine, color: string){
        this.Circle = new Graphics().circle(0, 0, 6).fill(color);
        this.Circle.position.set(Math.random() * 200, 100);
        this.Circle.eventMode = 'static';
        this.Circle.on('pointerdown', (event) => {this.isMouseDown = true;});
        this.Circle.on('pointerup', (event) => {this.isMouseDown = false;});
        this.Circle.on('pointerupoutside', (event) => {this.isMouseDown = false;});
        this.Circle.on('globalpointermove', (event) => {
            if(this.isMouseDown){
                this.Circle.position.set(event.global.x, event.global.y);
                this.perspectiveLineParent.redrawLine();
            }
        });
        this.isMouseDown = false;
        this.perspectiveLineParent = line;
        //console.log(this.Circle.position);
    }

    getCircle(){
        return this.Circle;
    }
}