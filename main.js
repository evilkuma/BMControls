var scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222)
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );
camera.position.set(-3, 8, 0/*5*/);
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

// plane
// var geometry = new THREE.PlaneGeometry( 8, 8 );
var points = [
  [-4, -4], [-4, 0], [-1, 0], [-1, 4], [4, 4], [4, -4]
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

var planeEdges = []
var verts = edgesGeometry.attributes.position.array;
for(var i = 0; i < verts.length; i+=6) {
  planeEdges.push([
    [verts[i], verts[i+1]],
    [verts[i+3], verts[i+4]]
    // new THREE.Vector3(
    //   verts[i],
    //   verts[i+1],
    //   verts[i+2]
    // ), 
    // new THREE.Vector3(
    //   verts[i+3],
    //   verts[i+4],
    //   verts[i+5]
    // )
  ])
}

console.log(planeEdges)

// raycast
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

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
    var pos = fixMovePos(obj, intersect.point.x, -intersect.point.z)
    // console.log(pos)
    obj.position.x = pos[0]//intersect.point.x
    obj.position.z = -pos[1]//intersect.point.z
  }
}

function fixMovePos(obj, x, y) {
  if(!obj.geometry.boundingBox) {
    obj.geometry.computeBoundingBox()
  }

  var pos = [x, y]

  var p_cs = [
    [
      x + obj.geometry.boundingBox.min.x,
      y - obj.geometry.boundingBox.min.z
    ],
    [
      x + obj.geometry.boundingBox.max.x,
      y - obj.geometry.boundingBox.min.z
    ],
    [
      x + obj.geometry.boundingBox.max.x,
      y - obj.geometry.boundingBox.max.z
    ],
    [
      x + obj.geometry.boundingBox.min.x,
      y - obj.geometry.boundingBox.max.z
    ]
  ]

  // var edge = planeEdges[4]

  for(var edge of planeEdges) {

    if(edge[0][1] === edge[1][1]) {
      /**
       * делаем расчет через равнобедренный треугольник с 
       * горизонтальной гипотенузой
       */
      var xs = [edge[0][0], edge[1][0]].sort((i1, i2) => i1 - i2)
      var use = (function() { 
        for(var p_c of p_cs) if(xs[1] > p_c[0] && xs[0] < p_c[0]) 
          return true
        return false
      })();

      if(!use) continue

      var data = []

      for(var p_c of p_cs) {
        var a, b, c, h, x, y;
  
        var p_a = edge[0]
        var p_b = [
          p_c[0]*2 - edge[0][0],
          edge[1][1]
        ]
  
        a = b = Math.sqrt(Math.pow(p_a[0] - p_c[0], 2) + Math.pow(p_a[1] - p_c[1], 2))
        c = Math.sqrt(Math.pow(p_a[0] - p_b[0], 2) + Math.pow(p_a[1] - p_b[1], 2))
  
        h = Math.sqrt(Math.pow(a, 2) - Math.pow(c, 2)/4)
  
        x = 0
        y = h

        data.push({a, b, c, h, x, y})
      }

      var onLine = +(data[0].h + data[2].h).toFixed(10) <= 
      +(obj.geometry.boundingBox.max.z - obj.geometry.boundingBox.min.z).toFixed(10)

      var step_y = Math.min(data[0].h, data[2].h)
      var vec = step_y === data[0].h ? -1 : 1
      
      if(onLine) {
        // step_y *= -1
        pos[1] += vec*step_y
        break;
      }

    } else if(edge[0][0] === edge[1][0]) {
      /**
       * делаем расчет через равнобедренный треугольник с 
       * вертикальной гипотенузой
       */
      console.log(edge, '|')
    } else {
      /**
       * делаем расчет через прямоугольный треугольник
       */
      console.log(edge, '/')
    }

  }
  return pos
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
    markRay(e.clientX, e.clientY)// onMouseMove(e)
  }
}

fixMovePos(box, 0, 0)

window.addEventListener( 'mousemove', onMouseMove, false );
window.addEventListener( 'mousedown', onMouseDown, false );
window.addEventListener( 'mouseup', onMouseUp, false );
