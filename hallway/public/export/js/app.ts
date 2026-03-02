import * as THREE from "../three"
import { GLTFLoader } from '../three/examples/jsm/Addons.js';

type Actions = {
	Idle: THREE.AnimationAction,
	Walk: THREE.AnimationAction,
	Run: THREE.AnimationAction
};

export class APP {

	renderer: THREE.WebGLRenderer;
	loader: THREE.ObjectLoader;
	camera!: THREE.Camera;
	scene!: THREE.Scene;
	width: Number;
	height: Number;
	dom: HTMLDivElement;
	canvas: HTMLCanvasElement;
	events!: {
		init: Function [],
		start: Function [],
		stop: Function [],
		keydown: Function [],
		keyup: Function [],
		pointerdown: Function [],
		pointerup: Function [],
		pointermove: Function [],
		update: Function []
	};
	time!: number;
	startTime!: number;
	prevTime!: number;
	group: THREE.Group;
	followGroup: THREE.Group;
	mixer!: THREE.AnimationMixer;
	controls = {
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
	
	actions!: Actions;


	constructor(){
		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio ); // TODO: Use player.setPixelRatio()

		this.loader = new THREE.ObjectLoader();

		var dom = document.createElement( 'div' );
		dom.appendChild( this.renderer.domElement );

		this.events = {
			init: [],
			start: [],
			stop: [],
			keydown: [],
			keyup: [],
			pointerdown: [],
			pointerup: [],
			pointermove: [],
			update: []
		};

		this.dom = dom;
		this.canvas = this.renderer.domElement;

		this.width = 500;
		this.height = 500;

		this.group = new THREE.Group();
		this.scene.add(this.group);

		this.followGroup = new THREE.Group();
		this.scene.add( this.followGroup );
	}

	loadPlayer(json: any){
		var project = json.project;

		if ( project.shadows !== undefined ) this.renderer.shadowMap.enabled = project.shadows;
		if ( project.shadowType !== undefined ) this.renderer.shadowMap.type = project.shadowType;
		if ( project.toneMapping !== undefined ) this.renderer.toneMapping = project.toneMapping;
		if ( project.toneMappingExposure !== undefined ) this.renderer.toneMappingExposure = project.toneMappingExposure;

		this.setScene( this.loader.parse( json.scene ) as THREE.Scene);
		this.setCamera( this.loader.parse( json.camera ) as THREE.Camera);

		var scriptWrapParams = 'player,renderer,scene,camera';
		var scriptWrapResultObj = {};

		for ( var eventKey in this.events ) {

			scriptWrapParams += ',' + eventKey;
			scriptWrapResultObj[ eventKey ] = eventKey;

		}

		const scriptWrapResult = JSON.stringify( scriptWrapResultObj ).replace( /\"/g, '' );

		for ( const uuid in json.scripts ) {

			const object = this.scene.getObjectByProperty( 'uuid', uuid );

			if ( object === undefined ) {

				console.warn( 'APP.Player: Script without object.', uuid );
				continue;

			}

			const scripts = json.scripts[ uuid ];

			for ( let i = 0; i < scripts.length; i ++ ) {

				const script = scripts[ i ];

				const functions = ( new Function( scriptWrapParams, script.source + '\nreturn ' + scriptWrapResult + ';' ).bind( object ) )( this, this.renderer, this.scene, this.camera );

				for ( const name in functions ) {

					if ( functions[ name ] === undefined ) continue;

					if ( this.events[ name as "init" | "start" | "stop" | "keydown" | "keyup" | "pointerdown" | "pointerup" | "pointermove" | "update" ] === undefined ) {

						console.warn( 'APP.Player: Event type not supported (', name, ')' );
						continue;

					}

					this.events[ name as "init" | "start" | "stop" | "keydown" | "keyup" | "pointerdown" | "pointerup" | "pointermove" | "update" ].push( functions[ name ].bind( object ) );

				}

			}

		}

		this.events.keydown.push(this.characterOnKeyDown);
		this.events.keydown.push(this.characterOnKeyUp);
		this.dispatch( this.events.init, arguments );
	}

	setCamera ( value: THREE.Camera ) {

		this.camera = value;
		(this.camera as THREE.PerspectiveCamera).aspect = (this.width as number) / (this.height as number);
		this.camera.updateMatrix();

	};

	setScene ( value: THREE.Scene ) {

		this.scene = value;

	};

	setPixelRatio ( pixelRatio: number ) {

		this.renderer.setPixelRatio( pixelRatio );

	};

	setSize ( width: number, height: number ) {

		this.width = width;
		this.height = height;

		if ( this.camera ) {

			(this.camera as THREE.PerspectiveCamera).aspect = (this.width as number) / (this.height as number);
			this.camera.updateMatrix();

		}

		this.renderer.setSize( width, height );

	};

	dispatch ( array: Function[], event: any ) {

		for ( var i = 0, l = array.length; i < l; i ++ ) {

			array[ i ]( event );

		}

	}

	animate () {

		this.time = performance.now();

		try {

			this.dispatch( this.events.update, { time: this.time - this.startTime, delta: this.time - this.prevTime } );

		} catch ( e : any ) {

			console.error( ( e.message || e ), ( e.stack || '' ) );

		}

		this.renderer.render( this.scene, this.camera );

		this.prevTime = this.time;

	}

	play () {

		this.startTime = this.prevTime = performance.now();

		document.addEventListener( 'keydown', this.onKeyDown );
		document.addEventListener( 'keyup', this.onKeyUp );
		document.addEventListener( 'pointerdown', this.onPointerDown );
		document.addEventListener( 'pointerup', this.onPointerUp );
		document.addEventListener( 'pointermove', this.onPointerMove );

		this.dispatch( this.events.start, arguments );

		this.renderer.setAnimationLoop( this.animate );

	};

	stop () {

		document.removeEventListener( 'keydown', this.onKeyDown );
		document.removeEventListener( 'keyup', this.onKeyUp );
		document.removeEventListener( 'pointerdown', this.onPointerDown );
		document.removeEventListener( 'pointerup', this.onPointerUp );
		document.removeEventListener( 'pointermove', this.onPointerMove );

		this.dispatch( this.events.stop, arguments );

		this.renderer.setAnimationLoop( null );

	};

	render ( time: number ) {

		this.dispatch( this.events.update, { time: time * 1000, delta: 0 /* TODO */ } );

		this.renderer.render( this.scene, this.camera );

	};

	dispose () {

		this.renderer.dispose();

		//this.camera = undefined;
		//this.scene = undefined;

	};


	onKeyDown( event: any ) {

		this.dispatch( this.events.keydown, event );

	}

	onKeyUp( event: any ) {

		this.dispatch( this.events.keyup, event );

	}

	onPointerDown( event: any ) {

		this.dispatch( this.events.pointerdown, event );

	}

	onPointerUp( event: any ) {

		this.dispatch( this.events.pointerup, event );

	}

	onPointerMove( event: any ) {

		this.dispatch( this.events.pointermove, event );

	}

	loadModel() {
		let group = this.group;
		let mixer = this.mixer;
		let actions = this.actions;
		const loader = new GLTFLoader();
		const downloadUrl = new URL('/Soldier.glb', import.meta.url);

		loader.load( downloadUrl.toString(), function ( gltf: any ) {

			const model = gltf.scene;
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

		});
	}
	
	updateCharacter( delta : number ) {

		const fade = this.controls.fadeDuration;
		const key = this.controls.key;
		const up = this.controls.up;
		const ease = this.controls.ease;
		const rotate = this.controls.rotate;
		const position = this.controls.position;

		const active = key[ 0 ] === 0 && key[ 1 ] === 0 ? false : true;
		const play = active ? ( key[ 2 ] ? 'Run' : 'Walk' ) : 'Idle';

		// change animation

		if (this.controls.current != play ) {

			const current = this.actions[ play ];
			const old = this.actions[this.controls.current as "Idle" | "Walk" | "Run"];
			this.controls.current = play;

			this.setWeight( current, 1.0 );
			old.fadeOut( fade );
			current.reset().fadeIn( fade ).play();
		}

		// move object

		if (this.controls.current !== 'Idle' ) {

		// run/walk velocity
		const velocity =this.controls.current == 'Run' ?this.controls.runVelocity :this.controls.walkVelocity;

		// direction with key
		ease.set( key[ 1 ], 0, key[ 0 ] ).multiplyScalar( velocity * delta );

		// calculate camera direction
		const angle = this.unwrapRad( Math.atan2( ease.x, ease.z ) + 0 );
		rotate.setFromAxisAngle( up, angle );

		// apply camera angle on ease
		this.controls.ease.applyAxisAngle( up, 0 );

		position.add( ease );

		this.group.position.copy( position );
		this.group.quaternion.rotateTowards( rotate,this.controls.rotateSpeed );

		this.followGroup.position.copy( position );
		}

		if ( this.mixer ) this.mixer.update( delta );

	}

	unwrapRad( r : number ) {

		return Math.atan2( Math.sin( r ), Math.cos( r ) );

	}

	setWeight( action:THREE.AnimationAction, weight: number ) {

		action.enabled = true;
		action.setEffectiveTimeScale( 1 );
		action.setEffectiveWeight( weight );

	}

	characterOnKeyDown( event: KeyboardEvent ) {

		const key =this.controls.key;
		switch ( event.code ) {

		case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = - 1; break;
		case 'ArrowDown': case 'KeyS': key[ 0 ] = 1; break;
		case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = - 1; break;
		case 'ArrowRight': case 'KeyD': key[ 1 ] = 1; break;
		case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 1; break;

		}

	}

	characterOnKeyUp( event: KeyboardEvent ) {

		const key =this.controls.key;
		switch ( event.code ) {

		case 'ArrowUp': case 'KeyW': case 'KeyZ': key[ 0 ] = key[ 0 ] < 0 ? 0 : key[ 0 ]; break;
		case 'ArrowDown': case 'KeyS': key[ 0 ] = key[ 0 ] > 0 ? 0 : key[ 0 ]; break;
		case 'ArrowLeft': case 'KeyA': case 'KeyQ': key[ 1 ] = key[ 1 ] < 0 ? 0 : key[ 1 ]; break;
		case 'ArrowRight': case 'KeyD': key[ 1 ] = key[ 1 ] > 0 ? 0 : key[ 1 ]; break;
		case 'ShiftLeft' : case 'ShiftRight' : key[ 2 ] = 0; break;

		}

	}

};