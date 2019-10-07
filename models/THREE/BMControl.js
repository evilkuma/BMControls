
define(function(require) {

  var Room = require('./Room')
  var raycaster = new THREE.Raycaster
  var ray = new THREE.Ray
  var SCOPE = require('./../global')


  /**
   * Ищет 3д обьект для взаимодействия
   * 
   * @param {BMControl} self 
   * 
   * @returns Object - info about object | false
   */
  function findObject(self) {

    raycaster.setFromCamera( self.mouse, self.scene.camera ) 
    var intersects = raycaster.intersectObjects( self.objects )

    if(intersects.length) 
      return intersects[0]

    return false

  }

  function getInterestWalls(self, intersect, exclude) {

    var res = []

    for(var p of self.room._walls) {

      if(exclude && exclude.includes(p)) continue

      ray.set(intersect, p.rvec.clone().multiplyScalar(-1))
      var pos = ray.intersectPlane(p, new THREE.Vector3)

      if(pos) {
        if( (pos.x > p.max.x || pos.x < p.min.x) || (pos.z > p.max.z || pos.z < p.min.z) ) 
          continue
      } else {
        var angle = p.point1.angleTo(p.point2) - p.point1.angleTo(intersect) - p.point2.angleTo(intersect)
        if(+angle.toFixed(10) < 0) continue
      }

      var points = self.obj.toRectY(intersect).map(pt => pt.start)

      var isOver = false
      var over_poses = points.map(pt => {
    
        ray.set(pt, p.rvec)
        var res = ray.intersectPlane(p, new THREE.Vector3)
        if(res) isOver = true
    
        return res
    
      })

      if(!isOver) continue

      var idx, distance = 0
      for(let i = 0; i < over_poses.length; i++) {

        if(!over_poses[i]) continue

        var ndist = over_poses[i].distanceTo(points[i])
        if(ndist >= distance) {
          distance = ndist
          idx = i
        }

      }

      var mv = p.rvec.clone().multiplyScalar(.001)
      var nx = intersect.x - (points[idx].x - over_poses[idx].x) + mv.x
      var nz = intersect.z - (points[idx].z - over_poses[idx].z) + mv.z

      res.push({ 
        point: new THREE.Vector3(nx, 0, nz),
        p
      })

    }

    return res

  }

  function getInterestObjs(self, intersect, exclude) {

    var res = []

    for(var o of self.objects) {

      if(self.obj === o || (exclude && exclude.includes(o))) continue

      var cross = self.obj.rectangle.cross(o.rectangle, intersect)
      if(!cross) continue

      res.push({
        cross,
        o
      })

    }

    return res

  }

  function setFixedWalls(walls, intersect) {

    if(!walls.length) return false
    if(walls.length === 1) {
      intersect.copy(walls[0].point)
      return walls[0].p.rvec
    }

    var vec1 = walls[0].p.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0))
    var vec2 = walls[1].p.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0))

    ray.set(walls[0].point, vec1)

    var res = ray.intersectVec2( vec2, walls[1].point, 'xz')

    intersect.copy(res)

    return walls[0].p.rvec.clone().add(walls[1].p.rvec).normalize()

  }

  function setFixedObjs(obj, objs, intersect, vec) {

    if(!objs.length) return

    /**
     * calc vector mv
     */

    var v = new THREE.Vector3

    objs.map(o => {
      
      var lines = o.o.rectangle.getWorldLines()
      
      var info = lines.map(line => {

        var v = line.start.clone().sub(line.end).normalize()
        var dir = v.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0)).toFixed(10)

        ray.origin.copy(intersect)
        ray.direction.copy(dir.clone().multiplyScalar(-1))

        var p1 = v.clone().multiplyScalar(1000).add(line.start)
        var p2 = v.clone().multiplyScalar(-1000).add(line.end)

        if(!ray.intersectsLine2(new THREE.Line3(p1, p2), 'xz'))
          return false

        return { v, line, dir }

      }).filter(l => !!l)

      if(info.length === 1) return info[0].dir
      if(info.length === 2) return info[0].dir.clone().add(info[1].dir).normalize()
      return o.o.rectangle.directionFromTriangles(intersect)

    }).filter(v => !!v).forEach(e => v.add(e).normalize())

    if(v.equals({x:0, y:0, z:0})) v = vec ? vec : new THREE.Vector3(0, 0, 1)
    else if(vec) {
      var vecr = vec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0))
      var a = Math.PI/2
      if(vecr.angleTo(v) > Math.PI/2) a *= -1

      v = vec.clone().applyEuler(new THREE.Euler(0, a, 0)).toFixed().normalize()

    }

    arar.position.copy(intersect)
    arar.setDirection(v)

    if(vec && v.angleTo(vec) > Math.PI/2) v = vec

    /**
     * calc mv val by vector
     */

    if(objs.length === 1) {
        
      var line1 = obj.rectangle.getLineFromDirect(v.clone().multiplyScalar(-1)) 
      if(line1) {

        line1 = line1.clone()
        line1.start.add(intersect)
        line1.end.add(intersect)

      } else return false

      var line2 = objs[0].o.rectangle.getLineFromDirect(v)
      if(line2) line2 = objs[0].o.rectangle.localToWorld(line2)
        else return false

      var p

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
      
      if(!res.length) return false

      var dist = res[0]
      for(var i = 1; i < res.length; i++)
        if(res[i][0] > dist[0]) {

          dist = res[i]

        }

      p = dist[1]

      if(!p) {

        return false
      }

      p.add(v.clone().multiplyScalar(.001))

      intersect.add(p)

      return true

    }

    if(objs.length === 2) {

      // TODO: add multy objs

    }

  }

  function fixWallObj(self, intersect) {

    var o_info = null, o_p = null, info = null, p = null, iter = -1

    while(true) {

      iter++

      if(o_info) {

        intersect.x = o_info.point[0]
        intersect.z = o_info.point[1]
        self.obj.position.x = o_info.point[0]
        self.obj.position.z = o_info.point[1]

      }

      info = null

      for(p of self.room._walls) {

        if(p === o_p) continue

        // info = getFixedPos(self.obj, p, intersect)

        // ищем проецкию позицию передвижения на плэйн
        ray.set(intersect, p.rvec.clone().multiplyScalar(-1))
        var pos = ray.intersectPlane(p, new THREE.Vector3)

        if(pos) {
          // проверяем вхождение точки в зону действия плэйна
          // когда мышь в пределах комнаты
          if( (pos.x > p.max.x || pos.x < p.min.x) || (pos.z > p.max.z || pos.z < p.min.z) ) 
            continue
    
        } else {
          // когда мышь за пределами комнаты
          var angle = p.point1.angleTo(p.point2) - p.point1.angleTo(intersect) - p.point2.angleTo(intersect)
    
          if(+angle.toFixed(10) < 0) continue

        }

        // ищем предельеные точки объекта, которые выходят за пределы плэйна
        var points = self.obj.toRectY()
        var isOver = false
        var over_poses = points.map(pt => {
      
          ray.set(pt, p.rvec)
          var res = ray.intersectPlane(p, new THREE.Vector3)
          if(res) isOver = true
      
          return res
      
        })

        // если нет точки вышелшей за пределы - все ок
        if(!isOver) continue

        // находим точку дальше всего выходящую за пределы плэйна
        var idx, distance = 0
        for(let i = 0; i < over_poses.length; i++) {

          if(!over_poses[i]) continue

          var ndist = over_poses[i].distanceTo(points[i])
          if(ndist >= distance) {
            distance = ndist
            idx = i
          }

        }

        // подсчитываем допустимые координаты
        var mv = p.rvec.clone().multiplyScalar(.001)
        var nx = intersect.x - (points[idx].x - over_poses[idx].x) + mv.x
        var nz = intersect.z - (points[idx].z - over_poses[idx].z) + mv.z

        info = { point: [nx, nz] }
        
        break
  
      }
  
      if(!info) break
  
      if(!o_info) {

        o_info = info
        o_p = p

        continue

      }

      var vec1 = o_p.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0))
      var vec2 = p.rvec.clone().applyEuler(new THREE.Euler(0, Math.PI/2, 0))

      ray.origin.set(o_info.point[0], 0, o_info.point[1])
        // .add(p.rvec.clone().multiplyScalar(.001)) 
      ray.direction.copy(vec1)

      var pos = ray.intersectVec2(
        vec2, 
        new THREE.Vector3(info.point[0], 0, info.point[1]),
          // .add(p.rvec.clone().multiplyScalar(.001)), 
        'xz'
      )

      info.point[0] = pos.x
      info.point[1] = pos.z

      o_info = info
      o_p = p

      if(iter > 10) {
        
        console.warn('iterible')
        return false

      }

    }

    return iter > 0

  }

  function fixObjObjs(obj, objs, point) {

    // TODO includes getFixedPos and linesExtraProj to this and remove him

    obj.position.x = point.x
    obj.position.z = point.z

    var info = null, o = null, o_info = null, o_o = null, iter = -1

    while(true) {

      iter++

      if(o_info) {

        point.x = o_info.point.x
        point.z = o_info.point.z
        obj.position.x = info.point.x
        obj.position.z = info.point.z

      }

      info = null

      for(o of objs) {

        if(o === obj || o === o_o) continue

        // info = getFixedPos(obj, o, point)

        var res = obj.rectangle.cross(o.rectangle)
        if(!res) continue

        var v = obj.position.clone().sub(o.position).normalize()

        var line1 = obj.rectangle.getLineFromDirect(v.clone().multiplyScalar(-1)) 
        if(line1)
          line1 = obj.rectangle.localToWorld( line1 )
        else 
          return false

        var line2 = o.rectangle.getLineFromDirect(v)
        if(line2) 
          line2 = o.rectangle.localToWorld(line2)
        else
          return false

        var p
        {

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

          p = dist[1]

        }

        if(!p) continue

        p.x += point.x
        p.y = 0
        p.z += point.z
        //add дополнительный отступ, что бы не было пересечения
        p.add(v.clone().multiplyScalar(.001))

        info = {
          point: p
        }
        
        break

      }

      if(!info) break

      if(!o_info) {

        o_info = info
        o_o = o

        continue

      }

      o_info = info
      o_o = o

      if(iter > 100) {

        console.warn('iterible', iter)
        return false

      }

    }

    return iter > 0

  }

  /**
   * Расчет передвижения обьекта
   * 
   * @param {BMControl} self 
   */
  function moveSelected(self) {

    // настраиваем кастер и пуляем луч в плэйн пола
    raycaster.setFromCamera( self.mouse, self.scene.camera )
    var intersect = raycaster.ray.intersectPlane( self.room._plane, new THREE.Vector3 )

    // если мимо ничего не делаем (правда это анрил, но на всяк)
    if(!intersect) return

    var walls = getInterestWalls(self, intersect)

    if(walls.length === 1) {

      var tmp = getInterestWalls(self, walls[0].point, [walls[0].p])
      if(tmp.length) walls.push(tmp[0])

    }

    var v = setFixedWalls(walls, intersect)

    var objs = getInterestObjs(self, intersect)

    if(!objs.length) {

      self.obj.position.x = intersect.x
      self.obj.position.z = intersect.z
      
      return

    }

    // if(!walls.length) {

      if(setFixedObjs(self.obj, objs, intersect, v)) {

        walls = getInterestWalls(self, intersect)

        if(!walls.length) {

          self.obj.position.x = intersect.x
          self.obj.position.z = intersect.z

          return

        }

      }

    // }




    // console.log(walls)

    // TODO fixed recutsive

    // var iter = 0
    // while((
    //   fixWallObj(self, intersect) || 
    //   fixObjObjs(self.obj, self.objects, intersect)
    // ) && iter < 10) {
    //   iter++
    // }

    // if(iter > 8) console.warn('iter')

    // var wo = fixWallObj(self, intersect)
    // var oo = fixObjObjs(self.obj, self.objects, intersect)

    // if(oo && wo) self.obj.position.copy(old)

    // var recursive = function() {
    //   iter++;
    //   if(iter > 10) {
    //     console.warn('iter')
    //     return;
    //   }

    //   fixWallObj(self, intersect)
    //   oo = fixObjObjs(self.obj, self.objects, intersect)
      
    //   if(oo) {
    //     recursive()
    //   }

    // }

    // if(oo || wo) recursive()

  }


  /**
   * exorted Class BMControl
   */

  function BMControl({ scene, points = [], dom = document.body, ocontrol } = {}) {

    this.room = new Room(points)
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

  BMControl.prototype.selectedObject = function(obj) {

    if(this.ocontrol && this.ocontrol.enabled) {

      this.ocontrol.enabled = false
      
    }

    this.obj = obj.object

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


  /**
   * Event on dom
   */
  function mouseMove(e) {

    this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1
    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

    if(this.obj) {

      if(!this.move) return

      moveSelected(this)

    } else {

      var obj = findObject(this)
      
      if(this.events.onview)
        this.events.onview(obj, this.objects)

    }

  }

  /**
   * Event on dom
   */
  function mouseDown(e) {

    this.move = true

    this.mouse.x = (e.clientX / window.innerWidth ) * 2 - 1
    this.mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;
    
    var obj = findObject(this)

    if(obj) { 

      if(obj.object !== this.obj && this.obj) {

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
