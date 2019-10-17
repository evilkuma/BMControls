
define(function(require) {

  function sizesToPoints(info) {

    var points = []

    var point = new THREE.Vector3

    var max = [0, 0]
    var min = [0, 0]

    var fr = 0

    for(var w of info) {

      point = new THREE.Vector3(
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

    return points

  }

  /**
   * Wall class
   */

  var SCOPE = require('./../global')

  function Wall(parent, point1, point2) {

    this.constructor()

    this.parent = parent

    if(point1 && point2) {

      this.setFromPoints(point1, point2)

    }

  }

  Wall.prototype = Object.create(THREE.Plane.prototype)

  Wall.prototype.setFromPoints = function(point1, point2) {

    this.point1 = point1
    this.point2 = point2

    var sub = point2.clone().sub(point1)

    this._l = sub.length()
    this.vec = sub.clone().normalize()
    this.rvec = this.vec.clone().applyEuler(new THREE.Euler(0, -Math.PI/2, 0)).toFixed()

    this.mesh = new THREE.Mesh(new THREE.BufferGeometry, new THREE.MeshPhongMaterial( { color: 0x074c24 } ))
    var l2 = this._l/2
    var vert = new Float32Array( [
      -l2, 0, 0,
       l2, 0, 0,
       l2, 300, 0,
    
       l2, 300, 0,
      -l2, 300, 0,
      -l2, 0, 0
    ] );
    this.mesh.geometry.addAttribute('position', new THREE.BufferAttribute(vert, 3))
    this.mesh.geometry.computeVertexNormals()
    this.mesh.rotation.y = 2*Math.PI - new THREE.Vector2(this.vec.x, this.vec.z).angle()

    this.position = this.mesh.position.copy(point2).add(point1).divideScalar(2)

    this.setFromNormalAndCoplanarPoint(this.rvec, this.position)

    this.max = new THREE.Vector3(
      Math.max(point1.x, point2.x), 
      Math.max(point1.y, point2.y),
      Math.max(point1.z, point2.z)
    )

    this.min = new THREE.Vector3(
      Math.min(point1.x, point2.x), 
      Math.min(point1.y, point2.y),
      Math.min(point1.z, point2.z)
    )

    this.rot = Math.atan((point2.z - point1.z)/(point2.x - point1.x))

    if(SCOPE.room_sizes) {

      var self = this
      this.gui = SCOPE.room_sizes.add({
        get l() { return self.l },
        set l(l) { self.toLen(l) }
      }, 'l', 50, 1000, 1)

    }
 
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
    if(this.gui) this.gui.remove()
    if(this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh)

  }

  Wall.prototype.toLen = function(l) {

    l = +l

    var iter = 0
    var i = this.id

    var MIN_WALL_LEN = 50
    var intervals = []
    var PI = Math.PI
    var PI2 = Math.PI * 2

    if(l < MIN_WALL_LEN) l = MIN_WALL_LEN

    var diff = Math.abs(l - this.l)
    var sign = Math.sign(l - this.l)
    
    this.l = l

    var cos = Math.abs(Math.cos(this.mesh.rotation.y).toFixed(10))
    var sin = Math.abs(Math.sin(this.mesh.rotation.y).toFixed(10))

    var diffX = Math.round(cos * diff)
    var diffY = Math.rousetFromPointsnd(sin * diff)

    if (this.mesh.rotation.y < PI / 2) {
      intervals.push(
        [PI2 - (PI / 2 - this.mesh.rotation.y), PI2],
        [0, this.mesh.rotation.y + PI / 2]
      )
    } else if (this.mesh.rotation.y > PI * 1.5) {
      intervals.push(
        [this.mesh.rotation.y - PI / 2, PI2],
        [0, this.mesh.rotation.y - PI * 1.5]
      )
    } else {
      intervals.push(
        [this.mesh.rotation.y - PI / 2,
        this.mesh.rotation.y + PI / 2]
      )
    }

    while (diffX || diffY) {

      iter++
      i++

      if (i >= this.parent._walls.length) i = 0

      var wall = this.parent._walls[i]

      if (wall === this) continue

      var k = 1
      for (var interval of intervals) {
        if (interval[0] <= wall.mesh.rotation.y && interval[1] >= wall.mesh.rotation.y) {
          k = -1
          break
        }
      }

      var cos1 = Math.abs(Math.cos(wall.mesh.rotation.y).toFixed(10))
      var sin1 = Math.abs(Math.sin(wall.mesh.rotation.y).toFixed(10))

      var maxDiffX = (wall.l - MIN_WALL_LEN) * cos1
      var maxDiffY = (wall.l - MIN_WALL_LEN) * sin1

      var minDiffX = sign * k > 0 ? diffX : Math.min(maxDiffX, diffX)
      var minDiffY = sign * k > 0 ? diffY : Math.min(maxDiffY, diffY)

      var toDiffX = cos1 ? Math.round(minDiffX / cos1) : 0
      var toDiffY = sin1 ? Math.round(minDiffY / sin1) : 0

      if (toDiffX) {
        wall.l += toDiffX * sign * k
        diffX -= minDiffX
        diffY += toDiffX * sin1
      }

      if (toDiffY) {
        wall.l += toDiffY * sign * k
        diffY -= minDiffY
        diffX += toDiffY * cos1
      }

      if (iter > 1000) {
        return console.error('loop')
      }

      if (iter >= this.parent._walls.length) {
        console.warn('is most iterible')
      }
    }

    // update floor

  }

  Object.defineProperties(Wall.prototype, {

    l: {

      get: function() {

        return this._l

      },

      set: function(value) {

        this.mesh.geometry.scale(1/(this._l/value), 1, 1)

        this._l = value

      }

    },

    id: {
      
      get: function() {

        return this.parent._walls.indexOf(this)

      }

    }

  })

  /**
   * Room class
   */

  function Room(points) {

    this.constructor()

    this._walls = []
    this._floor = null
    this._plane = new THREE.Plane(new THREE.Vector3(0, 1, 0))

    if(points && points.length) {

      this.setWalls(points)

    }

  }

  Room.prototype = Object.create(THREE.Object3D.prototype)

  Room.prototype.setWalls = function(points) {

    while(this._walls.length) this._walls[0].remove()

    if(this._floor && this._floor.parent) this._floor.parent.remove(this._floor) 

    var geom = new THREE.Shape

    for(var i = 0; i < points.length; i++) {

      var point1 = points[i]
      var point2 = points[i+1 === points.length ? 0 : i+1]

      var wall = new Wall(this, point1, point2)
      this._walls.push(wall)
      this.add(wall.mesh)

      geom.lineTo(point1.x, -point1.z)

    }

    geom.lineTo(points[0].x, -points[0].z)

    this._floor = new THREE.Mesh(
      new THREE.ShapeGeometry(geom),
      new THREE.MeshPhongMaterial( { color: 0x074c24 } )
    )

    this._floor.rotation.x = -Math.PI/2

    this.add(this._floor)

  }

  Room.prototype.setWallsBySizes = function(info) {

    this.setWalls(sizesToPoints(info))

    return this

  }

  Room.prototype.getSizes = function() {

    // TODO

    var res = []

    for(var wall of this._walls) {

      var wall1 = wall.getPrevWall()

      var r = THREE.Math.euclideanModulo((wall.mesh.rotation.y + Math.PI) - wall1.mesh.rotation.y, Math.PI*2) *180/Math.PI

      res.push({ 
        l: wall.l, 
        r
      })

    }

    this.setWallsBySizes(res)

    console.log(res)

    return res

  }

  return Room

})
