
function CubeMesh() {
  this.constructor(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshPhongMaterial({ color: 'lightgreen' })
  )

  this.geometry.computeBoundingBox()
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
}
CubeMesh.prototype = Object.create(THREE.Mesh.prototype)
CubeMesh.prototype.mark = function(color) {
  this.children[0].visible = !!color
  if(color) {
    this.children[0].material.color = new THREE.Color(color)
  }
}
