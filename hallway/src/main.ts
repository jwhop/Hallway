import { WebGLRenderer, Application } from 'pixi.js';
import * as THREE from 'three';
import { PerspectiveLinePair } from './perspective-line-pair';
import { PerspectiveManager } from './perspective-manager';
import { Image } from './image';
import { GLTFLoader } from 'three/examples/jsm/Addons.js';
import { zipSync, strToU8 } from 'three/addons/libs/fflate.module.js';
import * as ts from "typescript";
import { TransformControls } from 'three/examples/jsm/Addons.js';
import { MeshBVH, StaticGeometryGenerator } from 'three-mesh-bvh';

class EditorObject{
  element: HTMLElement;
  editor: Editor;

  constructor(el : HTMLElement, ed: Editor){
    this.element = el;
    this.editor = ed;
  }
}

(async () => {
  const fileSelect = new EditorObject(document.getElementById("fileSelect") as HTMLInputElement, this);
  fileSelect.element.addEventListener('change', function() {
    const wrapper = document.getElementById('innerContainer') as HTMLElement;
    for (const file of (this as HTMLInputElement).files!) {
      const img = document.createElement("img");
      img.id = "myImg";
      img.src = URL.createObjectURL(file);
      img.onload = function(){
        img.height = Math.min(img.height, 800);
        wrapper.appendChild(img);
        initializeApp();
      };
    }
  })
  
  
  
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

    // Controls
    const transformControls = new TransformControls(threeCamera, threeRenderer.domElement);
    //transformControls.addEventListener( 'change', render );
    transformControls.addEventListener( 'dragging-changed', function ( event ) {

      //orbit.enabled = ! event.value;

    } );

    let currentlySelectedObject: null | THREE.Mesh = null;
    let environmentMeshes: THREE.Group = new THREE.Group();
    let collider: null | THREE.Mesh = null;

    scene.add(environmentMeshes);

    // For delta time
    const clock = new THREE.Clock();

    //for environment


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

    const exportButton = document.getElementById("export");

    exportButton!.addEventListener("click", function() {
      exportTest();
    });

    const addPlaneButton = document.getElementById("addPlane");

    addPlaneButton!.addEventListener("click", function() {
      addPlane();
    });

    const addCubeButton = document.getElementById("addCube");

    addCubeButton!.addEventListener("click", function() {
      addCube();
    });

    const addSphereButton = document.getElementById("addSphere");

    addSphereButton!.addEventListener("click", function() {
      addSphere();
    });

    const toggleWireframeButton = document.getElementById("toggleWireframe");

    toggleWireframeButton!.addEventListener("click", function() {
      toggleWireframe();
    });

    const snapToGroundButton = document.getElementById("snapToGround");

    snapToGroundButton!.addEventListener("click", function() {
      snapToGround();
    });

    const removeSelectedObjectButton = document.getElementById("removeObject");

    removeSelectedObjectButton!.addEventListener("click", function() {
      removeSelectedObject();
    });

    const readyWalkableGeometryButton = document.getElementById("readyWalkableGeometry");

    readyWalkableGeometryButton!.addEventListener("click", function() {
      readyWalkableGeometry();
    });

    function loadModel() {

      // Hide the pixi UI
      //app.stage.visible = false;

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
      controlsKeyDown(event);

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

    function addPlane(){
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1,1,25, 25), new THREE.MeshBasicMaterial({color: 0xaaaaaa, wireframe: true}))
      p.rotateX(-Math.PI / 2);
      environmentMeshes.add(p)
      transformControls.attach( p );

      const gizmo = transformControls.getHelper();
      scene.add( gizmo );
      currentlySelectedObject = p;
    }

    function addCube(){
      const p = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({color: 0xaaaaaa}))
      environmentMeshes.add(p)
      transformControls.attach( p );

      const gizmo = transformControls.getHelper();
      scene.add( gizmo );
      currentlySelectedObject = p;
    }

    function addSphere(){
      const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10 ), new THREE.MeshBasicMaterial({color: 0xaaaaaa}))
      environmentMeshes.add(p)
      transformControls.attach( p );

      const gizmo = transformControls.getHelper();
      scene.add( gizmo );
      currentlySelectedObject = p;
      
    }

    function controlsKeyDown ( event ) {

      switch ( event.key ) {

        case 'q':
          transformControls.setSpace( transformControls.space === 'local' ? 'world' : 'local' );
          break;

        case 'Shift':
          transformControls.setTranslationSnap( 1 );
          transformControls.setRotationSnap( THREE.MathUtils.degToRad( 15 ) );
          transformControls.setScaleSnap( 0.25 );
          break;

        case 'w':
          transformControls.setMode( 'translate' );
          break;

        case 'e':
          transformControls.setMode( 'rotate' );
          break;

        case 'r':
          transformControls.setMode( 'scale' );
          break;
          
        case '+':
        case '=':
          transformControls.setSize( transformControls.size + 0.1 );
          break;

        case '-':
        case '_':
          transformControls.setSize( Math.max( transformControls.size - 0.1, 0.1 ) );
          break;

        case 'x':
          transformControls.showX = ! transformControls.showX;
          break;

        case 'y':
          transformControls.showY = ! transformControls.showY;
          break;

        case 'z':
          transformControls.showZ = ! transformControls.showZ;
          break;

        case ' ':
          transformControls.enabled = ! transformControls.enabled;
          break;

        case 'Escape':
          transformControls.reset();
          break;

      }

    }

    function exportEditor(){
      return {
        metadata: {},
        project: {
          renderer: "WebGLRenderer",
          shadows: true,
          shadowType: 1,
          toneMapping: 7,
          toneMappingExposure: 1
        },
        camera: threeCamera.toJSON(),
        scene: scene,
      };
    }

    function exportTest() {

      let toZip : {"app.json": Uint8Array<ArrayBufferLike>, 'index.html': Uint8Array<ArrayBufferLike>};
      toZip = {"app.json": new Uint8Array(), "index.html": new Uint8Array()};
      
      let output = exportEditor();
      
      output.metadata.type = 'App';

      output = JSON.stringify( output, null, '\t' );
      output = output.replace( /[\n\t]+([\d\.e\-\[\]]+)/g, '$1' );

      toZip[ 'app.json' ] = strToU8( output );

      //

      const title = "Tiptoe";

      const manager = new THREE.LoadingManager( function () {

        const zipped = zipSync( toZip, { level: 9 } );

        const blob = new Blob( [ zipped.buffer as any], { type: 'application/zip' } );

        save( blob, title  + '.zip' );

      } );

      const loader = new THREE.FileLoader( manager );
      debugger
      loader.load( '/export/index.html', function ( content ) {

        content = (content as string).replace( '<!-- title -->', title );

        //

        const IMPORTMAP = {
          WebGLRenderer: {
            imports: {
              'three': './js/three.module.js'
            }
          },
          WebGPURenderer: {
            imports: {
              'three': './js/three.webgpu.js',
              'three/webgpu': './js/three.webgpu.js'
            }
          }
        };
        const importmap = JSON.stringify( IMPORTMAP[ "WebGLRenderer" ], null, '\t' );

        content = (content as string).replace( '<!-- importmap -->', indent( '\n' + indent( importmap, 1 ) + '\n', 2 ) );

        toZip[ 'index.html' ] = strToU8( content );

		  });

      loader.load( '/export/js/app.ts', function ( content ) {

        const result = ts.transpileModule((content as string), {
          compilerOptions: {
              module: ts.ModuleKind.Preserve,
              target: ts.ScriptTarget.ES2022
          }
        });
        toZip[ 'js/app.js' ] = strToU8( result.outputText );

      } );
      loader.load( '/export/js/three.core.js', function ( content ) {

        toZip[ 'js/three.core.js' ] = strToU8( content );

      } );

      loader.load( '/export/js/three.module.js', function ( content ) {

        toZip[ 'js/three.module.js' ] = strToU8( content );

      } );

      

      function indent( text: string, count: number, space = '\t' ) {

        return text
          .split( '\n' )
          .map( line => space.repeat( count ) + line )
          .join( '\n' );

      }

      const link = document.createElement( 'a' );

      function save( blob : Blob, filename: string ) {

        if ( link.href ) {

          URL.revokeObjectURL( link.href );

        }

        link.href = URL.createObjectURL( blob );
        link.download = filename || 'data.json';
        link.dispatchEvent( new MouseEvent( 'click' ) );

      }
    };

    function toggleWireframe(){
      if(currentlySelectedObject != null){
        (currentlySelectedObject as THREE.Mesh).material.wireframe = !(currentlySelectedObject as THREE.Mesh).material.wireframe;
      }
    }
    
    function snapToGround(){
      if(currentlySelectedObject != null){
        const bbox = new THREE.Box3().setFromObject(currentlySelectedObject as THREE.Mesh);
        const size = new THREE.Vector3;
        currentlySelectedObject.position.y = 0 + bbox.getSize(size).y /2;
      }
    }

    function removeSelectedObject(){
      if(currentlySelectedObject != null){
        scene.remove(currentlySelectedObject);
        currentlySelectedObject = null;
      }
    }

    function readyWalkableGeometry(){
      if(collider != null){
        scene.remove(collider);
      }
      const staticGenerator = new StaticGeometryGenerator( environmentMeshes );
      staticGenerator.attributes = [ 'position' ];

      const mergedGeometry = staticGenerator.generate();
      mergedGeometry.boundsTree = new MeshBVH( mergedGeometry );

      collider = new THREE.Mesh( mergedGeometry );
      collider.material.wireframe = true;
      collider.material.opacity = 0.5;
      collider.material.transparent = true;

      scene.add(collider);
    }

  }
})()

dragElement(document.getElementById("outerContainer"));
dragElement(document.getElementById("buttonMenu"));
dragElement(document.getElementById("objectPropertiesMenu"));

function dragElement(elmnt) {
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  if (document.getElementById(elmnt.id + "header")) {
    // if present, the header is where you move the DIV from:
    document.getElementById(elmnt.id + "header")!.onmousedown = dragMouseDown;
  } else {
    // otherwise, move the DIV from anywhere inside the DIV:
    //elmnt.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
    elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    // stop moving when mouse button is released:
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

