
define(function(require) {

  var Room = require('./Room')
  var raycaster = new THREE.Raycaster
  var ray = new THREE.Ray


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

    p.x += point.x
    p.y = 0
    p.z += point.z
    //add дополнительный отступ, что бы не было пересечения
    p.add(v.clone().multiplyScalar(.001))

    return {
      point: p
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
        var nx = intersect.x - (points[idx].x - over_poses[idx].x)
        var nz = intersect.z - (points[idx].z - over_poses[idx].z)

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
        .add(p.rvec.clone().multiplyScalar(.001)) 
      ray.direction.copy(vec1)

      var pos = ray.intersectVec2(
        vec2, 
        new THREE.Vector3(info.point[0], 0, info.point[1])
          .add(p.rvec.clone().multiplyScalar(.001)), 
        'xz'
      )

      info.point[0] = pos.x
      info.point[1] = pos.z

      o_info = info
      o_p = p

      if(iter > 10) {
        
        console.warn('iterible')
        return true

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

        info = getFixedPos(obj, o, point)

        if(info) break

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
        return true

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

    // сразу перемещаем конструкцию в место мышки
    self.obj.position.x = intersect.x
    self.obj.position.z = intersect.z

    var mm = fixWallObj(self, intersect)
    var m1 = fixObjObjs(self.obj, self.objects, intersect)

    console.log(mm, m1)

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
