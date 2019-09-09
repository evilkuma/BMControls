
(function() {

  requirejs(['./models/main'], function(modules) {

    run()
  
  });

  var scene, bmcontrol, ocontrol, box

  function run() {

    scene = new THREE.DefaultScene(document.body)

    ocontrol = new THREE.OrbitControls(scene.camera, scene.renderer.domElement)

    bmcontrol = new THREE.BMControl({
      scene,
      points: [
        new THREE.Vector3(-4, 0, 4),
        new THREE.Vector3(-1, 0, -1),
        new THREE.Vector3(2,  0, -4),
        new THREE.Vector3(4,  0, -4),
        new THREE.Vector3(4,  0, 4)
      ],
      ocontrol
    })
    scene.scene.add(bmcontrol.room._floor)

    bmcontrol.events.onview = function(obj, objs) {
      objs.forEach(o => o.mark())
      if(obj) obj.object.mark('red')
    }
    bmcontrol.events.onselected = function(obj, objs) {
      obj.object.mark('green')
    }
    bmcontrol.events.onunselected = function(obj, objs) {
      obj.mark()
    }
    
    box = new THREE.CubeMesh
    scene.scene.add(box)
    bmcontrol.objects.push(box)

  }

})()
