
define(function(require) {

  function TextMesh(text, color) {
    var canvas = document.createElement('canvas')
    canvas.height = 128
    canvas.width = 512
    var ctx = canvas.getContext('2d')
    ctx.font = "128px Arial"
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'

    this.constructor(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }))

    this.scale.set(1, 0.25, 1) // 512x128

    this.ctx = ctx
    this.color = color
    this.setText(text)
  }
  TextMesh.prototype = Object.create(THREE.Sprite.prototype)
  TextMesh.prototype.setText = function(text) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
    this.ctx.fillText(text, this.ctx.canvas.width / 2, 0)
    this.material.map.needsUpdate = true
  };

  return TextMesh

})
