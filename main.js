
(function() {

  var SCOPE

  requirejs(['./models/main'], function(global) {

    SCOPE = global

    run()
  
  });

  var scene, bmcontrol, ocontrol

  function run() {

    scene = new THREE.DefaultScene(document.body)

    ocontrol = new THREE.OrbitControls(scene.camera, scene.renderer.domElement)

    bmcontrol = new THREE.BMControl({
      scene,
      points: [
        new THREE.Vector3(-8, 0, 8),
        new THREE.Vector3(-6, 0, -2),
        new THREE.Vector3(0,  0, -8),
        new THREE.Vector3(8,  0, -8),
        new THREE.Vector3(8,  0, 8)
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
    bmcontrol.events.onmove = function(obj, objs, point) {

      for(let o of objs) {

        if(o === obj) continue

        obj.rectangle.cross(o.rectangle)

      }

    }
    
    var boxes = [new THREE.CubeMesh, new THREE.CubeMesh]
    boxes[0].position.x = 3
    boxes[0].rotation.y = Math.PI/5

    window.b = boxes[0]

    window.sph = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'blue'}))
    window.sph1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
    window.sph2 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
    window.sph3 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
    window.sph4 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
    scene.scene.add(sph, sph1, sph2, sph3, sph4)

    scene.scene.add(...boxes)
    bmcontrol.objects.push(...boxes)

  }

})()
