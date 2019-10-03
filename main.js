
(function() {

  var SCOPE

  requirejs(['./models/main'], function(global) {

    SCOPE = global

    // SCOPE.gui = new dat.GUI();

    run()
  
  });

  var scene, bmcontrol, ocontrol

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
    
    var boxes = [new THREE.CubeMesh, new THREE.CubeMesh, new THREE.CubeMesh, new THREE.CubeMesh]
    boxes[0].position.x = 300
    boxes[0].rotation.y = Math.PI/4
    boxes[1].position.x = -300
    boxes[3].position.z = -300
    // boxes[1].rotation.y = Math.PI/4

    scene.scene.add(...boxes)
    bmcontrol.objects.push(...boxes)

  }

})()
