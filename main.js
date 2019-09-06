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
  [-4, -4], [-1, 1], 
  // [-1, 0], 
  [2, 4], [4, 4], [4, -4]
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

var helper = new THREE.LinesHelper
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

for(var i = 0; i < points.length; i++) {
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
  p.userData.help = help
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


/**
 * перемещает выделеный обьект по сцене
 * по координатам плоскости
 */
function moveSelected(x, y) {

  // конвертируем координаты мыши
  mouse.x = ( x / window.innerWidth ) * 2 - 1;
  mouse.y = - ( y / window.innerHeight ) * 2 + 1;

  // настраиваем кастер и пуляем луч в плэйн пола
  raycaster.setFromCamera( mouse, camera )
  var intersect = raycaster.intersectObject( plane )[0]

  // если мимо ничего не делаем
  if(intersect) intersect = intersect.point
   else return
  
  // двигаем камеру для удобства наблюдения за краями (перспектива как бы)
  camera.position.x = intersect.x/2
  camera.position.z = intersect.z/2

  // сразу перемещаем конструкцию в место мышки
  obj.position.x = intersect.x
  obj.position.z = intersect.z

  // обновляем хэлпер для дэбага
  helper.setLines(obj.getCollisionLines())

  // ищем первое пересчение и записываем о нем инфу
  var info = null, p

  for(p of planes) {
    p.userData.help.material.color.g = 1
    
    info = getFixedPos(obj, p, intersect)

    if(info) break

  }

  // пересечений нет - значит все ок
  if(!info) {

    return

  }

  // по полученным данным смещаем инфу о курсоре и сам объект в допустимые координаты
  intersect.x = info.point[0]
  intersect.z = info.point[1]
  obj.position.x = info.point[0]
  obj.position.z = info.point[1]

  // ищем второе пересчение и записываем о нем инфу
  var info1 = null, p1

  for(p1 of planes) {
    // исключаем из поиска исправленое пересечение
    if(p1 === p) continue

    info1 = getFixedPos(obj, p1, intersect)

    if(info1) break

  }

  // пересечений нет - значит все ок
  if(!info1) {

    return

  }

  // пересчитываем полученные допустимые координаты с учетом первой проверки
  var vec1 = p.userData.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)
  var vec2 = p1.userData.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)

  var f11 = new THREE.Vector3(info.point[0], 0, info.point[1])
  var f12 = f11.clone().add(vec1.clone().multiplyScalar(10))
  var f21 = new THREE.Vector3(info1.point[0], 0, info1.point[1])
  var f22 = f21.clone().add(vec2.clone().multiplyScalar(10))

  var K1 = (f12.z - f11.z)/(f12.x - f11.x)
  var K2 = (f22.z - f21.z)/(f22.x - f21.x)

  var B1 = (f12.x*f11.z - f11.x*f12.z)/(f12.x - f11.x)
  var B2 = (f22.x*f21.z - f21.x*f22.z)/(f22.x - f21.x)

  var x, y

  // условие для обработки стен, который направлены по оси Z
  if((p.userData.rot + Math.PI) % Math.PI === Math.PI/2) {

    x = info.point[0]
    y = K2*x+B2

  } else if((p1.userData.rot + Math.PI) % Math.PI === Math.PI/2) {

    x = info1.point[0]
    y = K1*x+B1

  } else {

    x = (B2 - B1)/(K1 - K2)
    y = K1*x+B1

  }


  obj.position.x = x
  obj.position.z = y


}

/**
 * Проверяет пересечение и расчитывает допустимое положение объкта по отношению
 * к плэйну.
 * 
 * @param {Object3d} obj - проверяемый объект 
 * @param {Plane} p - проверяемый плэйн 
 * @param {Vector3} point - позиция передвижения 
 * 
 * @returns { point: [ x, z ] } || false
 */
function getFixedPos(obj, p, point) {

  // ищем проецкию позицию передвижения на плэйн
  ray.set(point, p.userData.rvec.clone().multiplyScalar(-1))
  var pos = ray.intersectPlane(p, new THREE.Vector3)
  
  if(!pos) {
    ray.set(point, p.userData.rvec)
    pos = ray.intersectPlane(p, new THREE.Vector3)
  }

  // дополнительно проверяем вхождение точки в зону действия плэйна
  if(
    ((pos.x > p.userData.max.x || pos.x < p.userData.min.x) ||
     (pos.z > p.userData.max.z || pos.z < p.userData.min.z))
  ) return false

  // ищем предельеные точки объекта, которые выходят за пределы плэйна
  var points = obj.toRectY().map(p => new THREE.Vector3(p[0], 0, p[1]))
  var isOver = false
  var over_poses = points.map(point => {

    ray.set(point, p.userData.rvec)
    var res = ray.intersectPlane(p, new THREE.Vector3)
    if(res) isOver = true

    return res

  })

  // если нет точки вышелшей за пределы - все ок
  if(!isOver) return false

  // находим точку дальше всего выходящую за пределы плэйна
  var idx, distance = 0
  for(let i = 0; i < over_poses.length; i++) {

    if(!over_poses[i]) continue

    var ndist = over_poses[i].distanceTo(points[i])
    if(ndist >= distance) {
      distance = ndist
      idx = i
    }

  }

  // подсчитываем допустимые координаты
  var nx = point.x - (points[idx].x - over_poses[idx].x)
  var nz = point.z - (points[idx].z - over_poses[idx].z)

  return {
    point: [nx, nz]
  }

}
