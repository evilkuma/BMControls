
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

        var res = obj.rectangle.cross(o.rectangle)

        if(res) {

          if(res.length === 2) {

            var point

            if(res[0].line1 === res[1].line1) {

              // o point in obj
              point = obj.rectangle.getNearPoint(o.rectangle)

            } else {

              // obj point in o
              point = o.rectangle.getNearPoint(obj.rectangle)

            }

            var v = obj.position.clone().sub(o.position)
            v.divide(v.clone().abs()).toFixed(10)
            var mvTo = findPointFor2(point, res[0].point, res[1].point, v)

            sph.visible = true
            sph1.visible = true
            sph2.visible = true
            arrow.visible = true

            sph.position.copy(point)
            sph1.position.copy(res[0].point)
            sph2.position.copy(res[1].point)

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

  /**
   * Подсчеты позиции при пересечении в 2 точки 
   * 
   * @param {Vector3} point точка обьекта находящаяся внутри другого
   * @param {Vector3} point1 первая точка пересечения
   * @param {Vector3} point2 вторая точка пересечения
   */
  function findPointFor2(point, point1, point2, v) {

    var vec = point1.clone()
                .sub(point2)
                .normalize()
                .applyEuler(new THREE.Euler(0, Math.PI/2, 0))
                .abs().multiply(v)
    
    vec.y = 0

    arrow.setDirection(vec)
    arrow.position.copy(point)

  }


})()
