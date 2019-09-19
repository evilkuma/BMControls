
define(function(require) {

  var Rectangle = require('./Rectangle')

  function calcRealSize(SIZE, ROTATION, VX = 'x', VY = 'y') {

    var x = SIZE[VX]*Math.cos(ROTATION)+SIZE[VY]*Math.sin(ROTATION)
    var y = SIZE[VX]*Math.sin(ROTATION)+SIZE[VY]*Math.cos(ROTATION)

    SIZE[VX] = x
    SIZE[VY] = y

    return SIZE

  }

  function updateRotY(self) {

    // check cache
    if(self.userData.rectCacheRotY !== self.rotation.y) {
      // calc rectangle
      var l = self.userData.size.x
      var h = self.userData.size.z
      
      var beta = Math.asin( (2*l*h)/(l*l+h*h) )
      var beta1 = Math.PI - beta
      
      if(l < h) {
        var tmp = beta; beta = beta1; beta1 = tmp;
      }
  
      var a0 = beta/2 + self.rotation.y
      var a1 = a0 + beta1
      var a2 = a1 + beta
      var a3 = a2 + beta1
  
      var R = Math.sqrt(l*l + h*h)/2
  
      var points = [
        [ R*Math.cos(a0), -R*Math.sin(a0) ],
        [ R*Math.cos(a1), -R*Math.sin(a1) ],
        [ R*Math.cos(a2), -R*Math.sin(a2) ],
        [ R*Math.cos(a3), -R*Math.sin(a3) ]
      ]

      self.rectangle.setFromPoints(points)

      // chached
      self.userData.rectCacheRotY = self.rotation.y

    }

  }
  


  function CubeMesh() {
    this.constructor(
      new THREE.BoxGeometry(1, 1, 2),
      new THREE.MeshPhongMaterial({ color: 'lightgreen', transparent: true, opacity: 0.5 })
    )

    this.geometry.computeBoundingBox()

    this.userData.size = this.geometry.boundingBox.getSize(new THREE.Vector3)

    var bound = this.geometry.boundingBox.clone()
    bound.min.x += -0.01
    bound.min.y += 0.01
    bound.min.z += -0.01
    bound.max.x += 0.01
    bound.max.y += 0.01
    bound.max.z += 0.01
    var mark = new THREE.Box3Helper( bound )
    mark.material.linewidth = 3
    this.add(mark)
    this.mark()

    this.position.y = 0.5

    this.rectangle = new Rectangle
    this.rectangle.setPosition(this.position)

    // пересчет информации про прямоугольник при повороте детали по oY
    var self = this
    Object.defineProperty(this.rotation, 'y', {
      set(value) {

        // get from THREE https://github.com/mrdoob/three.js/blob/master/src/math/Euler.js
        this._y = value
        this.onChangeCallback()
        // add custom
        updateRotY(self)

      },
      get() {
        return this._y
      }
    })

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
  CubeMesh.prototype.toRectY = function() {

    return this.rectangle.getWorldPoints()

  }

  return CubeMesh

})
