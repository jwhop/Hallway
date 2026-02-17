// dependencies: { "three": "latest", "pixi.js": "latest" }
// description: A basic integration of PixiJS and Three.js sharing the same WebGL context
// Import required classes from PixiJS and Three.js
import { WebGLRenderer, Application } from 'pixi.js';
import * as THREE from 'three';
import { PerspectiveLinePair } from './perspective-line-pair';
import { PerspectiveManager } from './perspective-manager';
import { Image } from './image';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

// Self-executing async function to set up the demo
(async () => {
  const fileSelect = document.getElementById("fileSelect") as HTMLInputElement;
  
  fileSelect.addEventListener('change', function() {
    const wrapper = document.getElementById('innerContainer') as HTMLElement;
    for (const file of this.files!) {
      const img = document.createElement("img");
      img.id = "myImg";
      img.src = URL.createObjectURL(file);
      img.onload = function(){
        wrapper.appendChild(img);
        initializeApp();
      }
    }
  });

  async function initializeApp(){
    
    const img = document.getElementById('myImg');
    const outerWrapper = document.getElementById('outerContainer');
    const innerWrapper = document.getElementById('innerContainer');
    
    
    // Initialize window dimensions
    let WIDTH = img?.offsetWidth as number;
    let HEIGHT = img?.offsetHeight as number;
    outerWrapper!.style.width = (img?.offsetLeft as number).toString() + "px";
    outerWrapper!.style.height = (img?.offsetTop as number).toString() + "px";
    
    
    // === PIXI.JS SETUP ===
    // Create a new application
    const app = new Application();

    // Initialize with options
    await app.init({
        width: WIDTH,                 // Canvas width
        height: HEIGHT,               // Canvas height
        backgroundColor: 0xffffff,    // Background color
        backgroundAlpha: 0,           // Background alpha
        antialias: true,              // Enable antialiasing
        resolution: 1,                // Resolution / device pixel ratio
        preference: 'webgl',          // or 'webgpu' // Renderer preference
        clearBeforeRender: false      // so that we can render three.js too
    });


    // Get width and height of image, need to pass to solver
    const imgData = new Image(WIDTH, HEIGHT);

    // Create z and x perspective lines
    const perspectiveLinePairX = new PerspectiveLinePair('red', imgData);
    const perspectiveLinePairZ = new PerspectiveLinePair('blue', imgData);

    // Create perspective manager
    const perspectiveManager = new PerspectiveManager(perspectiveLinePairX, perspectiveLinePairZ, imgData);
    perspectiveLinePairX.assignManager(perspectiveManager);
    perspectiveLinePairZ.assignManager(perspectiveManager);

    // Add actual shape containers to scene
    app.stage.addChild(perspectiveLinePairX.getLine1Object());
    app.stage.addChild(perspectiveLinePairX.getLine2Object());

    app.stage.addChild(perspectiveLinePairZ.getLine1Object());
    app.stage.addChild(perspectiveLinePairZ.getLine2Object());

    // Add the canvas to your webpage
    innerWrapper?.appendChild(app.canvas);

    app.canvas.classList.add("coveringCanvas");
    app.canvas.style.left = (img?.offsetLeft as number).toString() + "px";
    app.canvas.style.top = (img?.offsetTop as number).toString() + "px";
    
    
    
    // =========================================================================================
    
    
    // === THREE.JS SETUP ===
    
    // Create Three.js WebGL renderer with antialiasing and stencil buffer
    const threeRenderer = new THREE.WebGLRenderer({
      antialias: true,                            // smooth lines
      preserveDrawingBuffer: true,                // idk tbh
      stencil: true,                              // if we want to use stencil buffer
      alpha: true,                                // we want transparency 
      canvas: app.canvas,                         // need same canvas as pixi
      context: (app.renderer as WebGLRenderer).gl // need same context as pixi
    });
    
    
    // Configure Three.js renderer size and background color
    threeRenderer.setSize(WIDTH!, HEIGHT!);

    // Create Three.js scene
    const scene = new THREE.Scene();

    // Set up perspective camera -- this will be all overridden eventually
    const threeCamera = new THREE.PerspectiveCamera(70, WIDTH! / HEIGHT!);
    scene.add(threeCamera);
    perspectiveManager.assignCamera(threeCamera);
    
    // To see our axes in the space
    const axesHelper = new THREE.AxesHelper( 50 );
    scene.add( axesHelper );

    // Basic light - are we even using this?
    scene.add(new THREE.AmbientLight(0xfffff, 1));

    // For delta time
    const clock = new THREE.Clock();

    // Animation loop
    function loop() {
      const delta = clock.getDelta();

      updateCharacter( delta );

      threeRenderer.resetState();
      threeRenderer.render(scene, threeCamera);
      
      // Render PixiJS scene
      app.renderer.resetState();
      app.renderer.render({ container: app.stage });
      
      // Continue animation loop
      requestAnimationFrame(loop);
    }

    // Start animation loop
    requestAnimationFrame(loop);

    let model, mixer: THREE.AnimationMixer;
    let actions: {Idle: THREE.AnimationAction, Walk: THREE.AnimationAction, Run: THREE.AnimationAction};
    
    const controls = {
      key: [ 0, 0 ],
      ease: new THREE.Vector3(),
      position: new THREE.Vector3(),
      up: new THREE.Vector3( 0, 1, 0 ),
      rotate: new THREE.Quaternion(),
      current: 'Idle',
      fadeDuration: 0.5,
      runVelocity: 5,
      walkVelocity: 1.8,
      rotateSpeed: 0.05,
      floorDecale: 0,
    };

    const group = new THREE.Group();
    scene.add( group );

    const followGroup = new THREE.Group();
    scene.add( followGroup );

    document.addEventListener( 'keydown', onKeyDown );
    document.addEventListener( 'keyup', onKeyUp );

    const button = document.getElementById("addGuy");

    button!.addEventListener("click", function() {
      loadModel();
    });

    function loadModel() {

      // Hide the pixi UI
      app.stage.visible = false;

      const loader = new GLTFLoader();
      const downloadUrl = new URL('/Soldier.glb', import.meta.url);

      loader.load( downloadUrl.toString(), function ( gltf ) {

        model = gltf.scene;
        //model.scale.set(1.5,1.5,1.5)
        group.add( model );
        model.rotation.y = Math.PI;
        group.rotation.y = Math.PI;

        model.traverse( function ( object: THREE.Object3D) {

          if ((object as THREE.Mesh).isMesh ) {

            if ( object.name == 'vanguard_Mesh' ) {

              object.castShadow = true;
              object.receiveShadow = true;
              //object.material.envMapIntensity = 0.5;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).metalness = 1.0;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).roughness = 0.2;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set( 1, 1, 1 );
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).metalnessMap = 
                ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).map;

            } else {

              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).metalness = 1;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).roughness = 0;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).transparent = true;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.8;
              ((object as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set( 1, 1, 1 );

            }

          }

        } );

        const animations = gltf.animations;

        mixer = new THREE.AnimationMixer( model );

        actions = {
          Idle: mixer.clipAction(animations[0]),
          Walk: mixer.clipAction(animations[3]),
          Run: mixer.clipAction(animations[1])
        }

        for ( const m in actions ) {

          (actions[ m as "Idle" | "Walk" | "Run" ]).enabled = true;
          actions[ m as "Idle" | "Walk" | "Run" ].setEffectiveTimeScale( 1 );
          if ( m !== 'Idle' ) actions[ m as "Idle" | "Walk" | "Run" ].setEffectiveWeight( 0 );

        }

        (actions.Idle as THREE.AnimationAction).play();

      } );
      console.log(scene.toJSON());
      console.log(threeCamera.toJSON());
    }

    function updateCharacter( delta : number ) {

      const fade = controls.fadeDuration;
      const key = controls.key;
      const up = controls.up;
      const ease = controls.ease;
      const rotate = controls.rotate;
      const position = controls.position;

      const active = key[ 0 ] === 0 && key[ 1 ] === 0 ? false : true;
      const play = active ? ( key[ 2 ] ? 'Run' : 'Walk' ) : 'Idle';

      // change animation

      if ( controls.current != play ) {

        const current = actions[ play ];
        const old = actions[ controls.current as "Idle" | "Walk" | "Run"];
        controls.current = play;

        setWeight( current, 1.0 );
        old.fadeOut( fade );
        current.reset().fadeIn( fade ).play();
      }

      // move object

      if ( controls.current !== 'Idle' ) {

        // run/walk velocity
        const velocity = controls.current == 'Run' ? controls.runVelocity : controls.walkVelocity;

        // direction with key
        ease.set( key[ 1 ], 0, key[ 0 ] ).multiplyScalar( velocity * delta );

        // calculate camera direction
        const angle = unwrapRad( Math.atan2( ease.x, ease.z ) + 0 );
        rotate.setFromAxisAngle( up, angle );

        // apply camera angle on ease
        controls.ease.applyAxisAngle( up, 0 );

        position.add( ease );

        group.position.copy( position );
        group.quaternion.rotateTowards( rotate, controls.rotateSpeed );

        followGroup.position.copy( position );
      }

      if ( mixer ) mixer.update( delta );

    }

    function unwrapRad( r : number ) {

      return Math.atan2( Math.sin( r ), Math.cos( r ) );

    }

    function setWeight( action:THREE.AnimationAction, weight: number ) {

      action.enabled = true;
      action.setEffectiveTimeScale( 1 );
      action.setEffectiveWeight( weight );

    }

    function onKeyDown( event: KeyboardEvent ) {

      const key = controls.key;
      switch ( event.code ) {

        case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = - 1; break;
        case 'ArrowDown': case 'KeyS': key[ 0 ] = 1; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = - 1; break;
        case 'ArrowRight': case 'KeyD': key[ 1 ] = 1; break;
        case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 1; break;

      }

    }

    function onKeyUp( event: KeyboardEvent ) {

      const key = controls.key;
      switch ( event.code ) {

        case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = key[ 0 ] < 0 ? 0 : key[ 0 ]; break;
        case 'ArrowDown': case 'KeyS': key[ 0 ] = key[ 0 ] > 0 ? 0 : key[ 0 ]; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = key[ 1 ] < 0 ? 0 : key[ 1 ]; break;
        case 'ArrowRight': case 'KeyD': key[ 1 ] = key[ 1 ] > 0 ? 0 : key[ 1 ]; break;
        case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 0; break;

      }

    }
  }
  
})();
