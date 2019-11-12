
define(function(require) {

  var Room = require('./Room')
  var Rectangle = require('./Rectangle')
  var _Math = require('./../Math')
  var SizeLine = require('./SizeLine')

  var raycaster = new THREE.Raycaster
  var ray = new THREE.Ray
  var box = new THREE.Box3


  function BMObject(data) {

    this.mesh = data.obj
    this.size = box.setFromObject(data.obj).getSize(new THREE.Vector3)
    this.type = data.type || 'floor'
    this.parent = data.parent

    this._shape
    this._body = new p2.Body({ mass: 1, angle: 0, fixedRotation: true })
    this._body.type = p2.Body.DYNAMIC
    this.updateShape()

    if(this.type === 'floor') 
      this.parent.p2.world.addBody(this._body)

    if(data.position) {

      this.mesh.position.y = this.size.y/2

    }

  }

  BMObject.prototype.updateShape = function() {

    var width = this.size.x, height = this.type === 'floor' ? this.size.z : this.size.y

    // add remove shape

    this._shape = new p2.Box({ width, height })
    // this._shape.material = this.parent.p2.materials[0]

    this._body.addShape(this._shape)

    return this

  }

  BMObject.prototype.setPosition = function(vec) {

    var x = vec.x, y = this.type === 'floor' ? vec.z : vec.y

    this._body.position[0] = x
    this._body.position[1] = y

    return this

  }

  BMObject.prototype.update = function() {

    if(this.type === 'floor') {

      this.mesh.position.x = this._body.position[0]
      this.mesh.position.z = this._body.position[1]

    } else {

      if(!this.wall) return

      var pos = this.wall.position.clone()
        .add(this.wall.vec.clone().multiplyScalar(this._body.position[0]))
        .add(this.wall.rvec.clone().multiplyScalar(this.size.z/2))

      this.mesh.position.x = pos.x
      this.mesh.position.y = this._body.position[1]
      this.mesh.position.z = pos.z

    }

    return this

  }

  BMObject.prototype.remove = function() {

    this.mesh.parent.remove(this.mesh)
    this.parent.remove(this)

    return this

  }

  BMObject.prototype.setRotation = function(rot) {

    // this._body.angle = rot
    this.mesh.rotation.y = rot

    return this

  }

  /**
   * Ищет 3д обьект для взаимодействия
   * 
   * @param {BMControl} self 
   * 
   * @returns Object - info about object | false
   */
  function findObject(self) {

    raycaster.setFromCamera( self.mouse, self.scene.camera ) 
  
    var intersect = new THREE.Vector3
    var dist = false
    var res = false
  
    for(var info of self.objects) {
      
      var obj = info.mesh

      box.setFromCenterAndSize(obj.position, info.size)

      if(raycaster.ray.intersectBox(box, intersect)) {
  
        var ndist = intersect.sub(raycaster.ray.origin).length()
  
        if(!dist || ndist < dist) {
  
          res = info
          dist = ndist
  
        }
  
      }
  
    }
  
    return res

  }

  /**
   * Расчет передвижения обьекта
   * 
   * @param {BMControl} self 
   */
  function moveSelected(self) {

    // настраиваем кастер и пуляем луч в плэйн пола
    raycaster.setFromCamera( self.mouse, self.scene.camera )

    if(self.obj.type === 'floor' || self.obj.type === 'full') {

      // TODO rotate by wall

      var intersect = raycaster.ray.intersectPlane( self.room._plane, self.p2.toPosition )
      // если мимо ничего не делаем (правда это анрил, но на всяк)
      if(!intersect) return false

      var mv = intersect.clone().sub({x: self.obj._body.position[0], y: 0, z: self.obj._body.position[1]}) //.multiplyScalar(10)
      var len = mv.length()
      mv.normalize().multiplyScalar(len*10)
      self.obj._body.velocity[0] = mv.x
      self.obj._body.velocity[1] = mv.z

      updateWorld(self.p2.world, self.obj)

    }

    if(self.obj.type === 'wall') {

      var wall, pos = false

      for(wall of self.room._walls) {
        
        if(pos = wall.ray(raycaster)) {
  
          break
  
        }

      }

      if(!pos) return

      if(self.obj.wall !== wall) {

        if(self.obj.wall) {

          self.obj.wall.removeObj(self.obj)
  
        }

        wall.addObj(self.obj)
        self.obj.wall = wall

      }

      var mv = pos.clone().sub(self.obj.mesh.position)
      var len = mv.length()
      mv.normalize().multiplyScalar(len*10)

      var x = new THREE.Vector2(mv.x, mv.z).rotateAround({x:0, y:0}, wall.mesh.rotation.y).x
      
      self.obj._body.velocity[0] = x
      self.obj._body.velocity[1] = mv.y

      updateWorld(wall.world, self.obj)

    }

  }

  /**
   * exorted Class BMControl
   */
  function BMControl({ scene, points = [], dom = document.body, ocontrol } = {}) {

    this.objects = []

    this.events = {}
    this.obj = null
    this.move = false
    this.mouse = new THREE.Vector2
    this.scene = scene
    this.ocontrol = ocontrol

    var events = {
      mouseMove: mouseMove.bind(this),
      mouseDown: mouseDown.bind(this),
      mouseUp: mouseUp.bind(this)
    }

    this._enabled = false

    this.enable = function(bool) {

      this.enabled = bool

      var func = bool ? 'addEventListener' : 'removeEventListener'

      dom[func]('mousemove', events.mouseMove)
      dom[func]('mousedown', events.mouseDown)
      dom[func]('mouseup', events.mouseUp)

      // if(bool) {

      //   animate()

      // }

      return this

    }

    /**
     * если кнопка мыши была поднята в течении
     * некоторого времени, то выделяем обьект,
     * иначе работает orbit
     */
    this.moveTimeout = null

    // p2
    this.p2 = {

      world: new p2.World({ gravity:[0, 0] }),
      // tmp
      toPosition: new THREE.Vector3

    }

    this.p2.world.defaultContactMaterial.friction = 0.0;
    this.p2.world.setGlobalStiffness(1e10);

    // var animate = t => {

    //   requestAnimationFrame( animate )

    //   this.p2.world.step(1/60)
    //   // this.room._walls.forEach(wall => wall.world.step(1/60))

    //   this.objects.forEach(o => {
    //     if(o.type === 'wall') return
    //     o._body.velocity[0] = 0
    //     o._body.velocity[1] = 0
    //     o.update()
    //   })
    
    // }

    this.room = new Room(points, this)
    this.enable(true)

  }

  BMControl.prototype.add = function() {

    for ( var i = 0; i < arguments.length; i ++ ) {

      var info = arguments[i]

      var obj = info

      if(obj.isObject3D) {

        obj = { obj, type: 'floor', position: true }
        
      }

      this.objects.push(new BMObject( Object.assign({ parent: this }, obj) ))

    }

  }

  BMControl.prototype.remove = function() {

    for ( var i = 0; i < arguments.length; i ++ ) {

      var obj = arguments[i], idx
      
      if(obj.isObject3D) {

        idx = this.objects.findIndex(o => o.mesh === obj)

      } else idx = this.objects.indexOf(obj)

      if(idx !== -1) {

        this.objects.splice(idx, 1)

      }

    }

  }

  BMControl.prototype.selectedObject = function(obj) {

    if(this.ocontrol && this.ocontrol.enabled) {

      this.ocontrol.enabled = false
      
    }

    for(var o of this.objects) {

      o._body.type = p2.Body.KINEMATIC

    }
    
    obj._body.type = p2.Body.DYNAMIC

    this.obj = obj

    if(this.events.onselected)
      this.events.onselected(obj, this.objects)

  };

  BMControl.prototype.unselectedObject = function(resetOControl) {

    if(resetOControl && this.ocontrol && this.ocontrol.setRotateStart) {
      this.ocontrol.setRotateStart(new THREE.Vector2(...resetOControl))
    }

    if(this.events.onunselected)
      this.events.onunselected(this.obj, this.objects)

    this.obj = null

    if(this.ocontrol && !this.ocontrol.enabled) {

      this.ocontrol.enabled = true
      
    }

  };

  BMControl.prototype.getWallByObj = function(obj) {

    return this.room._walls.find(wall => wall.objects.includes(obj))

  };

  BMControl.prototype.clear = function() {

    this.obj = false

    while(this.objects.length)
      this.objects[0].remove()

    this.room.clear()

  };

  /**
   * Event on dom
   */
  function mouseMove(e) {

    var dom = this.scene.renderer.domElement
    var bounds = dom.getBoundingClientRect()
  
    this.mouse.x = ((e.clientX - bounds.left) / dom.clientWidth) * 2 - 1,
    this.mouse.y = -((e.clientY - bounds.top) / dom.clientHeight) * 2 + 1

    if(this.obj) {

      if(!this.move) return

      moveSelected(this)

    } else {

      if(this.events.onview) {

        var obj = findObject(this)
        this.events.onview(obj, this.objects)

      }

    }

  }

  /**
   * Event on dom
   */
  function mouseDown(e) {

    this.move = true

    var obj = findObject(this)

    if(obj) { 

      if(obj !== this.obj && this.obj) {

        this.unselectedObject([e.clientX, e.clientY])

      }

      this.moveTimeout = [
        obj,
        setTimeout((function() {
  
          this.moveTimeout = null
          
        }).bind(this), 200)
      ]

    } else if(this.obj) {

      this.unselectedObject([e.clientX, e.clientY])

    }

  }

  /**
   * Event on dom
   */
  function mouseUp(e) {

    this.move = false

    if(this.moveTimeout) {
      
      clearTimeout(this.moveTimeout[1])

      this.selectedObject(this.moveTimeout[0])
      
      this.moveTimeout = null

    }

  }

  function updateWorld(world, obj) {

    world.step(1/60)

    setTimeout(e => {

      world.step(1/60)

      setTimeout(e => {

        world.step(1/60)

          if(obj) {
            
            obj.update()
            obj._body.velocity[0] = 0
            obj._body.velocity[1] = 0

          }

      }, 6)

    }, 6)

  }

  //export
  return BMControl

})
