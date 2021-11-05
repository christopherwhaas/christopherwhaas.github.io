
import * as THREE from 'https://cdn.skypack.dev/three@0.134.0';

import { OrbitControls } from 'https://cdn.skypack.dev/three@0.134.0/examples/jsm/controls/OrbitControls.js';

 


          
const container = document.getElementById('biz-card');


const scene = new THREE.Scene();



const camera = new THREE.PerspectiveCamera( 75, container.clientWidth / container.clientHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize( container.clientWidth, container.clientHeight );



container.appendChild( renderer.domElement );

const textureFront = new THREE.TextureLoader().load('assets/images/frontBizCard.png');
const textureBack = new THREE.TextureLoader().load('assets/images/backBizCard.png');

const geometry = new THREE.BoxGeometry(0.1,175,100,1,1,1);

var materials = [new THREE.MeshBasicMaterial({map: textureFront}),
                 new THREE.MeshBasicMaterial({map: textureBack}),
                ];


const card = new THREE.Mesh( geometry, materials );

card.rotation.y = -Math.PI / 2 + 0.4; 

scene.add( card );

camera.position.z = 175;


const controls = new OrbitControls( camera, renderer.domElement);


const animate = function () {
    requestAnimationFrame( animate );


    renderer.render( scene, camera );
};

animate();


window.addEventListener('resize', onWindowResize, false);


function onWindowResize() {
 
   
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(container.clientWidth, container.clientHeight);

}