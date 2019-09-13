
define(function(require) {

  var Rectangle = require('./Rectangle')

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

    this.visible = false

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

  CubeMesh.prototype.updateMatrixWorld = function ( force ) {
    /**
     * Переопределенный метод из ядра THREE. Для его работы сначала вызываем
     * 'super' метод, а потом дополняем своей логикой.
     *  */    
    this.constructor.prototype.updateMatrixWorld.call(this, [force])

    if(!this.rectangle.helper.parent && this.parent) {

      this.parent.add(this.rectangle.helper)

    }

    // check cache
    if(this.userData.rectCacheRotY !== this.rotation.y) {
      // calc rectangle
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
        [ R*Math.cos(a0), -R*Math.sin(a0) ],
        [ R*Math.cos(a1), -R*Math.sin(a1) ],
        [ R*Math.cos(a2), -R*Math.sin(a2) ],
        [ R*Math.cos(a3), -R*Math.sin(a3) ]
      ]

      this.rectangle.setFromPoints(points)

      // chached
      this.userData.rectCacheRotY = this.rotation.y

    }

  }

  return CubeMesh

})
