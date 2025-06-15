import { Component, AfterViewInit, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import * as THREE from 'three';

@Component({
	selector: 'app-hero',
	templateUrl: './hero.component.html',
	styleUrl: './hero.component.scss'
})
export class HeroComponent implements AfterViewInit, OnDestroy {
	@ViewChild('canvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

	private camera!: THREE.PerspectiveCamera;
	private scene!: THREE.Scene;
	private renderer!: THREE.WebGLRenderer;
	private controls!: OrbitControls;
	private globe!: THREE.Mesh;
	private markers!: THREE.Group;
	private mouse = new THREE.Vector2();

	private animationFrameId: number | null = null;

	private readonly cities = [
		{ name: '', lat: -33.8688, lon: 151.2093 },
		{ name: '', lat: 27.4356, lon: -107.9212 },
		{ name: '', lat: -20.4293, lon: -45.8799 },
		{ name: '', lat: -20.5807, lon: -69.9274 },
		{ name: '', lat: 36.1248, lon: 138.8889 },
		{ name: '', lat: 36.5236, lon: 120.2649 },
		{ name: '', lat: -2.5026, lon: 103.2075 },
		{ name: '', lat: 23.1422, lon: 78.2167 },
		{ name: '', lat: 42.4081, lon: 24.4241 },
		{ name: '', lat: 41.6621, lon: -5.0389 },
		{ name: '', lat: 52.1337, lon: -1.6406 },
		{ name: '', lat: 52.6324, lon: 45.0443 },
		{ name: '', lat: -20.3796, lon: 47.1076 },
		{ name: '', lat: 30.2174, lon: 31.6651 },
		{ name: '', lat: -27.4338, lon: 23.3775 },
		{ name: '', lat: 43.9403, lon: -122.2300 },
		{ name: '', lat: 27.0312, lon: -82.3586 },
		{ name: '', lat: 34.6105, lon: -120.3759 },
	];

	ngAfterViewInit(): void {
		this.createScene();
		this.animate();
	}

	ngOnDestroy(): void {
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId);
		}

		if (this.renderer) {
			this.renderer.dispose();
			this.renderer.forceContextLoss();
			const gl = this.renderer.domElement.getContext('webgl');
			if (gl) {
				gl.getExtension('WEBGL_lose_context')?.loseContext();
			}
		}
		if (this.controls) {
			this.controls.dispose();
		}

		this.scene.traverse((object) => {
			if (object instanceof THREE.Mesh) {
				if (object.geometry) {
					object.geometry.dispose();
				}
				if (object.material) {
					if (Array.isArray(object.material)) {
						for (const material of object.material) {
							material.dispose();
						}
					} else {
						object.material.dispose();
					}
				}
			}
		});

		// @ts-ignore
		this.scene = null;
		// @ts-ignore
		this.camera = null;
		// @ts-ignore
		this.renderer = null;
		// @ts-ignore
		this.controls = null;
	}

	@HostListener('window:resize', ['$event'])
	onResize(): void {
		if (this.camera && this.renderer) {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(window.innerWidth, window.innerHeight);
		}
	}

	@HostListener('mousemove', ['$event'])
	onMouseMove(event: MouseEvent): void {
		const rect = this.canvasRef.nativeElement.getBoundingClientRect();
		this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
	}

	private createScene(): void {
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color(0x000000);

		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
		this.camera.position.z = 15;

		this.renderer = new THREE.WebGLRenderer({ canvas: this.canvasRef.nativeElement, antialias: true, alpha: false });
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setPixelRatio(window.devicePixelRatio);

		const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
		directionalLight.position.set(50, 20, 30);
		this.scene.add(directionalLight);

		const pointLight = new THREE.PointLight(0xffffff, 1);
		pointLight.position.set(20, 10, 20);
		this.scene.add(pointLight);

		this.controls = new OrbitControls(this.camera, this.renderer.domElement);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.05;
		this.controls.minDistance = 13;
		this.controls.maxDistance = 30;
		this.controls.enablePan = false;
		this.controls.autoRotate = true;
		this.controls.autoRotateSpeed = 2;

		this.createGlobe();
		this.createAtmosphere();
		this.createStars();
		this.createCityMarkers();
	}

	private createGlobe(): void {
		const textureLoader = new THREE.TextureLoader();
		const globeGeometry = new THREE.SphereGeometry(10, 64, 64);
		const globeMaterial = new THREE.MeshStandardMaterial({
			map: textureLoader.load('assets/textures/earth.jpg'),
			metalness: 0.3,
			roughness: 0.6
		});
		this.globe = new THREE.Mesh(globeGeometry, globeMaterial);
		this.scene.add(this.globe);
	}

	private createAtmosphere(): void {
		const atmosphereGeometry = new THREE.SphereGeometry(10, 64, 64);
		const atmosphereMaterial = new THREE.ShaderMaterial({
			vertexShader: `
				varying vec3 vertexNormal;
				void main() {
					vertexNormal = normalize(normalMatrix * normal);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				varying vec3 vertexNormal;
				void main() {
					float intensity = pow(0.8 - dot(vertexNormal, vec3(0.0, 0.0, 1.0)), 2.0);
					gl_FragColor = vec4(0.3, 0.6, 1.0, 1.0) * intensity * 2.0;
				}
			`,
			blending: THREE.AdditiveBlending,
			side: THREE.BackSide,
			transparent: true,
			depthWrite: false,
		});
		const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
		atmosphere.scale.set(1.11, 1.11, 1.11);
		this.scene.add(atmosphere);

		const atmosphereOuterGeometry = new THREE.SphereGeometry(10, 64, 64);
		const atmosphereOuterMaterial = new THREE.ShaderMaterial({
			vertexShader: `
				varying vec3 vertexNormal;
				void main() {
					vertexNormal = normalize(normalMatrix * normal);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				varying vec3 vertexNormal;
				void main() {
					float intensity = pow(0.7 - dot(vertexNormal, vec3(0.0, 0.0, 1.0)), 1.5);
					gl_FragColor = vec4(0.3, 0.6, 1.0, 0.5) * intensity;
				}
			`,
			blending: THREE.AdditiveBlending,
			side: THREE.BackSide,
			transparent: true,
			depthWrite: false
		});
		const atmosphereOuter = new THREE.Mesh(atmosphereOuterGeometry, atmosphereOuterMaterial);
		atmosphereOuter.scale.set(1.25, 1.25, 1.25);
		this.scene.add(atmosphereOuter);
	}

	private createStars(): void {
		const starGeometry = new THREE.BufferGeometry();
		const starMaterial = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 0.3,
			sizeAttenuation: true,
		});

		const numStars = 20000;
		const starVertices = [];
		const starFieldRadius = 2000;

		for (let i = 0; i < numStars; i++) {
			const u = Math.random();
			const v = Math.random();
			const theta = u * Math.PI * 2;
			const phi = Math.acos(2 * v - 1);
			const x = starFieldRadius * Math.sin(phi) * Math.cos(theta);
			const y = starFieldRadius * Math.sin(phi) * Math.sin(theta);
			const z = starFieldRadius * Math.cos(phi);
			starVertices.push(x, y, z);
		}

		starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
		const stars = new THREE.Points(starGeometry, starMaterial);
		this.scene.add(stars);
	}

	private createCityMarkers(): void {
		this.markers = new THREE.Group();
		const markerMaterial = new THREE.MeshBasicMaterial({ color: 0x00dddd });
		const markerGeometry = new THREE.SphereGeometry(0.05, 10, 10);

		this.cities.forEach(city => {
			const phi = (90 - city.lat) * (Math.PI / 180);
			const theta = (city.lon + 180) * (Math.PI / 180);
			const radius = 10;
			const x = -(radius * Math.sin(phi) * Math.cos(theta));
			const z = radius * Math.sin(phi) * Math.sin(theta);
			const y = radius * Math.cos(phi);

			const marker = new THREE.Mesh(markerGeometry, markerMaterial.clone());
			marker.position.set(x, y, z);
			marker.userData = { name: city.name };
			this.markers.add(marker);
		});
		this.globe.add(this.markers);
	}

	private animate = (): void => {
		this.animationFrameId = requestAnimationFrame(this.animate);

		this.controls.update();

		this.renderer.render(this.scene, this.camera);
	}
}