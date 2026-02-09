// dependencies: { "three": "latest", "pixi.js": "latest" }
// description: A basic integration of PixiJS and Three.js sharing the same WebGL context
// Import required classes from PixiJS and Three.js
import { Container, Graphics, Text, WebGLRenderer, Application, Point } from 'pixi.js';
import * as THREE from 'three';
import { PerspectiveLinePair } from './perspective-line-pair';
import { Solver } from './solver/solver';
import { PerspectiveManager } from './perspective-manager';
import { Image } from './image';
import { DragControls } from 'three/addons/controls/DragControls.js';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';

// Self-executing async function to set up the demo
(async () => {
  let w, h;
  const fileSelect = document.getElementById("fileSelect") as HTMLInputElement;
  
  fileSelect.addEventListener('change', function(e) {
    debugger
    const wrapper = document.getElementById('innerContainer') as HTMLElement;
    for (const file of this.files!) {
      debugger
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
    debugger
    // Initialize window dimensions
    let WIDTH = img?.offsetWidth;
    let HEIGHT = img?.offsetHeight;
    outerWrapper.style.width = (img?.offsetLeft as number).toString() + "px";
    outerWrapper.style.height = (img?.offsetTop as number).toString() + "px";
    // === PIXI.JS SETUP ===
    // Create a new application
    const app = new Application();

    // Initialize with options
    await app.init({
        width: WIDTH,           // Canvas width
        height: HEIGHT,          // Canvas height
        backgroundColor: 0xffffff, // Background color
        backgroundAlpha: 0,
        antialias: true,     // Enable antialiasing
        resolution: 1,       // Resolution / device pixel ratio
        preference: 'webgl', // or 'webgpu' // Renderer preference
        clearBeforeRender: false
    });

    const imgData = new Image(img?.offsetWidth as number, img?.offsetHeight as number);

    // Create a yellow rounded rectangle UI element
    const perspectiveLinePairX = new PerspectiveLinePair('red', imgData);
    const perspectiveLinePairZ = new PerspectiveLinePair('blue', imgData);

    const perspectiveManager = new PerspectiveManager(perspectiveLinePairX, perspectiveLinePairZ, imgData);
    perspectiveLinePairX.assignManager(perspectiveManager);
    perspectiveLinePairZ.assignManager(perspectiveManager);
    // Opt-in to interactivity

    // Add text overlay
    app.stage.addChild(perspectiveLinePairX.getLine1Object());
    app.stage.addChild(perspectiveLinePairX.getLine2Object());

    app.stage.addChild(perspectiveLinePairZ.getLine1Object());
    app.stage.addChild(perspectiveLinePairZ.getLine2Object());

    // Add the canvas to your webpage
    //document.body.appendChild(app.canvas);
    innerWrapper?.appendChild(app.canvas);

    app.canvas.classList.add("coveringCanvas");
    app.canvas.style.left = (img?.offsetLeft as number).toString() + "px";
    app.canvas.style.top = (img?.offsetTop as number).toString() + "px";
    // === THREE.JS SETUP ===
    // Create Three.js WebGL renderer with antialiasing and stencil buffer
    const threeRenderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, stencil: true, alpha: true, canvas: app.canvas, context: (app.renderer as WebGLRenderer).gl});
    // Configure Three.js renderer size and background color
    threeRenderer.setSize(WIDTH, HEIGHT);
    //threeRenderer.setClearColor(0xffffff, 0.0); // Light gray background

    // Create Three.js scene
    const scene = new THREE.Scene();

    // Set up perspective camera with 70° FOV
    const threeCamera = new THREE.PerspectiveCamera(70, WIDTH / HEIGHT);

    threeCamera.position.z = 50; // Move camera back to see the scene
    scene.add(threeCamera);
    perspectiveManager.assignCamera(threeCamera);
    // Create a simple cube mesh
    //const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    //const cube = new THREE.Mesh(boxGeometry, basicMaterial);
    const axesHelper = new THREE.AxesHelper( 50 );


    scene.add( axesHelper );
    scene.add(new THREE.AmbientLight(0xfffff, 1));

    var Raycaster = new THREE.Raycaster();
    var Mouse = new THREE.Vector2();
    // document.addEventListener( 'mousedown', function( event ) {
    //   //console.log("mouse down");
    //   Mouse.set((event.clientX / threeRenderer.domElement.clientWidth) * 2 - 1, -(event.clientY / threeRenderer.domElement.clientHeight) * 2 + 1)

      
    //   Raycaster.setFromCamera( Mouse, threeCamera );

    //   var intersects = Raycaster.intersectObjects( scene.children );
    //   //console.log(intersects);

    // });
    let lastTime = Date.now();

    // Animation loop
    function loop() {
      let now = Date.now();
      // Rotate cube continuously
      // Animate UI layer position using sine wave
      // Render Three.js scene
      const delta = clock.getDelta();

      updateCharacter( delta );

      threeRenderer.resetState();
      threeRenderer.render(scene, threeCamera);
      // Render PixiJS scene
      app.renderer.resetState();
      app.renderer.render({ container: app.stage });
      
      // Continue animation loop
      requestAnimationFrame(loop);
      lastTime = now;
    }

    // Start animation loop
    requestAnimationFrame(loop);

    // Handle window resizing
    // window.addEventListener('resize', () => {
    //   WIDTH = window.innerWidth;
    //   HEIGHT = window.innerHeight;
    //   // Update PixiJS renderer
    //   app.renderer.resize(WIDTH, HEIGHT);
      
    //   // Update Three.js renderer
    //   threeRenderer.setSize(WIDTH, HEIGHT);
    //   // Update Three.js camera aspect ratio so it renders correctly
    //   threeCamera.aspect = WIDTH / HEIGHT;
    //   threeCamera.updateProjectionMatrix();
    // });

    let model, skeleton, mixer, clock;
    clock = new THREE.Clock();
    let actions;
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

    let group = new THREE.Group();
    scene.add( group );

    let followGroup = new THREE.Group();
    scene.add( followGroup );

    document.addEventListener( 'keydown', onKeyDown );
    document.addEventListener( 'keyup', onKeyUp );

    const button = document.getElementById("addGuy");

    button!.addEventListener("click", function() {
      loadModel();
    });
    function loadModel() {
      app.stage.visible = false;
      const grid = new THREE.GridHelper(35,35);
      const basicMaterial = new THREE.MeshStandardMaterial({ color: 0x0095dd, side: THREE.DoubleSide }); // Blue color
      //plane.rotateX(Math.PI/2)
      //scene.add( grid );

      const loader = new GLTFLoader();
      const downloadUrl = new URL('/Soldier.glb', import.meta.url);

      loader.load( downloadUrl.toString(), function ( gltf ) {

        model = gltf.scene;
        //model.scale.set(1.5,1.5,1.5)
        group.add( model );
        model.rotation.y = Math.PI;
        group.rotation.y = Math.PI;

        model.traverse( function ( object ) {

          if ( object.isMesh ) {

            if ( object.name == 'vanguard_Mesh' ) {

              object.castShadow = true;
              object.receiveShadow = true;
              //object.material.envMapIntensity = 0.5;
              object.material.metalness = 1.0;
              object.material.roughness = 0.2;
              object.material.color.set( 1, 1, 1 );
              object.material.metalnessMap = object.material.map;

            } else {

              object.material.metalness = 1;
              object.material.roughness = 0;
              object.material.transparent = true;
              object.material.opacity = 0.8;
              object.material.color.set( 1, 1, 1 );

            }

          }

        } );

        //

        skeleton = new THREE.SkeletonHelper( model );
        skeleton.setColors( new THREE.Color( 0xe000ff ), new THREE.Color( 0x00e0ff ) );
        skeleton.visible = false;
        scene.add( skeleton );

        const animations = gltf.animations;

        mixer = new THREE.AnimationMixer( model );

        actions = {
          Idle: mixer.clipAction( animations[ 0 ] ),
          Walk: mixer.clipAction( animations[ 3 ] ),
          Run: mixer.clipAction( animations[ 1 ] )
        };

        for ( const m in actions ) {

          actions[ m ].enabled = true;
          actions[ m ].setEffectiveTimeScale( 1 );
          if ( m !== 'Idle' ) actions[ m ].setEffectiveWeight( 0 );

        }

        actions.Idle.play();

      } );

    }

    function updateCharacter( delta ) {

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
        const old = actions[ controls.current ];
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

    function unwrapRad( r ) {

				return Math.atan2( Math.sin( r ), Math.cos( r ) );

			}

			function createPanel() {

				const panel = new GUI( { width: 310 } );

				panel.add( settings, 'show_skeleton' ).onChange( ( b ) => {

					skeleton.visible = b;

				} );

				panel.add( settings, 'fixe_transition' );

			}

			function setWeight( action, weight ) {

				action.enabled = true;
				action.setEffectiveTimeScale( 1 );
				action.setEffectiveWeight( weight );

			}

			function onKeyDown( event ) {

				const key = controls.key;
				switch ( event.code ) {

					case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = - 1; break;
					case 'ArrowDown': case 'KeyS': key[ 0 ] = 1; break;
					case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = - 1; break;
					case 'ArrowRight': case 'KeyD': key[ 1 ] = 1; break;
					case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 1; break;

	      }

			}

			function onKeyUp( event ) {

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
