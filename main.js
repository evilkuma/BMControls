THREE.Vector3.prototype.toFixed = function(a = 10) {
  this.x = +this.x.toFixed(a)
  this.y = +this.y.toFixed(a)
  this.z = +this.z.toFixed(a)
  return this
}
THREE.Vector3.prototype.abs = function() {
  this.x = Math.abs(this.x)
  this.y = Math.abs(this.y)
  this.z = Math.abs(this.z)
  return this
}

var scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222)
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.set(0, 8, 3/*5*/);
camera.lookAt(scene.position)

var renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var light = new THREE.AmbientLight( 0x404040, 0.7 ); 
scene.add( light );

var pointLight = new THREE.PointLight( 0xffffff, 0.7, 100 );
pointLight.position.copy(camera.position.clone().divide(new THREE.Vector3(2, 1, 5)))
scene.add( pointLight );

var animate = function () {
    requestAnimationFrame( animate );

    renderer.render( scene, camera );
};

animate();

var points = [
  [-4, -4], [-4, 0], 
  // [-1, 0], 
  [-1, 4], [4, 4], [4, -4]
]
for(var point of points) {
  var textMesh = new TextMesh(point.join(', '), 'lightgreen')
  textMesh.position.set(point[0], 0.1, -point[1])
  scene.add(textMesh)
}

var geometry = new THREE.Shape();

geometry.moveTo(...points[0]);
for(var i = 0; i < points.length; i++)
  geometry.lineTo(...points[i]);
geometry.lineTo(...points[0]);

geometry = new THREE.ShapeGeometry(geometry);

var material = new THREE.MeshPhongMaterial( { color: 0x074c24 } );
var plane = new THREE.Mesh( geometry, material );
plane.rotation.x = -Math.PI/2

scene.add( plane );

var edgesGeometry = new THREE.EdgesGeometry(geometry)
var lineMaterial = new THREE.LineBasicMaterial({ color: 'red' })
var lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial)

lineSegments.position.copy(plane.position)
lineSegments.rotation.copy(plane.rotation)
lineSegments.scale.copy(plane.scale)
scene.add(lineSegments)

var planes = []

for(var i = 0; i < points.length; i++) {
  var point1 = points[i]
  var point2 = points[i+1 === points.length ? 0 : i+1]
  var v1 = new THREE.Vector3(point1[0], 0, -point1[1])
  var v2 = new THREE.Vector3(point2[0], 0, -point2[1])
  var position = v2.clone().add(v1).divideScalar(2)
  var sub = v2.clone().sub(v1)
  var vec = sub.clone().normalize()
  var rvec = vec.clone().applyEuler(new THREE.Euler(0, -Math.PI/2, 0)).toFixed()
  
  var p = new THREE.Plane( rvec, rvec.clone().multiply(position).length() );

  var from = v1.clone().multiply(vec.abs())
  var to = v2.clone().multiply(vec.abs())
  var max = new THREE.Vector3( Math.max(from.x, to.x), 0, Math.max(from.z, to.z) )
  var min = new THREE.Vector3( Math.min(from.x, to.x), 0, Math.min(from.z, to.z) )
  p.userData = { max, min, rvec, vec }

  planes.push(p)
}

// raycast
var ray = new THREE.Ray
var raycaster = new THREE.Raycaster
var mouse = new THREE.Vector2

const box = new CubeMesh()
scene.add(box)

var obj;

/**
 * Определяет по координатам плоскости, на какой кубмэш направлена
 * мышка и выделяет его красным цветом
 */
function markRay(x, y) {    
  mouse.x = ( x / window.innerWidth ) * 2 - 1;
  mouse.y = - ( y / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );
  var intersects = raycaster.intersectObjects( scene.children );

  for(let mesh of scene.children) {
    if(mesh instanceof CubeMesh) {
      mesh.mark()
    }
  }

  if(intersects.length && intersects[0].object instanceof CubeMesh) {
    intersects[0].object.mark('red')
  }
}

/**
 * перемещает выделеный обьект по сцене
 * по координатам плоскости
 */
function moveSelected(x, y) {
  mouse.x = ( x / window.innerWidth ) * 2 - 1;
  mouse.y = - ( y / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );
  var intersect = raycaster.intersectObjects( scene.children ).find(i => i.object === plane);
  
  if(intersect) {

    var b = new THREE.Box3().setFromObject(obj)
    b.min.x += intersect.point.x - obj.position.x
    b.min.z += intersect.point.z - obj.position.z
    b.max.x += intersect.point.x - obj.position.x
    b.max.z += intersect.point.z - obj.position.z

    var isReturn = false

    for(var p of planes) {

      // проверка на вхождение в промежуток
      // TODO: доработать проверку, что бы она работала по bb, а не position
      if(
        (obj.position.x < p.userData.max.x && obj.position.x > p.userData.min.x) ||
        (obj.position.z < p.userData.max.z && obj.position.z > p.userData.min.z) 
      ) {

        if(b.intersectsPlane(p)) {
          
          var dir = intersect.point.clone().sub(obj.position)
          dir.y = 0
          dir.normalize()

          ray.set(intersect.point, p.userData.rvec.clone().multiplyScalar(-1))

          var pos = ray.intersectPlane(p)

          if(pos) {
            // TODO: исправить подсчет позиции для косых стен
            var size = b.getSize(new THREE.Vector3)
            pos.add(size.clone().divideScalar(2).multiply(p.userData.rvec))
            
            if(isReturn) {
              var force = pos.clone().multiply(p.userData.rvec).toFixed(10)
              if(force.x) obj.position.x = pos.x
              if(force.z) obj.position.z = pos.z
            } else {
              obj.position.x = pos.x
              obj.position.z = pos.z
            }

          }

          isReturn = true

        }

      }

    }

    if(!isReturn) {
      obj.position.x = intersect.point.x
      obj.position.z = intersect.point.z
    }

  }
}

/**
 * Events 
 */

function onMouseMove(e) {

  if(obj) {
    // move selected
    moveSelected(e.clientX, e.clientY)

  } else {
    // mark ray
    markRay(e.clientX, e.clientY)
  
  }
  
}

function onMouseDown(e) {
	mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
  mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );
  var intersects = raycaster.intersectObjects( scene.children );

  if(intersects.length && intersects[0].object instanceof CubeMesh) {
    obj = intersects[0].object
    obj.mark('green')
  }
}

function onMouseUp(e) {
  if(obj) {
    obj.mark()
    obj = null
    markRay(e.clientX, e.clientY)
  }
}

window.addEventListener( 'mousemove', onMouseMove, false );
window.addEventListener( 'mousedown', onMouseDown, false );
window.addEventListener( 'mouseup', onMouseUp, false );
