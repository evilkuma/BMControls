
define(function(require) {

  var Room = require('./Room')
  var SizeLine = require('./SizeLine')
  var _Math = require('./../Math')

  var raycaster = new THREE.Raycaster
  var ray = new THREE.Ray
  var box = new THREE.Box3

  function BMObject(data) {

    this.mesh = data.obj
    this.size = box.setFromObject(data.obj).getSize(new THREE.Vector3)
    this.type = data.type || 'floor'
    this.parent = data.parent

    this.SAT = new SAT.Polygon(new SAT.Vector(0,0), [
      new SAT.Vector(-this.size.x/2,-this.size.z/2),
      new SAT.Vector( this.size.x/2,-this.size.z/2),
      new SAT.Vector( this.size.x/2,this.size.z/2),
      new SAT.Vector(-this.size.x/2,this.size.z/2)
    ])

    if(data.position) {

      this.mesh.position.y = this.size.y/2

    }

  }

  BMObject.prototype.setPosition = function(vec) {

    if(this.type === 'floor') {

      this.mesh.position.x = vec.x
      this.mesh.position.z = vec.z

      this.SAT.pos.x = vec.x
      this.SAT.pos.y = vec.z

    } else
    if(this.type === 'wall') {

      this.mesh.position.x = vec.x
      this.mesh.position.y = vec.y
      this.mesh.position.z = vec.z

      this.SAT.pos.x = vec.x
      this.SAT.pos.y = vec.y

    }

    return this

  }

  BMObject.prototype.remove = function() {

    this.mesh.parent.remove(this.mesh)
    this.parent.remove(this)

    return this

  }

  BMObject.prototype.setRotation = function(rot) {

    this.mesh.rotation.y = rot
    this.SAT.setAngle(-rot)

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
  var response = new SAT.Response();
  function moveSelected(self) {

    // настраиваем кастер и пуляем луч в плэйн пола
    raycaster.setFromCamera( self.mouse, self.scene.camera )

    var pos, wall

    for(wall of self.room._walls) {
      
      if(pos = wall.ray(raycaster)) {

        break

      }

    }

    if(self.obj.type === 'floor' || self.obj.type === 'full') {

      if(pos) self.obj.setRotation(wall.mesh.rotation.y)

      var intersect = raycaster.intersectObject( self.room._floor, false )

      // если мимо ничего не делаем
      if(!intersect.length) {

        if(!pos) return

        intersect = pos.clone()
        intersect.y = 0

      }
      else intersect = intersect[0].point

      self.obj.setPosition(intersect)

      var position = self.obj.mesh.position.clone()

      var collide = function(vec) {

        // walls
        for(var wall of self.room._walls) {

          response.clear()
          var collided = SAT.testPolygonPolygon(self.obj.SAT, wall.SAT, response)
  
          if(collided) {

            if(Math.sign(wall.normal.x) == Math.sign(response.overlapV.x)) {
  
              response.overlapV.x =-response.overlapV.x
  
            }
  
            if(Math.sign(wall.normal.z) == Math.sign(response.overlapV.y)) {
  
              response.overlapV.y = -response.overlapV.y
  
            }
  
            position.x -= response.overlapV.x
            position.z -= response.overlapV.y

            vec = new THREE.Vector3(-response.overlapV.x, 0, -response.overlapV.y).toFixed().normalize()
  
            // additional offset so that there would be no intersection
            position.add(
              vec.clone().multiplyScalar(.01)
            )

            self.obj.SAT.pos.x = position.x
            self.obj.SAT.pos.y = position.z

            collide(vec)
            return
  
          }
  
        }

        // objects
        for(var obj of self.objects) {

          if(obj === self.obj) continue
  
          response.clear()
          var collided = SAT.testPolygonPolygon(self.obj.SAT, obj.SAT, response)

          if(collided) {

            if(vec) {

              var signx = Math.sign(response.overlapV.x)
              var signy = Math.sign(response.overlapV.y)

              if(vec.x && response.overlapV.x && signx == Math.sign(vec.x)) {

                response.overlapV.x = -response.overlapV.x

              }

              if(vec.z && response.overlapV.y && signy == Math.sign(vec.z)) {

                response.overlapV.y = -response.overlapV.y

              }

            } else vec = new THREE.Vector3(-response.overlapV.x, 0, -response.overlapV.y).normalize()

            position.x -= response.overlapV.x
            position.z -= response.overlapV.y
            // additional offset so that there would be no intersection
            position.add(new THREE.Vector3(-response.overlapV.x, 0, -response.overlapV.y).normalize().multiplyScalar(.01))
            // assign changes
            self.obj.SAT.pos.x = position.x
            self.obj.SAT.pos.y = position.z

            // use recursive
            collide(vec)
            return
  
          }
  
        }

      }

      collide()

      self.obj.setPosition(position)

      self.updateSizeLines(self.obj)

    } else if(self.obj.type === 'wall') {

      if(!pos) return

      if(self.obj.wall !== wall) {

        if(self.obj.wall) {

          self.obj.wall.removeObj(self.obj)

        }

        wall.addObj(self.obj)
        self.obj.wall = wall

      }
      
      self.obj.setPosition(pos)

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
    this.ocontrol = ocontrol;
    // создается 4 размерных линии, сразу скрываются, добавляются на сцену и хранятся в массиве this.size_lines
    (this.size_lines = [new SizeLine({w:10}), new SizeLine({w:10}), new SizeLine({w:10}), new SizeLine({w:10})]).forEach((line) => {

      this.scene.scene.add(line)
      line.visible = false

    })

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

      return this

    }

    /**
     * если кнопка мыши была поднята в течении
     * некоторого времени, то выделяем обьект,
     * иначе работает orbit
     */
    this.moveTimeout = null

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

    this.obj = obj
    this.updateSizeLines(this.obj)

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
    this.updateSizeLines()

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

  BMControl.prototype.updateSizeLines = function(obj) {

    if(!obj) {

      this.size_lines.forEach(line => line.visible = false)

      return

    }

    if(obj.type === 'floor') {

      ray.origin.copy(obj.mesh.position)
      ray.origin.y = 1
  
      var dirs = [
        [-1, 0, 0], [1, 0, 0],  //left right
        [0, 0, 1], [0, 0, -1]    //top bottom
      ]
  
      var size = _Math.calcRealSize(obj.size.clone(), obj.mesh.rotation.y, 'x', 'z').abs()
      var info = new Array(4)
  
      for(var o of this.objects) {
  
        if (o === obj) continue
  
        var o_size = o.size.clone()
  
        if(o.mesh.rotation.y) _Math.calcRealSize(o_size, o.mesh.rotation.y, 'x', 'z').abs()
  
        box.setFromCenterAndSize(o.mesh.position, o_size)
  
        for(var i = 0; i < 4; i++) {
  
          ray.direction.set(...dirs[i])
  
          if( ray.intersectsBox(box) ) {
  
            var abs_dir = ray.direction.clone().abs()
            var v = i < 2 ? 'x' : 'z'
  
            var n_v = o.mesh.position.clone().multiply(abs_dir).add( 
              obj.mesh.position.clone().multiply( new THREE.Vector3(1,1,1).sub(abs_dir) )
            ).add(ray.direction.multiplyScalar(-o_size[v]/2))

            if(!info[i] || n_v.distanceTo(obj.mesh.position) < info[i].distanceTo(obj.mesh.position)) 
              info[i] = n_v
  
            // 1 обьект может пересекаться только с 1 стороной, потому нет смысла проходить весь цикл
            break 
  
          }
  
        }
        
      }
  
      // if not find obj, find point on wall
      var walls = this.room._walls.map(wall => wall.mesh)
  
      for(var i = 0; i < 4; i ++) {
  
        if(info[i]) continue
  
        raycaster.ray.origin.copy(obj.mesh.position)
        raycaster.ray.direction.set(...dirs[i])
  
        var res = raycaster.intersectObjects(walls, false)
  
        if(res.length) {
  
          info[i] = res[0].point
  
        }
  
      }
  
      // show lines 
      var rots = [
        0, Math.PI,             //left right
        Math.PI/2, Math.PI*1.5  //top bottom
      ]
  
      var o_points = [
        obj.mesh.position.clone(), obj.mesh.position.clone(),
        obj.mesh.position.clone(), obj.mesh.position.clone()
      ]
      o_points[0].x -= size.x/2 //left
      o_points[1].x += size.x/2 //right
      o_points[2].z += size.z/2 //top
      o_points[3].z -= size.z/2 //bottom
  
      for(var i = 0; i < 4; i++) {
  
        if(!info[i]) continue

        var line = this.size_lines[i]
        var l = +info[i].distanceTo(o_points[i]).toFixed(2)
  
        if(l > 4) {
  
          line.visible = true
          line.position.copy(o_points[i]).sub(info[i]).divideScalar(2).add(info[i])
          line.l = l
          line.rotation.set(0, rots[i], Math.PI/2)
  
        } else line.visible = false
  
      }

    } else {

      if(!obj.wall) return

      var size = obj.size
      var info = new Array(3)

      var dirs = [
        [-1,0,0], [1,0,0], [0,-1,0] // left right down
      ]

      var v2 = new THREE.Vector2
      var v3 = new THREE.Vector3

      var wall_start = v2.set(obj.wall.point1.x, obj.wall.point1.z).rotateAround({x:0, y:0}, obj.wall.mesh.rotation.y).x
      var wall_end = v2.set(obj.wall.point2.x, obj.wall.point2.z).rotateAround({x:0, y:0}, obj.wall.mesh.rotation.y).x

      var ro_position = new THREE.Vector3(
        v2.set(obj.mesh.position.x, obj.mesh.position.z).rotateAround({x:0, y: 0}, obj.wall.mesh.rotation.y).x,
        obj.mesh.position.y,
        size.z/2
      )

      ray.origin.copy(ro_position)
      ray.origin.z = 4

      for(var o of obj.wall.objects) {

        if(o === obj) continue

        var o_size = o.size

        v3.set(
          v2.set(o.mesh.position.x, o.mesh.position.z).rotateAround({x:0, y:0}, obj.wall.mesh.rotation.y).x,
          o.mesh.position.y,
          o_size.z/2
        )

        box.setFromCenterAndSize(v3, o_size)

        for(var i = 0; i < 3; i++) {

          ray.direction.set(...dirs[i])

          if( ray.intersectsBox(box) ) {

            switch(i) {

              case 0:
                var n_v = v3.x + o_size.x/2
                if(!info[i] || Math.abs(n_v-ro_position.x) < Math.abs(info[i]-ro_position.x))
                  info[i] = n_v
                break
              case 1:
                var n_v = v3.x - o_size.x/2
                if(!info[i] || Math.abs(n_v-ro_position.x) < Math.abs(info[i]-ro_position.x))
                  info[i] = n_v
                break
              case 2:
                info[i] = v3.y + o_size.y/2
                break

            }

            // 1 оьект может пересекаться только с 1 стороной, потому нет смысла проходить весь цикл
            break 

          }

        }

      }

      if(!info[0]) {

        info[0] = wall_start

      }

      if(!info[1]) {

        info[1] = wall_end

      }

      if(!info[2]) {

        info[2] = this.room._floor.position.y

      }

      // left right
      info[0] = [info[0] - wall_start, (ro_position.x - size.x/2) - wall_start]
      info[1] = [info[1] - wall_start, (ro_position.x + size.x/2) - wall_start]

      var z_mv = obj.wall.normal.clone().multiplyScalar(size.z/2)

      for(var i = 0; i < 2; i++) {

        // convert positions
        for(var j in info[i]) {

          info[i][j] = obj.wall.point1.clone().add(
            obj.wall.vec.clone().multiplyScalar(info[i][j])
          ).add(z_mv)

          info[i][j].y = obj.mesh.position.y

        }

        // calc lines
        var p1 = info[i][0]
        var p2 = info[i][1]

        var l = +p1.distanceTo(p2).toFixed(2)
        var line = this.size_lines[i]

        if(l > 4) {

          line.visible = true
          line.l = l
          line.position.copy(p1.sub(p2).divideScalar(2).add(p2))
          line.rotation.set(Math.PI/2, 0, Math.PI/2 + (2*Math.PI-obj.wall.mesh.rotation.y))

        } else line.visible = false

      }

      // bottom
      var p1 = obj.mesh.position.clone()
      p1.y -= size.y/2
      var p2 = obj.mesh.position.clone()
      p2.y = info[2]

      var l = +p1.distanceTo(p2).toFixed(2)
      var line = this.size_lines[2]

      if(l > 4) {

        line.visible = true
        line.l = l
        line.position.copy(p1.sub(p2).divideScalar(2).add(p2))
        line.rotation.set(0, Math.PI/2 + (obj.wall.mesh.rotation.y), 0)

      } else line.visible = false

    }

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
