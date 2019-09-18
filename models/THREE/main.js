
define(function(require) {

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

  THREE.CubeMesh = require('./CubeMesh')
  THREE.LinesHelper = require('./LinesHelper')
  THREE.TextMesh = require('./TextMesh')
  THREE.DefaultScene = require('./DefaultScene')
  // THREE.Room = require('./Room')
  THREE.BMControl = require('./BMControl')
  THREE.OrbitControls = require('./OrbitControls')
  THREE.Rectangle = require('./Rectangle')

  var _Math = require('./../Math')

  THREE.Ray.prototype.intersectLine2 = function(line, order = 'xy', far = 100000) {

    var self_line = new THREE.Line3(
      this.origin,                          // да, костыль выдан за фичу
      this.origin.clone().add(this.direction.clone().multiplyScalar(far))
    )
    
    var cross = _Math.lineCross2(line, self_line, order[0], order[1])

    return cross

  }

})
