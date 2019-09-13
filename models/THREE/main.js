
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

})
