import { Graphics, Container, Bounds, getCanvasBoundingBox } from 'pixi.js';
import { PerspectiveManager } from './perspective-manager.ts';
import * as THREE from 'three';

export class PerspectiveOriginPoint{
    private Circle: Graphics;
    private isMouseDown: boolean;
    private canvas: HTMLCanvasElement;
    private rect!: DOMRect;
    private manager!: PerspectiveManager;

    constructor(c: HTMLCanvasElement, p0: THREE.Vector2){
        this.canvas = c;
        this.Circle = new Graphics().circle(0, 0, 12).fill('grey');
        this.Circle.position.set(p0.x, p0.y);
        this.Circle.eventMode = 'static';
        this.Circle.on('pointerdown', (event) => {this.isMouseDown = true; this.rect = c.getBoundingClientRect();});
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
                this.manager.compute();
                //this.perspectiveLineParent.redrawLine();
            }
        });
        this.isMouseDown = false;
    }

    assignManager(m: PerspectiveManager){
        this.manager = m;
    }

    getOrigin(){
        const origin = new THREE.Vector2();
        // if(!this.rect) return null;
        // origin.set(((this.Circle.position.x) / this.rect.width) * 2 - 1,
        //  -((((this.Circle.position.y) / this.rect.height))* 2 - 1));
        origin.set(this.Circle.position.x, this.Circle.position.y);
        return origin;
    }

    getCircle(){
        return this.Circle;
    }

    assignPoint(px: number, py: number){
        this.Circle.position.set(px, py);
    }
}