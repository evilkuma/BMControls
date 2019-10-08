
(function() {

  var SCOPE

  requirejs(['./models/main'], function(global) {

    SCOPE = global

    // SCOPE.gui = new dat.GUI();

    run()
  
  });

  var scene, bmcontrol, ocontrol

  function isMarked(obj) {

    obj.geometry.computeBoundingBox()
    var bound = obj.geometry.boundingBox.clone()
    bound.min.x += -0.01
    bound.min.y += 0.01
    bound.min.z += -0.01
    bound.max.addScalar(0.01)
    var mark = new THREE.Box3Helper( bound )
    mark.visible = false
    mark.material.linewidth = 3
    obj.add(mark)

    obj.mark = function(color) {
      mark.visible = !!color
      if(color) {
        mark.material.color = new THREE.Color(color)
      }
    }

    return obj

  }

  function run() {

    scene = new THREE.DefaultScene(document.body)
    SCOPE.scene = scene.scene

    ocontrol = new THREE.OrbitControls(scene.camera, scene.renderer.domElement)

    bmcontrol = new THREE.BMControl({
      scene,
      points: [
        new THREE.Vector3(-800, 0, 800),
        new THREE.Vector3(-600, 0, -200),
        new THREE.Vector3(0,  0, -800),
        new THREE.Vector3(800,  0, -800),
        new THREE.Vector3(800,  0, 800)
      ],
      ocontrol
    })
    scene.scene.add(bmcontrol.room._floor)

    bmcontrol.events.onview = function(obj, objs) {
      objs.forEach(o => o.mark())
      if(obj) obj.object.mark('red')
    }
    bmcontrol.events.onselected = function(obj, objs) {
      objs.forEach(o => o.mark())
      obj.object.mark('green')
    }
    bmcontrol.events.onunselected = function(obj, objs) {
      obj.mark()
    }
    
    var boxes = []

    var material = new THREE.MeshPhongMaterial({ color: 'lightgreen', transparent: true, opacity: 0.5 })
    var geometry = new THREE.BoxGeometry(100, 100, 200)
    
    boxes.push(
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, material),
      new THREE.Mesh(geometry, material)
    )

    scene.scene.add(...boxes)
    bmcontrol.add(...boxes)

    boxes[0].position.x = 300
    boxes[0].rotation.y = Math.PI/4
    boxes[1].position.x = -300
    boxes[3].position.z = -300
    boxes[1].rotation.y = Math.PI/4

    boxes.forEach(b => isMarked(b))

  }

})()
