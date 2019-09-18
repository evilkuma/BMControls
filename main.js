
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

        var res = obj.rectangle.cross(o.rectangle)

        if(res) {

          if(res.length === 2) {

            var point, pos = null, v = o.position.clone().sub(obj.position).normalize()

            if(res[0].line2 === res[1].line2) {

              v.multiplyScalar(-1)

              // obj point in o
              point = o.rectangle.getInsidePoint(obj.rectangle)[0]
              
              if(point) {
                pos = findPointFor2(point, res[0].line2, v)
                pos.y = 0.5
              }

            } else if(res[0].line1 === res[1].line1) {

              // o point in obj
              point = obj.rectangle.getInsidePoint(o.rectangle)[0]

              if(point) {
                pos = findPointFor2(point, res[0].line1, v)
                pos.y = 0.5
              }

            } else {

              var point1 = obj.rectangle.getInsidePoint(o.rectangle)[0]
              var pos1

              if(point1) {
                pos1 = findPointFor2(point, res[0].line1, v)
                if(!pos1) pos1 = findPointFor2(point, res[1].line1, v)
                pos.y = 0.5
                // TODO
              }

            }

            if(!point) return
            
            sph.visible = true
            sph1.visible = true
            sph2.visible = true
            arrow.visible = true

            arrow.position.copy(point)
            arrow.setDirection(v)

            if(pos) sph.position.copy(pos)

          } else {
            
            sph.visible = false
            sph1.visible = false
            sph2.visible = false
            arrow.visible = false

          }

        } else {

          sph.visible = false
          sph1.visible = false
          sph2.visible = false
          arrow.visible = false
          
        }

      }

    }
    
    var boxes = [new THREE.CubeMesh, new THREE.CubeMesh]
    boxes[0].position.x = 3
    boxes[0].rotation.y = Math.PI/5
    boxes[1].position.x = -3

    window.b = boxes[0]

    window.sph = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'blue'}))
    window.sph1 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
    window.sph2 = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({color: 'green'}))
    window.arrow = new THREE.ArrowHelper
    scene.scene.add(sph, sph1, sph2, arrow)

    sph.visible = false
    sph1.visible = false
    sph2.visible = false
    arrow.visible = false

    scene.scene.add(...boxes)
    bmcontrol.objects.push(...boxes)

  }

  var ray = new THREE.Ray

  function findPointFor2(point, line1, v) {

    ray.origin.copy(point)
    ray.direction.copy(v)

    var res = ray.intersectLine2(line1, 'xz')

    return res

  }


})()
