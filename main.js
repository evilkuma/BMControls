
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

    bmcontrol.events.onmove = function(obj, objs, point) {

      obj.position.x = point[0]
      obj.position.z = point[1]

      var info = null, o

      for(o of objs) {

        if(o === obj) continue

        info = getFixedPos(obj, o, point)

        if(info) break

      }

      if(!info) return

      var info1 = null, o1, iter = 0

      while(true) {

        point[0] = info.point.x
        point[1] = info.point.z
        obj.position.x = info.point.x
        obj.position.z = info.point.z

        for(o1 of objs) {

          if(o1 === obj || o1 === o) continue

          info1 = getFixedPos(obj, o1, point)

          if(info1) break

        }

        if(!info1) return

        info = info1
        o = o1

        iter++

        if(iter > 100) {
          console.warn('iterible', iter)
          return
        }

      }

    }
    
    var boxes = [new THREE.CubeMesh, new THREE.CubeMesh, new THREE.CubeMesh]
    boxes[0].position.x = 300
    boxes[0].rotation.y = Math.PI/4
    boxes[1].position.x = -300
    // boxes[1].rotation.y = Math.PI/4

    scene.scene.add(...boxes)
    bmcontrol.objects.push(...boxes)

  }

  var ray = new THREE.Ray
  function linesExtraProj(line1, line2, v) {

    var v1 = v.clone()
    var v2 = v.clone().multiplyScalar(-1)

    var fs = [
      [line1.start, v1, line2],
      [line1.end,   v1, line2],
      [line2.start, v2, line1],
      [line2.end,   v2, line1]
    ]

    var res = fs.map(f => {

      ray.direction.copy(f[1])
      ray.origin.copy(f[0])

      var pos = ray.intersectLine2(f[2], 'xz')
      
      if(!pos) return false

      return [pos.distanceTo(f[0]), f[1] === v1 ? pos.sub(f[0]) : f[0].clone().sub(pos)]

    }).filter(el => !!el)

    var dist = res[0]
    for(var i = 1; i < res.length; i++)
      if(res[i][0] > dist[0]) {

        dist = res[i]

      }

    return dist[1]

  }

  function getFixedPos(obj, o, point) {

    var res = obj.rectangle.cross(o.rectangle)
    if(!res) return false

    var v = obj.position.clone().sub(o.position).normalize()

    var line1 = obj.rectangle.localToWorld(
      obj.rectangle.getLineFromDirect(v.clone().multiplyScalar(-1))
    )
    var line2 = o.rectangle.localToWorld(
      o.rectangle.getLineFromDirect(v)
    )

    var p = linesExtraProj(line1, line2, v)
    if(!p) return false

    p.x += point[0]
    p.y = 0
    p.z += point[1]
    //add дополнительный отступ, что бы не было пересечения
    p.add(v.clone().multiplyScalar(.001))

    return {
      point: p
    }

  }


})()
