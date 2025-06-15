import { Component, ElementRef, AfterViewInit, ViewChild, OnDestroy, NgZone, Input, SimpleChanges, OnChanges, EventEmitter, Output } from '@angular/core';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import * as THREE from 'three';

export interface Stop {
	name: string;
	lat: number;
	lng: number;
}

@Component({
	selector: 'app-globe',
	templateUrl: './globe.component.html',
	styleUrls: ['./globe.component.scss']
})
export class GlobeComponent implements AfterViewInit, OnDestroy, OnChanges {
	@ViewChild('globeContainer', { static: true }) private globeContainer!: ElementRef;

	@Input() stops: Stop[] = [];
	@Input('planet') selectedPlanet: any = 'earth.jpg';

	@Output() coordinateClick = new EventEmitter<{ lat: number, lng: number }>();

	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private renderer!: THREE.WebGLRenderer;
	private currentMesh!: THREE.Mesh;
	private controls!: OrbitControls;
	private markersGroup = new THREE.Group();

	private stars!: THREE.Points;
	private atmosphere!: THREE.Mesh;

	private animationId: number = 0;
	private raycaster = new THREE.Raycaster();
	private mouse = new THREE.Vector2();

	private clickStartTime: number = 0;
	private initialMousePosition = new THREE.Vector2();
	private clickThresholdTimeMs = 250;
	private dragThresholdPx = 5;

	autoRotateEnabled: boolean = true;
	isGlobeMode: boolean = true;

	private MAP_WIDTH = 20;
	private MAP_HEIGHT = 10;
	private MARKER_Z_OFFSET = 0.05;
	private GLOBE_RADIUS = 5;
	private GLOBE_SEGMENTS = 64;

	constructor(private ngZone: NgZone) { }

	ngAfterViewInit(): void {
		this.createCoreScene();
		this.updateDisplayMode();
		this.animate();
	}

	ngOnChanges(changes: SimpleChanges): void {
		if (changes['stops'] && this.currentMesh) {
			this.updateMarkers();
		}

		if (changes['selectedPlanet']) {
			this.updateDisplayMode();
		}
	}

	ngOnDestroy(): void {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
		}
		window.removeEventListener('resize', this.onWindowResize);
		const container = this.globeContainer.nativeElement;
		if (container) {
			container.removeEventListener('mousedown', this.onMouseDown);
			container.removeEventListener('mouseup', this.onMouseUp);
		}
		if (this.controls) {
			this.controls.dispose();
		}
		if (this.renderer) {
			this.renderer.dispose();
			while (container.firstChild) {
				container.removeChild(container.firstChild);
			}
		}
		if (this.scene) {
				if (this.stars) {
						this.stars.geometry.dispose();
						(this.stars.material as THREE.Material).dispose();
				}

				if (this.atmosphere) {
						this.atmosphere.geometry.dispose();
						(this.atmosphere.material as THREE.Material).dispose();
				}

				this.scene.children.forEach(child => {
					if (child instanceof THREE.Mesh) {
						child.geometry.dispose();
						
						(child.material as THREE.Material).dispose();
					}
					
					this.scene.remove(child);
				});
		}

		this.markersGroup = new THREE.Group();
	}

	private createCoreScene(): void {
		const container = this.globeContainer.nativeElement;

		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x000005);

		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setSize(container.clientWidth, container.clientHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);
		container.appendChild(this.renderer.domElement);

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		this.scene.add(ambientLight);
		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
		directionalLight.position.set(10, 10, 10);
		this.scene.add(directionalLight);

		this.createStars();

		container.addEventListener('mousedown', this.onMouseDown.bind(this));
		container.addEventListener('mouseup', this.onMouseUp.bind(this));

		window.addEventListener('resize', this.onWindowResize.bind(this), false);
	}

	public toggleDisplayMode(): void {
		this.isGlobeMode = !this.isGlobeMode;
		this.updateDisplayMode();
	}

	private updateDisplayMode(): void {
		 if (this.scene && this.stars) {
			if (this.currentMesh) {
				this.scene.remove(this.currentMesh);
				this.currentMesh.geometry.dispose();
				(this.currentMesh.material as THREE.Material).dispose();
				this.markersGroup = new THREE.Group();
			}

			if (this.controls) {
				this.controls.dispose();
			}
			
			if (this.atmosphere) {
					this.scene.remove(this.atmosphere);
					this.atmosphere.geometry.dispose();
					(this.atmosphere.material as THREE.Material).dispose();
			}
			
			while(this.markersGroup.children.length > 0){
				this.markersGroup.remove(this.markersGroup.children[0]);
			}

			const textureLoader = new THREE.TextureLoader();
			const earthTexture = textureLoader.load(
				`assets/textures/${this.selectedPlanet}`,
				() => { this.updateMarkers(); }
			);

			if (this.isGlobeMode) {
				this.createGlobe(earthTexture);
				this.atmosphere = this.createAtmosphere();
				this.scene.add(this.atmosphere);
			} else {
				this.createMap(earthTexture);
			}
			
			this.stars.visible = this.isGlobeMode;

			const container = this.globeContainer.nativeElement;
			this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 2000);

			if (this.isGlobeMode) {
				this.camera.position.set(0, 5, 20);
				this.camera.lookAt(0, 0, 0);

				this.controls = new OrbitControls(this.camera, this.renderer.domElement);
				this.controls.minDistance = 8;
				this.controls.maxDistance = 50;
				this.controls.enableRotate = true;
				this.controls.screenSpacePanning = false;
				this.controls.target.set(0, 0, 0);
				this.controls.autoRotate = this.autoRotateEnabled;
				this.controls.autoRotateSpeed = 0.5;
			} else {
				this.camera.position.set(0, 0, 15);
				this.camera.lookAt(0, 0, 0);

				this.controls = new OrbitControls(this.camera, this.renderer.domElement);
				this.controls.minDistance = 5;
				this.controls.maxDistance = 30;
				this.controls.enableRotate = false;
				this.controls.screenSpacePanning = true;
				this.controls.target.set(0, 0, 0);
				this.controls.autoRotate = false;
			}

			this.controls.enableDamping = true;
			this.controls.dampingFactor = 0.05;
			this.controls.update();
		}
	}

	private createStars(): void {
		const starVertices = [];
		for (let i = 0; i < 10000; i++) {
				const x = (Math.random() - 0.5) * 2000;
				const y = (Math.random() - 0.5) * 2000;
				const z = -Math.random() * 2000;
				starVertices.push(x, y, z);
		}

		const starGeometry = new THREE.BufferGeometry();
		starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
		
		const starMaterial = new THREE.PointsMaterial({
				color: 0xffffff,
				size: 0.7,
				transparent: true
		});

		this.stars = new THREE.Points(starGeometry, starMaterial);
		this.scene.add(this.stars);
	}
	
	private createAtmosphere(): THREE.Mesh {
		const atmosphereGeometry = new THREE.SphereGeometry(this.GLOBE_RADIUS + 0.8, this.GLOBE_SEGMENTS, this.GLOBE_SEGMENTS);
		
		const vertexShader = `
				varying vec3 vertexNormal;
				void main() {
						vertexNormal = normalize(normalMatrix * normal);
						gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
		`;
		const fragmentShader = `
				varying vec3 vertexNormal;
				void main() {
						float intensity = pow(0.6 - dot(vertexNormal, vec3(0.0, 0.0, 1.0)), 2.0);
						gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity;
				}
		`;

		const atmosphereMaterial = new THREE.ShaderMaterial({
				vertexShader,
				fragmentShader,
				blending: THREE.AdditiveBlending,
				side: THREE.BackSide,
				transparent: true
		});

		return new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
	}

	private createGlobe(texture: THREE.Texture): void {
		const geometry = new THREE.SphereGeometry(this.GLOBE_RADIUS, this.GLOBE_SEGMENTS, this.GLOBE_SEGMENTS);
		const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.9, metalness: 0.1 });
		this.currentMesh = new THREE.Mesh(geometry, material);
		this.currentMesh.add(this.markersGroup);
		this.scene.add(this.currentMesh);
		this.autoRotateEnabled = true;
	}

	private createMap(texture: THREE.Texture): void {
		const geometry = new THREE.PlaneGeometry(this.MAP_WIDTH, this.MAP_HEIGHT);
		const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.1, side: THREE.DoubleSide });
		this.currentMesh = new THREE.Mesh(geometry, material);
		this.currentMesh.add(this.markersGroup);
		this.scene.add(this.currentMesh);
		this.autoRotateEnabled = false;
	}

	private onMouseDown = (event: MouseEvent): void => {
		this.clickStartTime = performance.now();
		this.initialMousePosition.set(event.clientX, event.clientY);
	}

	private onMouseUp = (event: MouseEvent): void => {
		const clickDuration = performance.now() - this.clickStartTime;
		const currentMousePosition = new THREE.Vector2(event.clientX, event.clientY);
		const mouseMovement = currentMousePosition.distanceTo(this.initialMousePosition);

		if (clickDuration < this.clickThresholdTimeMs && mouseMovement < this.dragThresholdPx) {
			this.handleQuickClick(event);
		}
	}

	private handleQuickClick(event: MouseEvent): void {
		const container = this.globeContainer.nativeElement;
		const rect = container.getBoundingClientRect();
		this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

		this.raycaster.setFromCamera(this.mouse, this.camera);
		const intersects = this.raycaster.intersectObject(this.currentMesh);

		if (intersects.length > 0) {
			const point = intersects[0].point;
			const { lat, lng } = this.cartesianToLatLng(point);
			this.coordinateClick.emit({ lat, lng });
		}
	}

	private cartesianToLatLng(pos: THREE.Vector3): { lat: number; lng: number } {
		if (this.isGlobeMode) {
			const normalizedPos = pos.clone().normalize();
			const lat = 90 - (Math.acos(normalizedPos.y) * 180) / Math.PI;
			let theta = Math.atan2(normalizedPos.z, -normalizedPos.x);
			let lng = (theta * 180) / Math.PI;
			if (lng < 0) {
				lng += 360;
			}
			lng -= 180;
			return { lat, lng };
		} else {
			const lng = (pos.x / (this.MAP_WIDTH / 2)) * 180;
			const lat = (pos.y / (this.MAP_HEIGHT / 2)) * 90;
			return { lat, lng };
		}
	}

	private updateMarkers(): void {
		while(this.markersGroup.children.length > 0){
			this.markersGroup.remove(this.markersGroup.children[0]);
		}

		const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16);
		const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00dddd });

		this.stops.forEach(stop => {
			const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
			const position = this.latLngToSceneCoords(stop.lat, stop.lng);
			markerMesh.position.copy(position);
			this.markersGroup.add(markerMesh);
		});
	}

	private onWindowResize = (): void => {
		const container = this.globeContainer.nativeElement;
		if (container) {
			this.camera.aspect = container.clientWidth / container.clientHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(container.clientWidth, container.clientHeight);
		}
	}

	private latLngToSceneCoords(lat: number, lng: number): THREE.Vector3 {
		if (this.isGlobeMode) {
			const phi = (90 - lat) * (Math.PI / 180);
			const theta = (lng + 180) * (Math.PI / 180);
			const x = -this.GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
			const y = this.GLOBE_RADIUS * Math.cos(phi);
			const z = this.GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
			return new THREE.Vector3(x, y, z);
		} else {
			const x = (lng / 180) * (this.MAP_WIDTH / 2);
			const y = (lat / 90) * (this.MAP_HEIGHT / 2);
			return new THREE.Vector3(x, y, this.MARKER_Z_OFFSET);
		}
	}

	private animate = (): void => {
		this.ngZone.runOutsideAngular(() => {
			this.animationId = requestAnimationFrame(this.animate);

			if (this.autoRotateEnabled && this.currentMesh && !this.isGlobeMode) {
				this.currentMesh.rotation.z += 0.001;
			}

			this.controls.update();
			this.renderer.render(this.scene, this.camera);
		});
	}

	public toggleAutoRotate(): void {
		this.autoRotateEnabled = !this.autoRotateEnabled;
		if (this.isGlobeMode && this.controls) {
			this.controls.autoRotate = this.autoRotateEnabled;
		}
	}
}