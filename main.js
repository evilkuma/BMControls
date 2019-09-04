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
camera.position.set(0, 8, 0/*5*/);
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
  [-4, -4], [0, 0], 
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

var floor_plane = new THREE.Plane(new THREE.Vector3(0, 1, 0))
var floor_helper = new THREE.PlaneHelper(floor_plane, 1000)
floor_helper.position.y = -.5
scene.add(floor_helper)

var edgesGeometry = new THREE.EdgesGeometry(geometry)
var lineMaterial = new THREE.LineBasicMaterial({ color: 'red' })
var lineSegments = new THREE.LineSegments(edgesGeometry, lineMaterial)

lineSegments.position.copy(plane.position)
lineSegments.rotation.copy(plane.rotation)
lineSegments.scale.copy(plane.scale)
scene.add(lineSegments)

var helper = new THREE.LinesHelper
// helper.position.y = 1.1
scene.add(helper)


var p1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'red'}))
var p2 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
var p3 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'blue'}))
var p4 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'yellow'}))
scene.add(p1, p2, p3, p4)
var arrow1 = new THREE.ArrowHelper
var arrow2 = new THREE.ArrowHelper
scene.add(arrow1, arrow2)

var planes = []

for(var i = 0; i < 1; i++) {
  var point1 = points[i]
  var point2 = points[i+1 === points.length ? 0 : i+1]
  var v1 = new THREE.Vector3(point1[0], 0, -point1[1])
  var v2 = new THREE.Vector3(point2[0], 0, -point2[1])
  var position = v2.clone().add(v1).divideScalar(2)
  var sub = v2.clone().sub(v1)
  var vec = sub.clone().normalize()
  var rvec = vec.clone().applyEuler(new THREE.Euler(0, -Math.PI/2, 0)).toFixed()
  var kvec = new THREE.Vector3()
  
  if(rvec.x !== 0) kvec.x = rvec.x > 0 ? 1 : -1
  if(rvec.z !== 0) kvec.z = rvec.z > 0 ? 1 : -1
  
  var p = new THREE.Plane()// rvec, rvec.clone().multiply(position).length() );
  p.setFromNormalAndCoplanarPoint(rvec, position)

  var from = v1.clone().multiply(vec.abs())
  var to = v2.clone().multiply(vec.abs())
  // var max = new THREE.Vector3( Math.max(from.x, to.x), 0, Math.max(from.z, to.z) )
  // var min = new THREE.Vector3( Math.min(from.x, to.x), 0, Math.min(from.z, to.z) )
  var max = new THREE.Vector3(
    Math.max(point1[0], point2[0]), 0, Math.max(-point1[1], -point2[1])
  )
  var min = new THREE.Vector3(
    Math.min(point1[0], point2[0]), 0, Math.min(-point1[1], -point2[1])
  )

  var rot = Math.atan((point2[1] - point1[1])/(point2[0] - point1[0]))
  p.userData = { max, min, rvec, kvec, vec, rot }

  var help = new THREE.PlaneHelper(p, 1)
  scene.add(help)

  var arrow = new THREE.ArrowHelper()
  scene.add(arrow)
  p.userData.arrow = arrow
  var arrow1 = new THREE.ArrowHelper()
  scene.add(arrow1)
  p.userData.arrow1 = arrow1

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

  if(intersects.length) {
    var mm = intersects.find(e => e.object instanceof CubeMesh)
    if(mm) {
      mm.object.mark('red')
    }
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
  
  // если мышка не попала по полу, ничего не делаем
  if(!intersect) return

  camera.position.x = intersect.point.x/2
  camera.position.z = intersect.point.z/2

  var moved = intersect.point.clone().sub(obj.position)
  moved.y = 0

  var lines = obj.getCollisionLines(moved)
  helper.setLines(lines)

  var intersectsData = []

  for(var p of planes) {

    // проверка на вхождение в промежуток
    // TODO: доработать проверку, что бы она работала по bb, а не position
    if( // если не входит в промежуток влияния плэйна, пропускаем проверку
      !((intersect.point.x < p.userData.max.x && intersect.point.x > p.userData.min.x) ||
        (intersect.point.z < p.userData.max.z && intersect.point.z > p.userData.min.z))
    ) continue

    // по контуру обьекта, определяем грани пересекающие плэйн
    var intersectsLines = lines.filter(line => p.intersectsLine(line))

    // если пересечения не найдены, пропускаем проверку
    if(intersectsLines.length === 0) continue
    var rot = +p.userData.rot.toFixed(10)

    if(rot % +(Math.PI/2).toFixed(10)) {
      // для косых стен более сложный расчет

      var point = null
      var distance = 0
      
      // ищем точку на определнной грани, которая ближе всего к плэйн
      for(var line of intersectsLines) {
        for(var lineEl of [line.start, line.end]) {

          var ndistance = p.distanceToPoint(lineEl)
          if(ndistance < distance) {
            distance = ndistance
            point = lineEl
          }

        }
      }
      
      ray.set(point, p.userData.rvec)
      var over = ray.intersectPlane(p, new THREE.Vector3)

      if(over) {
        // расчитываем на осколько обьект вышел за пределы плэйна
        var toAdd = point.clone().sub(over)
        // позиция мышки + выход за пределы = нужная позиция обьекта
        intersectsData.push([p, intersect.point.clone().sub(toAdd)])
      }

    } else {    
      
      // пускаем луч, для определния проекции мышки на плэйне в направлении стены
      ray.set(intersect.point, p.userData.rvec.clone().multiplyScalar(-1))
      var pos = ray.intersectPlane(p, new THREE.Vector3)
      if(!pos) { // дополнительная проверка если вдруг мышь вышла за стену
        ray.set(intersect.point, p.userData.rvec)
        ray.intersectPlane(p, new THREE.Vector3)
      }
  
      // если точка не найдена, отменяем расчет
      if(!pos) continue

      // для стен под прямым углом
      // нужная позиция обьекта = точка на плэйне + половина размера обьекта по бб
      intersectsData.push([
        p,
        pos.clone().add(obj.getRealSize().divideScalar(2).multiply(p.userData.kvec))
      ])

      p1.position.copy(pos.clone().add(obj.getRealSize().divideScalar(2).multiply(p.userData.kvec)))

    }

          // if(isReturn) {
          //   var force = pos.clone().multiply(p.userData.rvec).toFixed(10)
          //   console.log('hay yo', force)
          //   if(force.x) obj.position.x = pos.x
          //   if(force.z) obj.position.z = pos.z
          // } else {
          //   obj.position.x = pos.x
          //   obj.position.z = pos.z
          //   intersect.point.copy(obj.position)
          // }

        // isReturn = true

  }

  if(intersectsData.length === 0) {
    // если информации о пересечении нет, просто двигаем
    obj.position.x = intersect.point.x
    obj.position.z = intersect.point.z
    
    return
  }

  if(intersectsData.length === 1) {
    // если пересечение только одно, то все ок
    obj.position.x = intersectsData[0][1].x
    obj.position.z = intersectsData[0][1].z

    return
  }

  // если переесечений более, то нужен подсчет
  var vec1 = intersectsData[0][0].userData.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)
  var vec2 = intersectsData[1][0].userData.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)

  var f11 = intersectsData[0][1].toFixed(10)
  var f12 = f11.clone().add(vec1.clone().multiplyScalar(10))
  var f21 = intersectsData[1][1].toFixed(10)
  var f22 = f21.clone().add(vec2.clone().multiplyScalar(10))

  var K1 = (f12.z - f11.z)/(f12.x - f11.x)
  var K2 = (f22.z - f21.z)/(f22.x - f21.x)

  var B1 = (f12.x*f11.z - f11.x*f12.z)/(f12.x - f11.x)
  var B2 = (f22.x*f21.z - f21.x*f22.z)/(f22.x - f21.x)

  var x = (B2 - B1)/(K1 - K2)
  var y = K1*x+B1

  // TODO обработать условие, когда одна из стен вертиальная

  p3.position.set(x, 0, y)

  obj.position.x = x
  obj.position.z = y

  p1.position.copy(intersectsData[0][1])
  p2.position.copy(intersectsData[1][1])
  arrow1.setLength(500)
  arrow2.setLength(500)
  arrow1.setDirection(vec1)
  arrow2.setDirection(vec2)
  arrow1.position.copy(intersectsData[0][1])
  arrow2.position.copy(intersectsData[1][1])
  
}

/**
 * Events 
 */

function onMouseMove(e) {

  if(obj) {
    // move selected
    moveSelected1(e.clientX, e.clientY)

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

  if(intersects.length) {
    var mm = intersects.find(e => e.object instanceof CubeMesh)
    if(mm) {
      obj = mm.object
      obj.mark('green')
    }
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


function moveSelected1(x, y) {
  mouse.x = ( x / window.innerWidth ) * 2 - 1;
  mouse.y = - ( y / window.innerHeight ) * 2 + 1;

  raycaster.setFromCamera( mouse, camera );
  var intersect = raycaster.ray.intersectPlane(floor_plane, new THREE.Vector3) //intersectObjects( [plane] )[0];
  
  // если мышка не попала по полу, ничего не делаем
  if(!intersect) return

  intersect.y = .5

  camera.position.x = intersect.x/2
  camera.position.z = intersect.z/2

  var moved = intersect.clone().sub(obj.position)
  moved.y = 0

  helper.setLines(obj.getCollisionLines(moved))

  var points = obj.toRectY(moved).map(p => new THREE.Vector3(p[0], 0, p[1]))

  var isMoved = false

  for(var p of planes) {

    ray.set(intersect, p.userData.rvec.clone().multiplyScalar(-1))
    var pos = ray.intersectPlane(p, new THREE.Vector3)
    
    if(!pos) {
      ray.set(intersect, p.userData.rvec)
      pos = ray.intersectPlane(p, new THREE.Vector3)
    }

    // проверка на вхождение в промежуток
    // TODO: доработать проверку, что бы она работала по bb, а не position
    if( // если не входит в промежуток влияния плэйна, пропускаем проверку
      ((pos.x > p.userData.max.x || pos.x < p.userData.min.x) ||
       (pos.z > p.userData.max.z || pos.z < p.userData.min.z))
    ) continue

    var isOver = false

    var over_poses = points.map(point => {

      ray.set(point, p.userData.rvec)
      var res = ray.intersectPlane(p, new THREE.Vector3)
      if(res) isOver = true

      return res

    })

    var idx;

    if(isOver) {

      var distance = 0
      for(let i = 0; i < over_poses.length; i++) {
        
        if(over_poses[i]) {

          var ndist = over_poses[i].distanceTo(points[i])
          if(ndist > distance) {
            distance = ndist
            idx = i
          }

        }

      }

      var nx = intersect.x - (points[idx].x - over_poses[idx].x)
      var nz = intersect.z - (points[idx].z - over_poses[idx].z)

      obj.position.x = nx
      obj.position.z = nz

      isMoved = true

    }
    
  }

  if(!isMoved) {

    obj.position.x = intersect.x
    obj.position.z = intersect.z

  }
}
