
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

          var v = obj.position.clone().sub(o.position).normalize()

          var line1 = obj.rectangle.localToWorld(obj.rectangle.getLineFromDirect(v.clone().multiplyScalar(-1)))
          var line2 = o.rectangle.localToWorld(o.rectangle.getLineFromDirect(v))

          var p = linesExtraProj(line1, line2, v)

          if(p) {

            p.x += point[0]
            p.z += point[1]

            obj.position.x = p.x
            obj.position.z = p.z

          } else console.log('watafacka')


        }

      }

    }
    
    var boxes = [new THREE.CubeMesh, new THREE.CubeMesh]
    boxes[0].position.x = 3
    boxes[0].rotation.y = Math.PI/5
    boxes[1].position.x = -3
    boxes[1].rotation.y = -Math.PI/1.5

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

      return [pos.distanceTo(f[0]), f[1] === v1 ? pos.sub(f[0]) : f[0].sub(pos)]

    }).filter(el => !!el)

    var dist = res[0]
    for(var i = 1; i < res.length; i++)
      if(res[i][0] > dist[0]) {

        dist = res[i]

      }

    return dist[1]

  }


})()
