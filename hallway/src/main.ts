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
import { RoundedBoxGeometry } from 'three/examples/jsm/Addons.js';
import { Axis } from './solver/calibration-settings';
import { PerspectiveOriginPoint } from './origin-point';

export class SceneData{
  scene: THREE.Scene;
  camera: THREE.Camera;
  name!: string;
  introText!: string;
  imgUrl: string;
  id: string;
  imgData: Image;
  cameraString!: string;
  sceneString!: string;
  
  axes1Type: Axis;
  axes1LinePoints: [THREE.Vector2, THREE.Vector2, THREE.Vector2, THREE.Vector2];
  axes2Type: Axis;
  axes2LinePoints: [THREE.Vector2, THREE.Vector2, THREE.Vector2, THREE.Vector2];
  playerRunSpeed: number;
  onSceneEnterText: string;
  playerScale: THREE.Vector3;

  constructor(s: THREE.Scene, c: THREE.Camera, imgSrc: string, id: string, imgData : Image){
    this.scene = s;
    this.camera = c;
    this.imgUrl = imgSrc;
    this.id = id;
    this.imgData = imgData;
    this.axes1Type = Axis.PositiveX;
    this.axes1LinePoints = [new THREE.Vector2(200,200), new THREE.Vector2(300,300), new THREE.Vector2(300,200), new THREE.Vector2(400,300)];
    this.axes2Type = Axis.PositiveZ;
    this.axes2LinePoints = [new THREE.Vector2(200,400), new THREE.Vector2(300,500), new THREE.Vector2(300,400), new THREE.Vector2(400,500)];
  
    this.playerRunSpeed = 2;
    this.onSceneEnterText = "";
    this.playerScale = new THREE.Vector3(1,1,1);
  }

  setName(s : string){
    this.name = s;
  }
}

class GameData{
  scenes: SceneData[];

  constructor(){
    this.scenes = [];
  }

  addScene(s : SceneData){
    this.scenes.push(s);
  }
}

async function convertStringToGameData(s : string) : Promise<GameData>{
  debugger
  console.log("reached");
  const g = JSON.parse(s) as GameData;
  if(g == null || g.scenes == null) return new GameData();
  const loader = new THREE.ObjectLoader();
  //for each scene, fill stuff in
  for(let s in g.scenes){
    try{
      const newScene = document.createElement('option');
      const scene = g.scenes[s] as SceneData;
      console.log(g);
      scene.camera = loader.parse(scene.camera);
      if(scene.scene.geometries.find(g=>g.type == "RoundedBoxGeometry")){
        //remove geometry
        const g = scene.scene.geometries.find(g=>g.type == "RoundedBoxGeometry");
        scene.scene.geometries.splice(scene.scene.geometries.indexOf(g), 1);
        const o = scene.scene.object.children.find( c => c.name == 'player');
        scene.scene.object.children.splice(scene.scene.object.children.indexOf(o), 1);
        console.log("found the bad one");
      }
      scene.scene = loader.parse(scene.scene);

      // Create new scene name
      newScene.innerHTML = scene.name;
      document.getElementById("sceneSelection")?.appendChild(newScene);
      newScene.value = scene.id;
    }
    catch(err){
      console.log(err);
      return new GameData();
    }
    
  }
  
  return g;
}

function stringToAxis(s : string) : Axis {
  switch(s){
    case '-X':
      return Axis.NegativeX;
    case '+X':
      return Axis.PositiveX;
    case '-Y':
      return Axis.NegativeY;
    case '+Y':
      return Axis.PositiveY;
    case '-Z':
      return Axis.NegativeZ;
    case '+Z':
      return Axis.PositiveZ;
  }
  return Axis.PositiveZ;
}

(async () => {  
  /////////////////////////////////////////////
  // Initialization 
  /////////////////////////////////////////////

  // Images Menu
  const imagesMenu = document.getElementById("imagesMenuBody");

  // Scene Selection + Scene Settings
  const sceneSelectionSelectElement = document.getElementById("sceneSelection") as HTMLSelectElement;
  const currentSceneHTMLElement = sceneSelectionSelectElement.options[sceneSelectionSelectElement.selectedIndex];
  let currentSceneID = "";
  
  const sceneSettingsNameInputElement = document.getElementById("sceneSettingsNameInput");
  sceneSettingsNameInputElement?.addEventListener('change', changeSceneName);

  const sceneSettingsPlayerWalkSpeedElement = document.getElementById("playerSpeed") as HTMLInputElement;
  sceneSettingsPlayerWalkSpeedElement?.addEventListener('change', (e) => {if(currentSceneData != null){ currentSceneData.playerRunSpeed = parseFloat(sceneSettingsPlayerWalkSpeedElement.value); save();}})

  const sceneSettingsEnterTextElement = document.getElementById("enterSceneText") as HTMLTextAreaElement;
  sceneSettingsEnterTextElement?.addEventListener('change', (e) => {if(currentSceneData != null){ currentSceneData.onSceneEnterText = sceneSettingsEnterTextElement.value; save();}})


  // check local storage for game data 
  const currentGameData = localStorage.getItem("currentGameData") == null? new GameData() : await convertStringToGameData(localStorage.getItem("currentGameData")!);

  // Drag + Drop zone
  const dropZone = document.getElementById("innerContainer");
  let dragged : HTMLImageElement | null = null;

  function dropZoneDragOver(event: Event){
    event.preventDefault();
  }

  function dropZoneDrop(event: Event){
    // prevent default action (open as a link for some elements)
    event.preventDefault();
    // move dragged element to the selected drop target
    if ((event.target as HTMLElement)!.className === "insideWrapper") {
      newScene(dragged!.src);
    }
  }

  dropZone!.addEventListener("dragover", dropZoneDragOver);
  dropZone!.addEventListener("drop", dropZoneDrop);


  ////////////////////////////////////////////////////
  // Hacky solution for GDC: iterate through urls and load images til one throws an error
  /////////////////////////////////////////////////////

  async function loadImage(num: number, cb: Function){
    var img = document.createElement("img");
    const reader = new FileReader();
    
    reader.onload = function(e){
      console.log("loaded reader");
    }
    document.getElementById("i1")?.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAA");     
          dragged = (event.target as HTMLImageElement);   
    });

    document.getElementById("i2")?.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAA");     
          dragged = (event.target as HTMLImageElement);   
    });
    document.getElementById("i3")?.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAA");     
          dragged = (event.target as HTMLImageElement);   
    });
    img.onload = function(){
        img.height = 100;
        img.draggable = true;
        img.addEventListener("dragstart", (event) => {
          event.dataTransfer?.setData("text", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAA");     
          dragged = (event.target as HTMLImageElement);   
        })
        imagesMenu?.append(img);
        console.log('loaded image');
        cb();
    };

    img.onerror = function(err){
        console.log('error:', err);
        cb(err);
    };

    console.log('attempting to load image:' + num);
    img.src = "http://file.garden/aacEYOWK43Nd2sJg/test" + num.toString() + ".jpg";
  };

  async function loadSequential(first : number){
    await loadImage(first, function(err){
        if(!err) { loadSequential(first + 1); }
    });  
  }
  
  await loadSequential(0);

  //////////////////////////////////////////////////////
  // Initialize Editor
  //////////////////////////////////////////////////////

  const innerWrapper = document.getElementById('innerContainer');
  
  //////////////////////////////////////////////////////
  // pixi.js set up 
  //////////////////////////////////////////////////////
  console.log ("initializing pixijs");
  const app = new Application();

  // Initialize with options
  await app.init({
      width: 10,                 // Canvas width
      height: 10,               // Canvas height
      backgroundColor: 0xffffff,    // Background color
      backgroundAlpha: 0,           // Background alpha
      antialias: true,              // Enable antialiasing
      resolution: 1,                // Resolution / device pixel ratio
      preference: 'webgl',          // or 'webgpu' // Renderer preference
      clearBeforeRender: false      // so that we can render three.js too
  });

  // Add the canvas to your webpage
  innerWrapper?.appendChild(app.canvas);
  app.canvas.classList.add("coveringCanvas");

  // Create z and x perspective lines
  const perspectiveLinePairX = new PerspectiveLinePair('red', null, Axis.PositiveX, app.canvas, new THREE.Vector2(200, 200), new THREE.Vector2(300, 300), new THREE.Vector2(300, 200), new THREE.Vector2(400, 300));
  const perspectiveLinePairZ = new PerspectiveLinePair('blue', null, Axis.NegativeZ, app.canvas, new THREE.Vector2(200, 400), new THREE.Vector2(300, 500), new THREE.Vector2(300, 400), new THREE.Vector2(400, 500));
  const origin = new PerspectiveOriginPoint(app.canvas, new THREE.Vector2(400, 600));
  // Create perspective manager
  const perspectiveManager = new PerspectiveManager(perspectiveLinePairX, perspectiveLinePairZ, origin, null);
  perspectiveLinePairX.assignManager(perspectiveManager);
  perspectiveLinePairZ.assignManager(perspectiveManager);
  origin.assignManager(perspectiveManager);

  // Add actual shape containers to scene
  app.stage.addChild(perspectiveLinePairX.getLine1Object());
  app.stage.addChild(perspectiveLinePairX.getLine2Object());

  app.stage.addChild(perspectiveLinePairZ.getLine1Object());
  app.stage.addChild(perspectiveLinePairZ.getLine2Object());
  app.stage.addChild(origin.getCircle());

  app.stage.visible = false;

  const axesOneOptions = document.getElementById("axes1Options");
  axesOneOptions?.addEventListener("change", function (){
    const s = (this as HTMLSelectElement).value;
    const preview = (document.getElementById("Axes1Preview") as HTMLDivElement);
    perspectiveLinePairX.assignAxis(stringToAxis((this as HTMLSelectElement).value));
    
    preview.style.backgroundColor = s.includes('X') ? 'red': s.includes('Y') ? 'green' : 'blue';
  });

  (axesOneOptions as HTMLSelectElement).value = "-X";

  const axesTwoOptions = document.getElementById("axes2Options");
  axesTwoOptions?.addEventListener("change", function (){
    const s = (this as HTMLSelectElement).value;
    const preview = (document.getElementById("Axes2Preview") as HTMLDivElement);
    perspectiveLinePairZ.assignAxis(stringToAxis((this as HTMLSelectElement).value));
    preview.style.backgroundColor = s.includes('X') ? 'red': s.includes('Y') ? 'green' : 'blue';
  });

  (axesTwoOptions as HTMLSelectElement).value = "-Z";

  document.getElementById("hideLines")?.addEventListener("click", function(){
    app.stage.visible = !app.stage.visible;
  });

  //////////////////////////////////////////////////////
  // three.js set up 
  //////////////////////////////////////////////////////

  // Create Three.js WebGL renderer with antialiasing and stencil buffer
  const threeRenderer = new THREE.WebGLRenderer({
    antialias: true,                            // smooth lines
    preserveDrawingBuffer: true,                // idk tbh
    stencil: true,                              // if we want to use stencil buffer
    alpha: true,                                // we want transparency 
    canvas: app.canvas,                         // need same canvas as pixi
    context: (app.renderer as WebGLRenderer).gl // need same context as pixi
  });
  
  console.log("initializing");
  // Configure Three.js renderer size and background color
  threeRenderer.setSize(0, 0);
  threeRenderer.sortObjects = false;
  // Scene and camera are null for now
  let currentScene: null | THREE.Scene = null;
  let currentCamera: null | THREE.Camera = null;
  let currentSceneData: null | SceneData = null;
  let transformControls: null | TransformControls = null; 
  let currentEnvironmentMeshes: null | THREE.Group = new THREE.Group();
  let currentExitMeshes: null | THREE.Group = new THREE.Group();
  let currentCollider: null | THREE.Mesh = null;
  let currentPlayer: null | THREE.Mesh = null;
  let isInPlayMode = false;
  let isSPawning = false;

  let sceneRaycaster = new THREE.Raycaster();
  var Mouse = new THREE.Vector2();
  let isMouseDown = false;
  let isDragging = false;
  let isDraggingDelta = 0;
  let isLoading = false;
  let isMouseOverCanvas = false;
  
  // Materials
  const editorMaterial = new THREE.MeshBasicMaterial({
    wireframe: true,
    transparent: true,
    opacity: 0.7
  });

  const playMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false
  })

  document.addEventListener( 'mousedown', function(event){
    isMouseDown = true;
    isDraggingDelta = 0;
  });

  document.addEventListener( 'mousemove', function (event){
    if(isMouseDown){
      if(!isDragging){
        isDraggingDelta += clock.getDelta();
        if(isDraggingDelta > 0.1) isDragging = true;
      }
    }
  })

  app.canvas.addEventListener('mouseenter', () => { isMouseOverCanvas = true; });
  app.canvas.addEventListener('mouseleave', () => { isMouseOverCanvas = false; });

  document.addEventListener( 'click', function( event ) {
    // todo add this somewhere 
    // event.preventDefault();
    if(!isMouseOverCanvas || currentCamera == null || currentScene == null || isDragging || isInPlayMode){
      isDragging = false;
      isMouseDown = false;
      isDraggingDelta = 0;
      return;
    } 
    const rect = threeRenderer.domElement.getBoundingClientRect();
    Mouse.set(((event.clientX - rect.x) / rect.width)  * 2 - 1, -(((event.clientY - rect.y) / rect.height) * 2 - 1))
    sceneRaycaster.layers.set(1);
    sceneRaycaster.setFromCamera( Mouse, currentCamera! );
    var intersects = sceneRaycaster.intersectObjects( currentScene!.children, true );
    console.log(intersects);
    
    if(intersects.length > 0 && intersects[0].object.isMesh && transformControls){
      transformControls!.attach( intersects[0].object );

      const gizmo = transformControls!.getHelper();
      gizmo.name = 'gizmo';
      gizmo.layers.set(1);
      if(!currentScene.children.find(c=>c.name == 'gizmo')){
        currentScene.add(gizmo);
      }
      currentlySelectedObject = intersects[0].object as THREE.Mesh;
      if(intersects[0].object.name == "cube" || intersects[0].object.name =="sphere"){
        document.getElementById("exitBox").disabled = false;
      }
      else{
        document.getElementById("exitBox").disabled = true;
      }
      document.getElementById("objectPropertiesMenu")!.style.visibility = "visible";

    }
    else if(intersects.length == 0 && !isSPawning){
      console.log("detaching");
      transformControls!.detach();
      document.getElementById("objectPropertiesMenu")!.style.visibility = "hidden";
    }
    isDragging = false;
    isDraggingDelta = 0;
    isMouseDown = false;
    isSPawning = false;
  });
  // For delta time
  const clock = new THREE.Clock();

  async function save(){
    if(currentSceneData != null){
      console.log(currentSceneData.scene);
      const cloneScene = currentSceneData.scene.clone();
      cloneScene.children.find(c=>c.name == "axesHelper")?.removeFromParent();
      cloneScene.children.find(c=>c.name == "gizmo")?.removeFromParent();
      currentSceneData.playerScale = currentPlayer?.scale!;
      cloneScene.children.find(c=>c.name == "player")?.removeFromParent();
      cloneScene.children.find(c=>c.name == "collider")?.removeFromParent();
      cloneScene.children.find(c=>c.name == "" && c.type == "Object3D")?.removeFromParent();
      currentSceneData!.scene = cloneScene;
      console.log(currentSceneData);
      localStorage.setItem("currentGameData", JSON.stringify(currentGameData));
    }
  }
  // Editor specific items
  let currentlySelectedObject: null | THREE.Mesh = null;
  // const intervalId = setInterval(() => {
  //   console.log("interval");
  //   if(currentSceneData != null){
  //     currentSceneData!.cameraString = JSON.stringify(currentSceneData?.camera);
  //     currentSceneData!.sceneString = JSON.stringify(currentSceneData?.scene);
  //     localStorage.setItem("currentGameData", JSON.stringify(currentGameData));
  //   }
  // }, 30000); // Repeats every 1000 milliseconds (1 second)

  // Animation loop
  function loop() {
    if(isLoading) return;
    const delta = clock.getDelta();
    
    updatePlayer( delta );

    if(currentScene != null && currentCamera != null){
      threeRenderer.resetState();
      threeRenderer.render(currentScene, currentCamera);
    }
    
    // Render PixiJS scene
    if(app.stage.visible){
      app.renderer.resetState();
      app.renderer.render({ container: app.stage });
    }

    // Continue animation loop
    requestAnimationFrame(loop);
  }

  // Start animation loop
  requestAnimationFrame(loop);

  //////////////////////////////////////////////////////
  // set up buttons 
  //////////////////////////////////////////////////////

  sceneSelectionSelectElement.addEventListener("change", sceneSelectionChanged);
  //document.getElementById("addGuy")?.addEventListener("click", loadModel);
  //document.getElementById("export")?.addEventListener("click", exportTest);
  document.getElementById("addPlane")?.addEventListener("mousedown", addPlane);
  document.getElementById("addCube")?.addEventListener("mousedown", addCube);
  document.getElementById("addSphere")?.addEventListener("mousedown", addSphere);
  document.getElementById("toggleWireframe")?.addEventListener("mousedown", toggleWireframe);
  document.getElementById("snapToGround")?.addEventListener("mousedown", snapToGround);
  document.getElementById("removeObject")?.addEventListener("mousedown", removeSelectedObject);
  document.getElementById("readyWalkableGeometry")?.addEventListener("click", readyWalkableGeometry);
  document.addEventListener( 'keydown', onKeyDown );
  document.addEventListener( 'keyup', onKeyUp );
  document.getElementById("playButton")?.addEventListener("click", playScene);
  document.getElementById("exitBox")?.addEventListener("change", addExit);
  document.getElementById("sceneListForExits")?.addEventListener("change", assignExit);
  
  async function sceneSelectionChanged(e: Event){
    console.log("started scene selection change");
    const target = e.currentTarget as HTMLInputElement;
    if(target.value == 'new'){

      await save();
      // Create new option div
      const newScene = document.createElement('option');

      // Create new scene name
      const sceneName = "newScene" + (target!.childElementCount -1).toString();
      newScene.innerHTML = sceneName;
      target.appendChild(newScene);
      newScene.value = sceneName;
      target.value = newScene.value;
      
      // Hide welcome text + unhide blank scene text
      document.getElementById("blankSceneText")!.style.visibility = "visible";
      document.getElementById("welcomeSceneText")!.style.visibility = "hidden";
      document.getElementById("sceneSettingsMenu")!.style.visibility = "hidden";
      document.getElementById("objectPropertiesMenu")!.style.visibility = "hidden";
      const img = (document.getElementById('myImg') as HTMLImageElement); 
      img.height = 0;
      img.width = 0 ;
      
      const myImg = document.getElementById("myImg");
      if(myImg) myImg.style.visibility = "hidden";
      dropZone!.addEventListener("dragover", dropZoneDragOver);
      dropZone!.addEventListener("drop", dropZoneDrop);
      app.canvas.width = 0;
      app.canvas.height = 0;
      app.renderer.resize(0, 0);

      app.stage.visible = false;
      threeRenderer.setSize(0, 0);

      // reset properties of scene settings menu
      resetSceneSettingsMenu(null);

      // change global scene id 
      currentSceneID = sceneName;
    }
    else{
      document.getElementById("blankSceneText").style.visibility = "hidden";
      document.getElementById("welcomeSceneText").style.visibility = "hidden";
      const sceneName = sceneSelectionSelectElement.options[sceneSelectionSelectElement.selectedIndex].innerHTML;
      const scene = currentGameData.scenes.find(s=>s.name == sceneName);
      console.log("about to populate scene");
      if(scene){
        resetSceneSettingsMenu(scene);
        console.log(scene);
        isLoading = true;
        await populateScene(scene, true);
        isLoading = false;
      } 
    }
  }

  function resetSceneSettingsMenu(s : SceneData | null){
    if(s != null){
      (sceneSettingsNameInputElement as HTMLInputElement).value = s.name;
      (sceneSettingsEnterTextElement as HTMLTextAreaElement).value = s.onSceneEnterText;
      (sceneSettingsPlayerWalkSpeedElement as HTMLInputElement).value = s.playerRunSpeed.toString();
    }
    else{
      (sceneSettingsNameInputElement as HTMLInputElement).value = sceneSelectionSelectElement.value;
      (sceneSettingsEnterTextElement as HTMLTextAreaElement).value = "";
      (sceneSettingsPlayerWalkSpeedElement as HTMLInputElement).value = "2";
    }
  }


  function changeSceneName(){
    currentSceneData?.setName((sceneSettingsNameInputElement as HTMLInputElement).value);
    sceneSelectionSelectElement.options[sceneSelectionSelectElement.selectedIndex].innerHTML = (sceneSettingsNameInputElement as HTMLInputElement).value;
  }
  
  function addPlane(e: Event){
    if(isInPlayMode) return;
    if(currentEnvironmentMeshes == null) return;
    isSPawning = true;
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1,1,25, 25), editorMaterial);
    p.material.color = new THREE.Color().setHSL(Math.random(), 0.4, 0.75);
    p.rotateX(-Math.PI / 2);
    currentEnvironmentMeshes!.add(p)
    transformControls!.attach( p );
    p.material.side = THREE.DoubleSide;

    const gizmo = transformControls!.getHelper();
    gizmo.name = 'gizmo';
    currentScene!.add( gizmo );
    currentlySelectedObject = p;
    p.layers.set(1);
    document.getElementById("exitBox")!.disabled = true;
    document.getElementById("objectPropertiesMenu")!.style.visibility = "visible";
  }

  function addCube(){
    if(isInPlayMode) return;
    if(currentEnvironmentMeshes == null) return;
    isSPawning = true;
    const p = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 10, 10, 10), editorMaterial);
    p.material.color = new THREE.Color().setHSL(Math.random(), 0.4, 0.75);
    currentEnvironmentMeshes!.add(p)
    transformControls!.attach( p );
    p.name="cube";
    const gizmo = transformControls!.getHelper();
    currentScene!.add( gizmo );
    currentlySelectedObject = p;
    snapToGround();
    p.layers.set(1);
    p.renderOrder = 4;
    document.getElementById("exitBox").disabled = false;
    document.getElementById("objectPropertiesMenu")!.style.visibility = "visible";
  }

  function addSphere(){
    if(isInPlayMode) return;
    if(currentEnvironmentMeshes == null) return;
    isSPawning = true;
    const p = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10 ), editorMaterial);
    p.material.color = new THREE.Color().setHSL(Math.random(), 0.4, 0.75);
    currentEnvironmentMeshes!.add(p)
    transformControls!.attach( p );
    p.name="sphere";
    const gizmo = transformControls!.getHelper();
    currentScene!.add( gizmo );
    currentlySelectedObject = p;
    snapToGround();
    p.layers.set(1);
    p.renderOrder = 4;
    document.getElementById("exitBox").disabled = false;
    document.getElementById("objectPropertiesMenu")!.style.visibility = "visible";
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
      camera: currentCamera!.toJSON(),
      scene: currentScene!,
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
    if(isInPlayMode) return;
    if(currentlySelectedObject != null){
      (currentlySelectedObject as THREE.Mesh).material.wireframe = !(currentlySelectedObject as THREE.Mesh).material.wireframe;
    }
  }
  
  function snapToGround(){
    if(isInPlayMode) return;
    if(currentlySelectedObject != null){
      const bbox = new THREE.Box3().setFromObject(currentlySelectedObject as THREE.Mesh);
      const size = new THREE.Vector3;
      currentlySelectedObject.position.y = 0 + bbox.getSize(size).y /2;
    }
  }

  function removeSelectedObject(){
    if(isInPlayMode) return;
    if(currentlySelectedObject != null){
      transformControls!.detach();
      currentlySelectedObject.removeFromParent();
      //currentScene!.remove(currentlySelectedObject);
      currentlySelectedObject = null;
    }
  }

  function readyWalkableGeometry(){
    console.log("A");
    sceneSelectionSelectElement.value = "newScene3";
    var event = new Event('change');
    sceneSelectionSelectElement?.dispatchEvent(event);
  }

  function onKeyDown( event: KeyboardEvent ) {
    if(isInPlayMode){
      const key = controls.key;
      
      switch ( event.code ) {
        case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = - 1; break;
        case 'ArrowDown': case 'KeyS': key[ 0 ] = 1; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = - 1; break;
        case 'ArrowRight': case 'KeyD': key[ 1 ] = 1; break;
        case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 1; break;
      }

      switch ( event.code ) {

        case 'KeyW': fwdPressed = true; break;
        case 'KeyS': bkdPressed = true; break;
        case 'KeyD': rgtPressed = true; break;
        case 'KeyA': lftPressed = true; break;
        case 'Space':
          if ( playerIsOnGround ) {

            //playerVelocity.y = 10.0;
            //playerIsOnGround = false;

          }

          break;

      }
    }
    else{
      controlsKeyDown(event);
    }
  }



  function onKeyUp(event: KeyboardEvent){
    if(isInPlayMode){
      const key = controls.key;
      
      switch ( event.code ) {

        case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = key[ 0 ] < 0 ? 0 : key[ 0 ]; break;
        case 'ArrowDown': case 'KeyS': key[ 0 ] = key[ 0 ] > 0 ? 0 : key[ 0 ]; break;
        case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = key[ 1 ] < 0 ? 0 : key[ 1 ]; break;
        case 'ArrowRight': case 'KeyD': key[ 1 ] = key[ 1 ] > 0 ? 0 : key[ 1 ]; break;
        case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 0; break;

      }

      switch ( event.code ) {

        case 'KeyW': fwdPressed = false; break;
        case 'KeyS': bkdPressed = false; break;
        case 'KeyD': rgtPressed = false; break;
        case 'KeyA': lftPressed = false; break;

      }
    }
  }

  function controlsKeyDown ( event ) {

    switch ( event.key ) {

      case 'q':
        transformControls!.setSpace( transformControls!.space === 'local' ? 'world' : 'local' );
        break;

      case 'Shift':
        transformControls!.setTranslationSnap( 1 );
        transformControls!.setRotationSnap( THREE.MathUtils.degToRad( 15 ) );
        transformControls!.setScaleSnap( 0.25 );
        break;

      case 'w':
        transformControls!.setMode( 'translate' );
        break;

      case 'e':
        transformControls!.setMode( 'rotate' );
        break;

      case 'r':
        transformControls!.setMode( 'scale' );
        break;
        
      case '+':
      case '=':
        transformControls!.setSize( transformControls!.size + 0.1 );
        break;

      case '-':
      case '_':
        transformControls!.setSize( Math.max( transformControls!.size - 0.1, 0.1 ) );
        break;

      case 'x':
        transformControls!.showX = ! transformControls!.showX;
        break;

      case 'y':
        transformControls!.showY = ! transformControls!.showY;
        break;

      case 'z':
        transformControls!.showZ = ! transformControls!.showZ;
        break;

      case ' ':
        transformControls!.enabled = ! transformControls!.enabled;
        break;

      case 'Escape':
        transformControls!.reset();
        break;

    }

  }

  function newScene(imgUrl: string){
    if(isInPlayMode) return;
    isLoading = true;

    const img = (document.getElementById('myImg') as HTMLImageElement); 
    document.getElementById("sceneSettingsMenu")!.style.visibility = "visible";

    img!.src = imgUrl;
    img.height = 0;
    img.width = 0;
    img!.style.visibility = "visible";
    app.stage.visible = true;

    img!.onload = async function(){
      // Hide blank scene text
      (document.getElementById("blankSceneText") as HTMLElement).style.visibility = "hidden";

      // Shrink / Enlarge depending on aspect ratio
      if(img!.naturalHeight > img!.naturalWidth){
        img!.height = 650;
        img!.width = img.height * (img.naturalWidth/img.naturalHeight);
      }
      else{
        img!.width = 750;
        img!.height = img.width * (img.naturalHeight / img.naturalWidth)
      }
      
      // Center + change canvas dimensions
      let WIDTH = img?.offsetWidth as number;
      let HEIGHT = img?.offsetHeight as number;

      const leftPoint = (img?.offsetWidth/2 as number)
      img.style.left = (387.5 - leftPoint).toString() + "px";
      (img as HTMLElement).style.position = "absolute";
      (img as HTMLElement).style.zIndex = "-10";
      
      const topPoint = img?.offsetHeight/2 as number;
      img.style.top = (337.5 - topPoint).toString() + "px";

      app.canvas.style.left = (387.5 - leftPoint).toString() + "px";
      app.canvas.style.top = (337.5 - topPoint).toString() + "px";

      app.canvas.width = WIDTH;
      app.canvas.height = HEIGHT;
      app.renderer.resize(WIDTH, HEIGHT);

      app.stage.visible = true;
      threeRenderer.setSize(WIDTH!, HEIGHT!);
      
      // Initialize threeJS elements
      const imgData = new Image(WIDTH, HEIGHT);
      
      const newScene = new THREE.Scene();
      
      const newCamera = new THREE.PerspectiveCamera(70, WIDTH! / HEIGHT!);
      newCamera.aspect = WIDTH/HEIGHT;
      newCamera.updateProjectionMatrix();
      newCamera.layers.enable(1);
      newCamera.layers.enable(2);
      newCamera.layers.enable(3);
      const newEnvironmentMeshes = new THREE.Group();
      newEnvironmentMeshes.name = "environmentMeshes";
      const newExitMeshes = new THREE.Group();
      newExitMeshes.name="exitMeshes";

      let newPlayer = new THREE.Mesh(
        new RoundedBoxGeometry( 1.0, 2.0, 1.0, 10, 0.5 ),
        new THREE.MeshStandardMaterial()
      );
      newPlayer.name = "player";
      newPlayer.layers.set(1);
      newPlayer.renderOrder = 0;
      //newPlayer.geometry.translate( 0, 0.5, 0 );
      //newPlayer.position.set(0,0.0,0);
      newPlayer.userData.capsuleInfo = {
        radius: 0.5,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0,  0.0, 0.0 ) )
      };

      // New camera, new scene, new scene data

      newScene.add(newCamera);
      newScene.add(newEnvironmentMeshes);
      newScene.add(newExitMeshes);
      newScene.add(newPlayer);

      // To see our axes in the space
      const axesHelper = new THREE.AxesHelper( 50 );
      axesHelper.name ="axesHelper";
      axesHelper.layers.set(3);
      newScene.add( axesHelper );

      // Basic light - are we even using this?
      const light = new THREE.AmbientLight(0xffffff, 2);
      light.name = "light";
      newScene?.add(light);
      
      // Done initializing new scene, now we populate current scene with it
      const newSceneData = new SceneData(newScene, newCamera, imgUrl, currentSceneID, imgData);
      newSceneData.setName(sceneSelectionSelectElement.options[sceneSelectionSelectElement.selectedIndex].innerHTML)
      currentGameData.scenes.push(newSceneData);
      await populateScene(newSceneData);
      isLoading = false;
    }
  }

  async function populateScene(sceneData: SceneData, populateImg = false){
    console.log(sceneData);
    // html stuff 
    currentSceneData = sceneData;
    currentSceneID = currentSceneData.id;
    dropZone!.removeEventListener("dragover", dropZoneDragOver);
    dropZone!.removeEventListener("drop", dropZoneDrop);
    const imgSrc = currentSceneData.imgUrl;
    const myImg = document.getElementById("myImg") as HTMLImageElement;
    if(myImg && populateImg){
      // Hide blank scene text
      (document.getElementById("blankSceneText") as HTMLElement).style.visibility = "hidden";
      myImg.src = imgSrc;
      myImg!.onload = function(){
        debugger
        // Shrink / Enlarge depending on aspect ratio
      if(myImg!.naturalHeight > myImg!.naturalWidth){
        myImg!.height = 650;
        myImg!.width = myImg.height * (myImg.naturalWidth/myImg.naturalHeight);
      }
      else{
        myImg!.width = 750;
        myImg!.height = myImg.width * (myImg.naturalHeight / myImg.naturalWidth)
      }
        
        // Center + change canvas dimensions
        let WIDTH = myImg?.offsetWidth as number;
        let HEIGHT = myImg?.offsetHeight as number;

        const leftPoint = (myImg?.offsetWidth/2 as number)
        myImg.style.left = (387.5 - leftPoint).toString() + "px";
        (myImg as HTMLElement).style.position = "absolute";
        (myImg as HTMLElement).style.zIndex = "-10";
        
        const topPoint = myImg?.offsetHeight/2 as number;
        myImg.style.top = (337.5 - topPoint).toString() + "px";

        app.canvas.style.left = (387.5 - leftPoint).toString() + "px";
        app.canvas.style.top = (337.5 - topPoint).toString() + "px";

        app.canvas.width = WIDTH;
        app.canvas.height = HEIGHT;
        app.renderer.resize(WIDTH, HEIGHT);

        app.stage.visible = true;
        threeRenderer.setSize(WIDTH!, HEIGHT!);
      }
    }

    if(currentScene && currentScene.children.find(c => c.name == "axesHelper") == null){
      const axesHelper = new THREE.AxesHelper( 50 );
      axesHelper.name ="axesHelper";
      currentScene!.add( axesHelper );
    }
        
    // three.js stuff
    currentCamera = currentSceneData.camera;
    currentScene = currentSceneData.scene;
    currentPlayer = currentScene.children.find(c=>c.name=="player")!;
    
    if(!currentPlayer){
      let newPlayer = new THREE.Mesh(
        new RoundedBoxGeometry( 1.0, 2.0, 1.0, 10, 0.5 ),
        new THREE.MeshStandardMaterial()
      );
      newPlayer.name = "player";
      newPlayer.scale.set(currentSceneData.playerScale.x, currentSceneData.playerScale.y, currentSceneData.playerScale.z);
      newPlayer.layers.set(1);
      //newPlayer.geometry.translate( 0, 0.5, 0 );
      //newPlayer.position.set(0,0.0,0);
      newPlayer.userData.capsuleInfo = {
        radius: 0.5,
        segment: new THREE.Line3( new THREE.Vector3(), new THREE.Vector3( 0,  0.0, 0.0 ) )
      };
      currentScene.add(newPlayer);
      currentPlayer = newPlayer;
    }

    //currentPlayer?.position.set(0,isInPlayMode? 1 : 0,0);
    currentEnvironmentMeshes = currentScene.children.find(c => c.name == "environmentMeshes") as THREE.Group;
    currentExitMeshes = currentScene.children.find(c => c.name == "exitMeshes") as THREE.Group;
    currentlySelectedObject = null;

    if(!transformControls){
      transformControls = new TransformControls(currentCamera, threeRenderer.domElement);
    }
    else{
      transformControls.camera = currentCamera;
    }
    
    // sometimes bits from the transform controls can get stuck in the scene?
    const junk = currentScene?.children.find(c=>c.name == "" && c.type == "Object3D");
    if(junk){
      junk.removeFromParent();
    }

    // Pixi.js stuff
    perspectiveManager.assignCamera(currentCamera as THREE.PerspectiveCamera);
    perspectiveManager.assignImage(currentSceneData.imgData);
    perspectiveManager.assignSceneData(null);
    if(populateImg){
      perspectiveLinePairX.resetPoints(currentSceneData.axes1Type, currentSceneData.axes1LinePoints);
      perspectiveLinePairZ.resetPoints(currentSceneData.axes2Type, currentSceneData.axes2LinePoints);
    }
    perspectiveManager.assignSceneData(currentSceneData);

    //switching to this scene via an exit in play mode 
    if(isInPlayMode){
      isInPlayMode = false;
      readySceneGeometryforPlay();
      readyCurrentSceneForPlay();
    }
    else{
      currentEnvironmentMeshes?.traverse((mesh) => {
        if(mesh.isMesh){
          mesh.material.visible = true;
        }
      });

      currentExitMeshes?.traverse((mesh) => {
        if(mesh.isMesh){
          mesh.material.visible = true;
        }
      });


    }
  }

  async function playScene(){
    if(currentCamera == null || currentScene == null) return;

    const button = document.getElementById("playButton");

    if(button!.innerHTML == "PLAY"){
      await save();

      readySceneGeometryforPlay();
    
      readyCurrentSceneForPlay();

      document.getElementById("playButton")!.innerHTML = "STOP";
      sceneSelectionSelectElement.disabled = true;
      transformControls!.detach();

      
      setTimeout(() => {
        isInPlayMode = true;
      }, 1000);
      
    }
    else{
      debugger
      isInPlayMode = false;
      if(currentScene?.children.find(c => c.name == "collider") != null){
        currentScene?.children.find(c => c.name == "collider")!.removeFromParent();
      }
      if(currentEnvironmentMeshes?.children.find(c => c.name == "newCubes") != null){
        currentEnvironmentMeshes?.children.find(c => c.name == "newCubes")!.removeFromParent();
      }
      
      if(currentPlayer){
        if(currentPlayer?.children.find(c => c.name == "playerGroup") != null){
          const g = currentPlayer?.children.find(c => c.name == "playerGroup");
          console.log(g);
          g?.traverse(m=>{
            if(m.isMesh){
              m.geometry.dispose();
              m.material.dispose();
            }
          });
          g?.removeFromParent();
        }
        currentPlayer.material.visible = true;
      }

      // Make current environment meshes visible
      currentEnvironmentMeshes?.traverse((mesh) => {
        console.log(mesh)
        if(mesh.isMesh){
          mesh.material = editorMaterial;
          mesh.material.color = new THREE.Color().setHSL(Math.random(), 0.4, 0.75);
        }
      });

      currentExitMeshes?.traverse((mesh) => {
        console.log(mesh)
        if(mesh.isMesh){
          mesh.material = editorMaterial;
          mesh.material.color = new THREE.Color().setHSL(Math.random(), 0.4, 0.75);
        }
      });

      if(currentPlayer){
        //currentPlayer!.geometry.translate( 0, 0.5, 0 );
        currentPlayer!.position.set(0,2.0,0);
        currentPlayer?.geometry.computeBoundingSphere();
      }
      
      document.getElementById("playButton")!.innerHTML = "PLAY";
      sceneSelectionSelectElement.disabled = false;

    }

  }
  
  async function readySceneGeometryforPlay(){
      const scene = currentScene;
      isInPlayMode = false;
      // Remove existing collider if it exists
      if(scene?.children.find(c => c.name == "collider") != null){
        scene?.children.find(c => c.name == "collider")!.removeFromParent();
      }
      
      // Make current environment meshes invisible
      const _newCubesToAdd = new THREE.Group();
      _newCubesToAdd.name = "newCubes";
      const _environmentMeshes = scene!.children.find(c=>c.name=="environmentMeshes");
      if(_environmentMeshes?.children.find(c=>c.name == "newCubes")){
        _environmentMeshes?.children.find(c=>c.name == "newCubes")?.removeFromParent();
      }


      _environmentMeshes?.traverse((mesh) => {
        if(mesh.isMesh){
          //mesh.material.visible = false;
          mesh.material = playMaterial;
          mesh.renderOrder = 2;
          //mesh.material.opacity = 0.1;
          mesh.updateMatrixWorld();
          if(mesh.geometry.type == "PlaneGeometry"){
            const cube = new THREE.Mesh(new THREE.BoxGeometry(1,1,1, 10, 10, 10), new THREE.MeshBasicMaterial({visible:false, color:0xff0000}));
            cube.scale.set(mesh.scale.x, mesh.scale.y, mesh.scale.z);
            cube.position.set(mesh.position.x, 0, mesh.position.z);
            const bbox = new THREE.Box3().setFromObject(cube as THREE.Mesh);
            const size = new THREE.Vector3;
            cube.position.y = 0 - bbox.getSize(size).y /2;
            cube.updateMatrixWorld();
            _newCubesToAdd.add(cube);
          }
        }
      });
      
      _environmentMeshes?.add(_newCubesToAdd);
      const _exitMeshes = scene!.children.find(c=>c.name=="exitMeshes");

      _exitMeshes?.traverse((mesh) => {
        if(mesh.isMesh){
          mesh.material.visible = false;
          mesh.geometry.computeBoundingSphere();
        }
      });

      // Generate collider
      const staticGenerator = new StaticGeometryGenerator( currentEnvironmentMeshes );
      staticGenerator.attributes = [ 'position' ];

      const mergedGeometry = staticGenerator.generate();
      mergedGeometry.boundsTree = new MeshBVH( mergedGeometry );

      currentCollider = new THREE.Mesh( mergedGeometry );
      currentCollider.name = "collider";
      currentCollider.material.wireframe = true;
      currentCollider.material.visible = false;
      currentCollider.layers.set(2);
      currentScene!.add(currentCollider);
      isInPlayMode = true;
  }

  function readyCurrentSceneForPlay(){
    if(currentPlayer){
      //currentPlayer!.geometry.translate( 0, 0.5, 0 );
      currentPlayer!.position.set(0,3.0,0);
      playerIsOnGround = false;
      playerVelocity = new THREE.Vector3();
      fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false;
      init = false;
      playerVelocity.set(0,0,0);
      currentPlayer!.updateMatrixWorld();
      currentPlayer?.geometry.computeBoundingSphere();
      currentPlayer.renderOrder = 0;
      currentPlayer.add(playerGroup);
      currentPlayer.children[0].traverse(m => {
        if(m.isMesh)
          m.renderOrder = 0;
      })
      currentPlayer.material.visible = false;
    }
    if(currentScene?.children.find(c=>c.name =="light")){
      const light = new THREE.AmbientLight(0xffffff, 2);
      light.name = "light";
      currentScene?.add(light);
    }
  }

  function addExit(e: Event){
    console.log("exit");
    if(e.currentTarget.checked == true && e.currentTarget.disabled == false){
      const dropDown = document.getElementById("sceneListForExits");
      dropDown.disabled = false;
      for(let s in currentGameData.scenes){
        if(currentGameData.scenes[s].id != currentSceneData.id){
          const option = document.createElement('option');
          option.innerHTML = currentGameData.scenes[s].name;
          option.value = currentGameData.scenes[s].id;
          dropDown?.appendChild(option);
        }
      }
    }
  }

  function assignExit(e: Event){
    currentlySelectedObject!.userData.exitID = document.getElementById("sceneListForExits")?.value;
    currentlySelectedObject?.removeFromParent();
    currentExitMeshes.add(currentlySelectedObject);
  }

  let playerIsOnGround = false;
  let playerVelocity = new THREE.Vector3();

  let tempVector = new THREE.Vector3();
  let upVector = new THREE.Vector3(0, 1, 0);
  let tempSegment = new THREE.Line3();

  const params = {

    gravity: - 10,
    playerSpeed: 2,
    physicsSteps: 5,

  };

  let tempBox = new THREE.Box3();
  let tempMat = new THREE.Matrix4();
  let tempVector2 = new THREE.Vector3();
  let fwdPressed = false, bkdPressed = false, lftPressed = false, rgtPressed = false;
  let init = false;

  function updatePlayer( delta: number ) {
    delta = Math.min(delta, 0.05);
    if(!isInPlayMode || !currentPlayer){
      return;
    }
    else{
      if(!init){
        app.stage.visible = false;
        init = true;
      }
    }
    if ( playerIsOnGround ) {

      playerVelocity.y = delta * params.gravity;

    } else {

      playerVelocity.y += delta * params.gravity;

    }

    // adjust the player model
    currentPlayer!.position.addScaledVector( playerVelocity, delta );

    // move the player
    const angle = 0;
    tempVector.set(0,0,0);

    const camfwd = new THREE.Vector3();
    currentCamera?.getWorldDirection(camfwd);
    camfwd.projectOnPlane(new THREE.Vector3(0,1,0));
    camfwd.normalize();

    const camleft = camfwd.clone().cross(new THREE.Vector3(0,1,0));

    if ( fwdPressed ) {
      tempVector.add( new THREE.Vector3(camfwd.x, 0, camfwd.z ).applyAxisAngle( upVector, angle ));
    }

    if ( bkdPressed ) {
      tempVector.add( new THREE.Vector3(-camfwd.x, 0, -camfwd.z ).applyAxisAngle( upVector, angle ));
    }

    if ( lftPressed ) {
      tempVector.add( new THREE.Vector3(-camleft.x, 0, -camleft.z ).applyAxisAngle( upVector, angle ));
    }

    if ( rgtPressed ) {
      tempVector.add( new THREE.Vector3( camleft.x, 0, camleft.z ).applyAxisAngle( upVector, angle ));
    }
    tempVector.normalize();

    const fwdVector = new THREE.Vector3(currentPlayer!.position.x, currentPlayer!.position.y + 0.5, currentPlayer!.position.z);
    const fwdVectorForCubeTarget = fwdVector.clone();
    fwdVector.addScaledVector(tempVector, currentSceneData!.playerRunSpeed * delta);
    fwdVector.y += 50;
    fwdVectorForCubeTarget.addScaledVector(tempVector, currentSceneData!.playerRunSpeed * delta * 100);

    const raycaster = new THREE.Raycaster(fwdVector, new THREE.Vector3(0,-1,0), 0.001, 100);
    raycaster.layers.set(2);
    const intersects = raycaster.intersectObjects(currentScene.children, true);
    
    if(intersects.length > 0)
    {
      console.log("can move");
      currentPlayer!.position.addScaledVector( tempVector, currentSceneData!.playerRunSpeed * delta );
    }
    else{
      console.log("cant move");
    }
    currentPlayer!.updateMatrixWorld();

    // adjust player position based on collisions
    const capsuleInfo = currentPlayer!.userData.capsuleInfo;
    tempBox.makeEmpty();
    tempMat.copy( currentCollider!.matrixWorld ).invert();
    tempSegment.copy( capsuleInfo.segment );

    // get the position of the capsule in the local space of the collider
    tempSegment.start.applyMatrix4( currentPlayer!.matrixWorld ).applyMatrix4( tempMat );
    tempSegment.end.applyMatrix4( currentPlayer!.matrixWorld ).applyMatrix4( tempMat );

    // get the axis aligned bounding box of the capsule
    tempBox.expandByPoint( tempSegment.start );
    tempBox.expandByPoint( tempSegment.end );

    tempBox.min.addScalar( - capsuleInfo.radius );
    tempBox.max.addScalar( capsuleInfo.radius );

    currentCollider!.geometry.boundsTree!.shapecast( {

      intersectsBounds: box => box.intersectsBox( tempBox ),

      intersectsTriangle: tri => {
        // check if the triangle is intersecting the capsule and adjust the
        // capsule position if it is.
        const triPoint = tempVector;
        const capsulePoint = tempVector2;

        const distance = tri.closestPointToSegment( tempSegment, triPoint, capsulePoint );
        if ( distance < capsuleInfo.radius ) {

          const depth = capsuleInfo.radius - distance;
          const direction = capsulePoint.sub( triPoint ).normalize();

          tempSegment.start.addScaledVector( direction, depth );
          tempSegment.end.addScaledVector( direction, depth );

        }
      }
    });

    // get the adjusted position of the capsule collider in world space after checking
    // triangle collisions and moving it. capsuleInfo.segment.start is assumed to be
    // the origin of the player model.
    const newPosition = tempVector;
    newPosition.copy( tempSegment.start ).applyMatrix4( currentCollider!.matrixWorld );

    // check how much the collider was moved
    const deltaVector = tempVector2;
    deltaVector.subVectors( newPosition, currentPlayer!.position );

    // if the player was primarily adjusted vertically we assume it's on something we should consider ground
    playerIsOnGround = deltaVector.y > Math.abs( delta * playerVelocity.y * 0.25 );

    const offset = Math.max( 0.0, deltaVector.length() - 1e-5 );
    deltaVector.normalize().multiplyScalar( offset );
    currentPlayer!.position.add( deltaVector );
    

    if ( ! playerIsOnGround ) {

      deltaVector.normalize();
      playerVelocity.addScaledVector( deltaVector, - deltaVector.dot( playerVelocity ) );

    } else {

      playerVelocity.set( 0, 0, 0 );

    }
    
    for(let e in currentExitMeshes?.children){
      const sphere = (currentExitMeshes.children[e] as THREE.Mesh).geometry.boundingSphere?.clone();
      sphere?.applyMatrix4(currentExitMeshes.children[e].matrixWorld);

      const playerSphere = currentPlayer?.geometry.boundingSphere?.clone();
      playerSphere?.applyMatrix4(currentPlayer?.matrixWorld);

      if (sphere!.intersectsSphere(playerSphere!)) {
        sceneSelectionSelectElement.value = currentExitMeshes.children[e].userData.exitID;
        var event = new Event('change');
        sceneSelectionSelectElement?.dispatchEvent(event);
      }
    }

    updateCharacter(delta, fwdVectorForCubeTarget);
  }

  // character model implementation 
  let model, mixer: THREE.AnimationMixer;
  let actions: {Idle: THREE.AnimationAction, Walk: THREE.AnimationAction};
  const playerGroup = new THREE.Group();
  playerGroup.name="playerGroup";
  
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

  function updateCharacter( delta : number, movement: THREE.Vector3) {

		const fade = controls.fadeDuration;
		const key = controls.key;
		const up = controls.up;
		const ease = controls.ease;
		const rotate = controls.rotate;
		const position = controls.position;

		const active = key[ 0 ] === 0 && key[ 1 ] === 0 ? false : true;
		const play = active ? 'Walk' : 'Idle';
		// change animation

		if (controls.current != play ) {

			const current = actions[ play ];
			const old = actions[controls.current as "Idle" | "Walk"];
			controls.current = play;

			setWeight( current, 1.0 );
			old.fadeOut( fade );
			current.reset().fadeIn( fade ).play();
		}

		// move object

		if (controls.current !== 'Idle' ) {

      // run/walk velocity
      const velocity = controls.walkVelocity;

      // direction with key
      //movement.normalize();
      ease.set(currentPlayer!.position.x - movement.x, 0, currentPlayer!.position.z - movement.z ).multiplyScalar( velocity * delta );

      // calculate camera direction
      const angle = unwrapRad( Math.atan2( ease.x, ease.z ) + 0 );
      //console.log(angle);
      rotate.setFromAxisAngle( up, angle );
      // apply camera angle on ease
      //controls.ease.applyAxisAngle( up, 0 );

      position.add( ease );

      //playerGroup.position.copy( position );
      playerGroup.quaternion.rotateTowards(rotate, controls.rotateSpeed);
      //playerGroup.lookAt(new THREE.Vector3(cube?.position.x, 0, cube?.position.z));
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
  
  loadModel();
  
  function loadModel() {

    // Hide the pixi UI
    //app.stage.visible = false;

    const loader = new GLTFLoader();
    const downloadUrl = new URL('/snake.glb', import.meta.url);

    loader.load( downloadUrl.toString(), function ( gltf ) {

      model = gltf.scene;
      model.scale.set(0.02,0.02,0.02);
      playerGroup.add( model );
      model.rotation.y = Math.PI;
      playerGroup.rotation.y = Math.PI;
      const bbox = new THREE.Box3().setFromObject(playerGroup);
      const size = new THREE.Vector3();
      playerGroup.position.y = 0; // bbox.getSize(size).y /2;

      model.traverse( function ( object: THREE.Object3D) {

        if ((object as THREE.Mesh).isMesh ) {
          (object as THREE.Mesh).material.depthWrite = true;
        }
      } );

      const animations = gltf.animations;

      mixer = new THREE.AnimationMixer( model );
      console.log(animations);
      actions = {
        Idle: mixer.clipAction(animations[0]),
        Walk: mixer.clipAction(animations[1])
      }

      for ( const m in actions ) {

        (actions[ m as "Idle" | "Walk"]).enabled = true;
        actions[ m as "Idle" | "Walk"].setEffectiveTimeScale( 1 );
        if ( m !== 'Idle' ) actions[ m as "Idle" | "Walk"].setEffectiveWeight( 0 );

      }

      

      (actions.Idle as THREE.AnimationAction).play();

    } );
  }

})()

dragElement(document.getElementById("sceneSettingsMenu"));
dragElement(document.getElementById("objectPropertiesMenu"));
dragElement(document.getElementById("imagesMenu"));
dragElement(document.getElementById("sceneSelectionMenu"));
dragElement(document.getElementById("objectsMenu"));

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

