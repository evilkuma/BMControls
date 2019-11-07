
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

    this._body = new p2.Box()

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
      
      var obj = info.obj

      if(raycaster.ray.intersectBox(box.setFromObject(obj), intersect)) {
  
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

    if(self.obj.type === 'wall' || self.obj.type === 'full') {

      // move by wall
      var isRemove, wall1

      for(wall1 of self.room._walls)
        if(isRemove = wall1.removeObj(self.obj)) break
  
      for(var wall of self.room._walls) {
  
        var pos = false
  
        if(pos = wall.ray(raycaster)) {
  
          wall.addObj(self.obj)

          if(isRemove && wall !== wall1) wall1.limits_y.forEach(limit => limit.mesh.visible = false)
  
          return moveByWall(self, wall, pos)
  
        }
  
      }

      return false

    }

    if(self.obj.type === 'floor' || self.obj.type === 'full') {

      // rotate by wall
      for(var wall of self.room._walls)
        if(wall.ray(raycaster)) {

          self.obj.obj.rotation.y = wall.mesh.rotation.y
          break

        }

      // move by floor

      var intersect = raycaster.ray.intersectPlane( self.room._plane, new THREE.Vector3 )

      // если мимо ничего не делаем (правда это анрил, но на всяк)
      if(!intersect) return false

      var info = self.getObjInfo(self.obj)
      self.obj.obj.position.y = info.size.y/2

      var walls = getInterestWalls(self, intersect)

      if(walls.length === 1) {

        var tmp = getInterestWalls(self, walls[0].point, [walls[0].p])
        if(tmp.length) walls.push(tmp[0])

      }

      var v = setFixedWalls(walls, intersect)

      var objs = getInterestObjs(self, intersect)

      if(!objs.length) {

        self.obj.obj.position.x = intersect.x
        self.obj.obj.position.z = intersect.z
        
        return true

      }

      if( setFixedObjs(self, objs, intersect, v) ) {

        walls = getInterestWalls(self, intersect)

        if(!walls.length) {

          self.obj.obj.position.x = intersect.x
          self.obj.obj.position.z = intersect.z

          return true

        }

      }

    }

  }

  /**
   * exorted Class BMControl
   */
  function BMControl({ scene, points = [], dom = document.body, ocontrol } = {}) {

    this.objects = []

    this.room = new Room(points)
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

    this.enable = function(bool) {

      var func = bool ? 'addEventListener' : 'removeEventListener'

      dom[func]('mousemove', events.mouseMove)
      dom[func]('mousedown', events.mouseDown)
      dom[func]('mouseup', events.mouseUp)

      return this

    }

    this.enable(true)

    /**
     * если кнопка мыши была поднята в течении
     * некоторого времени, то выделяем обьект,
     * иначе работает orbit
     */
    this.moveTimeout = null

  }

  BMControl.prototype.add = function() {

    for ( var i = 0; i < arguments.length; i ++ ) {

      var info = arguments[i]

      var obj = info, size = new THREE.Vector3

      if(obj.isObject3D) {

        obj = { obj, type: 'floor', position: true }
        
      }

      obj.size = box.setFromObject(obj.obj).getSize(new THREE.Vector3)

      this.objects.push(obj)

      if(obj.position) {

        obj.obj.position.y = obj.size.y/2

      }

    }

  }

  BMControl.prototype.remove = function() {

    for ( var i = 0; i < arguments.length; i ++ ) {

      var obj = arguments[i], idx
      
      if(obj.isObject3D) {

        idx = this.objects.findIndex(o => o.obj === obj)

      } else idx = this.objects.indexOf(obj)

      if(idx !== -1) {

        this.objects.splice(idx, 1)
        this.sizes.splice(idx, 1)
        this.rects.splice(idx, 1)

      }

    }

  }

  BMControl.prototype.selectedObject = function(obj) {

    if(this.ocontrol && this.ocontrol.enabled) {

      this.ocontrol.enabled = false
      
    }

    var wall = this.getWallByObj(obj)
    if(wall) {

      wall.limits_y.forEach(limit => limit.mesh.visible = true)

    }

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

    this.room._walls.forEach(wall => wall.limits_y.forEach(limit => limit.mesh.visible = false))

    this.obj = null

    if(this.ocontrol && !this.ocontrol.enabled) {

      this.ocontrol.enabled = true
      
    }

  };

  BMControl.prototype.getSizeObj = function(obj) {

    var idx = this.objects.indexOf(obj)

    if(idx === -1) return false

    return this.sizes[idx]

  };

  BMControl.prototype.getRectObj = function(obj) {

    var idx = this.objects.indexOf(obj)

    if(idx === -1) return false

    return this.rects[idx]

  };

  BMControl.prototype.getObjInfo = function(obj) {

    var idx = this.objects.indexOf(obj)

    if(idx === -1) return false

    return {

      rect: this.rects[idx],
      size: this.sizes[idx],
      obj

    }

  };

  BMControl.prototype.getWallInfo = function(wall, exclude) {

    var res = []

    for(var obj of wall.objects) {

      if(exclude && exclude.includes(obj)) continue

      res.push(this.getObjInfo(obj))

    }

    return res

  };

  BMControl.prototype.getWallByObj = function(obj) {

    return this.room._walls.find(wall => wall.objects.includes(obj))

  };

BMControl.prototype.clear = function() {

  this.obj = false

  for(var i = 0; i < this.objects.length; i++) {

    var obj = this.objects[i].obj
    if(obj.parent) obj.parent.remove(obj)

  }

  this.objects = []
  this.sizes = []
  this.rects = []

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

  //export
  return BMControl

})
