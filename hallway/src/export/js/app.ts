import * as THREE from './three.module.js'
var APP = {

	Player: function () {

		var renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio ); // TODO: Use player.setPixelRatio()

		var loader = new THREE.ObjectLoader();
		var camera, scene;

		var events = {};

		var dom = document.createElement( 'div' );
		dom.appendChild( renderer.domElement );

		this.dom = dom;
		this.canvas = renderer.domElement;

		this.width = 500;
		this.height = 500;

		this.load = function ( json ) {

			var project = json.project;

			if ( project.shadows !== undefined ) renderer.shadowMap.enabled = project.shadows;
			if ( project.shadowType !== undefined ) renderer.shadowMap.type = project.shadowType;
			if ( project.toneMapping !== undefined ) renderer.toneMapping = project.toneMapping;
			if ( project.toneMappingExposure !== undefined ) renderer.toneMappingExposure = project.toneMappingExposure;

			this.setScene( loader.parse( json.scene ) );
			this.setCamera( loader.parse( json.camera ) );

			events = {
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

			var scriptWrapParams = 'player,renderer,scene,camera';
			var scriptWrapResultObj = {};

			for ( var eventKey in events ) {

				scriptWrapParams += ',' + eventKey;
				scriptWrapResultObj[ eventKey ] = eventKey;

			}

			dispatch( events.init, arguments );

		};

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

		this.setCamera = function ( value ) {

			camera = value;
			camera.aspect = this.width / this.height;
			camera.updateProjectionMatrix();

		};

		this.setScene = function ( value ) {

			scene = value;

		};

		this.setPixelRatio = function ( pixelRatio ) {

			renderer.setPixelRatio( pixelRatio );

		};

		this.setSize = function ( width, height ) {

			this.width = width;
			this.height = height;

			if ( camera ) {

				camera.aspect = this.width / this.height;
				camera.updateProjectionMatrix();

			}

			renderer.setSize( width, height );

		};

		function dispatch( array, event ) {

			for ( var i = 0, l = array.length; i < l; i ++ ) {

				array[ i ]( event );

			}

		}

		var time, startTime, prevTime;

		function animate() {

			time = performance.now();

			try {

				dispatch( events.update, { time: time - startTime, delta: time - prevTime } );

			} catch ( e ) {

				console.error( ( e.message || e ), ( e.stack || '' ) );

			}

			renderer.render( scene, camera );

			prevTime = time;

		}

		this.play = function () {

			startTime = prevTime = performance.now();

			document.addEventListener( 'keydown', onKeyDown );
			document.addEventListener( 'keyup', onKeyUp );
			document.addEventListener( 'pointerdown', onPointerDown );
			document.addEventListener( 'pointerup', onPointerUp );
			document.addEventListener( 'pointermove', onPointerMove );

			dispatch( events.start, arguments );

			renderer.setAnimationLoop( animate );

		};

		this.stop = function () {

			document.removeEventListener( 'keydown', onKeyDown );
			document.removeEventListener( 'keyup', onKeyUp );
			document.removeEventListener( 'pointerdown', onPointerDown );
			document.removeEventListener( 'pointerup', onPointerUp );
			document.removeEventListener( 'pointermove', onPointerMove );

			dispatch( events.stop, arguments );

			renderer.setAnimationLoop( null );

		};

		this.render = function ( time ) {

			dispatch( events.update, { time: time * 1000, delta: 0 /* TODO */ } );

			renderer.render( scene, camera );

		};

		this.dispose = function () {

			renderer.dispose();

			camera = undefined;
			scene = undefined;

		};

		//

		function onKeyDown( event ) {

			dispatch( events.keydown, event );

		}

		function onKeyUp( event ) {

			dispatch( events.keyup, event );

		}

		function onPointerDown( event ) {

			dispatch( events.pointerdown, event );

		}

		function onPointerUp( event ) {

			dispatch( events.pointerup, event );

		}

		function onPointerMove( event ) {

			dispatch( events.pointermove, event );

		}

	}

};

export { APP };
