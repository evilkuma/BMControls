
define(function(require) {

  function calcRealSize(SIZE, ROTATION, VX = 'x', VY = 'y') {

    var x = SIZE[VX]*Math.cos(ROTATION)+SIZE[VY]*Math.sin(ROTATION)
    var y = SIZE[VX]*Math.sin(ROTATION)+SIZE[VY]*Math.cos(ROTATION)

    SIZE[VX] = x
    SIZE[VY] = y

    return SIZE

  }
  
  function CubeMesh() {
    this.constructor(
      new THREE.BoxGeometry(1, 1, 2),
      new THREE.MeshPhongMaterial({ color: 'lightgreen', transparent: true, opacity: 0.5 })
    )

    this.geometry.computeBoundingBox()

    this.userData.size = this.geometry.boundingBox.getSize(new THREE.Vector3)

    var bound = this.geometry.boundingBox.clone()
    bound.min.x += -0.01//addScalar(-0.01)
    bound.min.y += 0.01
    bound.min.z += -0.01
    bound.max.x += 0.01//addScalar(0.01)
    bound.max.y += 0.01
    bound.max.z += 0.01
    var mark = new THREE.Box3Helper( bound )
    mark.material.linewidth = 3
    this.add(mark)
    this.mark()

    this.position.y = 0.5
    // this.rotation.y = Math.PI/5

  }
  CubeMesh.prototype = Object.create(THREE.Mesh.prototype)
  CubeMesh.prototype.mark = function(color) {

    this.children[0].visible = !!color
    if(color) {
      this.children[0].material.color = new THREE.Color(color)
    }

  }
  CubeMesh.prototype.getSize = function() {
    
    return this.userData.size

  }
  CubeMesh.prototype.getRealSize = function() {

    return calcRealSize(this.userData.size.clone(), this.rotation.y, 'x', 'z').toFixed(10)

  }
  CubeMesh.prototype.toRectY = function(moved) {

    /**
     * 1    l   0
     * .--------.
     * |  \  /  | h
     * | /   \  |
     * .--------.
     * 2        3
     */

    var l = this.userData.size.x
    var h = this.userData.size.z
    
    var beta = Math.asin( (2*l*h)/(l*l+h*h) )
    var beta1 = Math.PI - beta
    
    if(l < h) {
      var tmp = beta; beta = beta1; beta1 = tmp;
    }

    var a0 = beta/2 + this.rotation.y
    var a1 = a0 + beta1
    var a2 = a1 + beta
    var a3 = a2 + beta1

    var R = Math.sqrt(l*l + h*h)/2

    var points = [
      [ R*Math.cos(a0) + this.position.x, -R*Math.sin(a0) + this.position.z ],
      [ R*Math.cos(a1) + this.position.x, -R*Math.sin(a1) + this.position.z ],
      [ R*Math.cos(a2) + this.position.x, -R*Math.sin(a2) + this.position.z ],
      [ R*Math.cos(a3) + this.position.x, -R*Math.sin(a3) + this.position.z ]
    ]

    if(moved) {
      points.forEach(point => {
        point[0] += moved.x
        point[1] += moved.z
      })
    }

    return points

  }
  CubeMesh.prototype.getCollisionLines = function(moved) {

    var points = this.toRectY(moved)

    var res = points.map((point, i) => {
      var point1 = points[i+1 >= points.length ? 0 : i+1]

      return new THREE.Line3(
        new THREE.Vector3(point[0], 0, point[1]),
        new THREE.Vector3(point1[0], 0, point1[1])
      )
    })

    return res

  }

  return CubeMesh

})
