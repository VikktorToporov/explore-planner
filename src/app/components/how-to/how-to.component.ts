import { Component, AfterViewInit, ElementRef, ViewChild, HostListener, ChangeDetectorRef, ViewChildren, QueryList } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { ImageModalComponent, ImageModalData } from '../image-modal/image-modal.component';

import * as THREE from 'three';

@Component({
	selector: 'app-how-to',
	templateUrl: './how-to.component.html',
	styleUrls: ['./how-to.component.scss']
})
export class HowToComponent implements AfterViewInit {
	@ViewChild('threeCanvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
	@ViewChildren('reveal') private revealElements!: QueryList<ElementRef>;

	private scene!: THREE.Scene;
	private camera!: THREE.PerspectiveCamera;
	private renderer!: THREE.WebGLRenderer;

	private starField!: THREE.Points;
	private earth!: THREE.Mesh;
	private moon!: THREE.Mesh;
	private textureLoader = new THREE.TextureLoader();

	private observer!: IntersectionObserver;

	constructor(private cdr: ChangeDetectorRef, private dialog: MatDialog) {}

	ngAfterViewInit(): void {
		this.initThree();
		this.initLighting();
		this.createStarfield();
		this.createEarth();
		this.createMoon();
		this.animate();
		this.initIntersectionObserver();

		this.revealElements.changes.subscribe(() => {
				this.observeElements();
		});
		this.observeElements();

		this.cdr.detectChanges();
	}

	openImageModal(src: string, alt: string, caption?: string): void {
		this.dialog.open(ImageModalComponent, {
			data: { src, alt, caption } as ImageModalData,
			maxWidth: '95vw',
			maxHeight: '95vh',
			panelClass: 'image-modal-panel'
		});
	}

	private initThree(): void {
		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.camera.position.z = 5;

		this.renderer = new THREE.WebGLRenderer({
			canvas: this.canvasRef.nativeElement,
			alpha: true,
		});
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.renderer.setClearColor(0x000000, 0);
	}

	private initLighting(): void {
		const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
		this.scene.add(ambientLight);

		const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
		directionalLight.position.set(5, 3, 5);
		this.scene.add(directionalLight);
	}

	private createEarth(): void {
		const earthTexture = this.textureLoader.load('assets/textures/earth.jpg');
		const geometry = new THREE.SphereGeometry(2.5, 64, 64);
		const material = new THREE.MeshStandardMaterial({
				map: earthTexture,
				roughness: 0.9,
				metalness: 0.1
		});

		this.earth = new THREE.Mesh(geometry, material);
		this.earth.position.set(8, -5, -20);
		this.scene.add(this.earth);
	}

	private createMoon(): void {
		const moonTexture = this.textureLoader.load('assets/textures/moon.jpg');
		const geometry = new THREE.SphereGeometry(0.625, 32, 32);
		const material = new THREE.MeshStandardMaterial({
				map: moonTexture,
				roughness: 0.95,
				metalness: 0.1
		});

		this.moon = new THREE.Mesh(geometry, material);
		this.moon.position.set(-8, -4, -15);
		this.scene.add(this.moon);
	}


	private createStarfield(): void {
		const starCount = 10000;
		const vertices = [];
		for (let i = 0; i < starCount; i++) {
			const x = (Math.random() - 0.5) * 2000;
			const y = (Math.random() - 0.5) * 2000;
			const z = (Math.random() - 0.5) * 2000;
			vertices.push(x, y, z);
		}

		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));

		const material = new THREE.PointsMaterial({
			color: 0xffffff,
			size: 1.2,
			map: this.createStarTexture(),
			transparent: true,
			blending: THREE.AdditiveBlending,
			depthWrite: false,
		});

		this.starField = new THREE.Points(geometry, material);
		this.scene.add(this.starField);
	}

		private createStarTexture(): THREE.Texture {
				const canvas = document.createElement('canvas');
				canvas.width = 32;
				canvas.height = 32;
				const context = canvas.getContext('2d')!;
				const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
				gradient.addColorStop(0, 'rgba(255,255,255,1)');
				gradient.addColorStop(0.2, 'rgba(255,255,255,0.7)');
				gradient.addColorStop(0.4, 'rgba(190,190,255,0.4)');
				gradient.addColorStop(1, 'rgba(0,0,0,0)');
				context.fillStyle = gradient;
				context.fillRect(0, 0, 32, 32);
				return new THREE.CanvasTexture(canvas);
		}

	private animate(): void {
		requestAnimationFrame(this.animate.bind(this));

		this.starField.rotation.y += 0.00005;
		this.starField.rotation.x += 0.00005;

		if (this.earth) {
				this.earth.rotation.y += 0.0008;
		}

		if (this.moon) {
				this.moon.rotation.y += 0.001;
		}

		this.renderer.render(this.scene, this.camera);
	}

	private initIntersectionObserver(): void {
		const options = {
			root: null,
			rootMargin: '0px',
			threshold: 0.1
		};

		this.observer = new IntersectionObserver((entries, observer) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-visible');
					observer.unobserve(entry.target);
				}
			});
		}, options);
	}

	private observeElements(): void {
		this.revealElements.forEach(el => {
			this.observer.observe(el.nativeElement);
		});
	}

	@HostListener('window:scroll', ['$event'])
	onWindowScroll() {
		const scrollY = window.scrollY;
		this.camera.position.y = -scrollY * 0.01;
		this.camera.position.x = -scrollY * 0.001;

		if (this.earth) {
				this.earth.position.y = -5 - scrollY * 0.005;
		}

		if (this.moon) {
				this.moon.position.y = -4 - scrollY * 0.007;
		}
	}

	@HostListener('window:resize', ['$event'])
	onWindowResize() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
	}
}