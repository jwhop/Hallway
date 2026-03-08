import { Graphics, Container, Bounds, getCanvasBoundingBox } from 'pixi.js';
import { PerspectiveLine } from './perspective-line';

export class PerspectiveLineEndpoint{
    private Circle: Graphics;
    private isMouseDown: boolean;
    private perspectiveLineParent: PerspectiveLine;
    private color: string;
    private canvas: HTMLCanvasElement;
    private rect: DOMRect;

    constructor(line : PerspectiveLine, color: string, c: HTMLCanvasElement){
        this.color = color;
        this.canvas = c;
        this.rect = c.getBoundingClientRect();
        this.Circle = new Graphics().circle(0, 0, 12).fill(this.color);
        this.Circle.position.set(Math.random() * 200, 100);
        this.Circle.eventMode = 'static';
        this.Circle.on('pointerdown', (event) => {this.isMouseDown = true;});
        this.Circle.on('pointerup', (event) => {this.isMouseDown = false;});
        this.Circle.on('pointerupoutside', (event) => {this.isMouseDown = false;});
        this.Circle.on('globalpointermove', (event) => {
            if(this.isMouseDown){
                // this.rect = c.getBoundingClientRect();
                // if(event.global.x > 0 && event.global.x < this.rect.width){
                //     this.Circle.position.set(event.global.x, this.Circle.position.y);
                // }
                // else if(event.global.x < 0){
                //     this.Circle.position.set(0, this.Circle.position.y);
                // }
                // else{
                //     this.Circle.position.set(this.rect.width, this.Circle.position.y); 
                // }
                // if(event.global.y > 0 && event.global.y < this.rect.height){
                //     this.Circle.position.set(this.Circle.position.x, event.global.y);
                // }
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

    assignPoint(px: number, py: number){
        this.Circle.position.set(px, py);
    }

    setColor(s : string){
        const x = this.Circle.position.x;
        const y = this.Circle.position.y;
        this.Circle.clear();
        this.Circle = new Graphics().circle(0, 0, 12).fill(s);
        this.Circle.position.set(x,y);
        this.perspectiveLineParent.getContainer().addChild(this.Circle);
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
    }
}