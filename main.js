
(function() {

  var SCOPE

  requirejs(['./models/main'], function(global) {

    SCOPE = global

    SCOPE.gui = new dat.GUI();

    run()
  
  });

  var scene, bmcontrol, ocontrol

  var box = new THREE.Box3

  function isMarked(obj) {

    box.setFromObject(obj)
    var res = box.getSize(new THREE.Vector3)
    box.max.sub(obj.position)
    box.min.sub(obj.position)
    box.min.x += -0.01
    box.min.y += 0.01
    box.min.z += -0.01
    box.max.addScalar(0.01)

    var mark = new THREE.Box3Helper( box.clone() )

    mark.visible = false
    mark.material.linewidth = 3
    obj.add(mark)

    obj.mark = function(color) {
      mark.visible = !!color
      if(color) {
        mark.material.color = new THREE.Color(color)
      }
    }

    return res

  }

  function fixedOrigin(obj) {

    box.setFromObject(obj)

    var len = box.max.clone().sub(box.min)
    var cmax = box.max.sub(len.divideScalar(2))

    var res = new THREE.Group
    res.add(obj)
    obj.position.sub(cmax)

    return res

  }

  function run() {

    scene = new THREE.DefaultScene(document.body)
    SCOPE.scene = scene.scene

    ocontrol = new THREE.OrbitControls(scene.camera, scene.renderer.domElement)

    bmcontrol = new THREE.BMControl({
      scene,
      points: [
        new THREE.Vector3(-80, 0, 80),
        new THREE.Vector3(-60, 0, -20),
        new THREE.Vector3(0,  0, -80),
        new THREE.Vector3(80,  0, -80),
        new THREE.Vector3(80,  0, 80)
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
    
    var assets = [
      { key: 'soldier', title: 'soldier' },
      { key: 'bed', title: 'bed' },
      { key: 'closet', title: 'closet' },
      { key: 'table', title: 'table' },
    ]

    function loadMTL() {
      // TODO: cached requests
      new THREE.MTLLoader().setPath('assets/'+this+'/').load('OBJ.mtl', materials => {
  
        materials.preload();
  
        new THREE.OBJLoader().setMaterials(materials).setPath('assets/'+this+'/').load('OBJ.obj', obj => {
  
          obj = fixedOrigin(obj)
  
          scene.scene.add(obj)
    
          bmcontrol.add([obj, isMarked(obj)])
  
        })
  
      })

    }

    assets.forEach(a => {

      a.load = loadMTL.bind(a.key)
      var g = SCOPE.gui.add(a, 'load')
      g.name(a.title)
      
    })

  }

})()
