
import { Plane } from 'three/src/math/Plane'
import { Euler } from 'three/src/math/Euler'
import { Vector3 } from 'three/src/math/Vector3'
import { Object3D } from 'three/src/core/Object3D'
import { Shape } from 'three/src/extras/core/Shape'
import { Mesh } from 'three/src/objects/Mesh'
import { ShapeGeometry } from 'three/src/geometries/ShapeGeometry'
import { MeshPhongMaterial } from 'three/src/materials/MeshPhongMaterial'

/**
 * Wall class
 */

function Wall(parent, point1, point2) {

  this.constructor()

  this.parent = parent

  if(point1 && point2) {

    this.setFromPoints(point1, point2)

  }

}

Wall.prototype = Object.create(Plane.prototype)

Wall.prototype.setFromPoints = function(point1, point2) {

  this.point1 = point1
  this.point2 = point2

  this.position = point2.clone().add(point1).divideScalar(2)
  var sub = point2.clone().sub(point1)

  this.vec = sub.clone().normalize()
  this.rvec = this.vec.clone().applyEuler(new Euler(0, -Math.PI/2, 0)).toFixed()

  this.setFromNormalAndCoplanarPoint(this.rvec, this.position)

  this.max = new Vector3(
    Math.max(point1.x, point2.x), 
    Math.max(point1.y, point2.y),
    Math.max(point1.z, point2.z)
  )

  this.min = new Vector3(
    Math.min(point1.x, point2.x), 
    Math.min(point1.y, point2.y),
    Math.min(point1.z, point2.z)
  )

  this.rot = Math.atan((point2.z - point1.z)/(point2.x - point1.x))

}

Wall.prototype.getNextWall = function() {

  var idx = this.parent._walls.indexOf(this)
  var nidx = this.parent._walls.length === idx+1 ? 0 : idx+1

  return this.parent._walls[nidx]

}

Wall.prototype.getPrevWall = function() {

  var idx = this.parent._walls.indexOf(this)
  var pidx = 0 === idx ? this.parent._walls.length-1 : idx-1

  return this.parent._walls[pidx]

}

Wall.prototype.remove = function() {

  var idx = this.parent._walls.indexOf(this)
  this.parent._walls.splice(idx, 1)

}

/**
 * Room class
 */

function Room(points) {

  this.constructor()

  this._walls = []
  this._floor = null
  this._plane = new Plane(new Vector3(0, 1, 0))

  if(points && points.length) {

    this.setWalls(points)

  }

}

Room.prototype = Object.create(Object3D)

Room.prototype.setWalls = function(points) {

  while(this._walls.length) this._walls[0].remove()

  if(this._floor && this._floor.parent) this._floor.parent.remove(this._floor) 

  var geom = new Shape

  for(var i = 0; i < points.length; i++) {

    var point1 = points[i]
    var point2 = points[i+1 === points.length ? 0 : i+1]

    this._walls.push(new Wall(this, point1, point2))

    geom.lineTo(point1.x, -point1.z)

  }

  geom.lineTo(points[0].x, -points[0].z)

  this._floor = new Mesh(
    new ShapeGeometry(geom),
    new MeshPhongMaterial( { color: 0x074c24 } )
  )

  this._floor.rotation.x = -Math.PI/2

}

Room.prototype.setWallsBySizes = function(info) {

  var points = [new Vector3]

  var point = points[0]

  var max = [0, 0]
  var min = [0, 0]

  var fr = 0

  for(var w of info) {

    point = new Vector3(
      point.x - Math.cos(Math.PI/180 * fr) * w.l,
      0,
      point.z - Math.sin(Math.PI / 180 * fr) * w.l
    ).toFixed(1)

    if(point.x < min[0]) min[0] = point.x
    if(point.z < min[1]) min[1] = point.z
    if(point.x > max[0]) max[0] = point.x
    if(point.z > max[1]) max[1] = point.z

    points.push(point)

    fr += 180 - w.r

  }

  var center = {
    x: (max[0] - min[0])/2 - max[0],
    z: (max[1] - min[1])/2 - max[1],
    y: 0
  }

  points.forEach(p => p.add(center))

  this.setWalls(points)

  return this

}

export { Room }
