import * as THREE from 'three';

export class Atmosphere {
  private clouds = new THREE.Group();
  private sun: THREE.Mesh;
  private stars: THREE.Points;
  private hemi: THREE.HemisphereLight;
  private light: THREE.DirectionalLight;
  private day = true;
  private skyColor = new THREE.Color('#a9d6dd');
  private targetSky = new THREE.Color('#a9d6dd');

  constructor(private scene: THREE.Scene) {
    scene.background = this.skyColor;
    scene.fog = new THREE.Fog('#c9ddd7', 48, 130);
    this.hemi = new THREE.HemisphereLight('#e7f4ef', '#6e7860', 2.3);
    this.light = new THREE.DirectionalLight('#fff0cc', 2.4);
    this.light.position.set(-32, 58, 24);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(2048, 2048);
    Object.assign(this.light.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 150 });
    this.light.shadow.normalBias = 0.035;
    this.light.shadow.bias = -0.00025;
    scene.add(this.hemi, this.light);

    const cloudMaterial = new THREE.MeshLambertMaterial({ color: '#fffef1', transparent: true, opacity: 0.86 });
    const box = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const x = Math.sin(i * 78.23) * 115;
      const z = -95 + Math.cos(i * 41.43) * 90;
      cloud.position.set(x, 40 + (i % 4) * 5, z);
      const lobes = 3 + i % 3;
      for (let j = 0; j < lobes; j++) {
        const piece = new THREE.Mesh(box, cloudMaterial);
        piece.scale.set(8 + (j % 3) * 3, 1.4 + (j % 2) * 1.2, 5 + (j % 2) * 3);
        piece.position.set(j * 5 - lobes * 2.5, j % 2, (j % 3) * 2);
        cloud.add(piece);
      }
      this.clouds.add(cloud);
    }
    scene.add(this.clouds);
    this.sun = new THREE.Mesh(new THREE.BoxGeometry(7, 7, 1), new THREE.MeshBasicMaterial({ color: '#fff2c6', fog: false }));
    this.sun.position.set(-65, 76, -115);
    scene.add(this.sun);

    const starPositions = new Float32Array(600);
    for (let i = 0; i < 200; i++) {
      const angle = i * 137.508 * Math.PI / 180;
      const elevation = 0.15 + (i % 41) / 41 * 1.35;
      starPositions[i * 3] = Math.cos(angle) * Math.cos(elevation) * 160;
      starPositions[i * 3 + 1] = Math.sin(elevation) * 160;
      starPositions[i * 3 + 2] = Math.sin(angle) * Math.cos(elevation) * 160;
    }
    const starsGeometry = new THREE.BufferGeometry();
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: '#fff8de', size: 0.35, transparent: true, opacity: 0, fog: false }));
    scene.add(this.stars);

    // A distant, noninteractive silhouette keeps the finite island's horizon soft.
    const mountainMaterial = new THREE.MeshLambertMaterial({ color: '#718f84', flatShading: true });
    const mountains = new THREE.InstancedMesh(box, mountainMaterial, 110);
    const transform = new THREE.Object3D();
    for (let i = 0; i < 110; i++) {
      const x = (i % 22 - 11) * 10;
      const z = -58 - Math.floor(i / 22) * 10;
      const h = 12 + Math.sin(x * 0.057) * 7 + Math.sin(x * 0.13 + z * 0.05) * 6 + Math.floor(i / 22) * 2;
      transform.position.set(x, h / 2 - 2, z);
      transform.scale.set(10, Math.max(2, h), 10);
      transform.updateMatrix();
      mountains.setMatrixAt(i, transform.matrix);
    }
    scene.add(mountains);
  }

  setDay(day: boolean) {
    this.day = day;
    this.targetSky.set(day ? '#a9d6dd' : '#142a43');
    (this.sun.material as THREE.MeshBasicMaterial).color.set(day ? '#fff2c6' : '#e6edda');
  }

  setDistance(distance: number) {
    const fog = this.scene.fog as THREE.Fog;
    fog.near = distance * 0.6;
    fog.far = distance * 1.65;
  }

  update(dt: number) {
    const blend = 1 - Math.exp(-dt * 2.5);
    this.skyColor.lerp(this.targetSky, blend);
    (this.scene.fog as THREE.Fog).color.lerp(new THREE.Color(this.day ? '#c9ddd7' : '#203c50'), blend);
    this.hemi.intensity = THREE.MathUtils.lerp(this.hemi.intensity, this.day ? 2.3 : 0.85, blend);
    this.light.intensity = THREE.MathUtils.lerp(this.light.intensity, this.day ? 2.4 : 0.55, blend);
    const material = this.stars.material as THREE.PointsMaterial;
    material.opacity = THREE.MathUtils.lerp(material.opacity, this.day ? 0 : 0.85, blend);
    for (const cloud of this.clouds.children) {
      cloud.position.x += dt * 0.22;
      if (cloud.position.x > 150) cloud.position.x = -150;
    }
  }
}
